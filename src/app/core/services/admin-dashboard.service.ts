import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface DashboardData {
  platform?: { title: string };
  highlights?: Array<{ value: string | number; label: string }>;
  recentActivities?: any[];
  summaryCards?: any[];
}

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  constructor(private apiService: ApiService) {}

  getDashboardData(): Observable<ApiResponseModel<DashboardData>> {
    return this.apiService.get<DashboardData>('Dashboard/statistics');
  }
}
