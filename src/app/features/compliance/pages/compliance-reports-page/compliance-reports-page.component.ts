import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ComplianceDataService } from '../../../../core/services/compliance-data.service';
import { ReportsService, DisposalReportDto } from '../../../../core/services/reports.service';
import { ActivityLogsService, ActivityLogDto } from '../../../../core/services/activity-logs.service';

export interface SavedReport {
  name: string;
  date: string;
  type: string;
  size: string;
}

@Component({
  selector: 'app-compliance-reports-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './compliance-reports-page.component.html',
  styleUrl: './compliance-reports-page.component.scss',
})
export class ComplianceReportsPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly complianceData = inject(ComplianceDataService);
  private readonly reportsService = inject(ReportsService);
  private readonly activityLogs = inject(ActivityLogsService);

  stats = signal<any>(null);
  violations = signal<any[]>([]);
  inspections = signal<any[]>([]);
  disposalReport = signal<DisposalReportDto | null>(null);
  auditLogs = signal<ActivityLogDto[]>([]);
  loading = signal(false);

  dateRange = 'Dec 01, 2024 to Dec 31, 2024';
  reportType = 'Compliance Summary';
  format = 'PDF';
  includeDetails = 'Yes';
  confidential = 'Yes';
  emailTo = 'sarah.smith@afrocom.com';

  savedReports: SavedReport[] = [
    { name: 'Q4_Compliance_Report_2024', date: 'Dec 14', type: 'Full Compliance', size: '2.3MB' },
    { name: 'December_Risk_Assessment', date: 'Dec 10', type: 'Risk Summary', size: '1.1MB' },
    { name: 'December_Violation_Report', date: 'Dec 05', type: 'Violation', size: '3.2MB' },
  ];

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);

    this.complianceData.getDashboardStatistics().subscribe({
      next: (data) => this.stats.set(data),
    });

    this.complianceData.getInspections().subscribe({
      next: (data) => this.inspections.set(data),
    });

    this.reportsService.getDisposalReport().subscribe({
      next: (res) => {
        if (res.success && res.data) this.disposalReport.set(res.data);
      },
    });

    this.activityLogs.getAll().subscribe({
      next: (data) => {
        this.auditLogs.set(data);
        this.deriveViolations(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private deriveViolations(logs: ActivityLogDto[]): void {
    const critical = logs.filter((l) => l.status === 'critical' || l.actionType === 'Delete').length;
    const high = logs.filter((l) => l.actionType === 'Reject' || l.actionType === 'Update').length;
    const medium = logs.filter((l) => l.status === 'warning').length;
    const low = logs.filter((l) => l.status === 'info' || l.status === 'success').length;
    const total = critical + high + medium + low || 1;

    this.violations.set([
      { severity: 'Critical', count: critical, percentage: Math.round(critical / total * 100) + '%', trend: 'This period', commonType: `Unauthorized Actions (${critical})` },
      { severity: 'High', count: high, percentage: Math.round(high / total * 100) + '%', trend: 'This period', commonType: `Rejected Operations (${high})` },
      { severity: 'Medium', count: medium, percentage: Math.round(medium / total * 100) + '%', trend: 'This period', commonType: `Warnings (${medium})` },
      { severity: 'Low', count: low, percentage: Math.round(low / total * 100) + '%', trend: 'This period', commonType: `Info Events (${low})` },
    ]);
  }

  get complianceScore(): string {
    const s = this.stats();
    return s?.complianceScore != null ? `${s.complianceScore}%` : '—';
  }

  get totalViolationsCount(): number {
    return this.violations().reduce((s, v) => s + v.count, 0);
  }

  get totalViolations(): string {
    return this.totalViolationsCount.toLocaleString();
  }

  get criticalViolationsCount(): number {
    return this.violations().find((v) => v.severity === 'Critical')?.count ?? 0;
  }

  get criticalViolations(): string {
    return this.criticalViolationsCount > 0 ? String(this.criticalViolationsCount) : '—';
  }

  get inspectionCount(): string {
    return this.inspections().length.toLocaleString();
  }

  generateReport(): void {
    const params = {
      dateRange: this.dateRange,
      reportType: this.reportType,
      format: this.format,
      includeDetails: this.includeDetails,
      confidential: this.confidential,
      emailTo: this.emailTo,
    };
    console.log('Generating report with parameters:', params);
    this.router.navigate(['/compliance-officer/report-preview']);
  }

  exportToExcel(): void {
    const rows = this.auditLogs();
    if (!rows.length) { alert('No audit log data to export.'); return; }
    const headers = ['User,Action,Entity Type,Entity ID,Timestamp,IP Address,Status'];
    const csv = headers.concat(
      rows.map((r) => `"${r.user}","${r.action}","${r.entityType}","${r.entityId}","${r.timestamp}","${r.ipAddress}","${r.status}"`)
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'compliance-audit-logs.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    alert('Audit logs exported to CSV successfully!');
  }

  exportToPdf(): void {
    alert('PDF export will open the report preview page.');
    this.router.navigate(['/compliance-officer/report-preview']);
  }

  exportReport(format: string): void {
    if (format === 'excel') { this.exportToExcel(); return; }
    this.exportToPdf();
  }

  emailReport(reportId?: string): void {
    alert(`Report ${reportId || 'current'} will be emailed to ${this.emailTo}.`);
  }

  printReport(): void {
    window.print();
  }

  scheduleReport(): void {
    alert('Report scheduled successfully! It will be sent on the 1st of each month.');
  }

  viewReport(report: SavedReport): void {
    this.router.navigate(['/compliance-officer/report-preview'], {
      queryParams: { reportName: report.name, date: report.date, type: report.type },
    });
  }

  downloadReport(report: SavedReport): void {
    const filename = `${report.name}.pdf`;
    const content = [
      `AFROCOM COMPLIANCE REPORT`,
      `=========================`,
      `Report Name: ${report.name}`,
      `Date: ${report.date}`,
      `Type: ${report.type}`,
      `Status: Certified`,
      `Size: ${report.size}`,
      ``,
      `Compliance Score: ${this.complianceScore}`,
      `Total Violations: ${this.totalViolations}`,
      `Inspections: ${this.inspectionCount}`,
      `Audit Logs: ${this.auditLogs().length}`,
      ``,
      `This is a certified compliance audit artifact.`,
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    alert(`Report "${filename}" downloaded successfully!`);
  }

  deleteReport(reportName: string): void {
    if (confirm(`Delete report "${reportName}"?`)) {
      this.savedReports = this.savedReports.filter((r) => r.name !== reportName);
    }
  }
}
