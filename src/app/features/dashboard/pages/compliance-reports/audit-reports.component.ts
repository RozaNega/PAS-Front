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

  private readonly defaultSeeds: AuditReport[] = [
    {
      id: 'seed-1',
      reportName: 'Monthly Audit Summary - Jan 2024',
      generatedDate: '2024-01-31',
      totalAudits: 25,
      completedAudits: 22,
      findings: 8,
      auditorName: 'Lead Auditor Sarah Jenkins',
      complianceLevel: '94% Compliant',
      scopePeriod: 'Jan 1, 2024 - Jan 31, 2024',
      status: 'Approved'
    }
  ];

  protected readonly reports = computed<AuditReport[]>(() => {
    const reqs = this.workflowService.getAllRequests();
    if (reqs.length === 0) return this.defaultSeeds;

    const total = reqs.length;
    const completed = reqs.filter(r => ['Completed', 'Manager Approved', 'Admin Approved'].includes(r.status)).length;
    const findings = reqs.filter(r => ['Manager Rejected', 'Admin Rejected', 'Cancelled'].includes(r.status)).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 100;

    const dates = reqs.map(r => new Date(r.submittedDate).getTime());
    const minDate = new Date(Math.min(...dates)).toLocaleDateString();
    const maxDate = new Date(Math.max(...dates)).toLocaleDateString();

    const liveReport: AuditReport = {
      id: 'live-audit-1',
      reportName: 'Live Connected Audit Summary',
      generatedDate: new Date().toISOString().split('T')[0],
      totalAudits: total,
      completedAudits: completed,
      findings: findings,
      auditorName: 'Compliance Automated Audit Bot',
      complianceLevel: `${percentage}% Compliant`,
      scopePeriod: `${minDate} - ${maxDate}`,
      status: 'Approved'
    };

    return [liveReport, ...this.defaultSeeds];
  });

  readonly activeViewReport = signal<AuditReport | null>(null);
  readonly downloadingReportId = signal<string | null>(null);
  readonly downloadProgress = signal<number>(0);

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
