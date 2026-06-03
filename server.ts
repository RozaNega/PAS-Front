import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr/node';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import AppServerModule from './src/main.server';
import { existsSync } from 'node:fs';

const dashboardStatisticsResponse = {
  success: true,
  message: 'Dashboard statistics loaded successfully.',
  statusCode: 200,
  data: {
    platform: {
      badge: 'Operations Platform 2026',
      title: "AFRICOM'S TECHNOLOGIES",
      since: 'SINCE 2004',
      subtitle:
        'Coordinate assets, inventory, and requisitions from one command layer with policy-driven workflows and real-time visibility for every department.',
    },
    liveAttendees: {
      total: 14666,
      trendPercent: 12.5,
      trendDirection: 'up',
      comparisonLabel: 'vs last month',
      countdown: {
        days: 20,
        hours: 14,
        minutes: 6,
        seconds: 37,
        untilLabel: 'Until May 14th, 2026',
      },
    },
    highlights: [
      {
        value: '500+',
        label: 'Active Sites',
        note: 'Across all regions',
      },
      {
        value: '99.9%',
        label: 'Data Accuracy',
        note: 'Trusted and verified',
      },
      {
        value: '24/7',
        label: 'Operations Visibility',
        note: 'Real-time monitoring',
      },
    ],
  },
};

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');
  const workspaceAssetsFolder = resolve(process.cwd(), 'src', 'assets');
  const publicAssetsFolder = resolve(process.cwd(), 'public');

  const commonEngine = new CommonEngine();

  server.use(express.json());
  server.use(express.urlencoded({ extended: true }));

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // Example Express Rest API endpoints
  // server.get('/api/**', (req, res) => { });
  server.get('/api/Dashboard/statistics', (_req, res) => {
    res.status(200).json(dashboardStatisticsResponse);
  });

  // Lightweight in-project persistence for development: data/inventory.json
  const dataFolder = resolve(process.cwd(), 'data');
  const inventoryFile = resolve(dataFolder, 'inventory.json');

  async function ensureDataFile(): Promise<void> {
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

  async function readInventoryData(): Promise<{ inventory: any[]; ledger: any[]; itemMasters: any[] }> {
    try {
      await ensureDataFile();
      const raw = await fs.readFile(inventoryFile, 'utf8');
      const parsed = JSON.parse(raw);
      // ensure itemMasters present
      if (!parsed.itemMasters) parsed.itemMasters = [];
      return parsed;
    } catch (err) {
      console.error('readInventoryData error', err);
      return { inventory: [], ledger: [], itemMasters: [] };
    }
  }

  async function writeInventoryData(data: { inventory: any[]; ledger: any[]; itemMasters: any[] }) {
    try {
      await ensureDataFile();
      await fs.writeFile(inventoryFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('writeInventoryData error', err);
    }
  }

  // Inventory API
  server.get('/api/InventoryStock', async (req, res) => {
    const d = await readInventoryData();
    res.json({ success: true, message: '', data: d.inventory || [], statusCode: 200 });
  });

  server.get('/api/ItemMasters', async (req, res) => {
    const d = await readInventoryData();
    const items = d.itemMasters || [];
    res.json({ success: true, message: '', data: { items, pageNumber: 1, totalPages: 1, totalCount: items.length, hasPreviousPage: false, hasNextPage: false }, statusCode: 200 });
  });

  server.post('/api/ItemMasters', express.json(), async (req, res) => {
    const d = await readInventoryData();
    d.itemMasters = d.itemMasters || [];
    const payload = req.body || {};
    const id = payload.id || `itm-${Date.now()}`;
    const stockQty = Number(payload.stockQuantity) || 0;
    const item = { id, itemName: payload.itemName || payload.sku || 'Unnamed Item', sku: payload.sku || '', description: payload.description || '', categoryName: payload.categoryName || '', unitOfMeasure: payload.unitOfMeasure || 'PCS', currentStock: stockQty, reservedStock: 0, availableStock: stockQty, minStockLevel: payload.minStockLevel || 0, requiresInspection: false, isLowStock: false, isActive: payload.isActive ?? true };
    d.inventory = d.inventory || [];
    const inv = { id: `inv-${Date.now()}`, itemId: id, itemName: item.itemName, sku: item.sku, shelfId: payload.shelfId || '', shelfLocation: payload.shelfLocation || '', warehouseId: payload.warehouseId || '', warehouseName: payload.warehouseName || '', currentStock: item.currentStock, reservedStock: 0, availableStock: item.currentStock - 0, unitOfMeasure: item.unitOfMeasure, lastUpdated: new Date().toISOString(), minimumThreshold: item.minStockLevel || 0, maximumThreshold: 0 };
    d.inventory.push(inv);
    d.itemMasters.push(item);
    await writeInventoryData(d);
    res.status(201).json({ success: true, message: 'Created', data: id, statusCode: 201 });
  });

  server.put('/api/ItemMasters/:id', express.json(), async (req, res) => {
    const id = req.params.id;
    const d = await readInventoryData();
    d.itemMasters = d.itemMasters || [];
    const idx = d.itemMasters.findIndex((x) => String(x.id) === String(id));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
    const { id: _ignored, ...safeBody } = req.body || {};
    d.itemMasters[idx] = { ...d.itemMasters[idx], ...safeBody };
    await writeInventoryData(d);
    res.json({ success: true, message: 'Updated', data: d.itemMasters[idx], statusCode: 200 });
  });

  server.delete('/api/ItemMasters/:id', async (req, res) => {
    const id = req.params.id;
    const d = await readInventoryData();
    d.itemMasters = d.itemMasters || [];
    const idx = d.itemMasters.findIndex((x) => String(x.id) === String(id));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
    const removed = d.itemMasters.splice(idx, 1)[0];
    await writeInventoryData(d);
    res.json({ success: true, message: 'Deleted', data: removed, statusCode: 200 });
  });

  // legacy lowercase endpoints used by some frontend services
  server.get('/api/inventory/stock', async (req, res) => {
    const d = await readInventoryData();
    res.json({ success: true, message: '', data: d.inventory, statusCode: 200 });
  });

  server.post('/api/InventoryStock', express.json(), async (req, res) => {
    const d = await readInventoryData();
    const item = req.body || {};
    item.id = item.id || `inv-${Date.now()}`;
    d.inventory.push(item);
    await writeInventoryData(d);
    res.json({ success: true, message: 'Created', data: item, statusCode: 201 });
  });

  server.post('/api/inventory/stock', express.json(), async (req, res) => {
    const d = await readInventoryData();
    const item = req.body || {};
    item.id = item.id || `inv-${Date.now()}`;
    d.inventory.push(item);
    await writeInventoryData(d);
    res.json({ success: true, message: 'Created', data: item, statusCode: 201 });
  });

  server.put('/api/InventoryStock/:id', express.json(), async (req, res) => {
    const id = req.params.id;
    const d = await readInventoryData();
    const idx = d.inventory.findIndex((x) => String(x.id) === String(id));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
    d.inventory[idx] = { ...d.inventory[idx], ...req.body };
    await writeInventoryData(d);
    res.json({ success: true, message: 'Updated', data: d.inventory[idx], statusCode: 200 });
  });

  server.put('/api/inventory/stock/:id', express.json(), async (req, res) => {
    const id = req.params.id;
    const d = await readInventoryData();
    const idx = d.inventory.findIndex((x) => String(x.id) === String(id));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
    d.inventory[idx] = { ...d.inventory[idx], ...req.body };
    await writeInventoryData(d);
    res.json({ success: true, message: 'Updated', data: d.inventory[idx], statusCode: 200 });
  });

  server.delete('/api/InventoryStock/:id', async (req, res) => {
    const id = req.params.id;
    const d = await readInventoryData();
    const idx = d.inventory.findIndex((x) => String(x.id) === String(id));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
    const removed = d.inventory.splice(idx, 1)[0];
    await writeInventoryData(d);
    res.json({ success: true, message: 'Deleted', data: removed, statusCode: 200 });
  });

  server.delete('/api/inventory/stock/:id', async (req, res) => {
    const id = req.params.id;
    const d = await readInventoryData();
    const idx = d.inventory.findIndex((x) => String(x.id) === String(id));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
    const removed = d.inventory.splice(idx, 1)[0];
    await writeInventoryData(d);
    res.json({ success: true, message: 'Deleted', data: removed, statusCode: 200 });
  });

  // Adjust / reserve / release endpoints
  server.post('/api/InventoryStock/adjust', express.json(), async (req, res) => {
    const { itemId, shelfId, adjustmentType, quantity, reason } = req.body || {};
    const d = await readInventoryData();
    const idx = d.inventory.findIndex((x) => x.id === itemId || x.itemId === itemId || x.sku === itemId);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Item not found', statusCode: 404 });
    const item = d.inventory[idx];
    const q = Number(quantity) || 0;
    const prev = Number(item.currentStock) || 0;
    if (adjustmentType === 'increase') item.currentStock = prev + q;
    else if (adjustmentType === 'decrease') item.currentStock = Math.max(0, prev - q);
    else if (adjustmentType === 'set') item.currentStock = q;
    item.availableStock = item.currentStock - (Number(item.reservedStock) || 0);
    item.lastUpdated = new Date().toISOString();

    // Add ledger entry
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

  server.post('/api/inventory/stock/adjust', express.json(), async (req, res) => {
    const { itemId, shelfId, adjustmentType, quantity, reason } = req.body || {};
    const d = await readInventoryData();
    const idx = d.inventory.findIndex((x) => x.id === itemId || x.itemId === itemId || x.sku === itemId);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Item not found', statusCode: 404 });
    const item = d.inventory[idx];
    const q = Number(quantity) || 0;
    const prev2 = Number(item.currentStock) || 0;
    if (adjustmentType === 'increase') item.currentStock = prev2 + q;
    else if (adjustmentType === 'decrease') item.currentStock = Math.max(0, prev2 - q);
    else if (adjustmentType === 'set') item.currentStock = q;
    item.availableStock = item.currentStock - (Number(item.reservedStock) || 0);
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

  server.get('/api/StockLedger', async (req, res) => {
    const d = await readInventoryData();
    res.json({ success: true, message: '', data: d.ledger, statusCode: 200 });
  });

  server.post('/api/landing/contact', async (req, res) => {
    const name = String(req.body?.name ?? '').trim();
    const email = String(req.body?.email ?? '').trim();
    const message = String(req.body?.message ?? '').trim();

    if (!email || message.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request.',
        data: null,
      });
    }

    const id = randomUUID();
    const entry = {
      id,
      name,
      email,
      message,
      createdAt: new Date().toISOString(),
    };

    try {
      const outDir = resolve(process.cwd(), '.tmp');
      const outFile = resolve(outDir, 'contact-submissions.jsonl');
      await fs.mkdir(outDir, { recursive: true });
      await fs.appendFile(outFile, JSON.stringify(entry) + '\n', 'utf8');
    } catch (err) {
      console.error('Failed to persist contact submission', err);
    }

    return res.status(200).json({
      success: true,
      message: 'Thanks — we received your message.',
      data: { id },
    });
  });

  // Mock Auth/login endpoint for development
  server.post('/api/Auth/login', (req, res) => {
    const { username, password } = req.body;
    
    // Mock authentication - accept any username with minimum 8 character password
    if (username && password && password.length >= 8) {
      // Determine role based on username
      let role = 'employee';
      if (username.toLowerCase().includes('admin')) {
        role = 'admin';
      } else if (username.toLowerCase().includes('store') || username.toLowerCase().includes('keeper')) {
        role = 'storekeeper';
      } else if (username.toLowerCase().includes('manager')) {
        role = 'manager';
      } else if (username.toLowerCase().includes('compliance') || username.toLowerCase().includes('auditor')) {
        role = 'compliance-officer';
      }

      const mockUser = {
        id: 'user-' + Date.now(),
        username: username,
        fullName: username.charAt(0).toUpperCase() + username.slice(1),
        email: `${username}@afrocom.com`,
        roles: [role],
        permissions: [],
        isActive: true
      };

      const mockToken = 'mock-jwt-token-' + Date.now();
      
      res.status(200).json({
        success: true,
        succeeded: true,
        message: 'Login successful',
        data: {
          token: mockToken,
          refreshToken: 'mock-refresh-token',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          user: mockUser
        }
      });
    } else {
      res.status(401).json({
        success: false,
        succeeded: false,
        message: 'Invalid username or password',
        errors: ['Invalid username or password']
      });
    }
  });

  server.use(
    '/assets',
    express.static(workspaceAssetsFolder, {
      maxAge: '1y',
      index: false,
      redirect: false,
    }),
  );

  server.use(
    '/assets',
    express.static(publicAssetsFolder, {
      maxAge: '1y',
      index: false,
      redirect: false,
    }),
  );

  // Serve static files from /browser
  server.get(
    '*.*',
    express.static(browserDistFolder, {
      maxAge: '1y',
    }),
  );

  // All regular routes use the Angular engine
  server.get('*', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    commonEngine
      .render({
        bootstrap: AppServerModule,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
      })
      .then((html: string) => res.send(html))
      .catch((err: Error) => next(err));
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

run();
