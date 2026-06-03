import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-stock-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './stock-report.component.html',
  styleUrls: ['./stock-report.component.scss'],
})
export class StockReportComponent implements OnInit {
  reportForm: FormGroup;
  isLoading = false;
  reportData: any = null;
  error: string | null = null;

  reportTypes = [
    { value: 'stock_summary', label: 'Stock Summary' },
    { value: 'low_stock', label: 'Low Stock Report' },
    { value: 'movements', label: 'Stock Movements' },
    { value: 'valuation', label: 'Stock Valuation' },
    { value: 'warehouse', label: 'Warehouse Report' },
  ];

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
  ) {
    this.reportForm = this.fb.group({
      reportType: ['stock_summary'],
      dateFrom: [''],
      dateTo: [''],
      warehouseId: [''],
      category: [''],
    });
  }

  ngOnInit(): void {}

  generateReport(): void {
    this.isLoading = true;
    this.error = null;
    this.reportData = null;

    const { reportType, dateFrom, dateTo } = this.reportForm.value;
    let endpoint = '/StockLedger';
    if (reportType === 'low_stock') endpoint = '/InventoryStock';

    this.api.get<any[]>(endpoint).pipe(
      catchError((err) => {
        this.error = 'Failed to generate report';
        return of({ success: false, message: '', data: [] });
      }),
      finalize(() => (this.isLoading = false)),
    ).subscribe((response) => {
      if (response.success && response.data) {
        this.reportData = Array.isArray(response.data) ? response.data : [];
      }
    });
  }

  exportReport(format: 'pdf' | 'excel' | 'csv'): void {
    console.log(`Exporting report as ${format}...`);
  }

  printReport(): void {
    window.print();
  }

  resetForm(): void {
    this.reportForm.reset({ reportType: 'stock_summary' });
    this.reportData = null;
    this.error = null;
  }
}
