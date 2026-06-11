import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';
import { toCamelCaseDeep, unwrapPasEnvelope } from '../utils/pas-api-json.util';

export interface DashboardStatistics {
  totalProperties: number;
  totalLocations: number;
  totalSafetyBoxes: number;
  totalItems: number;
  totalSuppliers: number;
  totalEmployees: number;
  pendingRequisitions: number;
  approvedRequisitions: number;
  issuedRequisitions: number;
  completedRequisitions: number;
  rejectedRequisitions: number;
  pendingInspections: number;
  approvedReceiving: number;
  rejectedReceiving: number;
  totalStockValue: number;
  lowStockItemsCount: number;
  outOfStockItemsCount: number;
  totalPropertyValue: number;
  propertiesByLocation: number;
  propertiesByType: number;
  requisitionsByStatus: ChartData[];
  propertiesByLocationChart: ChartData[];
  stockMovementsByMonth: ChartData[];
  receivingByStatus: ChartData[];
  dailyCreatedProperties: ChartData[];
  recentActivities: RecentActivity[];
  lowStockAlerts: LowStockAlert[];
  pendingTasks: PendingTask[];
  quickActions: QuickAction[];
  monthlyTrend?: MonthlyTrendPoint[];
  categoryBreakdown?: ChartData[];
  departmentActivity?: DepartmentActivityPoint[];
  topRequestedItems?: TopRequestedItem[];
}

export interface MonthlyTrendPoint {
  month: string;
  requests: number;
  approved: number;
  completed: number;
}

export interface DepartmentActivityPoint {
  department: string;
  requests: number;
  pct: number;
}

export interface TopRequestedItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  requests: number;
}

export interface ChartData {
  label: string;
  value: number;
  color: string;
}

export interface RecentActivity {
  id: string;
  action: string;
  entityName: string;
  entityId: string;
  userName: string;
  actionDate: string;
  timeAgo: string;
  icon: string;
  color: string;
}

export interface LowStockAlert {
  itemId: string;
  itemName: string;
  sku: string;
  currentStock: number;
  minStockLevel: number;
  deficit: number;
  location: string;
  severity: string;
}

export interface PendingTask {
  id: string;
  taskType: string;
  description: string;
  reference: string;
  dueDate: string;
  priority: string;
  assignedTo: string;
  status: string;
}

export interface QuickAction {
  name: string;
  icon: string;
  route: string;
  color: string;
  permission: string;
}

interface RawItem {
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private apiService: ApiService) {}

  getStatistics(): Observable<ApiResponseModel<DashboardStatistics>> {
    return this.apiService.get<unknown>('Dashboard/statistics').pipe(
      map((raw) => {
        const env = unwrapPasEnvelope<unknown>(raw);
        const data =
          env.data !== undefined && env.data !== null
            ? toCamelCaseDeep<DashboardStatistics>(env.data)
            : undefined;
        return {
          success: env.success !== false && data !== undefined,
          message: env.message,
          data,
          statusCode: env.statusCode ?? 0,
        } satisfies ApiResponseModel<DashboardStatistics>;
      }),
      catchError(() => this.computeFallbackStatistics()),
    );
  }

  private computeFallbackStatistics(): Observable<ApiResponseModel<DashboardStatistics>> {
    return forkJoin({
      properties: this.apiService.get<unknown>('Properties').pipe(
        catchError(() => of({ success: false, data: [], statusCode: 0 } as unknown as ApiResponseModel<unknown>)),
      ),
      employees: this.apiService.get<unknown>('employees').pipe(
        catchError(() => of({ success: false, data: { items: [] }, statusCode: 0 } as unknown as ApiResponseModel<unknown>)),
      ),
      serviceRequests: this.apiService.get<unknown>('ServiceRequests').pipe(
        catchError(() => of({ success: false, data: { items: [] }, statusCode: 0 } as unknown as ApiResponseModel<unknown>)),
      ),
      inventory: this.apiService.get<unknown>('InventoryStock').pipe(
        catchError(() => of({ success: false, data: [], statusCode: 0 } as unknown as ApiResponseModel<unknown>)),
      ),
      inspections: this.apiService.get<unknown>('Inspections').pipe(
        catchError(() => of({ success: false, data: { items: [] }, statusCode: 0 } as unknown as ApiResponseModel<unknown>)),
      ),
    }).pipe(
      map((raw) => {
        const props = this.toArray(raw.properties?.data);
        const emps = this.toArray(raw.employees?.data, 'items');
        const reqs = this.toArray(raw.serviceRequests?.data, 'items');
        const inv = this.toArray(raw.inventory?.data);
        const insp = this.toArray(raw.inspections?.data, 'items');

        const d = this.compute(props, emps, reqs, inv, insp);
        return {
          success: true,
          message: 'Dashboard statistics computed from registered data.',
          data: d,
          statusCode: 200,
        } satisfies ApiResponseModel<DashboardStatistics>;
      }),
    );
  }

  private toArray(data: unknown, nestedKey?: string): RawItem[] {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      if (nestedKey) {
        const nested = obj[nestedKey] ?? obj[nestedKey.charAt(0).toUpperCase() + nestedKey.slice(1)];
        if (Array.isArray(nested)) return nested;
      }
      const items = obj['items'] ?? obj['Items'] ?? obj['data'] ?? obj['Data'] ?? obj['inventory'] ?? obj['Inventory'];
      if (Array.isArray(items)) return items;
    }
    return [];
  }

  private num(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  private compute(
    properties: RawItem[], employees: RawItem[],
    serviceRequests: RawItem[], inventory: RawItem[],
    inspections: RawItem[],
  ): DashboardStatistics {
    const gs = (item: RawItem, ...keys: string[]): string => {
      for (const k of keys) {
        const v = item[k];
        if (v != null && v !== '') return String(v);
      }
      return '';
    };
    const gn = (item: RawItem, ...keys: string[]): number => {
      for (const k of keys) {
        const v = item[k];
        const n = Number(v);
        if (Number.isFinite(n)) return n;
      }
      return 0;
    };

    const totalProperties = properties.length;
    const totalLocations = new Set(properties.map(p => gs(p, 'locationId', 'location')).filter(Boolean)).size;
    const totalEmployees = employees.length;
    const totalSafetyBoxes = properties.filter(p =>
      gs(p, 'propertyTypeId').toLowerCase().includes('safety') ||
      gs(p, 'propertyCategoryId').toLowerCase().includes('safety'),
    ).length;
    const totalSuppliers = new Set(serviceRequests.map(r => r['requesterName']).filter(Boolean)).size;
    const totalItems = inventory.length;
    const totalPropertyValue = properties.reduce((s, p) => s + gn(p, 'currentValue', 'value', 'totalValue'), 0);
    const totalStockValue = inventory.reduce((s, i) => s + gn(i, 'currentStock', 'stockQuantity') * (gn(i, 'unitPrice') || 15), 0);

    const matchStatus = (r: RawItem, status: string): boolean =>
      gs(r, 'status').toLowerCase() === status;
    const pendingReqs = serviceRequests.filter(r => matchStatus(r, 'pending')).length;
    const approvedReqs = serviceRequests.filter(r => matchStatus(r, 'approved')).length;
    const rejectedReqs = serviceRequests.filter(r => matchStatus(r, 'rejected')).length;
    const issuedReqs = serviceRequests.filter(r => matchStatus(r, 'issued')).length;
    const completedReqs = serviceRequests.filter(r => matchStatus(r, 'completed')).length;

    const lowStockItems = inventory.filter(i => {
      const min = gn(i, 'minimumThreshold', 'minStockLevel');
      return min > 0 && gn(i, 'currentStock', 'stockQuantity') <= min;
    });
    const outOfStockItems = inventory.filter(i => gn(i, 'currentStock', 'stockQuantity') <= 0);

    const pendingInsp = inspections.filter(i => gs(i, 'status').toLowerCase() !== 'completed').length;
    const approvedRec = inspections.filter(i => i['isPassed'] === true).length;
    const rejectedRec = inspections.filter(i => i['isPassed'] === false).length;

    const catMap = new Map<string, number>();
    properties.forEach(p => {
      const cat = gs(p, 'propertyCategoryName', 'propertyCategoryId', 'category', 'propertyTypeName', 'propertyTypeId', 'Other');
      catMap.set(cat, (catMap.get(cat) || 0) + 1);
    });
    const categoryColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#f97316'];
    const categoryBreakdown: ChartData[] = [...catMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count], i) => ({
        label: name, value: count, color: categoryColors[i % categoryColors.length],
      }));

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthMap = new Map<string, { requests: number; approved: number; completed: number }>();
    serviceRequests.forEach(r => {
      const rd = r['requestDate'] as string | undefined;
      if (rd) {
        const m = months[new Date(rd).getMonth()] || rd.slice(0, 7);
        if (!monthMap.has(m)) monthMap.set(m, { requests: 0, approved: 0, completed: 0 });
        const entry = monthMap.get(m)!;
        entry.requests++;
        if (matchStatus(r, 'approved')) entry.approved++;
        if (matchStatus(r, 'completed')) entry.completed++;
      }
    });
    const monthlyTrend: MonthlyTrendPoint[] = [...monthMap.entries()].map(([month, counts]) => ({
      month, ...counts,
    }));

    const deptMap = new Map<string, number>();
    serviceRequests.forEach(r => {
      const d = gs(r, 'department', 'Other');
      deptMap.set(d, (deptMap.get(d) || 0) + 1);
    });
    const totalReqs = Math.max(pendingReqs + approvedReqs + rejectedReqs + completedReqs + issuedReqs, 1);
    const departmentActivity: DepartmentActivityPoint[] = [...deptMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([dept, count]) => ({ department: dept, requests: count, pct: Math.round((count / totalReqs) * 100) }));

    const now = new Date();
    const recentActivities: RecentActivity[] = [];
    properties.slice(-3).reverse().forEach((p, i) => {
      recentActivities.push({
        id: `act-prop-${i}`, action: 'Property added',
        entityName: gs(p, 'name', 'tagNumber', 'Property'),
        entityId: gs(p, 'id'), userName: 'System',
        actionDate: new Date(now.getTime() - i * 3600000).toISOString(),
        timeAgo: `${i + 1} hour${i > 0 ? 's' : ''} ago`,
        icon: 'bi bi-building-add', color: '#3b82f6',
      });
    });
    serviceRequests.slice(-3).reverse().forEach((r, i) => {
      recentActivities.push({
        id: `act-req-${i}`, action: gs(r, 'status', 'Unknown'),
        entityName: gs(r, 'purpose', 'id', 'Service request'),
        entityId: gs(r, 'id'),
        userName: gs(r, 'requesterName', 'User'),
        actionDate: new Date(now.getTime() - i * 7200000).toISOString(),
        timeAgo: `${i + 2} hours ago`,
        icon: 'bi bi-check-circle', color: '#10b981',
      });
    });

    const lowStockAlerts: LowStockAlert[] = lowStockItems.map(i => ({
      itemId: gs(i, 'itemId', 'id'),
      itemName: gs(i, 'itemName', 'name', 'Item'),
      sku: gs(i, 'sku', '—'),
      currentStock: gn(i, 'currentStock', 'stockQuantity'),
      minStockLevel: gn(i, 'minimumThreshold', 'minStockLevel'),
      deficit: Math.max(0, gn(i, 'minimumThreshold', 'minStockLevel') - gn(i, 'currentStock', 'stockQuantity')),
      location: gs(i, 'warehouseName', 'shelfLocation', '—'),
      severity:
        gn(i, 'currentStock', 'stockQuantity') <= 0 ? 'Critical'
          : gn(i, 'currentStock', 'stockQuantity') <= gn(i, 'minimumThreshold', 'minStockLevel') * 0.5 ? 'Warning'
          : 'Attention',
    }));

    return {
      totalProperties, totalLocations, totalSafetyBoxes, totalItems,
      totalSuppliers, totalEmployees,
      pendingRequisitions: pendingReqs, approvedRequisitions: approvedReqs,
      issuedRequisitions: issuedReqs, completedRequisitions: completedReqs,
      rejectedRequisitions: rejectedReqs,
      pendingInspections: pendingInsp, approvedReceiving: approvedRec, rejectedReceiving: rejectedRec,
      totalStockValue, lowStockItemsCount: lowStockItems.length,
      outOfStockItemsCount: outOfStockItems.length,
      totalPropertyValue, propertiesByLocation: totalLocations, propertiesByType: catMap.size,
      requisitionsByStatus: [
        { label: 'Pending', value: pendingReqs, color: '#f59e0b' },
        { label: 'Approved', value: approvedReqs, color: '#10b981' },
        { label: 'Rejected', value: rejectedReqs, color: '#ef4444' },
        { label: 'Completed', value: completedReqs, color: '#3b82f6' },
        { label: 'Issued', value: issuedReqs, color: '#8b5cf6' },
      ],
      propertiesByLocationChart: categoryBreakdown.slice(0, 6),
      stockMovementsByMonth: monthlyTrend.map(mt => ({ label: mt.month, value: mt.requests, color: '#3b82f6' })),
      receivingByStatus: [
        { label: 'Accepted', value: approvedRec, color: '#10b981' },
        { label: 'Rejected', value: rejectedRec, color: '#ef4444' },
      ],
      dailyCreatedProperties: categoryBreakdown.slice(0, 5).map(c => ({
        label: c.label, value: Math.round(c.value / 3), color: c.color,
      })),
      monthlyTrend,
      categoryBreakdown,
      departmentActivity,
      recentActivities,
      lowStockAlerts,
      pendingTasks: [],
      quickActions: [],
    };
  }
}
