import { Component, OnInit, inject } from '@angular/core';
import { ReportsService, RequisitionHistoryReportDto } from '../../../core/services/reports.service';

@Component({
  selector: 'app-requisition-report',
  standalone: false,
  templateUrl: './requisition-report.component.html',
  styleUrls: ['./requisition-report.component.scss']
})
export class RequisitionReportComponent implements OnInit {
  private readonly reportsService = inject(ReportsService);

  reportData: RequisitionHistoryReportDto | null = null;
  loading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadReport();
  }

  loadReport(): void {
    this.loading = true;
    this.errorMessage = '';
    this.reportsService.getRequisitionHistory().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.reportData = res.data;
        } else {
          this.errorMessage = 'Unable to load requisition report data.';
        }
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load requisition report.';
        this.loading = false;
      },
    });
  }

  get totalRequests(): string {
    return this.reportData?.summary.totalRequisitions.toLocaleString() ?? '0';
  }

  get approvalRate(): string {
    if (!this.reportData || this.reportData.summary.totalRequisitions === 0) return '0%';
    const rate = (this.reportData.summary.approvedCount / this.reportData.summary.totalRequisitions) * 100;
    return `${Math.round(rate)}%`;
  }

  get avgProcessingTime(): string {
    if (!this.reportData?.requisitions.length) return 'N/A';
    const times: number[] = [];
    for (const req of this.reportData.requisitions) {
      if (req.requestDate && req.approvedDate) {
        const d1 = new Date(req.requestDate).getTime();
        const d2 = new Date(req.approvedDate).getTime();
        if (d2 > d1) times.push((d2 - d1) / (1000 * 60 * 60 * 24));
      }
    }
    if (!times.length) return 'N/A';
    const avg = times.reduce((s, t) => s + t, 0) / times.length;
    return `${avg.toFixed(1)} days`;
  }
}
