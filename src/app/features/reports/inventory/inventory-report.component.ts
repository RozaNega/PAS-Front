import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ReportService } from '../services/report.service';
import { NotificationService } from '../../../core/services/notification.service';

type InventoryValuationItem = {
  itemId: string;
  itemName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  locations: string[];
};

type InventoryValuationLocation = {
  locationName: string;
  itemCount: number;
  quantity: number;
  totalValue: number;
};

type InventoryValuationReport = {
  generatedAt: string;
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  items: InventoryValuationItem[];
  byLocation: InventoryValuationLocation[];
};

@Component({
  selector: 'app-inventory-report',
  standalone: false,
  templateUrl: './inventory-report.component.html',
  styleUrls: ['./inventory-report.component.scss'],
})
export class InventoryReportComponent implements OnInit {
  reportData: InventoryValuationReport | null = null;
  loading = false;
  hasLoaded = false;

  filterForm: FormGroup;

  constructor(
    private readonly reportService: ReportService,
    private readonly notificationService: NotificationService,
    private readonly fb: FormBuilder,
  ) {
    this.filterForm = this.fb.group({
      asOfDate: [new Date().toISOString().split('T')[0]],
      minValue: [''],
      maxValue: [''],
    });
  }

  ngOnInit(): void {
    this.loadReport();
  }

  loadReport(): void {
    this.loading = true;
    this.reportData = null;

    this.reportService.getInventoryValuation(this.filterForm.value).subscribe({
      next: (response: unknown) => {
        const data = this.extractReportData(response);
        if (data) {
          this.reportData = data;
        }
        this.hasLoaded = true;
        this.loading = false;
      },
      error: () => {
        this.hasLoaded = true;
        this.loading = false;
        this.notificationService.error('Failed to load inventory report');
      },
    });
  }

  onFilter(): void {
    this.loadReport();
  }

  resetFilters(): void {
    this.filterForm.reset({
      asOfDate: new Date().toISOString().split('T')[0],
      minValue: '',
      maxValue: '',
    });
    this.loadReport();
  }

  private extractReportData(response: unknown): InventoryValuationReport | null {
    if (!response || typeof response !== 'object') {
      return null;
    }

    const record = response as Record<string, unknown>;

    if ('data' in record) {
      const success = record['success'];
      const succeeded = record['succeeded'];
      const isSuccess =
        (typeof success === 'boolean' && success) || (typeof succeeded === 'boolean' && succeeded);

      if (!isSuccess) {
        return null;
      }

      return record['data'] as InventoryValuationReport | null;
    }

    return response as InventoryValuationReport;
  }
}
