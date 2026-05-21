import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
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

  private createMockReceivings(): ReceivingReportItem[] {
    return [
      { date: 'Dec 15', grnNumber: 'GRN-045', supplier: 'Tech Supplies', items: 3, quantity: 125, value: 30740, status: 'Pending' },
      { date: 'Dec 14', grnNumber: 'GRN-044', supplier: 'Office Depot', items: 2, quantity: 50, value: 12500, status: 'Passed' },
      { date: 'Dec 14', grnNumber: 'GRN-043', supplier: 'Global Suppliers', items: 1, quantity: 100, value: 500, status: 'Failed' },
      { date: 'Dec 13', grnNumber: 'GRN-042', supplier: 'Paper Co', items: 2, quantity: 200, value: 5000, status: 'Passed' },
      { date: 'Dec 12', grnNumber: 'GRN-041', supplier: 'Tech Supplies', items: 3, quantity: 75, value: 18750, status: 'Passed' }
    ];
  }

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
      catchError(() => {
        return of({
          success: true,
          message: 'Using mock receiving report data',
          data: this.createMockReceivings(),
          statusCode: 200
        } as ApiResponse<ReceivingReportItem[]>);
      })
    );
  }
}
