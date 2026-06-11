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
        return of({
          success: false,
          message: 'Dashboard statistics API unavailable',
          data: undefined,
          statusCode: 0,
        } satisfies ApiResponseModel<DashboardStatistics>);
      }),
    );
  }
}
