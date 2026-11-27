// Seeds the local WIMS stack through its own REST API, then backdates records so the timeline looks real.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, startStack } from './stack.mjs';
import * as D from './data.mjs';

const DAY = 86400000;
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function api(apiUrl, token, method, p, body) {
  const r = await fetch(apiUrl + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${p} -> ${r.status} ${data.message || ''}`);
  return data;
}

/** Returns { adminToken, staffToken, ids: { users, suppliers, stocks, orders } }. */
export async function seed({ apiUrl, mongoUri, wimsDir = path.join(ROOT, '.wims') }) {
  const mongoose = createRequire(path.join(wimsDir, 'backend', 'package.json'))('mongoose');
  const conn = await mongoose.createConnection(mongoUri).asPromise();
  const col = name => conn.db.collection(name);
  const backdate = async (name, id, daysAgo, hour = 10) => {
    const d = new Date(Date.now() - daysAgo * DAY);
    d.setHours(hour, 15 + (daysAgo * 7) % 40, 0, 0);
    await col(name).updateOne({ _id: new mongoose.Types.ObjectId(String(id)) }, { $set: { createdAt: d, updatedAt: d } });
  };
  const ids = { users: {}, suppliers: {}, stocks: {}, orders: {} };
  const tokens = {};

  try {
    for (const u of D.users) {
      const r = await api(apiUrl, null, 'POST', '/auth/register', { name: u.name, email: u.email, password: D.PASSWORD });
      ids.users[u.key] = r.id;
      if (u.role === 'admin') await col('users').updateOne({ email: u.email }, { $set: { role: 'admin' } });
      tokens[u.key] = (await api(apiUrl, null, 'POST', '/auth/login', { email: u.email, password: D.PASSWORD })).token;
    }
    const admin = tokens.admin;
    const staff = tokens.staff;

    for (const s of D.suppliers) {
      const { key, ...body } = s;
      ids.suppliers[key] = (await api(apiUrl, admin, 'POST', '/suppliers', body))._id;
      await backdate('suppliers', ids.suppliers[key], 40);
    }
    for (const s of D.stocks) {
      const { key, ...body } = s;
      ids.stocks[key] = (await api(apiUrl, admin, 'POST', '/stocks', body))._id;
      await backdate('stocks', ids.stocks[key], 30);
    }

    const movementIds = [];
    for (const m of D.movements) {
      const r = await api(apiUrl, m.type === 'outbound_sale' ? staff : admin, 'POST', '/movements', {
        stockId: ids.stocks[m.stock], type: m.type, quantity: m.quantity, reason: m.reason,
        ...(m.supplier ? { supplierId: ids.suppliers[m.supplier] } : {}),
      });
      movementIds.push(r._id);
      await backdate('stockmovements', r._id, m.daysAgo, 9 + (m.quantity % 8));
    }

    // Alerts raised by the movements: backdate to the movement that caused them, then apply outcomes.
    const alerts = await api(apiUrl, admin, 'GET', '/alerts');
    for (const a of alerts) {
      const stockId = String(a.stock?._id || a.stock);
      const key = Object.keys(ids.stocks).find(k => String(ids.stocks[k]) === stockId);
      const mv = [...D.movements].reverse().find(m => m.stock === key);
      if (mv) await backdate('alerts', a._id, mv.daysAgo, 11);
      const outcome = D.alertOutcomes[key];
      if (outcome?.action === 'resolve') await api(apiUrl, admin, 'PUT', `/alerts/${a._id}/resolve`, { resolution: outcome.resolution, notes: outcome.notes });
      if (outcome?.action === 'ignore') await api(apiUrl, admin, 'PUT', `/alerts/${a._id}/ignore`, { notes: outcome.notes });
    }

    for (const o of D.orders) {
      const items = o.items.map(([k, q]) => ({ stock: ids.stocks[k], quantity: q, unitPrice: D.stocks.find(s => s.key === k).price }));
      const order = await api(apiUrl, admin, 'POST', '/orders', { supplier: ids.suppliers[o.supplier], items, notes: o.notes });
      ids.orders[o.key] = order._id;
      await sleep(5); // orderNumber is 'ORD-' + Date.now()
      const path_ = `/orders/${order._id}`;
      const steps = { draft: [], pending: ['submit'], cancelled: ['submit', 'cancelled'], approved: ['submit', 'approved', 'track'],
        shipped: ['submit', 'approved', 'track', 'shipped'], received: ['submit', 'approved', 'track', 'shipped', 'received'] }[o.status];
      for (const step of steps) {
        if (step === 'submit') await api(apiUrl, admin, 'PUT', `${path_}/submit`, {});
        else if (step === 'track') {
          const eta = new Date(Date.now() + (o.status === 'received' ? -2 : 3) * DAY).toISOString().slice(0, 10);
          await api(apiUrl, admin, 'PUT', `${path_}/tracking`, { trackingNumber: o.tracking[0], carrier: o.tracking[1], estimatedDelivery: eta });
        } else await api(apiUrl, step === 'received' ? staff : admin, 'PUT', `${path_}/status`, { status: step });
      }
      await backdate('orders', order._id, o.daysAgo, 14);
    }

    for (const a of D.adjustments) {
      const stock = await api(apiUrl, staff, 'GET', `/stocks/${ids.stocks[a.stock]}`);
      const adj = await api(apiUrl, staff, 'POST', '/adjustments', {
        stock: stock._id, current_qty: stock.quantity, actual_qty: stock.quantity + a.actual, reason: a.reason,
      });
      if (a.status !== 'pending') await api(apiUrl, admin, 'PUT', `/adjustments/${adj._id}`, { status: a.status });
      await backdate('stockadjustments', adj._id, a.daysAgo, 15);
    }
    return { adminToken: admin, staffToken: staff, ids };
  } finally {
    await conn.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv.includes('--check')) {
  const s = await startStack();
  let ok = false;
  try {
    const { adminToken: t } = await seed(s);
    const get = p => api(s.apiUrl, t, 'GET', p);
    const [stocks, suppliers, alerts, orders, adjustments, users] = await Promise.all(
      ['/stocks', '/suppliers', '/alerts', '/orders', '/adjustments', '/users'].map(get));
    const count = (arr, f) => arr.filter(f).length;
    const statuses = [...new Set(orders.map(o => o.status))].sort();
    console.log(`stocks ${stocks.length}, suppliers ${suppliers.length}, users ${users.length}`);
    console.log(`alerts active ${count(alerts, a => a.status === 'active')}, resolved ${count(alerts, a => a.status === 'resolved')}, ignored ${count(alerts, a => a.status === 'ignored')}`);
    console.log(`orders ${orders.length}: ${statuses.join(', ')}`);
    console.log(`adjustments ${adjustments.length}: ${adjustments.map(a => a.status).sort().join(', ')}`);
    ok = stocks.length === 14 && suppliers.length === 5 && count(alerts, a => a.status === 'active') >= 3
      && statuses.length === 6 && adjustments.length === 3;
  } finally {
    await s.stop();
  }
  console.log(ok ? 'SEED OK' : 'SEED MISMATCH');
  process.exit(ok ? 0 : 1);
}
