import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ReportService } from '../services/report.service';
import { ReportsService } from '../../../core/services/reports.service';
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
  styleUrls: ['./inventory-report.component.scss']
})
export class InventoryReportComponent implements OnInit {
  reportData: InventoryValuationReport | null = null;
  loading = false;
  hasLoaded = false;
  hasLiveData = false;
  loadErrorMessage = '';
  turnoverDays: number | null = null;

  filterForm: FormGroup;

  constructor(
    private readonly reportService: ReportService,
    private readonly coreReportsService: ReportsService,
    private readonly notificationService: NotificationService,
    private readonly fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      asOfDate: [new Date().toISOString().split('T')[0]],
      minValue: [''],
      maxValue: ['']
    });
  }

  ngOnInit(): void {
    this.loadReport();
  }

  loadReport(): void {
    this.loading = true;
    this.reportData = null;
    this.hasLiveData = false;
    this.loadErrorMessage = '';
    this.turnoverDays = null;

    this.reportService.getInventoryValuation(this.filterForm.value).subscribe({
      next: (response: unknown) => {
        const data = this.extractReportData(response);
        if (data) {
          this.reportData = data;
          this.hasLiveData = true;
          this.loadTurnover();
        } else {
          this.loadErrorMessage = 'Live inventory service is unavailable.';
        }
        this.hasLoaded = true;
        this.loading = false;
      },
      error: () => {
        this.hasLoaded = true;
        this.loading = false;
        this.hasLiveData = false;
        this.loadErrorMessage = 'Unable to reach the inventory report endpoint.';
        this.notificationService.error('Failed to load inventory report.');
      }
    });
  }

  private loadTurnover(): void {
    this.coreReportsService.getStockMovement().subscribe({
      next: (res) => {
        if (res.success && res.data?.summary) {
          const s = res.data.summary;
          const totalMovement = s.totalQuantityIn + s.totalQuantityOut;
          const avgStock = this.reportData?.totalQuantity ?? 1;
          if (avgStock > 0 && totalMovement > 0) {
            this.turnoverDays = Math.round((avgStock / totalMovement) * 30);
          }
        }
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
      maxValue: ''
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
      const isSuccess = (typeof success === 'boolean' && success)
        || (typeof succeeded === 'boolean' && succeeded);

      if (!isSuccess) {
        return null;
      }

      return record['data'] as InventoryValuationReport | null;
    }

    return response as InventoryValuationReport;
  }

  get totalStockValue(): string {
    if (!this.reportData) {
      return 'ETB 0';
    }

    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      maximumFractionDigits: 0,
    }).format(this.reportData.totalValue);
  }

  get lowStockItems(): string {
    if (!this.reportData) {
      return '0';
    }

    const count = this.reportData.items.filter((item) => item.quantity <= 5).length;
    return String(count);
  }

  get averageTurnover(): string {
    if (this.turnoverDays === null) return '—';
    return `${this.turnoverDays} days`;
  }
}

