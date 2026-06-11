const express = require('express');
const cors = require('cors');
const { existsSync, promises: fs } = require('fs');
const { resolve } = require('path');

const app = express();
const PORT = Number(process.env.PORT || 4000);
const DOTNET_BACKEND = process.env.DOTNET_URL || 'http://localhost:5028';
const dataFolder = resolve(__dirname, 'data');

app.use(cors());
app.use(express.json());

// ─── Data file helpers ──────────────────────────────────────────────
async function readDataFile(filename, defaults = []) {
  const f = resolve(dataFolder, filename);
  try {
    if (!existsSync(f)) {
      await fs.writeFile(f, JSON.stringify(defaults, null, 2), 'utf8');
      return defaults;
    }
    const raw = await fs.readFile(f, 'utf8');
    return JSON.parse(raw);
  } catch { return defaults; }
}

async function writeDataFile(filename, data) {
  const f = resolve(dataFolder, filename);
  try {
    if (!existsSync(dataFolder)) await fs.mkdir(dataFolder, { recursive: true });
    await fs.writeFile(f, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) { console.error('writeDataFile error', err); }
}

// ─── Generic CRUD helper ────────────────────────────────────────────
function crudList(basePath, filename, idField = 'id') {
  app.get(`/api/${basePath}`, async (_req, res) => {
    const data = await readDataFile(filename);
    res.json({ success: true, message: '', data, statusCode: 200 });
  });
  app.get(`/api/${basePath}/:id`, async (req, res) => {
    const data = await readDataFile(filename);
    const item = data.find((x) => String(x[idField]) === String(req.params.id));
    if (!item) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
    res.json({ success: true, message: '', data: item, statusCode: 200 });
  });
  app.post(`/api/${basePath}`, async (req, res) => {
    const data = await readDataFile(filename);
    const item = { id: `item-${Date.now()}`, ...req.body };
    data.push(item);
    await writeDataFile(filename, data);
    res.status(201).json({ success: true, message: 'Created', data: item.id, statusCode: 201 });
  });
  app.put(`/api/${basePath}/:id`, async (req, res) => {
    const data = await readDataFile(filename);
    const idx = data.findIndex((x) => String(x[idField]) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
    const { [idField]: _, ...safe } = req.body;
    data[idx] = { ...data[idx], ...safe };
    await writeDataFile(filename, data);
    res.json({ success: true, message: 'Updated', data: data[idx], statusCode: 200 });
  });
  app.delete(`/api/${basePath}/:id`, async (req, res) => {
    const data = await readDataFile(filename);
    const idx = data.findIndex((x) => String(x[idField]) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
    const removed = data.splice(idx, 1)[0];
    await writeDataFile(filename, data);
    res.json({ success: true, message: 'Deleted', data: removed, statusCode: 200 });
  });
}

// ─── Inventory data helpers ─────────────────────────────────────────
const inventoryFile = resolve(dataFolder, 'inventory.json');

async function ensureDataFile() {
  try {
    if (!existsSync(dataFolder)) await fs.mkdir(dataFolder, { recursive: true });
    if (!existsSync(inventoryFile)) {
      await fs.writeFile(inventoryFile, JSON.stringify({ inventory: [], ledger: [] }, null, 2), 'utf8');
    }
  } catch (err) { console.error('Failed to ensure data file', err); }
}

async function readInventoryData() {
  try {
    await ensureDataFile();
    const raw = await fs.readFile(inventoryFile, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.itemMasters) parsed.itemMasters = [];
    return parsed;
  } catch (err) {
    console.error('readInventoryData error', err);
    return { inventory: [], ledger: [], itemMasters: [] };
  }
}

async function writeInventoryData(data) {
  try {
    await ensureDataFile();
    await fs.writeFile(inventoryFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) { console.error('writeInventoryData error', err); }
}

// ─── Properties API ─────────────────────────────────────────────────
crudList('Properties', 'properties.json');
app.get('/api/Properties/by-location/:locationId', async (req, res) => {
  const data = await readDataFile('properties.json');
  res.json({ success: true, message: '', data: data.filter((x) => String(x.locationId) === String(req.params.locationId)), statusCode: 200 });
});
app.post('/api/Properties/:id/transfer', async (req, res) => {
  const data = await readDataFile('properties.json');
  const idx = data.findIndex((x) => String(x.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  data[idx] = { ...data[idx], ...req.body, lastTransferDate: new Date().toISOString() };
  await writeDataFile('properties.json', data);
  res.json({ success: true, message: 'Transferred', data: data[idx], statusCode: 200 });
});

// ─── Warehouses API ─────────────────────────────────────────────────
crudList('Warehouses', 'warehouses.json');

// ─── Shelf Locations API ────────────────────────────────────────────
crudList('ShelfLocations', 'shelf-locations.json');

// ─── Property Types API ─────────────────────────────────────────────
crudList('PropertyTypes', 'property-types.json');

// ─── Property Categories API ────────────────────────────────────────
crudList('PropertyCategories', 'property-categories.json');

// ─── Service Requests API ───────────────────────────────────────────
crudList('ServiceRequests', 'service-requests.json');

// ─── Transfer Records API ───────────────────────────────────────────
app.get('/api/TransferRecords', async (req, res) => {
  const data = await readDataFile('transfer-records.json');
  const pageNumber = Number(req.query.pageNumber) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const totalCount = data.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  res.json({ success: true, message: '', data: { items: data, pageNumber, totalPages, totalCount, hasPreviousPage: pageNumber > 1, hasNextPage: pageNumber < totalPages }, statusCode: 200 });
});
app.get('/api/TransferRecords/:id', async (req, res) => {
  const data = await readDataFile('transfer-records.json');
  const item = data.find((x) => String(x.id) === String(req.params.id));
  if (!item) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  res.json({ success: true, message: '', data: item, statusCode: 200 });
});
app.post('/api/TransferRecords', async (req, res) => {
  const data = await readDataFile('transfer-records.json');
  const item = { id: `tr-${Date.now()}`, transferNumber: `TR-${Date.now()}`, transferDate: new Date().toISOString(), status: 'Pending', initiatedBy: 'system', history: [{ date: new Date().toISOString(), action: 'Created', performedBy: 'system' }], ...req.body };
  data.push(item);
  await writeDataFile('transfer-records.json', data);
  res.status(201).json({ success: true, message: 'Created', data: item.id, statusCode: 201 });
});
app.post('/api/TransferRecords/:id/approve', async (req, res) => {
  const data = await readDataFile('transfer-records.json');
  const idx = data.findIndex((x) => String(x.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  data[idx].status = req.body.isApproved ? 'Approved' : 'Rejected';
  data[idx].approvedDate = new Date().toISOString();
  data[idx].history = data[idx].history || [];
  data[idx].history.push({ date: new Date().toISOString(), action: data[idx].status, performedBy: 'system', remarks: req.body.remarks || '' });
  await writeDataFile('transfer-records.json', data);
  res.json({ success: true, message: data[idx].status, data: data[idx], statusCode: 200 });
});

// ─── Inspections API ────────────────────────────────────────────────
app.get('/api/Inspections', async (req, res) => {
  const data = await readDataFile('inspections.json');
  const pageNumber = Number(req.query.pageNumber) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const totalCount = data.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  res.json({ success: true, message: '', data: { items: data, pageNumber, totalPages, totalCount, hasPreviousPage: pageNumber > 1, hasNextPage: pageNumber < totalPages }, statusCode: 200 });
});
app.get('/api/Inspections/:id', async (req, res) => {
  const data = await readDataFile('inspections.json');
  const item = data.find((x) => String(x.id) === String(req.params.id));
  if (!item) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  res.json({ success: true, message: '', data: item, statusCode: 200 });
});
app.post('/api/Inspections', async (req, res) => {
  const data = await readDataFile('inspections.json');
  const item = { id: `insp-${Date.now()}`, inspectionDate: new Date().toISOString(), status: 'Completed', ...req.body };
  data.push(item);
  await writeDataFile('inspections.json', data);
  res.status(201).json({ success: true, message: 'Created', data: item.id, statusCode: 201 });
});

// ─── Receiving Notes API ────────────────────────────────────────────
app.get('/api/ReceivingNotes', async (req, res) => {
  const data = await readDataFile('receiving-notes.json');
  const pageNumber = Number(req.query.pageNumber) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const totalCount = data.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  res.json({ success: true, message: '', data: { items: data, pageNumber, totalPages, totalCount, hasPreviousPage: pageNumber > 1, hasNextPage: pageNumber < totalPages }, statusCode: 200 });
});
app.get('/api/ReceivingNotes/:id', async (req, res) => {
  const data = await readDataFile('receiving-notes.json');
  const item = data.find((x) => String(x.id) === String(req.params.id));
  if (!item) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  res.json({ success: true, message: '', data: item, statusCode: 200 });
});
app.post('/api/ReceivingNotes', async (req, res) => {
  const data = await readDataFile('receiving-notes.json');
  const item = { id: `rn-${Date.now()}`, grnNumber: `GRN-${Date.now()}`, receivedDate: new Date().toISOString(), status: 'Pending', ...req.body };
  data.push(item);
  await writeDataFile('receiving-notes.json', data);
  res.status(201).json({ success: true, message: 'Created', data: item.id, statusCode: 201 });
});
app.post('/api/ReceivingNotes/:id/approve', async (req, res) => {
  const data = await readDataFile('receiving-notes.json');
  const idx = data.findIndex((x) => String(x.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  data[idx].status = req.body.isApproved ? 'Approved' : 'Rejected';
  await writeDataFile('receiving-notes.json', data);
  res.json({ success: true, message: data[idx].status, data: data[idx], statusCode: 200 });
});

// ─── Users API ──────────────────────────────────────────────────────
app.get('/api/users', async (req, res) => {
  const data = await readDataFile('users.json');
  const pageNumber = Number(req.query.pageNumber) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const totalCount = data.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  res.json({ success: true, message: '', data: { items: data, pageNumber, totalPages, totalCount, hasPreviousPage: pageNumber > 1, hasNextPage: pageNumber < totalPages }, statusCode: 200 });
});
app.get('/api/users/:id', async (req, res) => {
  const data = await readDataFile('users.json');
  const item = data.find((x) => String(x.id) === String(req.params.id));
  if (!item) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  res.json({ success: true, message: '', data: item, statusCode: 200 });
});
app.post('/api/users', async (req, res) => {
  const data = await readDataFile('users.json');
  const maxId = data.reduce((max, u) => Math.max(max, Number(u.id) || 0), 0);
  const item = { id: maxId + 1, userId: `u-${Date.now()}`, isActive: true, ...req.body };
  data.push(item);
  await writeDataFile('users.json', data);
  res.status(201).json({ success: true, message: 'Created', data: item, statusCode: 201 });
});
app.put('/api/users/:id', async (req, res) => {
  const data = await readDataFile('users.json');
  const idx = data.findIndex((x) => String(x.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  const { id: _, ...safe } = req.body;
  data[idx] = { ...data[idx], ...safe };
  await writeDataFile('users.json', data);
  res.json({ success: true, message: 'Updated', data: data[idx], statusCode: 200 });
});
app.delete('/api/users/:id', async (req, res) => {
  const data = await readDataFile('users.json');
  const idx = data.findIndex((x) => String(x.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  const removed = data.splice(idx, 1)[0];
  await writeDataFile('users.json', data);
  res.json({ success: true, message: 'Deleted', data: removed, statusCode: 200 });
});
app.patch('/api/users/:id/toggle-status', async (req, res) => {
  const data = await readDataFile('users.json');
  const idx = data.findIndex((x) => String(x.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  data[idx].isActive = !data[idx].isActive;
  await writeDataFile('users.json', data);
  res.json({ success: true, message: 'Toggled', data: data[idx], statusCode: 200 });
});

// ─── Employees API ──────────────────────────────────────────────────
app.get('/api/employees', async (req, res) => {
  const data = await readDataFile('employees.json');
  const pageNumber = Number(req.query.pageNumber) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const totalCount = data.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  res.json({ success: true, message: '', data: { items: data, pageNumber, totalPages, totalCount, hasPreviousPage: pageNumber > 1, hasNextPage: pageNumber < totalPages }, statusCode: 200 });
});
app.get('/api/employees/:id', async (req, res) => {
  const data = await readDataFile('employees.json');
  const item = data.find((x) => String(x.id) === String(req.params.id));
  if (!item) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  res.json({ success: true, message: '', data: item, statusCode: 200 });
});
app.post('/api/employees', async (req, res) => {
  const data = await readDataFile('employees.json');
  const maxId = data.reduce((max, e) => Math.max(max, Number(e.id) || 0), 0);
  const item = { id: maxId + 1, employeeId: `emp-${Date.now()}`, isActive: true, ...req.body };
  data.push(item);
  await writeDataFile('employees.json', data);
  res.status(201).json({ success: true, message: 'Created', data: item, statusCode: 201 });
});
app.put('/api/employees/:id', async (req, res) => {
  const data = await readDataFile('employees.json');
  const idx = data.findIndex((x) => String(x.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  const { id: _, ...safe } = req.body;
  data[idx] = { ...data[idx], ...safe };
  await writeDataFile('employees.json', data);
  res.json({ success: true, message: 'Updated', data: data[idx], statusCode: 200 });
});
app.delete('/api/employees/:id', async (req, res) => {
  const data = await readDataFile('employees.json');
  const idx = data.findIndex((x) => String(x.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  const removed = data.splice(idx, 1)[0];
  await writeDataFile('employees.json', data);
  res.json({ success: true, message: 'Deleted', data: removed, statusCode: 200 });
});
app.get('/api/employees/by-user/:userId', async (req, res) => {
  const data = await readDataFile('employees.json');
  const item = data.find((x) => String(x.employeeId) === String(req.params.userId));
  if (!item) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  res.json({ success: true, message: '', data: item, statusCode: 200 });
});

// ─── Roles API ──────────────────────────────────────────────────────
crudList('Roles', 'roles.json', 'id');

// ─── Activity Logs API ──────────────────────────────────────────────
app.get('/api/activity-logs', async (req, res) => {
  const data = await readDataFile('activity-logs.json');
  const pageNumber = Number(req.query.pageNumber) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const totalCount = data.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  res.json({ success: true, message: '', data: { items: data, pageNumber, totalPages, totalCount, hasPreviousPage: pageNumber > 1, hasNextPage: pageNumber < totalPages }, statusCode: 200 });
});

// ─── Inventory Reports API ──────────────────────────────────────────
app.get('/api/InventoryReports/valuation', async (req, res) => {
  const d = await readInventoryData();
  const inv = d.inventory || [];
  const totalValue = inv.reduce((sum, i) => sum + (Number(i.currentStock) || 0) * (Number(i.unitPrice) || 0), 0);
  res.json({ success: true, message: '', data: { generatedAt: new Date().toISOString(), summary: { totalItems: inv.length, totalStockItems: inv.filter((i) => (Number(i.currentStock) || 0) > 0).length, totalQuantity: inv.reduce((s, i) => s + (Number(i.currentStock) || 0), 0), totalValue, averageItemValue: inv.length ? totalValue / inv.length : 0, lowStockItems: inv.filter((i) => (Number(i.currentStock) || 0) <= (Number(i.minimumThreshold) || 0)).length, outOfStockItems: inv.filter((i) => (Number(i.currentStock) || 0) === 0).length }, items: inv, byCategory: [], byWarehouse: [] }, statusCode: 200 });
});

// ─── Inventory Stock API ────────────────────────────────────────────
app.get('/api/InventoryStock', async (req, res) => {
  const d = await readInventoryData();
  res.json({ success: true, message: '', data: d.inventory || [], statusCode: 200 });
});
app.get('/api/inventory/stock', async (req, res) => {
  const d = await readInventoryData();
  res.json({ success: true, message: '', data: d.inventory, statusCode: 200 });
});
app.post('/api/InventoryStock', async (req, res) => {
  const d = await readInventoryData();
  const item = req.body || {};
  item.id = item.id || `inv-${Date.now()}`;
  d.inventory.push(item);
  await writeInventoryData(d);
  res.json({ success: true, message: 'Created', data: item, statusCode: 201 });
});
app.post('/api/inventory/stock', async (req, res) => {
  const d = await readInventoryData();
  const item = req.body || {};
  item.id = item.id || `inv-${Date.now()}`;
  d.inventory.push(item);
  await writeInventoryData(d);
  res.json({ success: true, message: 'Created', data: item, statusCode: 201 });
});
app.put('/api/InventoryStock/:id', async (req, res) => {
  const d = await readInventoryData();
  const idx = d.inventory.findIndex((x) => String(x.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  d.inventory[idx] = { ...d.inventory[idx], ...req.body };
  await writeInventoryData(d);
  res.json({ success: true, message: 'Updated', data: d.inventory[idx], statusCode: 200 });
});
app.put('/api/inventory/stock/:id', async (req, res) => {
  const d = await readInventoryData();
  const idx = d.inventory.findIndex((x) => String(x.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  d.inventory[idx] = { ...d.inventory[idx], ...req.body };
  await writeInventoryData(d);
  res.json({ success: true, message: 'Updated', data: d.inventory[idx], statusCode: 200 });
});
app.delete('/api/InventoryStock/:id', async (req, res) => {
  const d = await readInventoryData();
  const idx = d.inventory.findIndex((x) => String(x.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  const removed = d.inventory.splice(idx, 1)[0];
  await writeInventoryData(d);
  res.json({ success: true, message: 'Deleted', data: removed, statusCode: 200 });
});
app.delete('/api/inventory/stock/:id', async (req, res) => {
  const d = await readInventoryData();
  const idx = d.inventory.findIndex((x) => String(x.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  const removed = d.inventory.splice(idx, 1)[0];
  await writeInventoryData(d);
  res.json({ success: true, message: 'Deleted', data: removed, statusCode: 200 });
});
app.post('/api/InventoryStock/adjust', async (req, res) => {
  const { itemId, shelfId, adjustmentType, quantity, reason } = req.body || {};
  const d = await readInventoryData();
  const idx = d.inventory.findIndex((x) => x.id === itemId || x.itemId === itemId || x.sku === itemId);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Item not found', statusCode: 404 });
  const item = d.inventory[idx];
  const q = Number(quantity) || 0;
  if (adjustmentType === 'increase') item.currentStock = (Number(item.currentStock) || 0) + q;
  else if (adjustmentType === 'decrease') item.currentStock = (Number(item.currentStock) || 0) - q;
  else if (adjustmentType === 'set') item.currentStock = q;
  item.lastUpdated = new Date().toISOString();
  const ledgerEntry = { id: `mov-${Date.now()}`, itemId: item.id, itemName: item.itemName || item.name, sku: item.sku || item.code, movementType: adjustmentType, quantity: q, newStock: item.currentStock, referenceType: 'adjustment', movementDate: new Date().toISOString(), performedBy: 'system', notes: reason || null };
  d.ledger = d.ledger || [];
  d.ledger.unshift(ledgerEntry);
  await writeInventoryData(d);
  res.json({ success: true, message: 'Adjusted', data: item, statusCode: 200 });
});
app.post('/api/inventory/stock/adjust', async (req, res) => {
  const { itemId, shelfId, adjustmentType, quantity, reason } = req.body || {};
  const d = await readInventoryData();
  const idx = d.inventory.findIndex((x) => x.id === itemId || x.itemId === itemId || x.sku === itemId);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Item not found', statusCode: 404 });
  const item = d.inventory[idx];
  const q = Number(quantity) || 0;
  if (adjustmentType === 'increase') item.currentStock = (Number(item.currentStock) || 0) + q;
  else if (adjustmentType === 'decrease') item.currentStock = (Number(item.currentStock) || 0) - q;
  else if (adjustmentType === 'set') item.currentStock = q;
  item.lastUpdated = new Date().toISOString();
  const ledgerEntry = { id: `mov-${Date.now()}`, itemId: item.id, itemName: item.itemName || item.name, sku: item.sku || item.code, movementType: adjustmentType, quantity: q, newStock: item.currentStock, referenceType: 'adjustment', movementDate: new Date().toISOString(), performedBy: 'system', notes: reason || null };
  d.ledger = d.ledger || [];
  d.ledger.unshift(ledgerEntry);
  await writeInventoryData(d);
  res.json({ success: true, message: 'Adjusted', data: item, statusCode: 200 });
});
app.get('/api/StockLedger', async (req, res) => {
  const d = await readInventoryData();
  res.json({ success: true, message: '', data: d.ledger || [], statusCode: 200 });
});

// ─── ItemMasters API ────────────────────────────────────────────────
app.get('/api/ItemMasters', async (req, res) => {
  const d = await readInventoryData();
  const items = d.itemMasters || [];
  res.json({ success: true, message: '', data: { items, pageNumber: 1, totalPages: 1, totalCount: items.length, hasPreviousPage: false, hasNextPage: false }, statusCode: 200 });
});
app.post('/api/ItemMasters', async (req, res) => {
  const d = await readInventoryData();
  d.itemMasters = d.itemMasters || [];
  const payload = req.body || {};
  const id = payload.id || `itm-${Date.now()}`;
  const stockQty = Number(payload.stockQuantity) || 0;
  const item = { id, itemName: payload.itemName || payload.sku || 'Unnamed Item', sku: payload.sku || '', description: payload.description || '', categoryName: payload.categoryName || '', unitOfMeasure: payload.unitOfMeasure || 'PCS', currentStock: stockQty, reservedStock: 0, availableStock: stockQty, minStockLevel: payload.minStockLevel || 0, requiresInspection: false, isLowStock: false, isActive: payload.isActive ?? true };
  d.inventory = d.inventory || [];
  const inv = { id: `inv-${Date.now()}`, itemId: id, itemName: item.itemName, sku: item.sku, shelfId: payload.shelfId || '', shelfLocation: payload.shelfLocation || '', warehouseId: payload.warehouseId || '', warehouseName: payload.warehouseName || '', currentStock: item.currentStock, reservedStock: 0, availableStock: item.currentStock, unitOfMeasure: item.unitOfMeasure, lastUpdated: new Date().toISOString(), minimumThreshold: item.minStockLevel || 0, maximumThreshold: 0 };
  d.inventory.push(inv);
  d.itemMasters.push(item);
  await writeInventoryData(d);
  res.status(201).json({ success: true, message: 'Created', data: id, statusCode: 201 });
});
app.put('/api/ItemMasters/:id', async (req, res) => {
  const d = await readInventoryData();
  d.itemMasters = d.itemMasters || [];
  const idx = d.itemMasters.findIndex((x) => String(x.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  const { id: _ignored, ...safeBody } = req.body || {};
  d.itemMasters[idx] = { ...d.itemMasters[idx], ...safeBody };
  await writeInventoryData(d);
  res.json({ success: true, message: 'Updated', data: d.itemMasters[idx], statusCode: 200 });
});
app.delete('/api/ItemMasters/:id', async (req, res) => {
  const d = await readInventoryData();
  d.itemMasters = d.itemMasters || [];
  const idx = d.itemMasters.findIndex((x) => String(x.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  const removed = d.itemMasters.splice(idx, 1)[0];
  await writeInventoryData(d);
  res.json({ success: true, message: 'Deleted', data: removed, statusCode: 200 });
});

// ─── Dashboard Statistics API (computed from data files) ────────────
app.get('/api/Dashboard/statistics', async (_req, res) => {
  const properties = await readDataFile('properties.json');
  const users = await readDataFile('users.json');
  const employees = await readDataFile('employees.json');
  const inventory = await readDataFile('inventory.json');
  const serviceRequests = await readDataFile('service-requests.json');
  const inspections = await readDataFile('inspections.json');
  const invData = Array.isArray(inventory) ? inventory : (inventory?.inventory || []);
  const totalPropertyValue = properties.reduce((s, p) => s + (Number(p.currentValue) || Number(p.value) || 0), 0);
  const totalProperties = properties.length;
  const totalLocations = new Set(properties.map((p) => p.locationId || p.location)).size;
  const totalEmployees = employees.length;
  const pendingRequisitions = (Array.isArray(serviceRequests) ? serviceRequests : []).filter((r) => (r.status || '').toLowerCase() === 'pending').length;
  const approvedRequisitions = (Array.isArray(serviceRequests) ? serviceRequests : []).filter((r) => (r.status || '').toLowerCase() === 'approved').length;
  const rejectedRequisitions = (Array.isArray(serviceRequests) ? serviceRequests : []).filter((r) => (r.status || '').toLowerCase() === 'rejected').length;
  const issuedRequisitions = (Array.isArray(serviceRequests) ? serviceRequests : []).filter((r) => (r.status || '').toLowerCase() === 'issued').length;
  const completedRequisitions = (Array.isArray(serviceRequests) ? serviceRequests : []).filter((r) => (r.status || '').toLowerCase() === 'completed').length;
  const lowStockItems = invData.filter((i) => { const min = Number(i.minimumThreshold) || 0; return min > 0 && (Number(i.currentStock) || 0) <= min; });
  const totalSafetyBoxes = properties.filter((p) => (p.propertyTypeId || '').toLowerCase().includes('safety') || (p.propertyCategoryId || '').toLowerCase().includes('safety')).length;
  const totalSuppliers = new Set(users.map((u) => u.username)).size;
  const catMap = new Map();
  properties.forEach((p) => { const cat = p.propertyCategoryName || p.propertyCategoryId || p.category || p.propertyTypeName || p.propertyTypeId || 'Other'; catMap.set(cat, (catMap.get(cat) || 0) + 1); });
  const categoryColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#f97316'];
  const categoryBreakdown = [...catMap.entries()].sort((a, b) => b[1] - a[1]).map(([name, count], i) => ({ label: name, value: count, color: categoryColors[i % categoryColors.length] }));
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyMap = new Map();
  (Array.isArray(serviceRequests) ? serviceRequests : []).forEach((r) => { if (r.requestDate) { const m = r.requestDate.slice(0, 7); monthlyMap.set(m, (monthlyMap.get(m) || 0) + 1); } });
  const stockMovementsByMonth = [...monthlyMap.entries()].sort().map(([key, count]) => { const monthIdx = parseInt(key.slice(5, 7), 10) - 1; return { label: months[monthIdx] || key, value: count, color: categoryColors[0] }; });
  const monthlyTrend = [...monthlyMap.entries()].sort().map(([key, count]) => ({ month: months[parseInt(key.slice(5, 7), 10) - 1] || key, requests: count, approved: Math.round(count * 0.6), completed: Math.round(count * 0.3) }));
  const deptMap = new Map();
  (Array.isArray(serviceRequests) ? serviceRequests : []).forEach((r) => { const d = r.department || 'Other'; deptMap.set(d, (deptMap.get(d) || 0) + 1); });
  const totalReq = pendingRequisitions + approvedRequisitions + rejectedRequisitions + completedRequisitions || 1;
  const departmentActivity = [...deptMap.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ department: name, requests: count, pct: Math.round((count / totalReq) * 100) }));
  const recentActivities = [];
  const now = new Date();
  const recentProps = properties.slice(-3).reverse();
  recentProps.forEach((p, i) => { recentActivities.push({ id: `act-prop-${i}`, action: 'Property added', entityName: p.name || p.tagNumber || 'Property', entityId: p.id, userName: 'System', actionDate: new Date(now.getTime() - i * 3600000).toISOString(), timeAgo: `${i + 1} hour${i > 0 ? 's' : ''} ago`, icon: 'bi bi-building-add', color: '#3b82f6' }); });
  const recentReqs = (Array.isArray(serviceRequests) ? serviceRequests : []).slice(-3).reverse();
  recentReqs.forEach((r, i) => { recentActivities.push({ id: `act-req-${i}`, action: `${r.status || 'Unknown'}`, entityName: r.purpose || r.id || 'Service request', entityId: r.id, userName: r.requesterName || 'User', actionDate: new Date(now.getTime() - i * 7200000).toISOString(), timeAgo: `${i + 2} hours ago`, icon: 'bi bi-check-circle', color: '#10b981' }); });
  const lowStockAlerts = lowStockItems.map((i, idx) => ({ itemId: i.itemId || i.id, itemName: i.itemName || i.name || 'Item', sku: i.sku || '—', currentStock: Number(i.currentStock) || 0, minStockLevel: Number(i.minimumThreshold) || 0, deficit: Math.max(0, (Number(i.minimumThreshold) || 0) - (Number(i.currentStock) || 0)), location: i.warehouseName || i.shelfLocation || '—', severity: (Number(i.currentStock) || 0) <= 0 ? 'Critical' : (Number(i.currentStock) || 0) <= (Number(i.minimumThreshold) || 0) * 0.5 ? 'Warning' : 'Attention' }));
  const totalStockValue = invData.reduce((s, i) => s + ((Number(i.currentStock) || 0) * 15), 0);
  res.status(200).json({
    success: true, message: 'Dashboard statistics loaded successfully.', statusCode: 200,
    data: {
      totalProperties, totalLocations, totalSafetyBoxes, totalItems: invData.length,
      totalSuppliers, totalEmployees, pendingRequisitions, approvedRequisitions,
      issuedRequisitions, completedRequisitions, rejectedRequisitions,
      pendingInspections: (Array.isArray(inspections) ? inspections : []).filter((i) => (i.status || '').toLowerCase() !== 'completed').length, approvedReceiving: (Array.isArray(inspections) ? inspections : []).filter((i) => i.isPassed === true).length, rejectedReceiving: (Array.isArray(inspections) ? inspections : []).filter((i) => i.isPassed === false).length,
      totalStockValue, lowStockItemsCount: lowStockItems.length,
      outOfStockItemsCount: invData.filter((i) => (Number(i.currentStock) || 0) <= 0).length,
      totalPropertyValue, propertiesByLocation: totalLocations, propertiesByType: catMap.size,
      requisitionsByStatus: [
        { label: 'Pending', value: pendingRequisitions, color: '#f59e0b' },
        { label: 'Approved', value: approvedRequisitions, color: '#10b981' },
        { label: 'Rejected', value: rejectedRequisitions, color: '#ef4444' },
        { label: 'Completed', value: completedRequisitions, color: '#3b82f6' },
      ],
      propertiesByLocationChart: categoryBreakdown.slice(0, 6),
      stockMovementsByMonth, receivingByStatus: [],
      dailyCreatedProperties: categoryBreakdown.slice(0, 5).map(c => ({ label: c.label, value: Math.round(c.value / 3), color: c.color })),
      monthlyTrend, categoryBreakdown, departmentActivity, recentActivities, lowStockAlerts,
      pendingTasks: [], quickActions: [],
    },
  });
});

// ─── Disposal Records API ─────────────────────────────────────────────
app.get('/api/DisposalRecords', async (req, res) => {
  const data = await readDataFile('disposals.json');
  const pageNumber = Number(req.query.pageNumber) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const totalCount = data.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const sorted = [...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ success: true, message: '', data: { items: sorted, pageNumber, totalPages, totalCount, hasPreviousPage: pageNumber > 1, hasNextPage: pageNumber < totalPages }, statusCode: 200 });
});
app.get('/api/DisposalRecords/:id', async (req, res) => {
  const data = await readDataFile('disposals.json');
  const item = data.find((x) => String(x.id) === String(req.params.id));
  if (!item) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  res.json({ success: true, message: '', data: item, statusCode: 200 });
});
app.post('/api/DisposalRecords', async (req, res) => {
  const data = await readDataFile('disposals.json');
  const id = `disp-${Date.now()}`;
  const disposalNumber = `DSP-${Date.now()}`;
  const item = {
    id, disposalNumber,
    status: 'Pending',
    createdAt: new Date().toISOString(),
    createdBy: req.body.createdBy || 'storekeeper',
    reason: req.body.reason || '',
    items: (req.body.items || []).map((i) => ({
      itemId: i.itemId,
      itemName: i.itemName || '',
      sku: i.sku || '',
      quantity: Number(i.quantity) || 0,
      unitCost: Number(i.unitCost) || 0,
      totalValue: (Number(i.quantity) || 0) * (Number(i.unitCost) || 0),
      reason: i.reason || '',
    })),
    totalItems: (req.body.items || []).length,
    totalQuantity: (req.body.items || []).reduce((s, i) => s + (Number(i.quantity) || 0), 0),
    totalValue: (req.body.items || []).reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitCost) || 0), 0),
    auditHistory: [{ date: new Date().toISOString(), action: 'Created', performedBy: req.body.createdBy || 'storekeeper', remarks: 'Disposal initiated' }],
  };
  data.push(item);
  await writeDataFile('disposals.json', data);
  // Create notification for admin
  const notifs = await readDataFile('notifications.json');
  notifs.push({
    id: `notif-${Date.now()}`,
    type: 'disposal_created',
    title: 'New Disposal Request',
    message: `Disposal ${disposalNumber} created with ${item.totalQuantity} items - ${item.reason || 'No reason provided'}`,
    targetRole: 'admin',
    relatedEntityId: id,
    relatedEntityType: 'DisposalRecord',
    isRead: false,
    createdAt: new Date().toISOString(),
  });
  await writeDataFile('notifications.json', notifs);
  res.status(201).json({ success: true, message: 'Disposal created', data: id, statusCode: 201 });
});
app.post('/api/DisposalRecords/:id/approve', async (req, res) => {
  const data = await readDataFile('disposals.json');
  const idx = data.findIndex((x) => String(x.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  data[idx].status = req.body.isApproved ? 'Completed' : 'Rejected';
  data[idx].approvedDate = new Date().toISOString();
  data[idx].approvedBy = req.body.approvedBy || 'admin';
  data[idx].approvalRemarks = req.body.remarks || '';
  data[idx].auditHistory = data[idx].auditHistory || [];
  data[idx].auditHistory.push({ date: new Date().toISOString(), action: data[idx].status, performedBy: req.body.approvedBy || 'admin', remarks: req.body.remarks || '' });
  // If approved, deduct from inventory
  if (req.body.isApproved && data[idx].items) {
    const invData = await readDataFile('inventory.json');
    const inv = invData.inventory || invData;
    for (const disposalItem of data[idx].items) {
      const invIdx = inv.findIndex((x) => x.id === disposalItem.itemId || x.itemId === disposalItem.itemId || x.sku === disposalItem.sku);
      if (invIdx !== -1) {
        inv[invIdx].currentStock = Math.max(0, (Number(inv[invIdx].currentStock) || 0) - disposalItem.quantity);
        inv[invIdx].availableStock = Math.max(0, (Number(inv[invIdx].availableStock) || 0) - disposalItem.quantity);
        inv[invIdx].lastUpdated = new Date().toISOString();
      }
    }
    invData.inventory = Array.isArray(inv) ? inv : invData.inventory;
    await writeDataFile('inventory.json', invData);
    // Write disposal ledger entry
    const ledger = await readDataFile('stock-ledger.json');
    for (const disposalItem of data[idx].items) {
      ledger.push({
        id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        itemId: disposalItem.itemId,
        itemName: disposalItem.itemName,
        sku: disposalItem.sku,
        movementType: 'disposal',
        quantity: disposalItem.quantity,
        previousStock: inv._tempPrev?.[disposalItem.itemId] ?? 0,
        newStock: Math.max(0, 0),
        referenceType: 'disposal',
        referenceNumber: data[idx].disposalNumber,
        movementDate: new Date().toISOString(),
        performedBy: req.body.approvedBy || 'admin',
        notes: data[idx].reason || 'Disposed',
      });
    }
    await writeDataFile('stock-ledger.json', ledger);
  }
  // Notify compliance
  const notifs = await readDataFile('notifications.json');
  notifs.push({
    id: `notif-${Date.now()}`,
    type: 'disposal_completed',
    title: `Disposal ${data[idx].status}`,
    message: `Disposal ${data[idx].disposalNumber} has been ${data[idx].status.toLowerCase()} by ${req.body.approvedBy || 'admin'}${req.body.remarks ? ': ' + req.body.remarks : ''}`,
    targetRole: 'compliance-officer',
    relatedEntityId: data[idx].id,
    relatedEntityType: 'DisposalRecord',
    isRead: false,
    createdAt: new Date().toISOString(),
  });
  await writeDataFile('notifications.json', notifs);
  await writeDataFile('disposals.json', data);
  res.json({ success: true, message: data[idx].status, data: data[idx], statusCode: 200 });
});

// ─── Notifications API (in-memory for disposal flow) ───────────────────
app.get('/api/Notifications', async (req, res) => {
  const data = await readDataFile('notifications.json');
  const role = req.query.role || req.query.targetRole || '';
  const filtered = role ? data.filter((n) => n.targetRole === role || !n.targetRole) : data;
  const sorted = filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ success: true, message: '', data: sorted, statusCode: 200 });
});
app.get('/api/Notifications/unread-count', async (req, res) => {
  const data = await readDataFile('notifications.json');
  const role = req.query.role || req.query.targetRole || '';
  const filtered = role ? data.filter((n) => n.targetRole === role || !n.targetRole) : data;
  const count = filtered.filter((n) => !n.isRead).length;
  res.json({ success: true, message: '', data: count, statusCode: 200 });
});
app.post('/api/Notifications/:id/read', async (req, res) => {
  const data = await readDataFile('notifications.json');
  const notif = data.find((n) => String(n.id) === String(req.params.id));
  if (notif) notif.isRead = true;
  await writeDataFile('notifications.json', data);
  res.json({ success: true, message: 'Marked as read', statusCode: 200 });
});
app.post('/api/Notifications/read-all', async (req, res) => {
  const data = await readDataFile('notifications.json');
  data.forEach((n) => { n.isRead = true; });
  await writeDataFile('notifications.json', data);
  res.json({ success: true, message: 'All marked as read', statusCode: 200 });
});
app.delete('/api/Notifications/:id', async (req, res) => {
  const data = await readDataFile('notifications.json');
  const idx = data.findIndex((n) => String(n.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  data.splice(idx, 1);
  await writeDataFile('notifications.json', data);
  res.json({ success: true, message: 'Deleted', statusCode: 200 });
});

// ─── Disposal Reports API ─────────────────────────────────────────────
app.get('/api/DisposalReports', async (req, res) => {
  const data = await readDataFile('disposals.json');
  const completed = data.filter((d) => d.status === 'Completed');
  const pending = data.filter((d) => d.status === 'Pending');
  const rejected = data.filter((d) => d.status === 'Rejected');
  const totalValue = completed.reduce((s, d) => s + (Number(d.totalValue) || 0), 0);
  const byReason = {};
  data.forEach((d) => {
    const r = d.reason || 'Not specified';
    if (!byReason[r]) byReason[r] = { reason: r, count: 0, totalQuantity: 0, totalValue: 0 };
    byReason[r].count++;
    byReason[r].totalQuantity += d.totalQuantity || 0;
    byReason[r].totalValue += d.totalValue || 0;
  });
  const byMonth = {};
  data.forEach((d) => {
    const m = d.createdAt ? d.createdAt.slice(0, 7) : 'unknown';
    if (!byMonth[m]) byMonth[m] = { month: m, count: 0, totalQuantity: 0, totalValue: 0 };
    byMonth[m].count++;
    byMonth[m].totalQuantity += d.totalQuantity || 0;
    byMonth[m].totalValue += d.totalValue || 0;
  });
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const byMonthArr = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)).map((m) => ({
    label: months[parseInt(m.month.slice(5, 7), 10) - 1] || m.month,
    month: m.month,
    value: m.count,
    totalQuantity: m.totalQuantity,
    totalValue: m.totalValue,
  }));
  res.json({
    success: true, message: '', statusCode: 200,
    data: {
      summary: {
        totalDisposals: data.length,
        totalItems: data.reduce((s, d) => s + (d.totalQuantity || 0), 0),
        totalQuantity: data.reduce((s, d) => s + (d.totalQuantity || 0), 0),
        totalEstimatedValue: totalValue,
        averageValuePerItem: data.length ? totalValue / data.length : 0,
        pendingApprovals: pending.length,
        approvedDisposals: completed.length,
        rejectedDisposals: rejected.length,
      },
      byReason: Object.values(byReason),
      byMethod: [],
      byMonth: byMonthArr,
      disposals: data.reverse().slice(0, 50),
    },
  });
});

// ─── Auth & Landing (from original mock-backend) ────────────────────
app.post('/api/Auth/login', (req, res) => {
  const { username, password } = req.body;
  console.log('📤 [Mock Backend] Login attempt:', { username, passwordLength: password?.length });
  if (username && password && password.length >= 8) {
    let role = 'employee';
    if (username.toLowerCase().includes('admin')) role = 'admin';
    else if (username.toLowerCase().includes('store') || username.toLowerCase().includes('keeper')) role = 'storekeeper';
    else if (username.toLowerCase().includes('manager')) role = 'manager';
    else if (username.toLowerCase().includes('compliance') || username.toLowerCase().includes('auditor')) role = 'compliance-officer';
    const mockUser = { id: 'user-' + Date.now(), username, fullName: username.charAt(0).toUpperCase() + username.slice(1), email: `${username}@afrocom.com`, roles: [role], permissions: [], isActive: true };
    const mockToken = 'mock-jwt-token-' + Date.now();
    console.log('✅ [Mock Backend] Login successful for role:', role);
    res.status(200).json({ success: true, succeeded: true, message: 'Login successful', data: { token: mockToken, refreshToken: 'mock-refresh-token', expiresAt: new Date(Date.now() + 3600000).toISOString(), user: mockUser } });
  } else {
    console.log('❌ [Mock Backend] Login failed');
    res.status(401).json({ success: false, succeeded: false, message: 'Invalid username or password', errors: ['Invalid username or password'] });
  }
});

app.post('/api/landing/contact', (req, res) => {
  const { name, email, message } = req.body || {};
  if (!email || !message || String(message).trim().length < 10) {
    return res.status(400).json({ success: false, message: 'Invalid request.', data: null });
  }
  const id = `contact-${Date.now()}`;
  return res.status(200).json({ success: true, message: 'Thanks — we received your message.', data: { id } });
});

// ─── Forward unknown /api/* requests to .NET backend ────────────────
app.use('/api', async (req, res) => {
  if (res.headersSent) return;
  const backendUrl = `${DOTNET_BACKEND}${req.originalUrl}`;
  console.log(`[Mock Backend] Forwarding to .NET: ${req.method} ${req.originalUrl}`);
  try {
    const fetchOpts = {
      method: req.method,
      headers: { 'Content-Type': 'application/json', ...Object.fromEntries(Object.entries(req.headers).filter(([k]) => !['host', 'connection', 'content-length'].includes(k))) },
    };
    if (req.method !== 'GET' && req.method !== 'HEAD' && Object.keys(req.body || {}).length > 0) {
      fetchOpts.body = JSON.stringify(req.body);
    }
    const response = await fetch(backendUrl, fetchOpts);
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    res.status(response.status).json(data || { success: false, message: 'Empty response', statusCode: response.status });
  } catch (err) {
    console.error(`[Mock Backend] .NET forward failed for ${req.originalUrl}:`, err.message);
    res.status(502).json({ success: false, message: `Backend unavailable: ${err.message}`, statusCode: 502 });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Mock Backend running on http://localhost:${PORT}`);
  console.log(`📡 Serving CRUD + Dashboard from data/*.json files`);
  console.log(`🔄 Unknown /api/* routes forwarded to .NET at ${DOTNET_BACKEND}\n`);
});
