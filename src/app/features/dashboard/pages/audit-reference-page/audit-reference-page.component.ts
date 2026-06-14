import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { ManagerDataService, ManagerRequestRow } from '../../../../core/services/manager-data.service';
import { downloadReportPdf, ReportDetailRow } from '../compliance-reports/report-actions.util';

export interface ApprovalLog {
  timestamp: string;
  approver: string;
  srNumber: string;
  decision: 'approved' | 'rejected' | 'pending';
  value: number;
  responseTime: string;
  justification: string;
}

export interface DecisionHistoryItem {
  date: string;
  srNumber: string;
  decision: 'approved' | 'rejected' | 'pending';
  reason: string;
  comments: string;
}

interface AuditStats {
  totalEvents: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  approvalRate: number;
  avgResponseDays: number;
  mostActiveApprover: string;
  mostActiveCount: number;
  totalValue: number;
}

@Component({
  selector: 'app-audit-reference-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audit-reference-page.component.html',
  styleUrl: './audit-reference-page.component.scss',
})
export class AuditReferencePageComponent implements OnInit {
  private readonly managerData = inject(ManagerDataService);
  private readonly router = inject(Router);

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);

  // Data
  readonly allRequests = signal<ManagerRequestRow[]>([]);

  // Filters
  readonly searchQuery = signal('');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly approverFilter = signal('All');
  readonly approversList = signal<string[]>([]);
  readonly statusFilter = signal('All');
  readonly showAdvancedFilters = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = signal(5);

  // Modal
  protected showModal = signal(false);
  protected modalType = signal<'logs' | 'history' | ''>('');
  protected modalTitle = signal('');

  // Export type
  protected exportDropdownOpen = signal(false);

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.managerData.syncServiceRequests().subscribe({
      next: () => {
        const all = this.managerData.requestRows();
        this.allRequests.set(all);
        const approvers = new Set<string>();
        all.forEach(r => {
          if (r.approvedBy) approvers.add(r.approvedBy);
          if (r.rejectedBy) approvers.add(r.rejectedBy);
        });
        this.approversList.set(['All', ...Array.from(approvers)]);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load audit data. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  retry(): void {
    this.loadData();
  }

  // ─── Derived Data ──────────────────────────────────────

  private get filteredRequests(): ManagerRequestRow[] {
    let rows = this.allRequests();
    const query = this.searchQuery().toLowerCase();

    if (query) {
      rows = rows.filter(r =>
        r.requestNumber.toLowerCase().includes(query) ||
        (r.approvedBy || '').toLowerCase().includes(query) ||
        (r.rejectedBy || '').toLowerCase().includes(query) ||
        r.requesterName.toLowerCase().includes(query)
      );
    }

    if (this.dateFrom()) {
      const from = new Date(this.dateFrom());
      rows = rows.filter(r => new Date(r.requestedDate) >= from);
    }
    if (this.dateTo()) {
      const to = new Date(this.dateTo());
      to.setHours(23, 59, 59, 999);
      rows = rows.filter(r => new Date(r.requestedDate) <= to);
    }

    if (this.approverFilter() !== 'All') {
      rows = rows.filter(r =>
        r.approvedBy === this.approverFilter() || r.rejectedBy === this.approverFilter()
      );
    }

    if (this.statusFilter() !== 'All') {
      rows = rows.filter(r => r.status === this.statusFilter());
    }

    return rows;
  }

  get approvalLogs(): ApprovalLog[] {
    const rows = this.filteredRequests;
    const logs: ApprovalLog[] = [];

    for (const r of rows) {
      if (r.status === 'Approved' && r.approvedBy && r.approvedDate) {
        logs.push({
          timestamp: r.approvedDate,
          approver: r.approvedBy,
          srNumber: r.requestNumber,
          decision: 'approved',
          value: r.estimatedValue,
          responseTime: this.calcResponseTime(r.requestedDate, r.approvedDate),
          justification: 'Approved',
        });
      }
      if (r.status === 'Rejected' && r.rejectedBy && r.rejectedDate) {
        logs.push({
          timestamp: r.rejectedDate,
          approver: r.rejectedBy,
          srNumber: r.requestNumber,
          decision: 'rejected',
          value: r.estimatedValue,
          responseTime: this.calcResponseTime(r.requestedDate, r.rejectedDate),
          justification: r.rejectionReason || 'Budget constraints',
        });
      }
      if (r.status === 'Pending') {
        logs.push({
          timestamp: r.requestedDate,
          approver: r.approvedBy || r.rejectedBy || '—',
          srNumber: r.requestNumber,
          decision: 'pending',
          value: r.estimatedValue,
          responseTime: '—',
          justification: 'Pending',
        });
      }
    }

    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return logs;
  }

  get pagedLogs(): ApprovalLog[] {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.approvalLogs.slice(start, start + this.pageSize());
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.approvalLogs.length / this.pageSize()));
  }

  get decisionHistory(): DecisionHistoryItem[] {
    const rows = this.filteredRequests.filter(r => r.status === 'Approved' || r.status === 'Rejected');
    const history: DecisionHistoryItem[] = [];

    for (const r of rows) {
      if (r.status === 'Approved') {
        history.push({
          date: r.approvedDate || r.requestedDate,
          srNumber: r.requestNumber,
          decision: 'approved',
          reason: 'Within budget',
          comments: `Approved for ${r.description?.slice(0, 60) || 'request'}`,
        });
      }
      if (r.status === 'Rejected') {
        history.push({
          date: r.rejectedDate || r.requestedDate,
          srNumber: r.requestNumber,
          decision: 'rejected',
          reason: r.rejectionReason || 'Budget constraints',
          comments: r.rejectionReason ? `Rejected: ${r.rejectionReason}` : 'Please resubmit next quarter',
        });
      }
    }

    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return history.slice(0, 20);
  }

  get auditStats(): AuditStats {
    const all = this.allRequests();
    const approved = all.filter(r => r.status === 'Approved');
    const rejected = all.filter(r => r.status === 'Rejected');
    const pending = all.filter(r => r.status === 'Pending');
    const total = approved.length + rejected.length + pending.length;

    const approverCounts = new Map<string, number>();
    approved.forEach(r => {
      if (r.approvedBy) approverCounts.set(r.approvedBy, (approverCounts.get(r.approvedBy) || 0) + 1);
    });
    let mostActive = '—';
    let mostCount = 0;
    approverCounts.forEach((cnt, name) => {
      if (cnt > mostCount) { mostCount = cnt; mostActive = name; }
    });

    const responseDiffs: number[] = [];
    approved.forEach(r => {
      if (r.approvedDate) {
        const diff = (new Date(r.approvedDate).getTime() - new Date(r.requestedDate).getTime()) / (1000 * 60 * 60 * 24);
        if (diff >= 0) responseDiffs.push(diff);
      }
    });
    rejected.forEach(r => {
      if (r.rejectedDate) {
        const diff = (new Date(r.rejectedDate).getTime() - new Date(r.requestedDate).getTime()) / (1000 * 60 * 60 * 24);
        if (diff >= 0) responseDiffs.push(diff);
      }
    });
    const avgResponse = responseDiffs.length > 0 ? responseDiffs.reduce((s, d) => s + d, 0) / responseDiffs.length : 0;

    return {
      totalEvents: total,
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      pendingCount: pending.length,
      approvalRate: total > 0 ? Math.round((approved.length / total) * 100) : 0,
      avgResponseDays: Math.round(avgResponse * 10) / 10,
      mostActiveApprover: mostActive,
      mostActiveCount: mostCount,
      totalValue: all.reduce((s, r) => s + r.estimatedValue, 0),
    };
  }

  get isAuditReady(): boolean {
    return this.allRequests().length > 0;
  }

  get violationCount(): number {
    return this.allRequests().filter(r => r.status === 'Rejected' && r.rejectionReason?.toLowerCase().includes('violation')).length;
  }

  private calcResponseTime(requestedDate: string, decisionDate: string): string {
    const diffMs = new Date(decisionDate).getTime() - new Date(requestedDate).getTime();
    if (diffMs < 0) return '—';
    const hours = diffMs / (1000 * 60 * 60);
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    if (hours < 24) return `${Math.round(hours * 10) / 10} hrs`;
    const days = hours / 24;
    return `${Math.round(days * 10) / 10} days`;
  }

  // ─── Actions ───────────────────────────────────────────

  getPageEnd(): number {
    return Math.min(this.currentPage() * this.pageSize(), this.approvalLogs.length);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) this.currentPage.set(page);
  }

  viewDetails(type: 'logs' | 'history', title: string): void {
    this.modalType.set(type);
    this.modalTitle.set(title);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  getDecisionIcon(status: string): string {
    if (status === 'approved') return 'pi pi-check-circle';
    if (status === 'rejected') return 'pi pi-times-circle';
    return 'pi pi-clock';
  }

  getDecisionClass(status: string): string {
    if (status === 'approved') return 'badge badge--success';
    if (status === 'rejected') return 'badge badge--danger';
    return 'badge badge--warn';
  }

  getDecisionLabel(status: string): string {
    if (status === 'approved') return 'Approved';
    if (status === 'rejected') return 'Rejected';
    return 'Pending';
  }

  getInitials(name: string): string {
    if (!name || name === '—') return '?';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  getAvatarColor(name: string): string {
    if (!name || name === '—') return '#94a3b8';
    const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
    return `hsl(${hue}, 55%, 50%)`;
  }

  toggleAdvanced(): void {
    this.showAdvancedFilters.update(v => !v);
  }

  toggleExportDropdown(): void {
    this.exportDropdownOpen.update(v => !v);
  }

  closeExportDropdown(): void {
    this.exportDropdownOpen.set(false);
  }

  exportExcel(): void {
    const logs = this.approvalLogs;
    if (logs.length === 0) {
      alert('No data to export.');
      this.closeExportDropdown();
      return;
    }

    const wsData = logs.map(l => ({
      'Timestamp': l.timestamp,
      'Approver': l.approver,
      'SR #': l.srNumber,
      'Decision': this.getDecisionLabel(l.decision),
      'Value': l.value,
      'Response Time': l.responseTime,
      'Justification': l.justification,
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 20 }, { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 16 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Approval Logs');

    if (this.decisionHistory.length > 0) {
      const histData = this.decisionHistory.map(h => ({
        'Date': h.date,
        'SR #': h.srNumber,
        'Decision': this.getDecisionLabel(h.decision),
        'Reason': h.reason,
        'Comments': h.comments,
      }));
      const ws2 = XLSX.utils.json_to_sheet(histData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Decision History');
    }

    const stats = this.auditStats;
    const summaryData = [
      { 'Metric': 'Total Approval Events', 'Value': stats.totalEvents },
      { 'Metric': 'Approved', 'Value': `${stats.approvedCount} (${stats.approvalRate}%)` },
      { 'Metric': 'Rejected', 'Value': stats.rejectedCount },
      { 'Metric': 'Pending', 'Value': stats.pendingCount },
      { 'Metric': 'Average Response Time', 'Value': `${stats.avgResponseDays} days` },
      { 'Metric': 'Most Active Approver', 'Value': `${stats.mostActiveApprover} (${stats.mostActiveCount})` },
      { 'Metric': 'Audit Ready', 'Value': this.isAuditReady ? 'Yes' : 'No' },
      { 'Metric': 'Violations', 'Value': this.violationCount },
      { 'Metric': 'Total Value', 'Value': stats.totalValue },
    ];
    const ws3 = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws3, 'Audit Summary');

    XLSX.writeFile(wb, `audit-reference-${new Date().toISOString().split('T')[0]}.xlsx`);
    this.closeExportDropdown();
  }

  async exportPDF(): Promise<void> {
    const stats = this.auditStats;
    const details: ReportDetailRow[] = [
      { label: 'Report', value: 'Audit Reference Report' },
      { label: 'Generated', value: new Date().toLocaleString() },
      { label: 'Total Approval Events', value: stats.totalEvents },
      { label: 'Approved', value: `${stats.approvedCount} (${stats.approvalRate}%)` },
      { label: 'Rejected', value: stats.rejectedCount },
      { label: 'Pending', value: stats.pendingCount },
      { label: 'Average Response Time', value: `${stats.avgResponseDays} days` },
      { label: 'Most Active Approver', value: `${stats.mostActiveApprover} (${stats.mostActiveCount})` },
      { label: 'Total Value', value: `$${stats.totalValue.toLocaleString()}` },
      { label: 'Audit Ready', value: this.isAuditReady ? 'Yes' : 'No' },
      { label: 'Violations Detected', value: this.violationCount },
    ];
    if (this.approvalLogs.length > 0) {
      details.push({
        label: 'Approval Logs',
        value: this.approvalLogs.map(l => `${l.timestamp} | ${l.approver} | ${l.srNumber} | ${this.getDecisionLabel(l.decision)} | $${l.value.toLocaleString()} | ${l.responseTime}`).join('\n'),
      });
    }
    await downloadReportPdf('Audit Reference Report', `Audit Reference - ${new Date().toLocaleDateString()}`, details);
    this.closeExportDropdown();
  }

  emailReport(): void {
    const mailto = `mailto:?subject=Audit Reference Report - ${new Date().toLocaleDateString()}&body=Please find attached the Audit Reference Report generated on ${new Date().toLocaleString()}.%0A%0AAudit Summary:%0ATotal Events: ${this.auditStats.totalEvents}%0AApproved: ${this.auditStats.approvedCount} (${this.auditStats.approvalRate}%)%0ARejected: ${this.auditStats.rejectedCount}%0APending: ${this.auditStats.pendingCount}%0AAverage Response: ${this.auditStats.avgResponseDays} days%0AMost Active Approver: ${this.auditStats.mostActiveApprover}%0ATotal Value: $${this.auditStats.totalValue.toLocaleString()}`;
    window.location.href = mailto;
    this.closeExportDropdown();
  }

  printView(): void {
    window.print();
    this.closeExportDropdown();
  }

  scheduleExport(): void {
    const msg = `To schedule recurring exports, please contact your system administrator to configure automated report delivery.\n\nYou can request:\n• Daily audit summaries\n• Weekly compliance reports\n• Monthly export archives`;
    alert(msg);
    this.closeExportDropdown();
  }
}
