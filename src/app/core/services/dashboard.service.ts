import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface DashboardStatistics {
  totalProperties: number;
  totalWarehouses: number;
  totalItems: number;
  totalUsers: number;
  pendingRequests: number;
  lowStockItems: number;
  recentActivities: any[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private apiService: ApiService) {}

  getStatistics(): Observable<ApiResponseModel<DashboardStatistics>> {
    return this.apiService.get<ApiResponseModel<DashboardStatistics>>('Dashboard/statistics');
  }
}
