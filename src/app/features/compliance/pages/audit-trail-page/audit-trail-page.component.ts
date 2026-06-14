import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivityLogsService, ActivityLogDto } from '../../../../core/services/activity-logs.service';

@Component({
  selector: 'app-audit-trail-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-trail-page.component.html',
  styleUrl: './audit-trail-page.component.scss',
})
export class AuditTrailPageComponent implements OnInit {
  private readonly activityLogsService = inject(ActivityLogsService);

  loading = signal(false);
  error = signal(false);
  activityLogs = signal<ActivityLogDto[]>([]);

  searchQuery = signal('');
  statusFilter = signal('All');
  dateFrom = signal('');
  dateTo = signal('');
  currentPage = signal(1);
  rowsPerPage = signal(15);

  showDetailsModal = signal(false);
  selectedLog = signal<ActivityLogDto | null>(null);
  showExportDropdown = signal(false);

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading.set(true);
    this.error.set(false);
    this.activityLogsService.getAll().subscribe({
      next: (logs) => {
        this.activityLogs.set(logs);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      }
    });
  }

  stats = computed(() => {
    const all = this.activityLogs();
    const today = new Date().toDateString();
    return {
      totalEvents: all.length,
      uniqueUsers: new Set(all.map(l => l.user)).size,
      criticalEvents: all.filter(l => l.status === 'Failure' || l.status === 'Warning').length,
      todayEvents: all.filter(l => new Date(l.timestamp).toDateString() === today).length,
    };
  });

  filteredLogs = computed(() => {
    let result = [...this.activityLogs()];
    const q = this.searchQuery().toLowerCase();
    if (q) {
      result = result.filter(l =>
        l.user.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.actionType.toLowerCase().includes(q) ||
        l.entityType.toLowerCase().includes(q) ||
        l.entityId.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q) ||
        l.ipAddress.toLowerCase().includes(q)
      );
    }
    if (this.statusFilter() !== 'All') {
      result = result.filter(l => l.status === this.statusFilter());
    }
    if (this.dateFrom()) {
      const from = new Date(this.dateFrom()).getTime();
      result = result.filter(l => new Date(l.timestamp).getTime() >= from);
    }
    if (this.dateTo()) {
      const to = new Date(this.dateTo()).getTime() + 86400000;
      result = result.filter(l => new Date(l.timestamp).getTime() < to);
    }
    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return result;
  });

  pagedLogs = computed(() => {
    const start = (this.currentPage() - 1) * this.rowsPerPage();
    return this.filteredLogs().slice(start, start + this.rowsPerPage());
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredLogs().length / this.rowsPerPage())));

  displayRange = computed(() => {
    const total = this.filteredLogs().length;
    if (!total) return { start: 0, end: 0 };
    return {
      start: (this.currentPage() - 1) * this.rowsPerPage() + 1,
      end: Math.min(this.currentPage() * this.rowsPerPage(), total)
    };
  });

  onSearch(e: Event): void { this.searchQuery.set((e.target as HTMLInputElement).value); this.currentPage.set(1); }
  onStatusFilter(e: Event): void { this.statusFilter.set((e.target as HTMLSelectElement).value); this.currentPage.set(1); }
  onDateFrom(e: Event): void { this.dateFrom.set((e.target as HTMLInputElement).value); this.currentPage.set(1); }
  onDateTo(e: Event): void { this.dateTo.set((e.target as HTMLInputElement).value); this.currentPage.set(1); }
  onRowsPerPageChange(e: Event): void { this.rowsPerPage.set(+(e.target as HTMLSelectElement).value); this.currentPage.set(1); }

  resetFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('All');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.currentPage.set(1);
  }

  goToPage(page: number): void { this.currentPage.set(page); }

  getActionIcon(actionType: string): string {
    const icons: Record<string, string> = {
      Create: 'bi-plus-circle', Update: 'bi-pencil', Delete: 'bi-trash',
      View: 'bi-eye', Login: 'bi-key', Logout: 'bi-box-arrow-right',
      Export: 'bi-download', Import: 'bi-upload', Approve: 'bi-check-circle',
      Reject: 'bi-x-circle', Alert: 'bi-exclamation-triangle', Error: 'bi-x-circle'
    };
    return icons[actionType] || 'bi-circle';
  }

  getActionClass(actionType: string): string {
    const c: Record<string, string> = {
      Create: 'green', Update: 'blue', Delete: 'red', View: 'gray',
      Login: 'green', Logout: 'gray', Export: 'purple', Import: 'purple',
      Approve: 'green', Reject: 'red', Alert: 'orange', Error: 'red'
    };
    return c[actionType] || 'gray';
  }

  formatDate(date: string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatTimestamp(date: string): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' +
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  formatTimeAgo(date: string): string {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  openDetailsModal(log: ActivityLogDto): void {
    this.selectedLog.set(log);
    this.showDetailsModal.set(true);
  }

  closeDetailsModal(): void {
    this.showDetailsModal.set(false);
    this.selectedLog.set(null);
  }

  copyDetails(): void {
    const log = this.selectedLog();
    if (!log) return;
    const txt = `Timestamp: ${this.formatTimestamp(log.timestamp)}\nUser: ${log.user}\nAction: ${log.action}\nAction Type: ${log.actionType}\nEntity: ${log.entityType}\nEntity ID: ${log.entityId}\nStatus: ${log.status}\nIP: ${log.ipAddress}\nDetails: ${log.details}`;
    navigator.clipboard.writeText(txt);
  }

  exportLogs(format: string): void {
    this.showExportDropdown.set(false);
    const logs = this.filteredLogs();
    if (!logs.length) return;

    const headers = ['Timestamp', 'User', 'Action', 'Action Type', 'Entity Type', 'Entity ID', 'Details', 'IP Address', 'Status'];
    const rows = logs.map(l => [
      this.formatTimestamp(l.timestamp), l.user, l.action, l.actionType,
      l.entityType, l.entityId, l.details, l.ipAddress, l.status
    ]);

    if (format === 'CSV') {
      const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      this.downloadFile(csv, 'audit-trail.csv', 'text/csv');
    } else if (format === 'Excel') {
      const tsv = [headers, ...rows].map(r => r.map(c => String(c).replace(/\t/g, ' ')).join('\t')).join('\n');
      this.downloadFile(tsv, 'audit-trail.xls', 'application/vnd.ms-excel');
    } else if (format === 'JSON') {
      const json = JSON.stringify(logs, null, 2);
      this.downloadFile(json, 'audit-trail.json', 'application/json');
    }
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  refresh(): void { this.loadLogs(); }

  uniqueStatuses = computed(() => [...new Set(this.activityLogs().map(l => l.status))].sort());

  Math = Math;
}
