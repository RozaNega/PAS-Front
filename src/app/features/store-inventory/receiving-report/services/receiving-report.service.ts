import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../../../core/services/api.service';
import { normalizePasListResponse } from '../../../../core/utils/pas-api-json.util';

export interface ReceivingReportItem {
  date: string;
  grnNumber: string;
  supplier: string;
  items: number;
  quantity: number;
  value: number;
  status: 'Pending' | 'Passed' | 'Failed';
}

@Injectable({ providedIn: 'root' })
export class ReceivingReportService {
  constructor(private apiService: ApiService) {}

  getReceivingReport(filters?: {
    supplierId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    pageSize?: number;
  }): Observable<{ success: boolean; message: string; data: ReceivingReportItem[]; statusCode: number }> {
    const params = { ...filters, movementType: 'Inbound', pageSize: filters?.pageSize || 100 };
    return this.apiService.get<unknown>('StockLedger', params).pipe(
      map((raw) => normalizePasListResponse<any>(raw)),
      map((res) => {
        if (res.success !== false && res.data.length > 0) {
          const items: ReceivingReportItem[] = res.data.map((item: any, index: number) => ({
            date: new Date(item.movementDate).toLocaleDateString() || '',
            grnNumber: item.referenceNumber || `GRN-${String(index).padStart(3, '0')}`,
            supplier: item.supplierName || 'N/A',
            items: 1,
            quantity: item.quantity || 0,
            value: (item.quantity || 0) * (item.unitPrice || 0),
            status: item.status === 'Pending' ? 'Pending' : (item.status === 'Rejected' ? 'Failed' : 'Passed')
          }));
          return { success: res.success, message: res.message, data: items, statusCode: res.statusCode };
        }

        return { success: res.success, message: res.message, data: [], statusCode: res.statusCode };
      }),
      catchError(() => {
        return of({ success: false, message: 'Failed to load receiving report', data: [], statusCode: 500 });
      })
    );
  }
}
