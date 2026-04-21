import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../../../config/api.config';
import { ApiResponseModel } from '../../../core/models/api-response.model';
import { ApiService } from '../../../core/services/api.service';

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  constructor(private readonly apiService: ApiService) {}

  getInventoryValuation(params?: unknown): Observable<ApiResponseModel<unknown>> {
    return this.apiService.get<ApiResponseModel<unknown>>(
      API_ENDPOINTS.REPORTS.INVENTORY_VALUATION,
      params,
    );
  }
}
