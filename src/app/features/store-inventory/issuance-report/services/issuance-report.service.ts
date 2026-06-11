import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { ApiResponse } from '../../../../types/api-response.type';

export interface IssuanceReportItem {
  date: string;
  sivNumber: string;
  requester: string;
  department: string;
  item: string;
  quantity: number;
  value: number;
}

@Injectable({ providedIn: 'root' })
export class IssuanceReportService {
  constructor(private apiService: ApiService) {}

  getIssuanceReport(filters?: {
    warehouseId?: string;
    departmentId?: string;
    dateFrom?: string;
    dateTo?: string;
    pageSize?: number;
  }): Observable<ApiResponse<IssuanceReportItem[]>> {
    return this.apiService.get<ApiResponse<IssuanceReportItem[]>>('StoreIssueVouchers', filters).pipe(
      map((res: any) => {
        if (res.success !== false && Array.isArray(res.data)) {
          const items = (res.data as any[]).map(item => ({
            date: new Date(item.issueDate).toLocaleDateString() || '',
            sivNumber: item.voucherNumber || item.id || '',
            requester: item.issuedBy || 'Unknown',
            department: item.department || 'N/A',
            item: (item.items && item.items.length > 0) ? (item.items[0].itemName || 'Multiple Items') : 'N/A',
            quantity: (item.items && item.items.length > 0) ? (item.items.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0)) : 0,
            value: (item.items && item.items.length > 0) ? (item.items.reduce((sum: number, i: any) => sum + ((i.quantity || 0) * (i.unitPrice || 0)), 0)) : 0
          }));
          return { ...res, data: items } as ApiResponse<IssuanceReportItem[]>;
        }
        return { ...res, data: [] } as ApiResponse<IssuanceReportItem[]>;
      }),
    );
  }
}
