import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../config/api.config';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private api: ApiService) {}

  getStatistics(params?: any): Observable<any> {
    return this.api.get<any>(API_ENDPOINTS.DASHBOARD.STATISTICS, params);
  }
}
