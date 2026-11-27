// Multi-step flows captured as numbered screenshots: <flow>-<n>.png
// Each run({ session, shoot, settle, webUrl }) drives the real UI.

/** Choose the <option> whose text contains `text` in a <select> locator. */
export async function selectByText(select, text) {
  const value = await select.evaluate((el, t) => [...el.options].find(o => o.text.includes(t))?.value, text);
  if (value === undefined) throw new Error(`no option containing "${text}"`);
  await select.selectOption(value);
}

/** Wait until the input with this placeholder has a non-empty value (the app's async SKU lookup). */
export async function waitForValue(page, placeholder) {
  await page.waitForFunction(p => document.querySelector(`input[placeholder="${p}"]`)?.value, placeholder, { timeout: 15000 });
}

const go = async (page, webUrl, route, settle) => { await page.goto(webUrl + route); await settle(page); };

export const flows = [
  {
    // Outbound sale → low-stock alert → reorder → purchase order → shipped → received → stock back up.
    name: 'loop',
    async run({ session, shoot, settle, webUrl }) {
      const staff = (await session('staff')).page;
      const admin = (await session('admin')).page;

      await go(staff, webUrl, '/outbound', settle);
      await staff.getByPlaceholder('Enter Product ID').fill('PK-2003');
      await waitForValue(staff, 'Auto-filled');
      await staff.getByPlaceholder('Enter Quantity').fill('380');
      await staff.getByPlaceholder('Enter reason...').fill('Customer order #4521');
      await settle(staff);
      await shoot(staff, 1);
      await staff.getByRole('button', { name: 'Confirm' }).click();
      await settle(staff);

      await go(admin, webUrl, '/alerts', settle);
      await shoot(admin, 2);

      await admin.locator('tr', { hasText: 'Packing Tape' }).getByRole('button', { name: /Reorder/ }).click();
      await settle(admin);
      await admin.getByRole('button', { name: '+ Create Order' }).click();
      await settle(admin);
      const selects = admin.locator('select');
      await selectByText(selects.nth(0), 'Harbour Packaging');
      await selectByText(selects.nth(1), 'Packing Tape');
      const nums = admin.locator('input[type=number]');
      await nums.nth(0).fill('300');
      await nums.nth(1).fill('3.2');
      await shoot(admin, 3);
      await admin.getByRole('button', { name: 'Submit', exact: true }).click();
      await settle(admin);

      await admin.locator('tr', { hasText: '960' }).getByRole('button', { name: /View/ }).click();
      await settle(admin);
      await shoot(admin, 4);
      await admin.getByRole('button', { name: /Approve Order/ }).click();
      await settle(admin);
      await admin.getByPlaceholder('e.g. DHL, FedEx, Australia Post').fill('Australia Post');
      await admin.getByPlaceholder('Enter tracking number').fill('AP-77188120');
      const eta = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
      await admin.locator('input[type=date]').fill(eta);
      await shoot(admin, 5);
      await admin.getByRole('button', { name: /Save Tracking & Mark as Shipped/ }).click();
      await settle(admin);
      await admin.evaluate(() => window.scrollTo(0, 0));
      await shoot(admin, 6);

      await go(staff, webUrl, '/inbound', settle);
      await staff.getByText('Harbour Packaging').first().click();
      await settle(staff);
      await staff.locator('input[type=number]').first().fill('300');
      await shoot(staff, 7);
      await staff.getByRole('button', { name: 'Confirm' }).click();
      await settle(staff);

      await go(staff, webUrl, '/stocks', settle);
      await staff.getByPlaceholder('Search stocks...').fill('Packing');
      await settle(staff);
      await shoot(staff, 8);
    },
  },
  {
    // Admin adds a product: filled-in form.
    name: 'stock',
    async run({ session, shoot, settle, webUrl }) {
      const admin = (await session('admin')).page;
      await go(admin, webUrl, '/stocks', settle);
      await admin.getByRole('button', { name: /\+ Add Stock/ }).click();
      await settle(admin);
      const values = ['Stretch Wrap Film 500 mm', 'PK-2004', 'Packaging', '80', 'rolls', '18.5', '25', 'Hand-grade, 23 micron'];
      const inputs = admin.locator('form').last().locator('input');
      for (let i = 0; i < values.length; i++) await inputs.nth(i).fill(values[i]);
      await shoot(admin, 2);
    },
  },
  {
    // Admin adds a supplier: filled-in form.
    name: 'suppliers',
    async run({ session, shoot, settle, webUrl }) {
      const admin = (await session('admin')).page;
      await go(admin, webUrl, '/suppliers', settle);
      await admin.getByRole('button', { name: /\+ Add Supplier/ }).click();
      await settle(admin);
      const fill = (ph, v) => admin.getByPlaceholder(ph).fill(v);
      await fill('Enter company name', 'Moreton Bay Pallets');
      await fill('Enter contact person name', 'Jack Wilson');
      await fill('Enter email address', 'orders@moretonpallets.example');
      await fill('Enter phone number', '0491 570 110');
      await fill('Enter location', '9 Gympie Rd, Strathpine QLD');
      await fill('e.g. Electronics, Furniture, Food', 'Packaging, Tools');
      await shoot(admin, 2);
    },
  },
  {
    // Staff counts stock, finds a mismatch, requests an adjustment; admin approves it.
    name: 'adjust',
    async run({ session, shoot, settle, webUrl }) {
      const staff = (await session('staff')).page;
      const admin = (await session('admin')).page;
      await go(staff, webUrl, '/adjustments', settle);
      await staff.getByPlaceholder('Search by Product ID or Name').first().fill('SF-4001');
      await settle(staff);
      const count = staff.locator('input[type=number]').first();
      const system = Number(await count.getAttribute('placeholder'));
      await count.fill(String(system - 3));
      await settle(staff);
      await shoot(staff, 1);
      await staff.getByText('→', { exact: true }).first().click();
      await settle(staff);
      await staff.getByPlaceholder('Explain the reason...').first().fill('Cycle count: 3 vests damaged by forklift');
      await shoot(staff, 2);
      await staff.getByRole('button', { name: 'Submit', exact: true }).first().click();
      await settle(staff);

      await go(admin, webUrl, '/adjustments', settle);
      await shoot(admin, 3);
      await admin.locator('div', { hasText: 'Hi-Vis' })
        .filter({ has: admin.getByRole('button', { name: 'Approve' }) }).last()
        .getByRole('button', { name: 'Approve' }).click();
      await settle(admin);
      await shoot(admin, 4);
    },
  },
  {
    // Alert history: every alert with its outcome.
    name: 'alerts',
    async run({ session, shoot, settle, webUrl }) {
      const admin = (await session('admin')).page;
      await go(admin, webUrl, '/alerts', settle);
      await admin.getByRole('button', { name: 'All', exact: true }).click();
      await settle(admin);
      await shoot(admin, 2);
    },
  },
];
