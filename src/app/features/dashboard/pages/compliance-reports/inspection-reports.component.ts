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


  protected readonly reports = computed<InspectionReport[]>(() => {
    const reqs = this.workflowService.getAllRequests();
    if (reqs.length === 0) return [];

    const total = reqs.length;
    const passed = reqs.filter(r => ['Completed', 'Manager Approved', 'Admin Approved'].includes(r.status)).length;
    const failed = reqs.filter(r => ['Manager Rejected', 'Admin Rejected', 'Cancelled'].includes(r.status)).length;
    const rate = total > 0 ? ((failed / total) * 100).toFixed(1) : '0.0';

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
      defectRate: `${rate}% Defect Rate`
    };

    return [liveReport];
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
}




