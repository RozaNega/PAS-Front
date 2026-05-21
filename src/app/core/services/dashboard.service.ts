import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
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

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private apiService: ApiService) {}

  private createMockData(): DashboardStatistics {
    return {
      totalProperties: 156,
      totalLocations: 12,
      totalSafetyBoxes: 48,
      totalItems: 2847,
      totalSuppliers: 23,
      totalEmployees: 89,
      pendingRequisitions: 12,
      approvedRequisitions: 34,
      issuedRequisitions: 28,
      completedRequisitions: 156,
      rejectedRequisitions: 5,
      pendingInspections: 8,
      approvedReceiving: 42,
      rejectedReceiving: 3,
      totalStockValue: 450000,
      lowStockItemsCount: 7,
      outOfStockItemsCount: 2,
      totalPropertyValue: 2500000,
      propertiesByLocation: 12,
      propertiesByType: 5,
      requisitionsByStatus: [
        { label: 'Pending', value: 12, color: '#f59e0b' },
        { label: 'Approved', value: 34, color: '#10b981' },
        { label: 'Rejected', value: 5, color: '#ef4444' },
        { label: 'Completed', value: 156, color: '#3b82f6' },
        { label: 'Issued', value: 28, color: '#8b5cf6' },
      ],
      propertiesByLocationChart: [
        { label: 'Main Warehouse', value: 45, color: '#3b82f6' },
        { label: 'Branch A', value: 32, color: '#10b981' },
        { label: 'Branch B', value: 24, color: '#f59e0b' },
        { label: 'Regional Hub', value: 55, color: '#8b5cf6' },
      ],
      stockMovementsByMonth: [],
      receivingByStatus: [],
      dailyCreatedProperties: [],
      recentActivities: [
        {
          id: '1',
          action: 'Property added',
          entityName: 'Office Building A',
          entityId: 'prop-001',
          userName: 'John Admin',
          actionDate: new Date().toISOString(),
          timeAgo: '2 hours ago',
          icon: 'bi bi-building',
          color: 'blue',
        },
        {
          id: '2',
          action: 'Requisition approved',
          entityName: 'Laptop Request',
          entityId: 'req-042',
          userName: 'Sarah Manager',
          actionDate: new Date(Date.now() - 3600000).toISOString(),
          timeAgo: '1 hour ago',
          icon: 'bi bi-check-circle',
          color: 'green',
        },
      ],
      lowStockAlerts: [
        {
          itemId: 'item-001',
          itemName: 'Office Paper A4',
          sku: 'PAP-A4-001',
          currentStock: 15,
          minStockLevel: 50,
          deficit: 35,
          location: 'Main Warehouse',
          severity: 'Critical',
        },
        {
          itemId: 'item-002',
          itemName: 'Printer Cartridge',
          sku: 'PRT-CAR-002',
          currentStock: 8,
          minStockLevel: 20,
          deficit: 12,
          location: 'Branch A',
          severity: 'Warning',
        },
      ],
      pendingTasks: [],
      quickActions: [],
    };
  }

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
      catchError(() => {
        console.warn('Dashboard API unavailable, using mock data');
        return of({
          success: true,
          message: 'Mock data (API unavailable)',
          data: this.createMockData(),
          statusCode: 200,
        } satisfies ApiResponseModel<DashboardStatistics>);
      }),
    );
  }
}
