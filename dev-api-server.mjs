import express from 'express';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';

const app = express();
app.use(express.json());
// simple request logger for debugging
app.use((req, res, next) => {
  try {
    console.log(new Date().toISOString(), req.method, req.path, JSON.stringify(req.body || {}));
  } catch (e) {
    console.log(new Date().toISOString(), req.method, req.path);
  }
  next();
});
const dataFolder = resolve(process.cwd(), 'data');
const inventoryFile = resolve(dataFolder, 'inventory.json');

async function ensureDataFile() {
  try {
    if (!existsSync(dataFolder)) {
      await fs.mkdir(dataFolder, { recursive: true });
    }
    if (!existsSync(inventoryFile)) {
      const seed = { inventory: [], ledger: [] };
      await fs.writeFile(inventoryFile, JSON.stringify(seed, null, 2), 'utf8');
    }
  } catch (err) {
    console.error('Failed to ensure data file', err);
  }
}

async function readInventoryData() {
  try {
    await ensureDataFile();
    const raw = await fs.readFile(inventoryFile, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('readInventoryData error', err);
    return { inventory: [], ledger: [], itemMasters: [] };
  }
}

async function writeInventoryData(data) {
  try {
    await ensureDataFile();
    await fs.writeFile(inventoryFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('writeInventoryData error', err);
  }
}

app.get('/api/InventoryStock', async (req, res) => {
  const d = await readInventoryData();
  res.json({ success: true, message: '', data: d.inventory, statusCode: 200 });
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

// ItemMasters endpoints (used by ItemMasterService)
app.get('/api/ItemMasters', async (req, res) => {
  const d = await readInventoryData();
  const items = d.itemMasters || [];
  // return paginated envelope compatible with normalizeApiResponseModel
  res.json({ success: true, message: '', data: { items, pageNumber: 1, totalPages: 1, totalCount: items.length, hasPreviousPage: false, hasNextPage: false }, statusCode: 200 });
});

app.post('/api/ItemMasters', async (req, res) => {
  const d = await readInventoryData();
  d.itemMasters = d.itemMasters || [];
  const payload = req.body || {};
  const id = payload.id || `itm-${Date.now()}`;
  const item = { id, itemName: payload.itemName || payload.sku || '', sku: payload.sku || '', description: payload.description || '', categoryName: payload.categoryName || '', unitOfMeasure: payload.unitOfMeasure || 'PCS', currentStock: payload.stockQuantity || 0, reservedStock: 0, availableStock: payload.stockQuantity || 0, minStockLevel: payload.minStockLevel || 0, requiresInspection: false, isLowStock: false, stockQuantity: payload.stockQuantity || 0, isActive: payload.isActive ?? true };
  d.itemMasters.push(item);
  // also create inventory record
  d.inventory = d.inventory || [];
  const inv = { id: `inv-${Date.now()}`, itemId: id, itemName: item.itemName, sku: item.sku, shelfId: payload.shelfId || '', shelfLocation: payload.shelfLocation || '', warehouseId: payload.warehouseId || '', warehouseName: payload.warehouseName || '', currentStock: item.currentStock || 0, reservedStock: 0, availableStock: item.currentStock || 0, unitOfMeasure: item.unitOfMeasure || 'Units', lastUpdated: new Date().toISOString(), minimumThreshold: item.minStockLevel || 0, maximumThreshold: 0 };
  d.inventory.push(inv);
  await writeInventoryData(d);
  res.json({ success: true, message: 'Created', data: id, statusCode: 201 });
});

app.put('/api/ItemMasters/:id', async (req, res) => {
  const id = req.params.id;
  const d = await readInventoryData();
  d.itemMasters = d.itemMasters || [];
  const idx = d.itemMasters.findIndex(x => String(x.id) === String(id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  d.itemMasters[idx] = { ...d.itemMasters[idx], ...req.body };
  await writeInventoryData(d);
  res.json({ success: true, message: 'Updated', data: d.itemMasters[idx], statusCode: 200 });
});

app.delete('/api/ItemMasters/:id', async (req, res) => {
  const id = req.params.id;
  const d = await readInventoryData();
  d.itemMasters = d.itemMasters || [];
  const idx = d.itemMasters.findIndex(x => String(x.id) === String(id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  const removed = d.itemMasters.splice(idx,1)[0];
  await writeInventoryData(d);
  res.json({ success: true, message: 'Deleted', data: removed, statusCode: 200 });
});

app.put('/api/InventoryStock/:id', async (req, res) => {
  const id = req.params.id;
  const d = await readInventoryData();
  const idx = d.inventory.findIndex((x) => String(x.id) === String(id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  d.inventory[idx] = { ...d.inventory[idx], ...req.body };
  await writeInventoryData(d);
  res.json({ success: true, message: 'Updated', data: d.inventory[idx], statusCode: 200 });
});

app.put('/api/inventory/stock/:id', async (req, res) => {
  const id = req.params.id;
  const d = await readInventoryData();
  const idx = d.inventory.findIndex((x) => String(x.id) === String(id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  d.inventory[idx] = { ...d.inventory[idx], ...req.body };
  await writeInventoryData(d);
  res.json({ success: true, message: 'Updated', data: d.inventory[idx], statusCode: 200 });
});

app.delete('/api/InventoryStock/:id', async (req, res) => {
  const id = req.params.id;
  const d = await readInventoryData();
  const idx = d.inventory.findIndex((x) => String(x.id) === String(id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  const removed = d.inventory.splice(idx, 1)[0];
  await writeInventoryData(d);
  res.json({ success: true, message: 'Deleted', data: removed, statusCode: 200 });
});

app.delete('/api/inventory/stock/:id', async (req, res) => {
  const id = req.params.id;
  const d = await readInventoryData();
  const idx = d.inventory.findIndex((x) => String(x.id) === String(id));
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

  const ledgerEntry = {
    id: `mov-${Date.now()}`,
    itemId: item.id,
    itemName: item.itemName || item.name || item.itemName,
    sku: item.sku || item.code,
    movementType: adjustmentType,
    quantity: q,
    previousStock: undefined,
    newStock: item.currentStock,
    referenceNumber: null,
    referenceType: 'adjustment',
    movementDate: new Date().toISOString(),
    performedBy: 'system',
    notes: reason || null,
  };
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

  const ledgerEntry = {
    id: `mov-${Date.now()}`,
    itemId: item.id,
    itemName: item.itemName || item.name || item.itemName,
    sku: item.sku || item.code,
    movementType: adjustmentType,
    quantity: q,
    previousStock: undefined,
    newStock: item.currentStock,
    referenceNumber: null,
    referenceType: 'adjustment',
    movementDate: new Date().toISOString(),
    performedBy: 'system',
    notes: reason || null,
  };
  d.ledger.unshift(ledgerEntry);
  await writeInventoryData(d);
  res.json({ success: true, message: 'Adjusted', data: item, statusCode: 200 });
});

app.get('/api/StockLedger', async (req, res) => {
  const d = await readInventoryData();
  res.json({ success: true, message: '', data: d.ledger, statusCode: 200 });
});

const port = process.env.PORT || 5030;
app.listen(port, () => console.log(`Dev API server listening on http://localhost:${port}`));
