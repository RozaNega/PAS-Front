import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { downloadReportPdf, ReportDetailRow } from './report-actions.util';
import { WorkflowService } from '../../../../core/services/workflow.service';

interface InspectionReport {
  id: string;
  reportName: string;
  generatedDate: string;
  totalInspections: number;
  passedInspections: number;
  failedInspections: number;
  inspectedBy: string;
  standardsUsed: string;
  warehouseSectors: string;
  defectRate: string;
  defectRateValue: number;
}

@Component({
  selector: 'app-inspection-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inspection-reports.component.html',
  styleUrls: ['./inspection-reports.component.scss'],
})
export class InspectionReportsComponent {
  private readonly workflowService = inject(WorkflowService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  protected readonly reports = computed<InspectionReport[]>(() => {
    try {
      const reqs = this.workflowService.getAllRequests();
      if (reqs.length === 0) {
        this.loading.set(false);
        return [];
      }

      const total = reqs.length;
      const passed = reqs.filter(r => ['Completed', 'Manager Approved', 'Admin Approved'].includes(r.status)).length;
      const failed = reqs.filter(r => ['Manager Rejected', 'Admin Rejected', 'Cancelled'].includes(r.status)).length;
      const rate = total > 0 ? (failed / total) * 100 : 0;

      const liveReport: InspectionReport = {
        id: 'live-inspection-1',
        reportName: 'Backend Inspection Report',
        generatedDate: new Date().toISOString().split('T')[0],
        totalInspections: total,
        passedInspections: passed,
        failedInspections: failed,
        inspectedBy: 'Backend data',
        standardsUsed: 'ISO 9001:2015 & MIL-STD-105E QA Protocol',
        warehouseSectors: 'Active Store Inventory and Receiving Sectors',
        defectRate: `${rate.toFixed(1)}% Defect Rate`,
        defectRateValue: rate
      };

      this.loading.set(false);
      return [liveReport];
    } catch (e) {
      this.error.set('Failed to load inspection reports.');
      this.loading.set(false);
      return [];
    }
  });

  protected readonly totalInspections = computed(() =>
    this.reports().reduce((sum, r) => sum + r.totalInspections, 0)
  );

  protected readonly totalPassed = computed(() =>
    this.reports().reduce((sum, r) => sum + r.passedInspections, 0)
  );

  protected readonly totalFailed = computed(() =>
    this.reports().reduce((sum, r) => sum + r.failedInspections, 0)
  );

  protected readonly defectRatePct = computed(() => {
    const total = this.totalInspections();
    if (total === 0) return 0;
    return parseFloat(((this.totalFailed() / total) * 100).toFixed(1));
  });

  readonly activeViewReport = signal<InspectionReport | null>(null);
  readonly downloadingReportId = signal<string | null>(null);
  readonly downloadProgress = signal<number>(0);

  viewReport(report: InspectionReport): void {
    this.activeViewReport.set(report);
  }

  async downloadReport(report: InspectionReport): Promise<void> {
    if (this.downloadingReportId()) return;

    this.downloadingReportId.set(report.id);
    this.downloadProgress.set(0);

    const interval = setInterval(() => {
      this.downloadProgress.update(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(async () => {
            this.downloadingReportId.set(null);
            this.downloadProgress.set(0);
            await downloadReportPdf('Inspection Report', report.reportName, this.buildDetails(report));
          }, 400);
          return 100;
        }
        return prev + 10;
      });
    }, 80);
  }

  private buildDetails(report: InspectionReport): ReportDetailRow[] {
    return [
      { label: 'Report Name', value: report.reportName },
      { label: 'Generated Date', value: report.generatedDate },
      { label: 'Total Inspections', value: report.totalInspections },
      { label: 'Passed Inspections', value: report.passedInspections },
      { label: 'Failed Inspections', value: report.failedInspections },
      { label: 'Inspected By', value: report.inspectedBy },
      { label: 'Standards Applied', value: report.standardsUsed },
      { label: 'Warehouse Sectors Covered', value: report.warehouseSectors },
      { label: 'Calculated Defect Rate', value: report.defectRate }
    ];
  }

  closeModal(): void {
    this.activeViewReport.set(null);
  }

  exportCsv(): void {
    const rows = this.reports();
    if (rows.length === 0) return;

    const headers = ['Report Name', 'Generated Date', 'Total Inspections', 'Passed', 'Failed', 'Defect Rate', 'Inspector'];
    const csvContent = [
      headers.join(','),
      ...rows.map(r => [
        `"${r.reportName}"`,
        r.generatedDate,
        r.totalInspections,
        r.passedInspections,
        r.failedInspections,
        `"${r.defectRate}"`,
        `"${r.inspectedBy}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspection-reports-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  defectRateBadgeClass(rate: number): string {
    if (rate < 5) return 'badge badge--success';
    if (rate < 15) return 'badge badge--warning';
    return 'badge badge--danger';
  }
}
