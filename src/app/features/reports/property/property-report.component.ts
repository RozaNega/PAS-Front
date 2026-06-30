import { Component, OnInit, inject } from '@angular/core';
import { ReportsService, PropertyValuationReportDto } from '../../../core/services/reports.service';

@Component({
  selector: 'app-property-report',
  standalone: false,
  templateUrl: './property-report.component.html',
  styleUrls: ['./property-report.component.scss']
})
export class PropertyReportComponent implements OnInit {
  private readonly reportsService = inject(ReportsService);

  reportData: PropertyValuationReportDto | null = null;
  loading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadReport();
  }

  loadReport(): void {
    this.loading = true;
    this.errorMessage = '';
    this.reportsService.getPropertyValuation().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.reportData = res.data;
        } else {
          this.errorMessage = 'Unable to load property report data.';
        }
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load property report.';
        this.loading = false;
      },
    });
  }

  get totalAssets(): string {
    return this.reportData?.summary.totalProperties.toLocaleString() ?? '0';
  }

  get assignedAssets(): string {
    if (!this.reportData) return '0';
    const assigned = this.reportData.summary.totalProperties - this.reportData.summary.propertiesWithoutLocation;
    return assigned.toLocaleString();
  }

  get pendingVerification(): string {
    return this.reportData?.summary.propertiesWithoutSafetyBox.toLocaleString() ?? '0';
  }
}
