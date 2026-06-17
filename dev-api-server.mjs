import express from 'express';
import fs from 'fs/promises';
import { existsSync, readFileSync, writeFileSync } from 'fs';
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

// ---------- Additional Auth Endpoints (dev mock) ----------

app.get('/api/Auth/me', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 'dev-user-001',
      email: 'dev@example.com',
      userName: 'DevUser',
      fullName: 'Dev User',
      roles: ['Admin'],
      twoFactorEnabled: true,
      emailConfirmed: true,
    },
    statusCode: 200,
  });
});

app.get('/api/Auth/confirm-email', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ success: false, message: 'Invalid or missing token.', statusCode: 400 });
  res.json({ success: true, message: 'Email confirmed successfully.', statusCode: 200 });
});

app.post('/api/Auth/enable-2fa', (req, res) => {
  const { method, contactInfo } = req.body || {};
  if (!method || !contactInfo) return res.status(400).json({ success: false, message: 'method and contactInfo are required.', statusCode: 400 });
  res.json({ success: true, message: '2FA enabled successfully.', statusCode: 200 });
});

app.post('/api/Auth/disable-2fa', (_req, res) => {
  res.json({ success: true, message: '2FA disabled successfully.', statusCode: 200 });
});

app.post('/api/Auth/resend-verification', (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ success: false, message: 'Email is required.', statusCode: 400 });
  res.json({ success: true, message: 'Verification email resent.', statusCode: 200 });
});

app.post('/api/Auth/send-phone-otp', (req, res) => {
  const { phoneNumber } = req.body || {};
  if (!phoneNumber) return res.status(400).json({ success: false, message: 'Phone number is required.', statusCode: 400 });
  res.json({ success: true, message: 'OTP sent to phone.', otp: '123456', statusCode: 200 });
});

app.post('/api/Auth/verify-phone-otp', (req, res) => {
  const { phoneNumber, otp } = req.body || {};
  if (!phoneNumber || !otp) return res.status(400).json({ success: false, message: 'Phone number and OTP are required.', statusCode: 400 });
  res.json({ success: true, message: 'Phone number verified successfully.', statusCode: 200 });
});

app.post('/api/Auth/logout', (_req, res) => {
  res.json({ success: true, message: 'Logged out successfully.', statusCode: 200 });
});

app.post('/api/Auth/refresh-token', (req, res) => {
  const { token } = req.body || {};
  res.json({
    success: true,
    message: 'Token refreshed.',
    data: { token: token || 'mock-refreshed-token', refreshToken: 'mock-refresh-token' },
    statusCode: 200,
  });
});

app.post('/api/Auth/change-password', (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Current and new password are required.', statusCode: 400 });
  if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.', statusCode: 400 });
  res.json({ success: true, message: 'Password changed successfully.', statusCode: 200 });
});

app.post('/api/Auth/upload-profile-photo', (req, res) => {
  res.json({ success: true, message: 'Profile photo uploaded.', data: { photoUrl: '/uploads/photo-' + Date.now() + '.jpg' }, statusCode: 200 });
});

app.put('/api/Auth/update-profile', (req, res) => {
  const { fullName, username, department, position, employeeCode, phoneNumber } = req.body || {};
  res.json({ success: true, message: 'Profile updated successfully.', statusCode: 200 });
});

// ---------- Pending Registration Endpoints ----------

const PENDING_FILE_DEV = resolve(dataFolder, 'pending-registrations.json');

function loadPendingDev() {
  try {
    if (!existsSync(PENDING_FILE_DEV)) return new Map();
    const raw = readFileSync(PENDING_FILE_DEV, 'utf8');
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Map();
    const map = new Map();
    for (const item of arr) map.set(item.id, item);
    return map;
  } catch {
    return new Map();
  }
}

function savePendingDev(map) {
  try {
    writeFileSync(PENDING_FILE_DEV, JSON.stringify(Array.from(map.values()), null, 2), 'utf8');
  } catch {}
}

const pendingRegistrationsDev = loadPendingDev();
const pendingIds = Array.from(pendingRegistrationsDev.keys());
let pendingDevIdCounter = pendingIds.reduce((max, id) => {
  const parts = id.split('-');
  const num = parseInt(parts[parts.length - 1], 10);
  return isNaN(num) ? max : Math.max(max, num);
}, 0);

app.post('/api/Auth/register-pending', async (req, res) => {
  try {
    const { username, fullName, email, password, roleName, department, employeeCode, phoneNumber } = req.body || {};
    if (!email || !password || !fullName || !roleName) {
      return res.status(400).json({ success: false, message: 'Missing required fields: email, password, fullName, roleName' });
    }
    pendingDevIdCounter++;
    const id = `pending-${Date.now()}-${pendingDevIdCounter}`;
    const record = {
      id, username: username || fullName.toLowerCase().replace(/\s+/g, '_'),
      fullName: fullName.trim(), email: email.trim().toLowerCase(),
      roleName: roleName.trim(), department: department || '',
      employeeCode: employeeCode || '', phoneNumber: phoneNumber || '',
      password, submittedAt: new Date().toISOString(),
    };
    pendingRegistrationsDev.set(id, record);
    savePendingDev(pendingRegistrationsDev);
    console.log('[DevAPI] Pending registration created for', email);
    res.json({ success: true, message: 'Registration submitted for admin approval.', data: { id } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/Auth/pending-registrations', async (req, res) => {
  try {
    const list = Array.from(pendingRegistrationsDev.values()).map(({ password, ...rest }) => rest);
    res.json({ success: true, data: list, statusCode: 200 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/Auth/pending-registrations/count', async (req, res) => {
  try {
    res.json({ success: true, data: pendingRegistrationsDev.size, statusCode: 200 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/Auth/pending-registrations/:id/approve', async (req, res) => {
  try {
    const record = pendingRegistrationsDev.get(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Pending registration not found.' });
    pendingRegistrationsDev.delete(req.params.id);
    savePendingDev(pendingRegistrationsDev);
    console.log('[DevAPI] Approved pending registration for', record.email);
    res.json({ success: true, message: `${record.fullName} approved as ${record.roleName}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/Auth/pending-registrations/:id/reject', async (req, res) => {
  try {
    const record = pendingRegistrationsDev.get(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Pending registration not found.' });
    pendingRegistrationsDev.delete(req.params.id);
    savePendingDev(pendingRegistrationsDev);
    console.log('[DevAPI] Rejected pending registration for', record.email);
    res.json({ success: true, message: `${record.fullName}'s registration rejected.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------- Users Endpoints ----------

const DEV_USERS = new Map();

app.get('/api/users/:id', (req, res) => {
  const user = DEV_USERS.get(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.', statusCode: 404 });
  res.json({ success: true, data: user, statusCode: 200 });
});

app.put('/api/users/:id', (req, res) => {
  const existing = DEV_USERS.get(req.params.id);
  const updated = { ...existing, ...req.body, id: req.params.id };
  DEV_USERS.set(req.params.id, updated);
  res.json({ success: true, message: 'Profile updated successfully.', statusCode: 200 });
});

// ---------- Swagger UI ----------

const OPENAPI_SPEC = {
  openapi: '3.0.3',
  info: { title: 'PAS API', version: '1.0.0', description: 'PAS Backend API' },
  servers: [{ url: '/', description: 'Local dev' }],
  components: {
    securitySchemes: {
      Bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    }
  },
  security: [{ Bearer: [] }],
  paths: {
    '/api/Auth/login': {
      post: { tags: ['Auth'], summary: 'Login to the system', security: [], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { username: { type: 'string' }, password: { type: 'string' } }, required: ['username', 'password'] } } } }, responses: { '200': { description: 'Login successful' }, '401': { description: 'Invalid credentials' } } }
    },
    '/api/Auth/register': {
      post: { tags: ['Auth'], summary: 'Register a new user', security: [], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { username: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' }, fullName: { type: 'string' }, roleName: { type: 'string' }, phone: { type: 'string' } }, required: ['username', 'email', 'password'] } } } }, responses: { '200': { description: 'Registration successful' } } }
    },
    '/api/Auth/logout': {
      post: { tags: ['Auth'], summary: 'Logout current user', responses: { '200': { description: 'Logged out' } } }
    },
    '/api/Auth/refresh-token': {
      post: { tags: ['Auth'], summary: 'Refresh JWT token', security: [], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' }, refreshToken: { type: 'string' } } } } } }, responses: { '200': { description: 'Token refreshed' } } }
    },
    '/api/Auth/change-password': {
      post: { tags: ['Auth'], summary: 'Change user password', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { currentPassword: { type: 'string' }, newPassword: { type: 'string' } }, required: ['currentPassword', 'newPassword'] } } } }, responses: { '200': { description: 'Password changed' } } }
    },
    '/api/Auth/forgot-password': {
      post: { tags: ['Auth'], summary: 'Send password reset email', security: [], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' } }, required: ['email'] } } } }, responses: { '200': { description: 'Reset email sent' } } }
    },
    '/api/Auth/reset-password': {
      post: { tags: ['Auth'], summary: 'Reset password using token', security: [], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, token: { type: 'string' }, password: { type: 'string' } }, required: ['email', 'token', 'password'] } } } }, responses: { '200': { description: 'Password reset' } } }
    },
    '/api/Auth/upload-profile-photo': {
      post: { tags: ['Auth'], summary: 'Upload profile photo', requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } }, required: ['file'] } } } }, responses: { '200': { description: 'Photo uploaded' } } }
    },
    '/api/Auth/update-profile': {
      put: { tags: ['Auth'], summary: 'Update current user profile', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { fullName: { type: 'string' }, name: { type: 'string' }, username: { type: 'string' }, department: { type: 'string' }, position: { type: 'string' }, employeeCode: { type: 'string' }, phoneNumber: { type: 'string' } } } } } }, responses: { '200': { description: 'Profile updated' } } }
    },
    '/api/Auth/me': {
      get: { tags: ['Auth'], summary: 'Get current user profile', responses: { '200': { description: 'User profile' } } }
    },
    '/api/Auth/confirm-email': {
      get: { tags: ['Auth'], summary: 'Confirm email address', security: [], parameters: [{ name: 'token', in: 'query', required: true, schema: { type: 'string' } }, { name: 'email', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Email confirmed' } } }
    },
    '/api/Auth/enable-2fa': {
      post: { tags: ['Auth'], summary: 'Enable 2FA', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { method: { type: 'string' }, contactInfo: { type: 'string' } }, required: ['method', 'contactInfo'] } } } }, responses: { '200': { description: '2FA enabled' } } }
    },
    '/api/Auth/disable-2fa': {
      post: { tags: ['Auth'], summary: 'Disable 2FA', responses: { '200': { description: '2FA disabled' } } }
    },
    '/api/Auth/resend-verification': {
      post: { tags: ['Auth'], summary: 'Resend email confirmation', security: [], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' } }, required: ['email'] } } } }, responses: { '200': { description: 'Verification resent' } } }
    },
    '/api/Auth/send-phone-otp': {
      post: { tags: ['Auth'], summary: 'Send OTP to phone number', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { phoneNumber: { type: 'string' } }, required: ['phoneNumber'] } } } }, responses: { '200': { description: 'OTP sent' } } }
    },
    '/api/Auth/verify-phone-otp': {
      post: { tags: ['Auth'], summary: 'Verify phone OTP code', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { phoneNumber: { type: 'string' }, otp: { type: 'string' } }, required: ['phoneNumber', 'otp'] } } } }, responses: { '200': { description: 'Phone verified' } } }
    },
    '/api/Auth/register-pending': {
      post: { tags: ['Auth'], summary: 'Register pending user', security: [], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'Pending registration created' } } }
    },
    '/api/Auth/pending-registrations': {
      get: { tags: ['Auth'], summary: 'List pending registrations', responses: { '200': { description: 'Pending list' } } }
    },
    '/api/Auth/pending-registrations/count': {
      get: { tags: ['Auth'], summary: 'Pending registrations count', responses: { '200': { description: 'Count' } } }
    },
    '/api/Auth/pending-registrations/{id}/approve': {
      post: { tags: ['Auth'], summary: 'Approve pending registration', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Approved' } } }
    },
    '/api/Auth/pending-registrations/{id}/reject': {
      post: { tags: ['Auth'], summary: 'Reject pending registration', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Rejected' } } }
    },
    '/api/users/{id}': {
      get: { tags: ['Users'], summary: 'Get user by ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'User data' } } },
      put: { tags: ['Users'], summary: 'Update user profile', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { fullName: { type: 'string' }, name: { type: 'string' }, username: { type: 'string' }, department: { type: 'string' }, position: { type: 'string' }, employeeCode: { type: 'string' } } } } } }, responses: { '200': { description: 'Profile updated' } } }
    }
  }
};

app.get('/api-docs', (_req, res) => {
  res.json(OPENAPI_SPEC);
});

app.get('/swagger', (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>PAS API - Swagger</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({ url: '/api-docs', dom_id: '#swagger-ui' });
  </script>
</body>
</html>`);
});

// Debug: log unmatched routes
app.use((req, res) => {
  console.log('*** UNMATCHED ***', req.method, req.originalUrl);
  res.status(404).json({ success: false, message: `No handler for ${req.method} ${req.originalUrl}` });
});

const port = process.env.PORT || 5028;
app.listen(port, () => {
  console.log(`Dev API server listening on http://localhost:${port}`);
  console.log(`Swagger UI: http://localhost:${port}/swagger`);
  console.log('Auth Endpoints:');
  console.log('  POST /api/Auth/login                - Login');
  console.log('  POST /api/Auth/register              - Register new user');
  console.log('  POST /api/Auth/logout                - Logout');
  console.log('  POST /api/Auth/refresh-token         - Refresh JWT token');
  console.log('  POST /api/Auth/change-password       - Change password');
  console.log('  POST /api/Auth/forgot-password       - Send reset email');
  console.log('  POST /api/Auth/reset-password        - Reset password');
  console.log('  POST /api/Auth/resend-verification   - Resend email confirmation');
  console.log('  GET  /api/Auth/me                    - Get current user profile');
  console.log('  GET  /api/Auth/confirm-email         - Confirm email');
  console.log('  POST /api/Auth/enable-2fa            - Enable 2FA');
  console.log('  POST /api/Auth/disable-2fa           - Disable 2FA');
  console.log('  POST /api/Auth/send-phone-otp        - Send OTP');
  console.log('  POST /api/Auth/verify-phone-otp      - Verify OTP');
  console.log('  POST /api/Auth/upload-profile-photo  - Upload profile photo');
  console.log('  PUT  /api/Auth/update-profile        - Update current user profile');
  console.log('  POST /api/Auth/register-pending      - Register pending user');
  console.log('  GET  /api/Auth/pending-registrations - List pending registrations');
  console.log('  GET  /api/Auth/pending-registrations/count - Pending count');
  console.log('  POST /api/Auth/pending-registrations/:id/approve - Approve pending');
  console.log('  POST /api/Auth/pending-registrations/:id/reject  - Reject pending');
});
