import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { downloadReportPdf, ReportDetailRow } from './report-actions.util';
import { WorkflowService } from '../../../../core/services/workflow.service';

interface StatusReport {
  id: string;
  reportName: string;
  generatedDate: string;
  complianceScore: number;
  totalItems: number;
  compliantItems: number;
  nonCompliantItems: number;
  complianceAuditor: string;
  generalSummary: string;
  lastAuditRef: string;
  actionsRequired: string;
}

@Component({
  selector: 'app-status-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-reports.component.html',
  styleUrls: ['./status-reports.component.scss'],
})
export class StatusReportsComponent {
  private readonly workflowService = inject(WorkflowService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  protected readonly reports = computed<StatusReport[]>(() => {
    try {
      this.error.set(null);
      const reqs = this.workflowService.getAllRequests();
      if (reqs.length === 0) return [];

      const totalItems = reqs.reduce((sum, r) => sum + r.items.length, 0);
      const compliant = reqs.filter(r => ['Completed', 'Manager Approved', 'Admin Approved'].includes(r.status))
                            .reduce((sum, r) => sum + r.items.length, 0);
      const nonCompliant = reqs.filter(r => ['Manager Rejected', 'Admin Rejected', 'Cancelled'].includes(r.status))
                               .reduce((sum, r) => sum + r.items.length, 0);

      const score = totalItems > 0 ? Math.round((compliant / totalItems) * 100) : 100;

      const liveReport: StatusReport = {
        id: 'live-status-1',
        reportName: 'Backend Compliance Status',
        generatedDate: new Date().toISOString().split('T')[0],
        complianceScore: score,
        totalItems: totalItems,
        compliantItems: compliant,
        nonCompliantItems: nonCompliant,
        complianceAuditor: 'Backend data',
        generalSummary: `Live analysis of ${totalItems} requested assets. Overall policy adherence remains stable.`,
        lastAuditRef: 'AUD-LIVE-TRACK',
        actionsRequired: nonCompliant > 0 ? `${nonCompliant} rejected assets isolated for disposal audit.` : 'All assets compliant'
      };

      this.loading.set(false);
      return [liveReport];
    } catch {
      this.error.set('Failed to load status reports');
      this.loading.set(false);
      return [];
    }
  });

  protected readonly totalItems = computed(() => {
    const r = this.reports()[0];
    return r ? r.totalItems : 0;
  });

  protected readonly compliantItems = computed(() => {
    const r = this.reports()[0];
    return r ? r.compliantItems : 0;
  });

  protected readonly nonCompliantItems = computed(() => {
    const r = this.reports()[0];
    return r ? r.nonCompliantItems : 0;
  });

  protected readonly score = computed(() => {
    const r = this.reports()[0];
    return r ? r.complianceScore : 0;
  });

  readonly activeViewReport = signal<StatusReport | null>(null);
  readonly downloadingReportId = signal<string | null>(null);
  readonly downloadProgress = signal<number>(0);

  viewReport(report: StatusReport): void {
    this.activeViewReport.set(report);
  }

  async downloadReport(report: StatusReport): Promise<void> {
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
            await downloadReportPdf('Compliance Status Report', report.reportName, this.buildDetails(report));
          }, 400);
          return 100;
        }
        return prev + 10;
      });
    }, 80);
  }

  refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    this.workflowService.getAllRequests();
    setTimeout(() => this.reports(), 300);
  }

  exportToCsv(): void {
    const reports = this.reports();
    if (reports.length === 0) return;
    const rows = reports.map(r => ({
      'Report Name': r.reportName,
      'Generated Date': r.generatedDate,
      'Total Items': r.totalItems,
      'Compliant': r.compliantItems,
      'Non-Compliant': r.nonCompliantItems,
      'Score (%)': r.complianceScore,
      'Auditor': r.complianceAuditor,
    }));
    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => headers.map(h => (row as any)[h]).join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `compliance-status-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  private buildDetails(report: StatusReport): ReportDetailRow[] {
    return [
      { label: 'Report Name', value: report.reportName },
      { label: 'Generated Date', value: report.generatedDate },
      { label: 'Compliance Score', value: `${report.complianceScore}%` },
      { label: 'Total Items Checked', value: report.totalItems },
      { label: 'Compliant Items', value: report.compliantItems },
      { label: 'Non-Compliant Items', value: report.nonCompliantItems },
      { label: 'Assigned Auditor', value: report.complianceAuditor },
      { label: 'Last Historical Audit Ref', value: report.lastAuditRef },
      { label: 'Mitigation Actions Needed', value: report.actionsRequired },
      { label: 'Compliance Summary', value: report.generalSummary }
    ];
  }

  closeModal(): void {
    this.activeViewReport.set(null);
  }
}
