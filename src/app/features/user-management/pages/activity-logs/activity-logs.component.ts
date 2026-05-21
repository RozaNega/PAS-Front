import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityLogsService, ActivityLogDto } from '../../../../core/services/activity-logs.service';

@Component({
  selector: 'app-activity-logs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './activity-logs.component.html',
  styleUrls: ['./activity-logs.component.scss']
})
export class ActivityLogsComponent implements OnInit {
  private readonly activityLogsService = inject(ActivityLogsService);
  showDetailsModal = signal(false);
  selectedLog = signal<ActivityLogDto | null>(null);
  showExportDropdown = signal(false);

  searchQuery = signal('');
  userFilter = signal('All');
  actionTypeFilter = signal('All');
  entityTypeFilter = signal('All');
  statusFilter = signal('All');
  currentPage = signal(1);
  rowsPerPage = signal(10);
  activityLogs = signal<ActivityLogDto[]>([]);
  totalLogs = signal(0);

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.activityLogsService.getAll().subscribe({
      next: (logs) => {
        this.activityLogs.set(logs);
        this.totalLogs.set(logs.length);
      },
      error: (err) => {
        console.error('Failed to load activity logs', err);
      }
    });
  }

  filteredLogs = computed(() => {
    let result = [...this.activityLogs()];

    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      result = result.filter(l =>
        l.user.toLowerCase().includes(q) ||
        l.entityType.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q)
      );
    }

    if (this.userFilter() !== 'All') {
      result = result.filter(l => l.user === this.userFilter());
    }

    if (this.actionTypeFilter() !== 'All') {
      result = result.filter(l => l.actionType === this.actionTypeFilter());
    }

    if (this.entityTypeFilter() !== 'All') {
      result = result.filter(l => l.entityType === this.entityTypeFilter());
    }

    if (this.statusFilter() !== 'All') {
      result = result.filter(l => l.status === this.statusFilter());
    }

    return result;
  });

  pagedLogs = computed(() => {
    const start = (this.currentPage() - 1) * this.rowsPerPage();
    const end = start + this.rowsPerPage();
    return this.filteredLogs().slice(start, end);
  });

  totalPages = computed(() => Math.ceil(this.filteredLogs().length / this.rowsPerPage()));

  displayRange = computed(() => {
    const start = (this.currentPage() - 1) * this.rowsPerPage() + 1;
    const end = Math.min(this.currentPage() * this.rowsPerPage(), this.filteredLogs().length);
    return { start, end };
  });

  onSearch(e: Event): void {
    this.searchQuery.set((e.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  onUserFilter(e: Event): void {
    this.userFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onActionTypeFilter(e: Event): void {
    this.actionTypeFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onEntityTypeFilter(e: Event): void {
    this.entityTypeFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onStatusFilter(e: Event): void {
    this.statusFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onRowsPerPageChange(e: Event): void {
    this.rowsPerPage.set(+(e.target as HTMLSelectElement).value);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.userFilter.set('All');
    this.actionTypeFilter.set('All');
    this.entityTypeFilter.set('All');
    this.statusFilter.set('All');
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  getActionIcon(actionType: string): string {
    const icons: Record<string, string> = {
      'Create': 'bi-plus-circle',
      'Update': 'bi-pencil',
      'Delete': 'bi-trash',
      'View': 'bi-eye',
      'Login': 'bi-key',
      'Logout': 'bi-box-arrow-right',
      'Export': 'bi-download',
      'Import': 'bi-upload',
      'Approve': 'bi-check-circle',
      'Reject': 'bi-x-circle',
      'Alert': 'bi-exclamation-triangle',
      'Error': 'bi-x-circle'
    };
    return icons[actionType] || 'bi-circle';
  }

  getActionColor(actionType: string): string {
    const colors: Record<string, string> = {
      'Create': 'green',
      'Update': 'blue',
      'Delete': 'red',
      'View': 'gray',
      'Login': 'green',
      'Logout': 'gray',
      'Export': 'purple',
      'Import': 'purple',
      'Approve': 'green',
      'Reject': 'red',
      'Alert': 'orange',
      'Error': 'red'
    };
    return colors[actionType] || 'gray';
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'Success': 'green',
      'Failure': 'red',
      'Warning': 'orange'
    };
    return colors[status] || 'gray';
  }

  formatTimestamp(date: any): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  exportLogs(format: string): void {
    alert(`Exporting logs as ${format}...`);
  }

  openDetailsModal(log: ActivityLogDto): void {
    this.selectedLog.set(log);
    this.showDetailsModal.set(true);
  }

  closeDetailsModal(): void {
    this.showDetailsModal.set(false);
    this.selectedLog.set(null);
  }

  openLogSettings(): void {
    alert('Opening log settings...');
  }

  copyDetails(): void {
    const log = this.selectedLog();
    if (log) {
      const details = `Timestamp: ${this.formatTimestamp(log.timestamp)}\nUser: ${log.user}\nAction: ${log.action}\nEntity: ${log.entityType}\nEntity ID: ${log.entityId}\nStatus: ${log.status}\nDetails: ${log.details}`;
      navigator.clipboard.writeText(details);
      alert('Details copied to clipboard!');
    }
  }
}
