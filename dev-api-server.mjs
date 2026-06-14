import express from 'express';
import fs from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import nodemailer from 'nodemailer';

const app = express();
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
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

// ---------- Email + Auth endpoints ----------

const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

let transporter = null;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { rejectUnauthorized: false },
  });
  transporter.verify()
    .then(() => console.log('SMTP verified for', process.env.SMTP_USER))
    .catch((err) => console.error('SMTP verify failed:', err.message));
}

async function sendEmail({ to, subject, body }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@afrocom.com';
  if (transporter) {
    const info = await transporter.sendMail({ from, to, subject, text: body });
    console.log('Email sent to', to, '- ID:', info.messageId);
    return info;
  }
  console.log('--- EMAIL (logged, no SMTP) ---');
  console.log('To:', to, 'Subject:', subject);
  console.log('Body:', body);
  console.log('--- END ---');
  return { messageId: 'console-' + Date.now() };
}

app.post('/api/Notifications/send-email', async (req, res) => {
  try {
    const { to, subject, body } = req.body || {};
    if (!to || !subject || !body) return res.status(400).json({ success: false, message: 'Missing to, subject, body' });
    const info = await sendEmail({ to, subject, body });
    res.json({ success: true, message: 'Email sent', data: { messageId: info.messageId } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/Notifications', async (req, res) => {
  try {
    const { to, subject, body } = req.body || {};
    if (!to || !subject || !body) return res.status(400).json({ success: false, message: 'Missing to, subject, body' });
    const info = await sendEmail({ to, subject, body });
    res.json({ success: true, message: 'Notification sent', data: { messageId: info.messageId } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/Notifications', async (req, res) => {
  res.json({ success: true, data: [], statusCode: 200 });
});

app.post('/api/Auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });
    const resetLink = `http://localhost:4200/reset-password?token=mock-${Date.now()}&email=${encodeURIComponent(email)}`;
    await sendEmail({ to: email, subject: 'Password Reset Request', body: `Click: ${resetLink}` });
    res.json({ success: true, message: 'Reset link sent', data: { token: 'mock-' + Date.now() } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/Auth/reset-password', async (req, res) => {
  res.json({ success: true, message: 'Password reset successful' });
});

app.post('/api/Auth/login', async (req, res) => {
  res.json({ success: true, message: 'Mock login' });
});

// Debug: log unmatched routes
app.use((req, res) => {
  console.log('*** UNMATCHED ***', req.method, req.originalUrl);
  console.log('Registered routes: POST /api/Notifications/send-email');
  res.status(404).json({ success: false, message: `No handler for ${req.method} ${req.originalUrl}` });
});

const port = process.env.PORT || 5028;
app.listen(port, () => console.log(`Dev API server listening on http://localhost:${port}`));
