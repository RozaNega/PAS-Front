import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { ApiServiceRequest, ApiReturnMaterialRequest } from '../../types/dashboard.types';

export type PasModuleKind = 'properties' | 'users' | 'leases' | 'payments' | 'maintenance';
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
}
export interface PaginatedResponse<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
export interface DashboardStatistics {
  totalProperties: number;
  totalLocations: number;
  totalSafetyBoxes: number;
  totalItems: number;
  totalSuppliers: number;
  totalEmployees: number;
  totalStockValue: number;
  totalPropertyValue: number;
  lowStockItemsCount: number;
  outOfStockItemsCount: number;
  requisitionsByStatus: Array<{ label: string; value: number; color?: string }>;
  stockMovementsByMonth: Array<{ label: string; value: number; color?: string }>;
  propertiesByLocationChart: Array<{ label: string; value: number; color?: string }>;
  dailyCreatedProperties: Array<{ label: string; value: number; color?: string }>;
  recentActivities: Array<{
    id: string;
    action: string;
    entityName: string;
    userName: string;
    timeAgo: string;
  }>;
  pendingTasks: Array<{ id: string; description: string; priority: string; status: string }>;
}

export interface Property {
  id: string;
  name: string;
  location: string;
  status: 'Active' | 'Vacant' | 'Under Maintenance' | 'Flagged';
  value: string;
  type: 'Residential' | 'Commercial' | 'Mixed-Use' | 'Office';
}

export interface StockItem {
  code: string;
  name: string;
  category: string;
  currentStock: number;
  minLevel: number;
  status: 'Normal' | 'Low' | 'Critical' | 'Out of Stock';
}

export interface LowStockAlert {
  item: string;
  current: number;
  min: number;
  priority: 'warning' | 'critical';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Storekeeper' | 'Manager';
  status: 'Active' | 'Inactive';
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
}

@Injectable({ providedIn: 'root' })
export class PasApiService {
  constructor(private readonly api: ApiService, private readonly http: HttpClient) {}

  dashboardStatistics(): Observable<DashboardStatistics> {
    return this.api
      .get<ApiResponse<DashboardStatistics>>('dashboard/statistics')
      .pipe(map((response: any) => response.data));
  }

  list(kind: PasModuleKind): Observable<PaginatedResponse<Record<string, unknown>>> {
    return this.api
      .get<ApiResponse<PaginatedResponse<Record<string, unknown>>>>(this.endpointFor(kind))
      .pipe(map((response: any) => response.data));
  }

  create(kind: PasModuleKind, payload: Record<string, unknown>): Observable<unknown> {
    if (kind === 'payments') {
      return this.api.post('inventory-stock/adjust', payload);
    }
    return this.api.post(this.endpointFor(kind), payload);
  }

  update(
    kind: PasModuleKind,
    id: string | number,
    payload: Record<string, unknown>,
  ): Observable<unknown> {
    if (kind === 'payments') {
      return this.api.post('inventory-stock/adjust', payload);
    }
    return this.api.put(`${this.endpointFor(kind)}/${id}`, payload);
  }

  remove(kind: PasModuleKind, id: string | number): Observable<unknown> {
    if (kind === 'payments') {
      return this.api.post('inventory-stock/release', { inventoryId: id, quantity: 1 });
    }
    return this.api.delete(`${this.endpointFor(kind)}/${id}`);
  }

  // Properties API methods
  getProperties(): Observable<Property[]> {
    return this.api
      .get<ApiResponse<Property[]>>('properties')
      .pipe(map((response: any) => response.data));
  }

  createProperty(property: Omit<Property, 'id'>): Observable<Property> {
    return this.api
      .post<ApiResponse<Property>>('properties', property)
      .pipe(map((response: any) => response.data));
  }

  updateProperty(id: string, property: Partial<Property>): Observable<Property> {
    return this.api
      .put<ApiResponse<Property>>(`properties/${id}`, property)
      .pipe(map((response: any) => response.data));
  }

  deleteProperty(id: string): Observable<unknown> {
    return this.api.delete(`properties/${id}`);
  }

  // Users API methods
  getUsers(): Observable<User[]> {
    return this.api.get<ApiResponse<User[]>>('users').pipe(map((response: any) => response.data));
  }

  createUser(user: Omit<User, 'id'>): Observable<User> {
    return this.api.post<ApiResponse<User>>('users', user).pipe(map((response: any) => response.data));
  }

  updateUser(id: string, user: Partial<User>): Observable<User> {
    return this.api
      .put<ApiResponse<User>>(`users/${id}`, user)
      .pipe(map((response: any) => response.data));
  }

  deleteUser(id: string): Observable<unknown> {
    return this.api.delete(`users/${id}`);
  }

  updateProfile(id: string, profile: any): Observable<unknown> {
    return this.api.put(`users/${id}`, profile);
  }

  // Inventory API methods
  getStockItems(): Observable<StockItem[]> {
    return this.api
      .get<ApiResponse<StockItem[]>>('inventory/stock')
      .pipe(map((response: any) => response.data));
  }

  createStockItem(item: Omit<StockItem, 'id'>): Observable<StockItem> {
    return this.api
      .post<ApiResponse<StockItem>>('inventory/stock', item)
      .pipe(map((response: any) => response.data));
  }

  updateStockItem(id: string, item: Partial<StockItem>): Observable<StockItem> {
    return this.api
      .put<ApiResponse<StockItem>>(`inventory/stock/${id}`, item)
      .pipe(map((response: any) => response.data));
  }

  deleteStockItem(id: string): Observable<unknown> {
    return this.api.delete(`inventory/stock/${id}`);
  }

  adjustStock(id: string, quantity: number, reason: string): Observable<unknown> {
    return this.api.post('inventory/stock/adjust', { id, quantity, reason });
  }

  transferStock(fromId: string, toId: string, quantity: number): Observable<unknown> {
    return this.api.post('inventory/stock/transfer', { fromId, toId, quantity });
  }

  // Notifications API methods
  getNotifications(): Observable<Notification[]> {
    return this.api
      .get<ApiResponse<Notification[]>>('notifications')
      .pipe(map((response: any) => response.data));
  }

  createNotification(notification: Omit<Notification, 'id'>): Observable<Notification> {
    return this.api
      .post<ApiResponse<Notification>>('notifications', notification)
      .pipe(map((response: any) => response.data));
  }

  markNotificationAsRead(id: string): Observable<unknown> {
    return this.api.put(`notifications/${id}/read`, {});
  }

  deleteNotification(id: string): Observable<unknown> {
    return this.api.delete(`notifications/${id}`);
  }

  // Download SIV PDF as Blob. Backend endpoint expected at `sivs/{sivId}/pdf` or `requisitions/sivs/${sivId}/pdf`.
  downloadSivPdf(sivId: string): Observable<Blob> {
    // Use HttpClient directly for blob download
    return this.http.get(`/api/requisitions/sivs/${sivId}/pdf`, { responseType: 'blob' });
  }

  // Service Requests API
  createServiceRequest(request: ApiServiceRequest): Observable<unknown> {
    return this.api.post('ServiceRequests', request);
  }

  createReturnMaterialRequest(request: ApiReturnMaterialRequest): Observable<unknown> {
    return this.api.post('ReturnMaterialRequests', request);
  }

  private endpointFor(kind: PasModuleKind): string {
    if (kind === 'properties') return 'properties';
    if (kind === 'users') return 'users';
    if (kind === 'leases') return 'service-requests';
    if (kind === 'payments') return 'inventory-stock';
    return 'service-requests';
  }
}
