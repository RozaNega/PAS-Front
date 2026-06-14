import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { downloadReportPdf, ReportDetailRow } from './report-actions.util';
import { WorkflowService } from '../../../../core/services/workflow.service';

interface AuditReport {
  id: string;
  reportName: string;
  generatedDate: string;
  totalAudits: number;
  completedAudits: number;
  findings: number;
  auditorName: string;
  complianceLevel: string;
  scopePeriod: string;
  status: 'Draft' | 'Finalized' | 'Approved';
}

@Component({
  selector: 'app-audit-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audit-reports.component.html',
  styleUrls: ['./audit-reports.component.scss'],
})
export class AuditReportsComponent {
  private readonly workflowService = inject(WorkflowService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  protected readonly reports = computed<AuditReport[]>(() => {
    const reqs = this.workflowService.getAllRequests();
    if (reqs.length === 0) return [];

    const total = reqs.length;
    const completed = reqs.filter(r => ['Completed', 'Manager Approved', 'Admin Approved'].includes(r.status)).length;
    const findings = reqs.filter(r => ['Manager Rejected', 'Admin Rejected', 'Cancelled'].includes(r.status)).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 100;

    const dates = reqs.map(r => new Date(r.submittedDate).getTime());
    const minDate = new Date(Math.min(...dates)).toLocaleDateString();
    const maxDate = new Date(Math.max(...dates)).toLocaleDateString();

    const liveReport: AuditReport = {
      id: 'live-audit-1',
      reportName: 'Backend Audit Summary',
      generatedDate: new Date().toISOString().split('T')[0],
      totalAudits: total,
      completedAudits: completed,
      findings: findings,
      auditorName: 'Backend data',
      complianceLevel: `${percentage}% Compliant`,
      scopePeriod: `${minDate} - ${maxDate}`,
      status: 'Approved'
    };

    return [liveReport];
  });

  protected readonly totalAudits = computed(() =>
    this.reports().reduce((s, r) => s + r.totalAudits, 0)
  );

  protected readonly completedAudits = computed(() =>
    this.reports().reduce((s, r) => s + r.completedAudits, 0)
  );

  protected readonly totalFindings = computed(() =>
    this.reports().reduce((s, r) => s + r.findings, 0)
  );

  protected readonly compliancePercent = computed(() => {
    const r = this.reports();
    if (r.length === 0) return 0;
    const total = r.reduce((s, rep) => s + rep.totalAudits, 0);
    const completed = r.reduce((s, rep) => s + rep.completedAudits, 0);
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  });

  readonly activeViewReport = signal<AuditReport | null>(null);
  readonly downloadingReportId = signal<string | null>(null);
  readonly downloadProgress = signal<number>(0);

  protected getCompliancePercent(report: AuditReport): number {
    const match = report.complianceLevel.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.workflowService.getAllRequests();
    } catch (e) {
      this.error.set(String(e));
    } finally {
      this.loading.set(false);
    }
  }

  exportCsv(): void {
    const rows = this.reports();
    if (rows.length === 0) return;

    const headers = ['Report Name', 'Generated Date', 'Total Audits', 'Completed', 'Findings', 'Compliance Level', 'Status'];
    const csvContent = [
      headers.join(','),
      ...rows.map(r => [
        `"${r.reportName}"`,
        r.generatedDate,
        r.totalAudits,
        r.completedAudits,
        r.findings,
        `"${r.complianceLevel}"`,
        r.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit-reports.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  viewReport(report: AuditReport): void {
    this.activeViewReport.set(report);
  }

  async downloadReport(report: AuditReport): Promise<void> {
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
            await downloadReportPdf('Audit Report', report.reportName, this.buildDetails(report));
          }, 400);
          return 100;
        }
        return prev + 10;
      });
    }, 80);
  }

  private buildDetails(report: AuditReport): ReportDetailRow[] {
    return [
      { label: 'Report Name', value: report.reportName },
      { label: 'Scope Period', value: report.scopePeriod },
      { label: 'Generated Date', value: report.generatedDate },
      { label: 'Lead Auditor', value: report.auditorName },
      { label: 'Total Audits', value: report.totalAudits },
      { label: 'Completed Audits', value: report.completedAudits },
      { label: 'Compliance Level', value: report.complianceLevel },
      { label: 'Major Findings', value: report.findings },
      { label: 'Approval Status', value: report.status }
    ];
  }

  closeModal(): void {
    this.activeViewReport.set(null);
  }
}
