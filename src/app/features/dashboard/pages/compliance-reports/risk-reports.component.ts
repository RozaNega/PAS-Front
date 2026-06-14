import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { downloadReportPdf, ReportDetailRow } from './report-actions.util';
import { WorkflowService } from '../../../../core/services/workflow.service';

interface RiskReport {
  id: string;
  reportName: string;
  riskLevel: string;
  generatedDate: string;
  highRiskItems: number;
  mediumRiskItems: number;
  lowRiskItems: number;
  riskAssessor: string;
  mitigationStrategy: string;
  nextReviewDate: string;
  safetyIndex: string;
}

@Component({
  selector: 'app-risk-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './risk-reports.component.html',
  styleUrls: ['./risk-reports.component.scss'],
})
export class RiskReportsComponent {
  private readonly workflowService = inject(WorkflowService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    setTimeout(() => this.loading.set(false), 600);
  }

  protected readonly reports = computed<RiskReport[]>(() => {
    const reqs = this.workflowService.getAllRequests();
    if (reqs.length === 0) return [];

    const high = reqs.filter(r => ['Urgent', 'High'].includes(r.priority)).length;
    const medium = reqs.filter(r => r.priority === 'Medium').length;
    const low = reqs.filter(r => r.priority === 'Low').length;
    const level = high > 2 ? 'High' : 'Medium';
    const safetyIndex = reqs.length > 0 ? Math.round(((low + medium) / reqs.length) * 100) : 100;

    const liveReport: RiskReport = {
      id: 'live-risk-1',
      reportName: 'Backend Risk Assessment',
      riskLevel: level,
      generatedDate: new Date().toISOString().split('T')[0],
      highRiskItems: high,
      mediumRiskItems: medium,
      lowRiskItems: low,
      riskAssessor: 'Backend data',
      mitigationStrategy: 'Immediate isolation tags for high priority requests',
      nextReviewDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      safetyIndex: `${safetyIndex}% Safety Index Rating`
    };

    return [liveReport];
  });

  readonly totalItems = computed(() => this.reports().reduce((s, r) => s + r.highRiskItems + r.mediumRiskItems + r.lowRiskItems, 0));
  readonly highRiskCount = computed(() => this.reports().reduce((s, r) => s + r.highRiskItems, 0));
  readonly mediumRiskCount = computed(() => this.reports().reduce((s, r) => s + r.mediumRiskItems, 0));
  readonly lowRiskCount = computed(() => this.reports().reduce((s, r) => s + r.lowRiskItems, 0));

  readonly activeViewReport = signal<RiskReport | null>(null);
  readonly downloadingReportId = signal<string | null>(null);
  readonly downloadProgress = signal<number>(0);

  refreshReports(): void {
    this.loading.set(true);
    this.error.set(null);
    setTimeout(() => this.loading.set(false), 500);
  }

  exportCsv(): void {
    const rows = this.reports();
    if (!rows.length) return;

    const headers = ['Report Name', 'Risk Level', 'Generated Date', 'High Risk Items', 'Medium Risk Items', 'Low Risk Items', 'Safety Index'];
    const csvRows = rows.map(r => [
      r.reportName, r.riskLevel, r.generatedDate, r.highRiskItems, r.mediumRiskItems, r.lowRiskItems, r.safetyIndex
    ].join(','));

    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'risk-reports.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  viewReport(report: RiskReport): void {
    this.activeViewReport.set(report);
  }

  async downloadReport(report: RiskReport): Promise<void> {
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
            await downloadReportPdf('Risk Assessment Report', report.reportName, this.buildDetails(report));
          }, 400);
          return 100;
        }
        return prev + 10;
      });
    }, 80);
  }

  private buildDetails(report: RiskReport): ReportDetailRow[] {
    return [
      { label: 'Report Name', value: report.reportName },
      { label: 'Risk Level', value: report.riskLevel },
      { label: 'Generated Date', value: report.generatedDate },
      { label: 'High Risk Items Count', value: report.highRiskItems },
      { label: 'Medium Risk Items Count', value: report.mediumRiskItems },
      { label: 'Low Risk Items Count', value: report.lowRiskItems },
      { label: 'Risk Assessor Assigned', value: report.riskAssessor },
      { label: 'Active Mitigation Strategy', value: report.mitigationStrategy },
      { label: 'Next Scheduled Review Date', value: report.nextReviewDate },
      { label: 'Calculated Safety Index', value: report.safetyIndex }
    ];
  }

  closeModal(): void {
    this.activeViewReport.set(null);
  }
}
