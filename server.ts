import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr/node';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import AppServerModule from './src/main.server';
import { existsSync } from 'node:fs';

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

  // ─── Generic data file helpers ──────────────────────────────────────────
  async function readDataFile(filename: string, defaults: any = []): Promise<any> {
    const f = resolve(dataFolder, filename);
    try {
      if (!existsSync(f)) {
        await fs.writeFile(f, JSON.stringify(Array.isArray(defaults) ? [] : defaults, null, 2), 'utf8');
        return defaults;
      }
      const raw = await fs.readFile(f, 'utf8');
      return JSON.parse(raw);
    } catch { return defaults; }
  }

  async function writeDataFile(filename: string, data: any): Promise<void> {
    const f = resolve(dataFolder, filename);
    try {
      if (!existsSync(dataFolder)) await fs.mkdir(dataFolder, { recursive: true });
      await fs.writeFile(f, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) { console.error(`writeDataFile(${filename}) error`, err); }
  }

  // ─── Generic CRUD helpers ──────────────────────────────────────────────
  function crudList(server: express.Express, basePath: string, filename: string, idField: string = 'id') {
    server.get(`/api/${basePath}`, async (_req, res) => {
      const data = await readDataFile(filename);
      res.json({ success: true, message: '', data, statusCode: 200 });
    });
    server.get(`/api/${basePath}/:id`, async (req, res) => {
      const data = await readDataFile(filename);
      const item = data.find((x: any) => String(x[idField]) === String(req.params.id));
      if (!item) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
      res.json({ success: true, message: '', data: item, statusCode: 200 });
    });
    server.post(`/api/${basePath}`, express.json(), async (req, res) => {
      const data = await readDataFile(filename);
      const item = { id: `item-${Date.now()}`, ...req.body };
      data.push(item);
      await writeDataFile(filename, data);
      res.status(201).json({ success: true, message: 'Created', data: item.id, statusCode: 201 });
    });
    server.put(`/api/${basePath}/:id`, express.json(), async (req, res) => {
      const data = await readDataFile(filename);
      const idx = data.findIndex((x: any) => String(x[idField]) === String(req.params.id));
      if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
      const { [idField]: _, ...safe } = req.body;
      data[idx] = { ...data[idx], ...safe };
      await writeDataFile(filename, data);
      res.json({ success: true, message: 'Updated', data: data[idx], statusCode: 200 });
    });
    server.delete(`/api/${basePath}/:id`, async (req, res) => {
      const data = await readDataFile(filename);
      const idx = data.findIndex((x: any) => String(x[idField]) === String(req.params.id));
      if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
      const removed = data.splice(idx, 1)[0];
      await writeDataFile(filename, data);
      res.json({ success: true, message: 'Deleted', data: removed, statusCode: 200 });
    });
  }

  server.get('/api/Dashboard/statistics', async (_req, res) => {
    const properties = await readDataFile('properties.json');
    const users = await readDataFile('users.json');
    const employees = await readDataFile('employees.json');
    const inventory = await readDataFile('inventory.json');
    const serviceRequests = await readDataFile('service-requests.json');
    const inspections = await readDataFile('inspections.json');
    const invData = Array.isArray(inventory) ? inventory : (inventory?.inventory || []);
    const totalPropertyValue = properties.reduce((s: number, p: any) => s + (Number(p.currentValue) || Number(p.value) || 0), 0);
    const totalProperties = properties.length;
    const totalLocations = new Set(properties.map((p: any) => p.locationId || p.location)).size;
    const totalEmployees = employees.length;
    const pendingRequisitions = (Array.isArray(serviceRequests) ? serviceRequests : []).filter((r: any) => (r.status || '').toLowerCase() === 'pending').length;
    const approvedRequisitions = (Array.isArray(serviceRequests) ? serviceRequests : []).filter((r: any) => (r.status || '').toLowerCase() === 'approved').length;
    const rejectedRequisitions = (Array.isArray(serviceRequests) ? serviceRequests : []).filter((r: any) => (r.status || '').toLowerCase() === 'rejected').length;
    const issuedRequisitions = (Array.isArray(serviceRequests) ? serviceRequests : []).filter((r: any) => (r.status || '').toLowerCase() === 'issued').length;
    const completedRequisitions = (Array.isArray(serviceRequests) ? serviceRequests : []).filter((r: any) => (r.status || '').toLowerCase() === 'completed').length;
    const lowStockItems = invData.filter((i: any) => { const min = Number(i.minimumThreshold) || 0; return min > 0 && (Number(i.currentStock) || 0) <= min; });
    const totalSafetyBoxes = properties.filter((p: any) => (p.propertyTypeId || '').toLowerCase().includes('safety') || (p.propertyCategoryId || '').toLowerCase().includes('safety')).length;
    const totalSuppliers = new Set(users.map((u: any) => u.username)).size;
    const catMap = new Map<string, number>();
    properties.forEach((p: any) => { const cat = p.propertyCategoryName || p.propertyCategoryId || p.category || p.propertyTypeName || p.propertyTypeId || 'Other'; catMap.set(cat, (catMap.get(cat) || 0) + 1); });
    const categoryColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#f97316'];
    const categoryBreakdown = [...catMap.entries()].sort((a, b) => b[1] - a[1]).map(([name, count], i) => ({ label: name, value: count, color: categoryColors[i % categoryColors.length] }));
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthlyMap = new Map<string, number>();
    (Array.isArray(serviceRequests) ? serviceRequests : []).forEach((r: any) => {
      if (r.requestDate) { const m = r.requestDate.slice(0, 7); monthlyMap.set(m, (monthlyMap.get(m) || 0) + 1); }
    });
    const stockMovementsByMonth = [...monthlyMap.entries()].sort().map(([key, count]) => {
      const monthIdx = parseInt(key.slice(5, 7), 10) - 1;
      return { label: months[monthIdx] || key, value: count, color: categoryColors[0] };
    });
    const monthlyTrend = [...monthlyMap.entries()].sort().map(([key, count]) => ({ month: months[parseInt(key.slice(5, 7), 10) - 1] || key, requests: count, approved: Math.round(count * 0.6), completed: Math.round(count * 0.3) }));
    const deptMap = new Map<string, number>();
    (Array.isArray(serviceRequests) ? serviceRequests : []).forEach((r: any) => { const d = r.department || 'Other'; deptMap.set(d, (deptMap.get(d) || 0) + 1); });
    const totalReq = pendingRequisitions + approvedRequisitions + rejectedRequisitions + completedRequisitions || 1;
    const departmentActivity = [...deptMap.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ department: name, requests: count, pct: Math.round((count / totalReq) * 100) }));
    const recentActivities: any[] = [];
    const now = new Date();
    const recentProps = properties.slice(-3).reverse();
    recentProps.forEach((p: any, i: number) => {
      recentActivities.push({ id: `act-prop-${i}`, action: 'Property added', entityName: p.name || p.tagNumber || 'Property', entityId: p.id, userName: 'System', actionDate: new Date(now.getTime() - i * 3600000).toISOString(), timeAgo: `${i + 1} hour${i > 0 ? 's' : ''} ago`, icon: 'bi bi-building-add', color: '#3b82f6' });
    });
    const recentReqs = (Array.isArray(serviceRequests) ? serviceRequests : []).slice(-3).reverse();
    recentReqs.forEach((r: any, i: number) => {
      recentActivities.push({ id: `act-req-${i}`, action: `${r.status || 'Unknown'}`, entityName: r.purpose || r.id || 'Service request', entityId: r.id, userName: r.requesterName || 'User', actionDate: new Date(now.getTime() - i * 7200000).toISOString(), timeAgo: `${i + 2} hours ago`, icon: 'bi bi-check-circle', color: '#10b981' });
    });
    const lowStockAlerts = lowStockItems.map((i: any, idx: number) => ({
      itemId: i.itemId || i.id, itemName: i.itemName || i.name || 'Item', sku: i.sku || '—',
      currentStock: Number(i.currentStock) || 0, minStockLevel: Number(i.minimumThreshold) || 0,
      deficit: Math.max(0, (Number(i.minimumThreshold) || 0) - (Number(i.currentStock) || 0)),
      location: i.warehouseName || i.shelfLocation || '—',
      severity: (Number(i.currentStock) || 0) <= 0 ? 'Critical' : (Number(i.currentStock) || 0) <= (Number(i.minimumThreshold) || 0) * 0.5 ? 'Warning' : 'Attention',
    }));
    const totalStockValue = invData.reduce((s: number, i: any) => s + ((Number(i.currentStock) || 0) * 15), 0);
    res.status(200).json({
      success: true, message: 'Dashboard statistics loaded successfully.', statusCode: 200,
      data: {
        totalProperties, totalLocations, totalSafetyBoxes, totalItems: invData.length,
        totalSuppliers, totalEmployees, pendingRequisitions, approvedRequisitions,
        issuedRequisitions, completedRequisitions, rejectedRequisitions,
        pendingInspections: (Array.isArray(inspections) ? inspections : []).filter((i: any) => (i.status || '').toLowerCase() !== 'completed').length, approvedReceiving: (Array.isArray(inspections) ? inspections : []).filter((i: any) => i.isPassed === true).length, rejectedReceiving: (Array.isArray(inspections) ? inspections : []).filter((i: any) => i.isPassed === false).length,
        totalStockValue, lowStockItemsCount: lowStockItems.length,
        outOfStockItemsCount: invData.filter((i: any) => (Number(i.currentStock) || 0) <= 0).length,
        totalPropertyValue, propertiesByLocation: totalLocations, propertiesByType: catMap.size,
        requisitionsByStatus: [
          { label: 'Pending', value: pendingRequisitions, color: '#f59e0b' },
          { label: 'Approved', value: approvedRequisitions, color: '#10b981' },
          { label: 'Rejected', value: rejectedRequisitions, color: '#ef4444' },
          { label: 'Completed', value: completedRequisitions, color: '#3b82f6' },
        ],
        propertiesByLocationChart: categoryBreakdown.slice(0, 6),
        stockMovementsByMonth,
        receivingByStatus: [],
        dailyCreatedProperties: categoryBreakdown.slice(0, 5).map(c => ({ label: c.label, value: Math.round(c.value / 3), color: c.color })),
        monthlyTrend,
        categoryBreakdown,
        departmentActivity,
        recentActivities,
        lowStockAlerts,
        pendingTasks: [],
        quickActions: [],
      },
    });
  });

  // ─── Properties API ───────────────────────────────────────────────────
  crudList(server, 'Properties', 'properties.json');
  server.get('/api/Properties/by-location/:locationId', async (req, res) => {
    const data = await readDataFile('properties.json');
    res.json({ success: true, message: '', data: data.filter((x: any) => String(x.locationId) === String(req.params.locationId)), statusCode: 200 });
  });
  server.post('/api/Properties/:id/transfer', express.json(), async (req, res) => {
    const data = await readDataFile('properties.json');
    const idx = data.findIndex((x: any) => String(x.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
    data[idx] = { ...data[idx], ...req.body, lastTransferDate: new Date().toISOString() };
    await writeDataFile('properties.json', data);
    res.json({ success: true, message: 'Transferred', data: data[idx], statusCode: 200 });
  });

  // ─── Warehouses API ───────────────────────────────────────────────────
  crudList(server, 'Warehouses', 'warehouses.json');

  // ─── Shelf Locations API ──────────────────────────────────────────────
  crudList(server, 'ShelfLocations', 'shelf-locations.json');

  // ─── Property Types API ───────────────────────────────────────────────
  crudList(server, 'PropertyTypes', 'property-types.json');

  // ─── Property Categories API ──────────────────────────────────────────
  crudList(server, 'PropertyCategories', 'property-categories.json');

  // ─── Service Requests API ─────────────────────────────────────────────
  crudList(server, 'ServiceRequests', 'service-requests.json');

  // ─── Transfer Records API ─────────────────────────────────────────────
  server.get('/api/TransferRecords', async (req, res) => {
    const data = await readDataFile('transfer-records.json');
    const items = data;
    const pageNumber = Number(req.query.pageNumber) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const totalCount = items.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    res.json({ success: true, message: '', data: { items, pageNumber, totalPages, totalCount, hasPreviousPage: pageNumber > 1, hasNextPage: pageNumber < totalPages }, statusCode: 200 });
  });
  server.get('/api/TransferRecords/:id', async (req, res) => {
    const data = await readDataFile('transfer-records.json');
    const item = data.find((x: any) => String(x.id) === String(req.params.id));
    if (!item) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
    res.json({ success: true, message: '', data: item, statusCode: 200 });
  });
  server.post('/api/TransferRecords', express.json(), async (req, res) => {
    const data = await readDataFile('transfer-records.json');
    const item = { id: `tr-${Date.now()}`, transferNumber: `TR-${Date.now()}`, transferDate: new Date().toISOString(), status: 'Pending', initiatedBy: 'system', history: [{ date: new Date().toISOString(), action: 'Created', performedBy: 'system' }], ...req.body };
    data.push(item);
    await writeDataFile('transfer-records.json', data);
    res.status(201).json({ success: true, message: 'Created', data: item.id, statusCode: 201 });
  });
  server.post('/api/TransferRecords/:id/approve', express.json(), async (req, res) => {
    const data = await readDataFile('transfer-records.json');
    const idx = data.findIndex((x: any) => String(x.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
    data[idx].status = req.body.isApproved ? 'Approved' : 'Rejected';
    data[idx].approvedDate = new Date().toISOString();
    data[idx].history = data[idx].history || [];
    data[idx].history.push({ date: new Date().toISOString(), action: data[idx].status, performedBy: 'system', remarks: req.body.remarks || '' });
    await writeDataFile('transfer-records.json', data);
    res.json({ success: true, message: data[idx].status, data: data[idx], statusCode: 200 });
  });

  // ─── Inspections API ──────────────────────────────────────────────────
  server.get('/api/Inspections', async (req, res) => {
    const data = await readDataFile('inspections.json');
    const pageNumber = Number(req.query.pageNumber) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const totalCount = data.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    res.json({ success: true, message: '', data: { items: data, pageNumber, totalPages, totalCount, hasPreviousPage: pageNumber > 1, hasNextPage: pageNumber < totalPages }, statusCode: 200 });
  });
  server.get('/api/Inspections/:id', async (req, res) => {
    const data = await readDataFile('inspections.json');
    const item = data.find((x: any) => String(x.id) === String(req.params.id));
    if (!item) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
    res.json({ success: true, message: '', data: item, statusCode: 200 });
  });
  server.post('/api/Inspections', express.json(), async (req, res) => {
    const data = await readDataFile('inspections.json');
    const item = { id: `insp-${Date.now()}`, inspectionDate: new Date().toISOString(), status: 'Completed', ...req.body };
    data.push(item);
    await writeDataFile('inspections.json', data);
    res.status(201).json({ success: true, message: 'Created', data: item.id, statusCode: 201 });
  });

  // ─── Receiving Notes API ──────────────────────────────────────────────
  server.get('/api/ReceivingNotes', async (req, res) => {
    const data = await readDataFile('receiving-notes.json');
    const pageNumber = Number(req.query.pageNumber) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const totalCount = data.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    res.json({ success: true, message: '', data: { items: data, pageNumber, totalPages, totalCount, hasPreviousPage: pageNumber > 1, hasNextPage: pageNumber < totalPages }, statusCode: 200 });
  });
  server.get('/api/ReceivingNotes/:id', async (req, res) => {
    const data = await readDataFile('receiving-notes.json');
    const item = data.find((x: any) => String(x.id) === String(req.params.id));
    if (!item) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
    res.json({ success: true, message: '', data: item, statusCode: 200 });
  });
  server.post('/api/ReceivingNotes', express.json(), async (req, res) => {
    const data = await readDataFile('receiving-notes.json');
    const item = { id: `rn-${Date.now()}`, grnNumber: `GRN-${Date.now()}`, receivedDate: new Date().toISOString(), status: 'Pending', ...req.body };
    data.push(item);
    await writeDataFile('receiving-notes.json', data);
    res.status(201).json({ success: true, message: 'Created', data: item.id, statusCode: 201 });
  });
  server.post('/api/ReceivingNotes/:id/approve', express.json(), async (req, res) => {
    const data = await readDataFile('receiving-notes.json');
    const idx = data.findIndex((x: any) => String(x.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
    data[idx].status = req.body.isApproved ? 'Approved' : 'Rejected';
    await writeDataFile('receiving-notes.json', data);
    res.json({ success: true, message: data[idx].status, data: data[idx], statusCode: 200 });
  });

  // ─── Users API ────────────────────────────────────────────────────────
  server.get('/api/users', async (req, res) => {
    const data = await readDataFile('users.json');
    const pageNumber = Number(req.query.pageNumber) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const totalCount = data.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    res.json({ success: true, message: '', data: { items: data, pageNumber, totalPages, totalCount, hasPreviousPage: pageNumber > 1, hasNextPage: pageNumber < totalPages }, statusCode: 200 });
  });
  server.get('/api/users/:id', async (req, res) => {
    const data = await readDataFile('users.json');
    const item = data.find((x: any) => String(x.id) === String(req.params.id));
    if (!item) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
    res.json({ success: true, message: '', data: item, statusCode: 200 });
  });
  server.post('/api/users', express.json(), async (req, res) => {
    const data = await readDataFile('users.json');
    const maxId = data.reduce((max: number, u: any) => Math.max(max, Number(u.id) || 0), 0);
    const item = { id: maxId + 1, userId: `u-${Date.now()}`, isActive: true, ...req.body };
    data.push(item);
    await writeDataFile('users.json', data);
    res.status(201).json({ success: true, message: 'Created', data: item, statusCode: 201 });
  });
  server.put('/api/users/:id', express.json(), async (req, res) => {
    const data = await readDataFile('users.json');
    const idx = data.findIndex((x: any) => String(x.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
    const { id: _, ...safe } = req.body;
    data[idx] = { ...data[idx], ...safe };
    await writeDataFile('users.json', data);
    res.json({ success: true, message: 'Updated', data: data[idx], statusCode: 200 });
  });
  server.delete('/api/users/:id', async (req, res) => {
    const data = await readDataFile('users.json');
    const idx = data.findIndex((x: any) => String(x.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
    const removed = data.splice(idx, 1)[0];
    await writeDataFile('users.json', data);
    res.json({ success: true, message: 'Deleted', data: removed, statusCode: 200 });
  });
  server.patch('/api/users/:id/toggle-status', async (req, res) => {
    const data = await readDataFile('users.json');
    const idx = data.findIndex((x: any) => String(x.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
    data[idx].isActive = !data[idx].isActive;
    await writeDataFile('users.json', data);
    res.json({ success: true, message: 'Toggled', data: data[idx], statusCode: 200 });
  });
  // Assign role to user (admin operation)
  server.patch('/api/users/:id/assign-role', express.json(), async (req, res) => {
    const data = await readDataFile('users.json');
    const idx = data.findIndex((x: any) => String(x.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ success: false, message: 'User not found', statusCode: 404 });
    const { roleName } = req.body;
    if (!roleName) return res.status(400).json({ success: false, message: 'roleName is required', statusCode: 400 });
    data[idx].role = roleName;
    data[idx].roles = [roleName.toLowerCase().replace(/[\s_-]+/g, '')];
    await writeDataFile('users.json', data);
    res.json({ success: true, message: `Role "${roleName}" assigned to user`, data: data[idx], statusCode: 200 });
  });

  // ─── Employees API ────────────────────────────────────────────────────
  server.get('/api/employees', async (req, res) => {
    const data = await readDataFile('employees.json');
    const pageNumber = Number(req.query.pageNumber) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const totalCount = data.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    res.json({ success: true, message: '', data: { items: data, pageNumber, totalPages, totalCount, hasPreviousPage: pageNumber > 1, hasNextPage: pageNumber < totalPages }, statusCode: 200 });
  });
  server.get('/api/employees/:id', async (req, res) => {
    const data = await readDataFile('employees.json');
    const item = data.find((x: any) => String(x.id) === String(req.params.id));
    if (!item) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
    res.json({ success: true, message: '', data: item, statusCode: 200 });
  });
  server.post('/api/employees', express.json(), async (req, res) => {
    const data = await readDataFile('employees.json');
    const maxId = data.reduce((max: number, e: any) => Math.max(max, Number(e.id) || 0), 0);
    const item = { id: maxId + 1, employeeId: `emp-${Date.now()}`, isActive: true, ...req.body };
    data.push(item);
    await writeDataFile('employees.json', data);
    res.status(201).json({ success: true, message: 'Created', data: item, statusCode: 201 });
  });
  server.put('/api/employees/:id', express.json(), async (req, res) => {
    const data = await readDataFile('employees.json');
    const idx = data.findIndex((x: any) => String(x.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
    const { id: _, ...safe } = req.body;
    data[idx] = { ...data[idx], ...safe };
    await writeDataFile('employees.json', data);
    res.json({ success: true, message: 'Updated', data: data[idx], statusCode: 200 });
  });
  server.delete('/api/employees/:id', async (req, res) => {
    const data = await readDataFile('employees.json');
    const idx = data.findIndex((x: any) => String(x.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
    const removed = data.splice(idx, 1)[0];
    await writeDataFile('employees.json', data);
    res.json({ success: true, message: 'Deleted', data: removed, statusCode: 200 });
  });
  server.get('/api/employees/by-user/:userId', async (req, res) => {
    const data = await readDataFile('employees.json');
    const item = data.find((x: any) => String(x.employeeId) === String(req.params.userId));
    if (!item) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
    res.json({ success: true, message: '', data: item, statusCode: 200 });
  });

  // ─── Roles API ────────────────────────────────────────────────────────
  crudList(server, 'Roles', 'roles.json', 'id');

  // ─── Activity Logs API ────────────────────────────────────────────────
  server.get('/api/activity-logs', async (req, res) => {
    const data = await readDataFile('activity-logs.json');
    const pageNumber = Number(req.query.pageNumber) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const totalCount = data.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    res.json({ success: true, message: '', data: { items: data, pageNumber, totalPages, totalCount, hasPreviousPage: pageNumber > 1, hasNextPage: pageNumber < totalPages }, statusCode: 200 });
  });

  // ─── Inventory Reports API (computed from inventory data) ─────────────
  server.get('/api/InventoryReports/valuation', async (req, res) => {
    const d = await readInventoryData();
    const inv = d.inventory || [];
    const totalValue = inv.reduce((sum: number, i: any) => sum + (Number(i.currentStock) || 0) * (Number(i.unitPrice) || 0), 0);
    res.json({ success: true, message: '', data: { generatedAt: new Date().toISOString(), summary: { totalItems: inv.length, totalStockItems: inv.filter((i: any) => (Number(i.currentStock) || 0) > 0).length, totalQuantity: inv.reduce((s: number, i: any) => s + (Number(i.currentStock) || 0), 0), totalValue, averageItemValue: inv.length ? totalValue / inv.length : 0, lowStockItems: inv.filter((i: any) => (Number(i.currentStock) || 0) <= (Number(i.minimumThreshold) || 0)).length, outOfStockItems: inv.filter((i: any) => (Number(i.currentStock) || 0) === 0).length }, items: inv, byCategory: [], byWarehouse: [] }, statusCode: 200 });
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
    let idx = d.inventory.findIndex((x) => x.id === itemId || x.itemId === itemId || x.sku === itemId);

    // If not found in inventory, look up itemMasters and create an inventory record
    if (idx === -1 && d.itemMasters) {
      const master = d.itemMasters.find((m: any) => String(m.id) === String(itemId) || m.sku === itemId);
      if (master) {
        const invRecord = {
          id: `inv-${Date.now()}`,
          itemId: String(master.id),
          itemName: master.itemName || '',
          sku: master.sku || '',
          shelfId: shelfId || '',
          shelfLocation: '',
          warehouseId: '',
          warehouseName: '',
          currentStock: 0,
          reservedStock: 0,
          availableStock: 0,
          unitOfMeasure: master.unitOfMeasure || 'PCS',
          lastUpdated: new Date().toISOString(),
          minimumThreshold: master.minStockLevel || 0,
          maximumThreshold: 0,
        };
        d.inventory.push(invRecord);
        idx = d.inventory.length - 1;
      }
    }

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

  server.get('/api/Warehouses', async (req, res) => {
    const d = await readInventoryData();
    const warehouses = [
      { id: 'wh-001', warehouseName: 'Main Warehouse', locationCode: 'WH-MAIN', address: 'Building A', city: 'Addis Ababa', country: 'Ethiopia', contactPerson: '', contactPhone: '', contactEmail: '', isActive: true, createdAt: new Date().toISOString() },
      { id: 'wh-002', warehouseName: 'Branch Warehouse A', locationCode: 'WH-BRANCH-A', address: 'Building B', city: 'Addis Ababa', country: 'Ethiopia', contactPerson: '', contactPhone: '', contactEmail: '', isActive: true, createdAt: new Date().toISOString() },
      { id: 'wh-003', warehouseName: 'Branch Warehouse B', locationCode: 'WH-BRANCH-B', address: 'Building C', city: 'Addis Ababa', country: 'Ethiopia', contactPerson: '', contactPhone: '', contactEmail: '', isActive: true, createdAt: new Date().toISOString() },
    ];
    res.json({ success: true, message: '', data: warehouses, statusCode: 200 });
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

  // Auth/login endpoint — hardcoded admin + users.json lookup + role check
  server.post('/api/Auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
      // ── Hardcoded super admin ──
      if (username === 'admin' && password === 'Admin@123') {
        const mockToken = 'mock-jwt-token-' + Date.now();
        return res.status(200).json({
          success: true, succeeded: true, message: 'Login successful',
          data: {
            token: mockToken, refreshToken: 'mock-refresh-token',
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
            user: {
              id: 'u-001', username: 'admin', fullName: 'Admin User',
              email: 'admin@afrocom.com', roles: ['admin'], permissions: [],
              isActive: true,
            },
          },
        });
      }

      const users = await readDataFile('users.json');
      const user = users.find((u: any) => u.username === username);
      if (user && password && password.length >= 8) {
        // ── Role check: deny login if user has no role assigned ──
        const userRoles = user.roles || (user.role ? [user.role] : []);
        if (!userRoles.length) {
          return res.status(403).json({
            success: false, succeeded: false,
            message: 'Account pending role assignment. Contact an administrator.',
            errors: ['Account pending role assignment. Contact an administrator.'],
          });
        }

        const mockToken = 'mock-jwt-token-' + Date.now();
        res.status(200).json({
          success: true, succeeded: true, message: 'Login successful',
          data: { token: mockToken, refreshToken: 'mock-refresh-token', expiresAt: new Date(Date.now() + 3600000).toISOString(), user: { id: user.userId || String(user.id), username: user.username, fullName: user.fullName, email: user.email, roles: userRoles, permissions: [], isActive: user.isActive } }
        });
      } else {
        res.status(401).json({ success: false, succeeded: false, message: 'Invalid username or password', errors: ['Invalid username or password'] });
      }
    } catch {
      res.status(500).json({ success: false, succeeded: false, message: 'Server error', errors: ['Internal error'] });
    }
  });

  // Auth/register endpoint — saves user with empty roles (pending assignment)
  server.post('/api/Auth/register', async (req, res) => {
    try {
      const { username, password, email, fullName, phoneNumber, department, employeeCode } = req.body;

      if (!username || !password || !email) {
        return res.status(400).json({ success: false, message: 'Username, password, and email are required.' });
      }

      const users = await readDataFile('users.json');
      const exists = users.find((u: any) => u.username === username || u.email === email);
      if (exists) {
        return res.status(409).json({ success: false, message: 'Username or email already exists.' });
      }

      const maxId = users.reduce((max: number, u: any) => Math.max(max, Number(u.id) || 0), 0);
      const newUser = {
        id: maxId + 1,
        userId: `u-${Date.now()}`,
        username,
        email,
        fullName: fullName || username,
        firstName: (fullName || username).split(' ')[0] || '',
        lastName: (fullName || username).split(' ').slice(1).join(' ') || '',
        role: '',
        roles: [],
        isActive: true,
        phoneNumber: phoneNumber || '',
        department: department || '',
        employeeCode: employeeCode || '',
        lastLogin: null,
      };

      users.push(newUser);
      await writeDataFile('users.json', users);

      res.status(201).json({
        success: true, message: 'Account created successfully! An administrator must assign your role before you can log in.',
        data: { id: newUser.id },
      });
    } catch {
      res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
  });

  // Auth/forgot-password
  server.post('/api/Auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required', statusCode: 400 });
    const users = await readDataFile('users.json');
    const user = users.find((u: any) => u.email === email);
    if (!user) return res.status(404).json({ success: false, message: 'No account found for that email', statusCode: 404 });
    const token = `reset-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const resetTokens = await readDataFile('reset-tokens.json', []);
    resetTokens.push({ email, token, expiresAt: new Date(Date.now() + 1800000).toISOString() });
    await writeDataFile('reset-tokens.json', resetTokens);
    console.log(`\n  🔑 Password reset token for ${email}: ${token}\n`);
    res.json({ success: true, message: 'Reset token created. Check server logs for dev token.', data: { token }, statusCode: 200 });
  });

  // ─── Disposal Records API ─────────────────────────────────────────────
  server.get('/api/DisposalRecords', async (req, res) => {
    const data = await readDataFile('disposals.json');
    const pageNumber = Number(req.query.pageNumber) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const totalCount = data.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const sorted = [...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, message: '', data: { items: sorted, pageNumber, totalPages, totalCount, hasPreviousPage: pageNumber > 1, hasNextPage: pageNumber < totalPages }, statusCode: 200 });
  });
  server.get('/api/DisposalRecords/:id', async (req, res) => {
    const data = await readDataFile('disposals.json');
    const item = data.find((x: any) => String(x.id) === String(req.params.id));
    if (!item) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
    res.json({ success: true, message: '', data: item, statusCode: 200 });
  });
  server.post('/api/DisposalRecords', express.json(), async (req, res) => {
    const data = await readDataFile('disposals.json');
    const id = `disp-${Date.now()}`;
    const disposalNumber = `DSP-${Date.now()}`;
    const item: any = {
      id, disposalNumber,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      createdBy: req.body.createdBy || 'storekeeper',
      reason: req.body.reason || '',
      items: (req.body.items || []).map((i: any) => ({
        itemId: i.itemId,
        itemName: i.itemName || '',
        sku: i.sku || '',
        quantity: Number(i.quantity) || 0,
        unitCost: Number(i.unitCost) || 0,
        totalValue: (Number(i.quantity) || 0) * (Number(i.unitCost) || 0),
        reason: i.reason || '',
      })),
      totalItems: (req.body.items || []).length,
      totalQuantity: (req.body.items || []).reduce((s: number, i: any) => s + (Number(i.quantity) || 0), 0),
      totalValue: (req.body.items || []).reduce((s: number, i: any) => s + (Number(i.quantity) || 0) * (Number(i.unitCost) || 0), 0),
      auditHistory: [{ date: new Date().toISOString(), action: 'Created', performedBy: req.body.createdBy || 'storekeeper', remarks: 'Disposal initiated' }],
    };
    data.push(item);
    await writeDataFile('disposals.json', data);
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
  server.post('/api/DisposalRecords/:id/approve', express.json(), async (req, res) => {
    const data = await readDataFile('disposals.json');
    const idx = data.findIndex((x: any) => String(x.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
    data[idx].status = req.body.isApproved ? 'Completed' : 'Rejected';
    data[idx].approvedDate = new Date().toISOString();
    data[idx].approvedBy = req.body.approvedBy || 'admin';
    data[idx].approvalRemarks = req.body.remarks || '';
    data[idx].auditHistory = data[idx].auditHistory || [];
    data[idx].auditHistory.push({ date: new Date().toISOString(), action: data[idx].status, performedBy: req.body.approvedBy || 'admin', remarks: req.body.remarks || '' });
    if (req.body.isApproved && data[idx].items) {
      const invData = await readDataFile('inventory.json');
      let inv = invData.inventory || invData;
      for (const disposalItem of data[idx].items) {
        const invIdx = inv.findIndex((x: any) => x.id === disposalItem.itemId || x.itemId === disposalItem.itemId || x.sku === disposalItem.sku);
        if (invIdx !== -1) {
          inv[invIdx].currentStock = Math.max(0, (Number(inv[invIdx].currentStock) || 0) - disposalItem.quantity);
          inv[invIdx].availableStock = Math.max(0, (Number(inv[invIdx].availableStock) || 0) - disposalItem.quantity);
          inv[invIdx].lastUpdated = new Date().toISOString();
        }
      }
      invData.inventory = Array.isArray(inv) ? inv : invData.inventory;
      await writeDataFile('inventory.json', invData);
    }
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
  server.get('/api/Notifications', async (req, res) => {
    const data = await readDataFile('notifications.json');
    const role = (req.query.role as string) || (req.query.targetRole as string) || '';
    const filtered = role ? data.filter((n: any) => n.targetRole === role || !n.targetRole) : data;
    const sorted = filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, message: '', data: sorted, statusCode: 200 });
  });
  server.get('/api/Notifications/unread-count', async (req, res) => {
    const data = await readDataFile('notifications.json');
    const role = (req.query.role as string) || (req.query.targetRole as string) || '';
    const filtered = role ? data.filter((n: any) => n.targetRole === role || !n.targetRole) : data;
    const count = filtered.filter((n: any) => !n.isRead).length;
    res.json({ success: true, message: '', data: count, statusCode: 200 });
  });
  server.post('/api/Notifications/:id/read', express.json(), async (req, res) => {
    const data = await readDataFile('notifications.json');
    const notif = data.find((n: any) => String(n.id) === String(req.params.id));
    if (notif) notif.isRead = true;
    await writeDataFile('notifications.json', data);
    res.json({ success: true, message: 'Marked as read', statusCode: 200 });
  });
  server.post('/api/Notifications/read-all', express.json(), async (req, res) => {
    const data = await readDataFile('notifications.json');
    data.forEach((n: any) => { n.isRead = true; });
    await writeDataFile('notifications.json', data);
    res.json({ success: true, message: 'All marked as read', statusCode: 200 });
  });
  server.delete('/api/Notifications/:id', async (req, res) => {
    const data = await readDataFile('notifications.json');
    const idx = data.findIndex((n: any) => String(n.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
    data.splice(idx, 1);
    await writeDataFile('notifications.json', data);
    res.json({ success: true, message: 'Deleted', statusCode: 200 });
  });

  // ─── Disposal Reports API ─────────────────────────────────────────────
  server.get('/api/DisposalReports', async (req, res) => {
    const data = await readDataFile('disposals.json');
    const completed = data.filter((d: any) => d.status === 'Completed');
    const pending = data.filter((d: any) => d.status === 'Pending');
    const rejected = data.filter((d: any) => d.status === 'Rejected');
    const totalValue = completed.reduce((s: number, d: any) => s + (Number(d.totalValue) || 0), 0);
    const byReason: Record<string, any> = {};
    data.forEach((d: any) => {
      const r = d.reason || 'Not specified';
      if (!byReason[r]) byReason[r] = { reason: r, count: 0, totalQuantity: 0, totalValue: 0 };
      byReason[r].count++;
      byReason[r].totalQuantity += d.totalQuantity || 0;
      byReason[r].totalValue += d.totalValue || 0;
    });
    const byMonth: Record<string, any> = {};
    data.forEach((d: any) => {
      const m = d.createdAt ? d.createdAt.slice(0, 7) : 'unknown';
      if (!byMonth[m]) byMonth[m] = { month: m, count: 0, totalQuantity: 0, totalValue: 0 };
      byMonth[m].count++;
      byMonth[m].totalQuantity += d.totalQuantity || 0;
      byMonth[m].totalValue += d.totalValue || 0;
    });
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const byMonthArr = Object.values(byMonth).sort((a: any, b: any) => a.month.localeCompare(b.month)).map((m: any) => ({
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
          totalItems: data.reduce((s: number, d: any) => s + (d.totalQuantity || 0), 0),
          totalQuantity: data.reduce((s: number, d: any) => s + (d.totalQuantity || 0), 0),
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

  // ─── Store Issue Vouchers API ─────────────────────────────────────────
  crudList(server, 'StoreIssueVouchers', 'store-issue-vouchers.json');

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

async function run(): Promise<void> {
  const port = process.env['PORT'] || 4000;

  // Seed data files before starting server
  const dataFolder = resolve(process.cwd(), 'data');
  async function seedAtStartup(): Promise<void> {
    if (!existsSync(dataFolder)) await fs.mkdir(dataFolder, { recursive: true });
    const usersFile = resolve(dataFolder, 'users.json');
    if (!existsSync(usersFile)) {
      await fs.writeFile(usersFile, JSON.stringify([
        { id: 1, userId: 'u-001', username: 'admin', email: 'admin@afrocom.com', fullName: 'Admin User', firstName: 'Admin', lastName: 'User', role: 'admin', roles: ['admin'], isActive: true, phoneNumber: '+255700000001', lastLogin: new Date().toISOString() },
        { id: 2, userId: 'u-002', username: 'manager', email: 'manager@afrocom.com', fullName: 'Manager User', firstName: 'Manager', lastName: 'User', role: 'manager', roles: ['manager'], isActive: true, phoneNumber: '+255700000002', lastLogin: new Date().toISOString() },
        { id: 3, userId: 'u-003', username: 'employee', email: 'employee@afrocom.com', fullName: 'Employee User', firstName: 'Employee', lastName: 'User', role: 'employee', roles: ['employee'], isActive: true, phoneNumber: '+255700000003', lastLogin: new Date().toISOString() },
        { id: 4, userId: 'u-004', username: 'storekeeper', email: 'storekeeper@afrocom.com', fullName: 'Store Keeper', firstName: 'Store', lastName: 'Keeper', role: 'storekeeper', roles: ['storekeeper'], isActive: true, phoneNumber: '+255700000004', lastLogin: new Date().toISOString() },
        { id: 5, userId: 'u-005', username: 'compliance', email: 'compliance@afrocom.com', fullName: 'Compliance Officer', firstName: 'Compliance', lastName: 'Officer', role: 'compliance-officer', roles: ['compliance-officer'], isActive: true, phoneNumber: '+255700000005', lastLogin: new Date().toISOString() },
      ], null, 2), 'utf8');
    }
    const rolesFile = resolve(dataFolder, 'roles.json');
    if (!existsSync(rolesFile)) {
      await fs.writeFile(rolesFile, JSON.stringify([
        { id: 'role-admin', name: 'Admin', description: 'Full system access', permissions: ['admin_dashboard', 'view_users', 'view_employees', 'view_roles', 'view_audit_log', 'view_notifications'], isActive: true },
        { id: 'role-manager', name: 'Manager', description: 'Department manager', permissions: ['manager_dashboard', 'approve_requests', 'view_reports'], isActive: true },
        { id: 'role-employee', name: 'Employee', description: 'Regular employee', permissions: ['employee_dashboard', 'create_requests', 'view_own_requests'], isActive: true },
        { id: 'role-storekeeper', name: 'Storekeeper', description: 'Warehouse staff', permissions: ['storekeeper_dashboard', 'manage_inventory', 'issue_items'], isActive: true },
        { id: 'role-compliance', name: 'Compliance Officer', description: 'Compliance and audit', permissions: ['compliance_dashboard', 'view_audits', 'manage_compliance'], isActive: true },
      ], null, 2), 'utf8');
    }
    const empFile = resolve(dataFolder, 'employees.json');
    if (!existsSync(empFile)) {
      await fs.writeFile(empFile, JSON.stringify([
        { id: 1, employeeId: 'emp-001', firstName: 'John', lastName: 'Doe', email: 'john@afrocom.com', phoneNumber: '+255700000011', department: 'IT', designation: 'Developer', dateOfBirth: '1990-01-15', dateOfJoining: '2020-06-01', employmentType: 'Permanent', status: 'Active', isActive: true },
        { id: 2, employeeId: 'emp-002', firstName: 'Jane', lastName: 'Smith', email: 'jane@afrocom.com', phoneNumber: '+255700000012', department: 'HR', designation: 'Officer', dateOfBirth: '1992-03-20', dateOfJoining: '2021-02-15', employmentType: 'Permanent', status: 'Active', isActive: true },
        { id: 3, employeeId: 'emp-003', firstName: 'Bob', lastName: 'Johnson', email: 'bob@afrocom.com', phoneNumber: '+255700000013', department: 'Finance', designation: 'Accountant', dateOfBirth: '1988-07-10', dateOfJoining: '2019-09-01', employmentType: 'Permanent', status: 'Active', isActive: true },
      ], null, 2), 'utf8');
    }
    const sivFile = resolve(dataFolder, 'store-issue-vouchers.json');
    if (!existsSync(sivFile)) {
      await fs.writeFile(sivFile, JSON.stringify([
        { id: 'siv-001', voucherNumber: 'SIV-2026-0001', serviceRequestId: 'sr-001', issuedBy: 'John Doe', issueDate: '2026-05-28T14:30:00.000Z', items: [{ itemId: 'item-001', quantity: 5 }], status: 'Issued' },
        { id: 'siv-002', voucherNumber: 'SIV-2026-0002', serviceRequestId: 'sr-002', issuedBy: 'Sarah Smith', issueDate: '2026-05-28T11:30:00.000Z', items: [{ itemId: 'item-002', quantity: 10 }], status: 'Issued' },
        { id: 'siv-003', voucherNumber: 'SIV-2026-0003', serviceRequestId: 'sr-003', issuedBy: 'Neha Patel', issueDate: '2026-05-28T16:00:00.000Z', items: [{ itemId: 'item-003', quantity: 8 }], status: 'Issued' },
        { id: 'siv-004', voucherNumber: 'SIV-2026-0004', serviceRequestId: 'sr-004', issuedBy: 'Mike Wilson', issueDate: '2026-05-27T12:00:00.000Z', items: [{ itemId: 'item-004', quantity: 15 }], status: 'Issued' },
        { id: 'siv-005', voucherNumber: 'SIV-2026-0005', serviceRequestId: 'sr-005', issuedBy: 'Alice Johnson', issueDate: '2026-05-26T15:00:00.000Z', items: [{ itemId: 'item-005', quantity: 3 }], status: 'Issued' },
        { id: 'siv-006', voucherNumber: 'SIV-2026-0006', serviceRequestId: 'sr-006', issuedBy: 'John Doe', issueDate: '2026-05-26T09:30:00.000Z', items: [{ itemId: 'item-006', quantity: 20 }], status: 'Pending' },
      ], null, 2), 'utf8');
    }
  }
  await seedAtStartup();

  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

run();
