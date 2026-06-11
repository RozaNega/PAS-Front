import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { normalizePasListResponse } from '../../../../core/utils/pas-api-json.util';

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
  }): Observable<{ success: boolean; message: string; data: IssuanceReportItem[]; statusCode: number }> {
    return this.apiService.get<unknown>('StoreIssueVouchers', filters).pipe(
      map((raw) => normalizePasListResponse<any>(raw)),
      map((res) => {
        if (res.success !== false && res.data.length > 0) {
          const items: IssuanceReportItem[] = res.data.map((item: any) => ({
            date: new Date(item.issueDate).toLocaleDateString() || '',
            sivNumber: item.voucherNumber || item.id || '',
            requester: item.issuedBy || 'Unknown',
            department: item.department || 'N/A',
            item: (item.items && item.items.length > 0) ? (item.items[0].itemName || 'Multiple Items') : 'N/A',
            quantity: (item.items && item.items.length > 0) ? (item.items.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0)) : 0,
            value: (item.items && item.items.length > 0) ? (item.items.reduce((sum: number, i: any) => sum + ((i.quantity || 0) * (i.unitPrice || 0)), 0)) : 0
          }));
          return { success: res.success, message: res.message, data: items, statusCode: res.statusCode };
        }
        return { success: res.success, message: res.message, data: [], statusCode: res.statusCode };
      })
    );
  }
}
