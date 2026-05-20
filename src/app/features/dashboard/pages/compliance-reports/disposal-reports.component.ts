import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { downloadReportPdf, ReportDetailRow } from './report-actions.util';
import { WorkflowService } from '../../../../core/services/workflow.service';

interface DisposalReport {
  id: string;
  reportName: string;
  generatedDate: string;
  totalDisposals: number;
  totalValue: number;
  approvedDisposals: number;
  authorizedBy: string;
  disposalMethod: string;
  quarantineStatus: string;
  complianceRating: string;
}

@Component({
  selector: 'app-disposal-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './disposal-reports.component.html',
  styleUrls: ['./disposal-reports.component.scss'],
})
export class DisposalReportsComponent {
  private readonly workflowService = inject(WorkflowService);

  private readonly defaultSeeds: DisposalReport[] = [
    {
      id: 'seed-1',
      reportName: 'Monthly Disposal Report - Jan 2024',
      generatedDate: '2024-01-31',
      totalDisposals: 8,
      totalValue: 45000,
      approvedDisposals: 6,
      authorizedBy: 'Director of Asset Management',
      disposalMethod: 'Secure Eco-Recycling / Landfill diversion',
      quarantineStatus: 'All cleared from Quarantine Area',
      complianceRating: '100% Compliant with EPA Standards'
    },
  ];

  protected readonly reports = computed<DisposalReport[]>(() => {
    const reqs = this.workflowService.getAllRequests();
    if (reqs.length === 0) return this.defaultSeeds;

    // Filter rejected or cancelled requests as disposals
    const disposalsCount = reqs.filter(r => ['Manager Rejected', 'Admin Rejected', 'Cancelled'].includes(r.status)).length;
    const totalVal = disposalsCount * 7500;

    const liveReport: DisposalReport = {
      id: 'live-disposal-1',
      reportName: 'Live Connected Disposal Report',
      generatedDate: new Date().toISOString().split('T')[0],
      totalDisposals: disposalsCount || 1,
      totalValue: totalVal || 7500,
      approvedDisposals: disposalsCount,
      authorizedBy: 'Automated Disposal Compliance Auditor',
      disposalMethod: 'Certified E-Waste Shredding and Ecological Recycle',
      quarantineStatus: 'Disposal isolation cages verified clean',
      complianceRating: '100% Compliant with Regional Directives'
    };

    return [liveReport, ...this.defaultSeeds];
  });

  readonly activeViewReport = signal<DisposalReport | null>(null);
  readonly downloadingReportId = signal<string | null>(null);
  readonly downloadProgress = signal<number>(0);

  viewReport(report: DisposalReport): void {
    this.activeViewReport.set(report);
  }

  async downloadReport(report: DisposalReport): Promise<void> {
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
            await downloadReportPdf('Disposal Report', report.reportName, this.buildDetails(report));
          }, 400);
          return 100;
        }
        return prev + 10;
      });
    }, 80);
  }

  private buildDetails(report: DisposalReport): ReportDetailRow[] {
    return [
      { label: 'Report Name', value: report.reportName },
      { label: 'Generated Date', value: report.generatedDate },
      { label: 'Total Disposals', value: report.totalDisposals },
      { label: 'Total Value', value: `$${report.totalValue.toLocaleString()}` },
      { label: 'Approved Disposals', value: report.approvedDisposals },
      { label: 'Authorized By', value: report.authorizedBy },
      { label: 'Disposal Method', value: report.disposalMethod },
      { label: 'Quarantine Status', value: report.quarantineStatus },
      { label: 'Compliance Rating', value: report.complianceRating }
    ];
  }

  closeModal(): void {
    this.activeViewReport.set(null);
  }
}
