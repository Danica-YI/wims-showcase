// Fictional sample data for the showcase. Phone numbers use Australia's reserved fictional range (0491 570 xxx).
export const PASSWORD = 'demo123';

export const users = [
  { key: 'admin', name: 'Alex Morgan', email: 'admin@wims.demo', role: 'admin' },
  { key: 'staff', name: 'Sam Lee', email: 'staff@wims.demo', role: 'staff' },
  { key: 'priya', name: 'Priya Nair', email: 'priya@wims.demo', role: 'staff' },
  { key: 'tom', name: 'Tom Walker', email: 'tom@wims.demo', role: 'staff' },
];

export const suppliers = [
  { key: 'elec', name: 'Southbank Electronics', contactPerson: 'Mia Chen', contactEmail: 'orders@southbank-electronics.example', phone: '0491 570 006', address: '12 Grey St, South Brisbane QLD', categories: ['Electronics'] },
  { key: 'pack', name: 'Harbour Packaging Co.', contactPerson: 'Liam O\'Brien', contactEmail: 'sales@harbourpack.example', phone: '0491 570 156', address: '88 Wharf Rd, Pinkenba QLD', categories: ['Packaging'] },
  { key: 'tools', name: 'Redgum Tools & Hardware', contactPerson: 'Ava Thompson', contactEmail: 'trade@redgumtools.example', phone: '0491 570 157', address: '5 Ipswich Rd, Woolloongabba QLD', categories: ['Tools'] },
  { key: 'office', name: 'Coral Office Supply', contactPerson: 'Noah Patel', contactEmail: 'hello@coraloffice.example', phone: '0491 570 158', address: '201 Ann St, Brisbane City QLD', categories: ['Office Supplies'] },
  { key: 'safety', name: 'Ironbark Safety Gear', contactPerson: 'Grace Kim', contactEmail: 'orders@ironbarksafety.example', phone: '0491 570 159', address: '40 Kingsford Smith Dr, Hamilton QLD', categories: ['Safety Equipment'] },
];

// quantity is the opening balance; movements below change it.
export const stocks = [
  { key: 'scanner', sku: 'EL-1001', name: 'Handheld Barcode Scanner', category: 'Electronics', quantity: 42, unit: 'pcs', price: 189, lowStockThreshold: 10, description: '2D imager, Bluetooth' },
  { key: 'printer', sku: 'EL-1002', name: 'Thermal Label Printer', category: 'Electronics', quantity: 18, unit: 'pcs', price: 429, lowStockThreshold: 5, description: '4-inch direct thermal' },
  { key: 'cable', sku: 'EL-1003', name: 'USB-C Charging Cable 2 m', category: 'Electronics', quantity: 260, unit: 'pcs', price: 12.5, lowStockThreshold: 50 },
  { key: 'box', sku: 'PK-2001', name: 'Corrugated Box 40×30×30 cm', category: 'Packaging', quantity: 1200, unit: 'pcs', price: 1.85, lowStockThreshold: 300 },
  { key: 'bubble', sku: 'PK-2002', name: 'Bubble Wrap Roll 50 m', category: 'Packaging', quantity: 64, unit: 'rolls', price: 24.9, lowStockThreshold: 20 },
  { key: 'tape', sku: 'PK-2003', name: 'Packing Tape 48 mm', category: 'Packaging', quantity: 340, unit: 'rolls', price: 3.2, lowStockThreshold: 100 },
  { key: 'jack', sku: 'TL-3001', name: 'Pallet Jack 2.5 t', category: 'Tools', quantity: 6, unit: 'units', price: 649, lowStockThreshold: 2 },
  { key: 'drill', sku: 'TL-3002', name: 'Cordless Drill 18 V', category: 'Tools', quantity: 22, unit: 'pcs', price: 159, lowStockThreshold: 5 },
  { key: 'vest', sku: 'SF-4001', name: 'Hi-Vis Safety Vest', category: 'Safety Equipment', quantity: 150, unit: 'pcs', price: 9.5, lowStockThreshold: 40 },
  { key: 'gloves', sku: 'SF-4002', name: 'Safety Gloves', category: 'Safety Equipment', quantity: 300, unit: 'pairs', price: 4.75, lowStockThreshold: 80 },
  { key: 'hat', sku: 'SF-4003', name: 'Hard Hat', category: 'Safety Equipment', quantity: 45, unit: 'pcs', price: 22, lowStockThreshold: 15 },
  { key: 'paper', sku: 'OF-5001', name: 'A4 Copy Paper (ream)', category: 'Office Supplies', quantity: 90, unit: 'reams', price: 6.4, lowStockThreshold: 30 },
  { key: 'clip', sku: 'OF-5002', name: 'Clipboard', category: 'Office Supplies', quantity: 75, unit: 'pcs', price: 3.9, lowStockThreshold: 20 },
  { key: 'label', sku: 'OF-5003', name: 'Shipping Label Roll', category: 'Office Supplies', quantity: 120, unit: 'rolls', price: 14, lowStockThreshold: 40 },
];

// daysAgo backdates the record. Outbound sales on printer, bubble, gloves, hat and jack cross their thresholds.
export const movements = [
  { stock: 'box', type: 'inbound', quantity: 400, supplier: 'pack', reason: 'Weekly restock', daysAgo: 20 },
  { stock: 'scanner', type: 'inbound', quantity: 12, supplier: 'elec', reason: 'New site rollout', daysAgo: 18 },
  { stock: 'box', type: 'outbound_sale', quantity: 350, reason: 'Customer order #4412', daysAgo: 16 },
  { stock: 'vest', type: 'outbound_sale', quantity: 35, reason: 'Contractor kit-out', daysAgo: 15 },
  { stock: 'cable', type: 'inbound', quantity: 100, supplier: 'elec', reason: 'Restock', daysAgo: 13 },
  { stock: 'paper', type: 'outbound_sale', quantity: 25, reason: 'Office order #4430', daysAgo: 12 },
  { stock: 'drill', type: 'outbound_return', quantity: 2, supplier: 'tools', reason: 'Faulty batteries returned to supplier', daysAgo: 11 },
  { stock: 'hat', type: 'outbound_sale', quantity: 33, reason: 'Site induction packs', daysAgo: 10 },
  { stock: 'jack', type: 'outbound_sale', quantity: 4, reason: 'Sold to Logan depot', daysAgo: 9 },
  { stock: 'tape', type: 'inbound', quantity: 120, supplier: 'pack', reason: 'Restock', daysAgo: 8 },
  { stock: 'printer', type: 'outbound_sale', quantity: 14, reason: 'Customer order #4467', daysAgo: 6 },
  { stock: 'bubble', type: 'outbound_sale', quantity: 50, reason: 'Peak season packing', daysAgo: 4 },
  { stock: 'gloves', type: 'outbound_sale', quantity: 230, reason: 'Contractor kit-out', daysAgo: 3 },
  { stock: 'label', type: 'outbound_sale', quantity: 30, reason: 'Dispatch team', daysAgo: 2 },
  { stock: 'scanner', type: 'outbound_sale', quantity: 6, reason: 'Customer order #4490', daysAgo: 1 },
];

// Orders end in the listed status; steps between are applied through the API.
export const orders = [
  { key: 'received', supplier: 'safety', items: [['hat', 30], ['vest', 60]], notes: 'Reorder after hard hat low-stock alert', status: 'received', tracking: ['AP-77120934', 'Australia Post'], daysAgo: 9 },
  { key: 'shipped', supplier: 'tools', items: [['drill', 8]], notes: 'Replacement for returned units', status: 'shipped', tracking: ['TNT-5581203', 'TNT Express'], daysAgo: 7 },
  { key: 'approved', supplier: 'elec', items: [['scanner', 10], ['printer', 6]], notes: 'Q4 device refresh', status: 'approved', tracking: ['SC-30419877', 'StarTrack'], daysAgo: 5 },
  { key: 'pending', supplier: 'pack', items: [['box', 500], ['tape', 200]], notes: 'Peak season packaging', status: 'pending', daysAgo: 3 },
  { key: 'cancelled', supplier: 'office', items: [['clip', 40]], notes: 'Duplicate request', status: 'cancelled', daysAgo: 2 },
  { key: 'draft', supplier: 'office', items: [['paper', 50], ['label', 40]], notes: 'Monthly office restock', status: 'draft', daysAgo: 1 },
];

export const adjustments = [
  { stock: 'drill', actual: -1, reason: 'Damaged in transit', status: 'approved', daysAgo: 6 },
  { stock: 'clip', actual: -5, reason: 'Count discrepancy', status: 'rejected', daysAgo: 4 },
  { stock: 'cable', actual: -8, reason: 'Cycle count: 8 missing from bin B4', status: 'pending', daysAgo: 1 },
];

// Alerts raised by the movements above: hat is resolved as a reorder, jack ignored, the rest stay active.
export const alertOutcomes = {
  hat: { action: 'resolve', resolution: 'reorder', notes: 'Reordered from Ironbark Safety Gear' },
  jack: { action: 'ignore', notes: 'Low-turnover item, no reorder needed' },
};
