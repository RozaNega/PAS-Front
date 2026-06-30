import { Component, OnInit, inject } from '@angular/core';
import { ReportsService, StockMovementReportDto } from '../../../core/services/reports.service';

@Component({
  selector: 'app-stock-movement-report',
  standalone: false,
  templateUrl: './stock-movement-report.component.html',
  styleUrls: ['./stock-movement-report.component.scss']
})
export class StockMovementReportComponent implements OnInit {
  private readonly reportsService = inject(ReportsService);

  reportData: StockMovementReportDto | null = null;
  loading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadReport();
  }

  loadReport(): void {
    this.loading = true;
    this.errorMessage = '';
    this.reportsService.getStockMovement().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.reportData = res.data;
        } else {
          this.errorMessage = 'Unable to load stock movement report data.';
        }
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load stock movement report.';
        this.loading = false;
      },
    });
  }

  get totalIncoming(): string {
    return this.reportData?.summary.totalQuantityIn.toLocaleString() ?? '0';
  }

  get totalOutgoing(): string {
    return this.reportData?.summary.totalQuantityOut.toLocaleString() ?? '0';
  }

  get netBalance(): string {
    if (!this.reportData) return '0';
    const net = this.reportData.summary.netMovement;
    return net >= 0 ? `+${net.toLocaleString()}` : net.toLocaleString();
  }
}
