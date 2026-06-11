import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { ApiResponse } from '../../../../types/api-response.type';

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
  }): Observable<ApiResponse<ReceivingReportItem[]>> {
    const params = { ...filters, movementType: 'Inbound', pageSize: filters?.pageSize || 100 };
    return this.apiService.get<ApiResponse<ReceivingReportItem[]>>('StockLedger', params).pipe(
      map((res: any) => {
        if (res.success !== false && Array.isArray(res.data)) {
          const items = (res.data as any[]).map((item, index) => ({
            date: new Date(item.movementDate).toLocaleDateString() || '',
            grnNumber: item.referenceNumber || `GRN-${String(index).padStart(3, '0')}`,
            supplier: item.supplierName || 'N/A',
            items: 1,
            quantity: item.quantity || 0,
            value: (item.quantity || 0) * (item.unitPrice || 0),
            status: item.status === 'Pending' ? 'Pending' : (item.status === 'Rejected' ? 'Failed' : 'Passed')
          }));
          return { ...res, data: items } as ApiResponse<ReceivingReportItem[]>;
        }
        return { ...res, data: [] } as ApiResponse<ReceivingReportItem[]>;
      }),
    );
  }
}
