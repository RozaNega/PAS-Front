import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { ApiResponseModel } from '../../../../core/models/api-response.model';
import { normalizeApiResponseModel, normalizePasListResponse } from '../../../../core/utils/pas-api-json.util';

export interface InspectionDto {
  id: string;
  receivingNoteId: string;
  inspectedBy: string;
  inspectionDate: string;
  status: string;
  notes?: string;
  items: unknown[];
  disposition?: string;
}

@Injectable({
  providedIn: 'root',
})
export class InspectionService {
  constructor(private apiService: ApiService) {}

  getAll(params?: Record<string, string | number | boolean | readonly (string | number | boolean)[]>): Observable<ApiResponseModel<InspectionDto[]>> {
    return this.apiService.get<unknown>('Inspections', params).pipe(
      map((raw) => {
        const n = normalizePasListResponse<InspectionDto>(raw);
        return {
          success: n.success,
          message: n.message,
          data: n.data,
          statusCode: n.statusCode,
        } satisfies ApiResponseModel<InspectionDto[]>;
      }),
    );
  }

  getById(id: string): Observable<ApiResponseModel<InspectionDto>> {
    return this.apiService.get<unknown>(`Inspections/${id}`).pipe(
      map((raw) => normalizeApiResponseModel<InspectionDto>(raw)),
    );
  }

  create(data: unknown): Observable<ApiResponseModel<string>> {
    return this.apiService.post<unknown>('Inspections', data).pipe(
      map((raw) => normalizeApiResponseModel<string>(raw)),
    );
  }

  update(id: string, data: unknown): Observable<ApiResponseModel<unknown>> {
    return this.apiService.put<unknown>(`Inspections/${id}`, data).pipe(
      map((raw) => normalizeApiResponseModel<unknown>(raw)),
    );
  }

  delete(id: string): Observable<ApiResponseModel<unknown>> {
    return this.apiService.delete<unknown>(`Inspections/${id}`).pipe(
      map((raw) => normalizeApiResponseModel<unknown>(raw)),
    );
  }
}
