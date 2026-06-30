import { Component, OnInit, inject } from '@angular/core';
import { ReportsService, DisposalReportDto } from '../../../core/services/reports.service';

@Component({
  selector: 'app-disposal-report',
  standalone: false,
  templateUrl: './disposal-report.component.html',
  styleUrls: ['./disposal-report.component.scss']
})
export class DisposalReportComponent implements OnInit {
  private readonly reportsService = inject(ReportsService);

  reportData: DisposalReportDto | null = null;
  loading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadReport();
  }

  loadReport(): void {
    this.loading = true;
    this.errorMessage = '';
    this.reportsService.getDisposalReport().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.reportData = res.data;
        } else {
          this.errorMessage = 'Unable to load disposal report data.';
        }
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load disposal report.';
        this.loading = false;
      },
    });
  }

  get totalDisposals(): string {
    return this.reportData?.summary.totalDisposals.toLocaleString() ?? '0';
  }

  get pendingDisposals(): string {
    return this.reportData?.summary.pendingApprovals.toLocaleString() ?? '0';
  }

  get recoveredValue(): string {
    if (!this.reportData) return 'ETB 0';
    const val = this.reportData.summary.totalEstimatedValue;
    if (val >= 1_000_000) return `ETB ${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `ETB ${(val / 1_000).toFixed(0)}K`;
    return `ETB ${Math.round(val)}`;
  }
}
