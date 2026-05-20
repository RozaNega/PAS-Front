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

  private readonly defaultSeeds: StatusReport[] = [
    {
      id: 'seed-1',
      reportName: 'Compliance Status - Jan 2024',
      generatedDate: '2024-01-31',
      complianceScore: 92,
      totalItems: 100,
      compliantItems: 92,
      nonCompliantItems: 8,
      complianceAuditor: 'Officer Michael Scott',
      generalSummary: 'Outstanding performance matching the standard threshold limit set by ISO 9001.',
      lastAuditRef: 'AUD-REF-2023-Q4',
      actionsRequired: '8 Non-compliant hardware assets scheduled for Eco disposal'
    },
  ];

  protected readonly reports = computed<StatusReport[]>(() => {
    const reqs = this.workflowService.getAllRequests();
    if (reqs.length === 0) return this.defaultSeeds;

    const totalItems = reqs.reduce((sum, r) => sum + r.items.length, 0);
    const compliant = reqs.filter(r => ['Completed', 'Manager Approved', 'Admin Approved'].includes(r.status))
                          .reduce((sum, r) => sum + r.items.length, 0);
    const nonCompliant = reqs.filter(r => ['Manager Rejected', 'Admin Rejected', 'Cancelled'].includes(r.status))
                             .reduce((sum, r) => sum + r.items.length, 0);
    
    const score = totalItems > 0 ? Math.round((compliant / totalItems) * 100) : 100;

    const liveReport: StatusReport = {
      id: 'live-status-1',
      reportName: 'Live Connected Compliance Status',
      generatedDate: new Date().toISOString().split('T')[0],
      complianceScore: score,
      totalItems: totalItems || 10,
      compliantItems: compliant || 9,
      nonCompliantItems: nonCompliant || 1,
      complianceAuditor: 'Automated System Integrity Monitor',
      generalSummary: `Live analysis of ${totalItems} requested assets. Overall policy adherence remains stable.`,
      lastAuditRef: 'AUD-LIVE-TRACK',
      actionsRequired: nonCompliant > 0 ? `${nonCompliant} rejected assets isolated for disposal audit.` : 'All assets compliant'
    };

    return [liveReport, ...this.defaultSeeds];
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
