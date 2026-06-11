import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivityLogsService, ActivityLogDto } from '../../../../core/services/activity-logs.service';

interface LogEntry extends ActivityLogDto {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  actionType: string;
  entityType: string;
  entityId: string;
  details: string;
  ipAddress: string;
  status: string;
}



@Component({
  selector: 'app-activity-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activity-logs.component.html',
  styleUrls: ['./activity-logs.component.scss']
})
export class ActivityLogsComponent implements OnInit {
  private readonly activityLogsService = inject(ActivityLogsService);

  showDetailsModal = signal(false);
  selectedLog = signal<LogEntry | null>(null);
  showExportDropdown = signal(false);

  searchQuery = signal('');
  userFilter = signal('All');
  actionTypeFilter = signal('All');
  entityTypeFilter = signal('All');
  statusFilter = signal('All');
  currentPage = signal(1);
  rowsPerPage = signal(15);
  loading = signal(false);
  activityLogs = signal<LogEntry[]>([]);
  totalLogs = signal(0);

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading.set(true);
    this.activityLogsService.getAll().subscribe({
      next: (logs) => {
        if (logs.length) {
          this.activityLogs.set(logs as LogEntry[]);
          this.totalLogs.set(logs.length);
        }
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); }
    });
  }

  filteredLogs = computed(() => {
    let result = [...this.activityLogs()];
    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      result = result.filter(l => l.user.toLowerCase().includes(q) || l.entityType.toLowerCase().includes(q) || l.details.toLowerCase().includes(q) || l.action.toLowerCase().includes(q));
    }
    if (this.userFilter() !== 'All') result = result.filter(l => l.user === this.userFilter());
    if (this.actionTypeFilter() !== 'All') result = result.filter(l => l.actionType === this.actionTypeFilter());
    if (this.entityTypeFilter() !== 'All') result = result.filter(l => l.entityType === this.entityTypeFilter());
    if (this.statusFilter() !== 'All') result = result.filter(l => l.status === this.statusFilter());
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
    return { start: (this.currentPage() - 1) * this.rowsPerPage() + 1, end: Math.min(this.currentPage() * this.rowsPerPage(), total) };
  });

  summaryStats = computed(() => {
    const all = this.activityLogs();
    return {
      total: all.length,
      success: all.filter(l => l.status === 'Success').length,
      failures: all.filter(l => l.status === 'Failure').length,
      uniqueUsers: new Set(all.map(l => l.user)).size,
    };
  });

  onSearch(e: Event): void { this.searchQuery.set((e.target as HTMLInputElement).value); this.currentPage.set(1); }
  onUserFilter(e: Event): void { this.userFilter.set((e.target as HTMLSelectElement).value); this.currentPage.set(1); }
  onActionTypeFilter(e: Event): void { this.actionTypeFilter.set((e.target as HTMLSelectElement).value); this.currentPage.set(1); }
  onEntityTypeFilter(e: Event): void { this.entityTypeFilter.set((e.target as HTMLSelectElement).value); this.currentPage.set(1); }
  onStatusFilter(e: Event): void { this.statusFilter.set((e.target as HTMLSelectElement).value); this.currentPage.set(1); }
  onRowsPerPageChange(e: Event): void { this.rowsPerPage.set(+(e.target as HTMLSelectElement).value); this.currentPage.set(1); }

  resetFilters(): void {
    this.searchQuery.set(''); this.userFilter.set('All'); this.actionTypeFilter.set('All');
    this.entityTypeFilter.set('All'); this.statusFilter.set('All'); this.currentPage.set(1);
  }

  goToPage(page: number): void { this.currentPage.set(page); }

  getActionIcon(actionType: string): string {
    const icons: Record<string, string> = {
      'Create': 'bi-plus-circle', 'Update': 'bi-pencil', 'Delete': 'bi-trash',
      'View': 'bi-eye', 'Login': 'bi-key', 'Logout': 'bi-box-arrow-right',
      'Export': 'bi-download', 'Import': 'bi-upload', 'Approve': 'bi-check-circle',
      'Reject': 'bi-x-circle', 'Alert': 'bi-exclamation-triangle', 'Error': 'bi-x-circle'
    };
    return icons[actionType] || 'bi-circle';
  }

  getActionClass(actionType: string): string {
    const c: Record<string, string> = {
      'Create': 'green', 'Update': 'blue', 'Delete': 'red', 'View': 'gray',
      'Login': 'green', 'Logout': 'gray', 'Export': 'purple', 'Import': 'purple',
      'Approve': 'green', 'Reject': 'red', 'Alert': 'orange', 'Error': 'red'
    };
    return c[actionType] || 'gray';
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatTimestamp(date: any): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' +
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  formatTimeAgo(date: any): string {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  exportLogs(format: string): void {
    this.showExportDropdown.set(false);
    const logs = this.filteredLogs();
    if (!logs.length) return;

    const headers = ['Timestamp', 'User', 'Action', 'Action Type', 'Entity Type', 'Entity ID', 'Details', 'IP Address', 'Status'];
    const rows = logs.map(l => [
      this.formatTimestamp(l.timestamp),
      l.user,
      l.action,
      l.actionType,
      l.entityType,
      l.entityId,
      l.details,
      l.ipAddress,
      l.status,
    ]);

    if (format === 'CSV') {
      const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      this.downloadFile(csv, 'activity-logs.csv', 'text/csv');
    } else if (format === 'Excel') {
      const tsv = [headers, ...rows].map(r => r.map(c => String(c).replace(/\t/g, ' ')).join('\t')).join('\n');
      this.downloadFile(tsv, 'activity-logs.xls', 'application/vnd.ms-excel');
    } else if (format === 'JSON') {
      const json = JSON.stringify(logs.map(l => ({
        timestamp: l.timestamp,
        user: l.user,
        action: l.action,
        actionType: l.actionType,
        entityType: l.entityType,
        entityId: l.entityId,
        details: l.details,
        ipAddress: l.ipAddress,
        status: l.status,
      })), null, 2);
      this.downloadFile(json, 'activity-logs.json', 'application/json');
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

  openDetailsModal(log: LogEntry): void {
    this.selectedLog.set(log);
    this.showDetailsModal.set(true);
  }

  closeDetailsModal(): void { this.showDetailsModal.set(false); this.selectedLog.set(null); }

  copyDetails(): void {
    const log = this.selectedLog();
    if (!log) return;
    const txt = `Timestamp: ${this.formatTimestamp(log.timestamp)}\nUser: ${log.user}\nAction: ${log.action}\nEntity: ${log.entityType}\nEntity ID: ${log.entityId}\nStatus: ${log.status}\nIP: ${log.ipAddress}\nDetails: ${log.details}`;
    navigator.clipboard.writeText(txt);
  }

  uniqueUsers = computed(() => [...new Set(this.activityLogs().map(l => l.user))].sort());
  uniqueEntityTypes = computed(() => [...new Set(this.activityLogs().map(l => l.entityType))].sort());

  Math = Math;
}
