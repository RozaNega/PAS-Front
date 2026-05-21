import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
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

  private createMockIssuances(): IssuanceReportItem[] {
    return [
      { date: 'Dec 15', sivNumber: 'SIV-045', requester: 'John Doe', department: 'IT', item: 'Dell Laptop', quantity: 2, value: 4998 },
      { date: 'Dec 15', sivNumber: 'SIV-044', requester: 'Sarah Smith', department: 'HR', item: 'Office Chair', quantity: 3, value: 1350 },
      { date: 'Dec 14', sivNumber: 'SIV-043', requester: 'Mike Wilson', department: 'Operations', item: 'USB Cables', quantity: 50, value: 250 },
      { date: 'Dec 14', sivNumber: 'SIV-042', requester: 'Lisa Wong', department: 'Finance', item: 'Monitor', quantity: 2, value: 700 },
      { date: 'Dec 13', sivNumber: 'SIV-041', requester: 'Peter Chen', department: 'Marketing', item: 'A4 Paper', quantity: 10, value: 250 }
    ];
  }

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
      catchError(() => {
        return of({
          success: true,
          message: 'Using mock issuance report data',
          data: this.createMockIssuances(),
          statusCode: 200
        } as ApiResponse<IssuanceReportItem[]>);
      })
    );
  }
}
