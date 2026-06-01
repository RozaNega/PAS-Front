import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivityLogsService, ActivityLogDto } from '../../../../core/services/activity-logs.service';

interface ActivityLog extends ActivityLogDto {
  id: string;
  sessionId?: string;
  method?: string;
  endpoint?: string;
  userAgent?: string;
  changes?: { field: string; oldValue: string; newValue: string }[];
}

const NOW = Date.now();
function ago(ms: number): string { return new Date(NOW - ms).toISOString(); }

const MOCK_LOGS: ActivityLog[] = [
  { id: '1', timestamp: ago(1000 * 60 * 2), user: 'John Doe', action: 'Created', actionType: 'Create', entityType: 'Property', entityId: 'PRP-0042', details: 'Added new office property asset to inventory', ipAddress: '192.168.1.100', status: 'Success', sessionId: 'ses_abc123', method: 'POST', endpoint: '/api/properties', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', changes: [{ field: 'Name', oldValue: '-', newValue: 'MacBook Pro M3' }, { field: 'Serial', oldValue: '-', newValue: 'C02XK2L8Q6PJ' }, { field: 'Value', oldValue: '-', newValue: '$2,499' }] },
  { id: '2', timestamp: ago(1000 * 60 * 15), user: 'Sarah Smith', action: 'Updated', actionType: 'Update', entityType: 'Requisition', entityId: 'REQ-0088', details: 'Modified quantity from 5 to 10 units', ipAddress: '192.168.1.105', status: 'Success', sessionId: 'ses_def456', method: 'PUT', endpoint: '/api/requisitions/REQ-0088', changes: [{ field: 'Quantity', oldValue: '5', newValue: '10' }] },
  { id: '3', timestamp: ago(1000 * 60 * 45), user: 'Mike Wilson', action: 'Deleted', actionType: 'Delete', entityType: 'Stock Item', entityId: 'STK-0231', details: 'Removed obsolete inventory item from warehouse', ipAddress: '192.168.1.110', status: 'Success', sessionId: 'ses_ghi789', method: 'DELETE', endpoint: '/api/stock/STK-0231' },
  { id: '4', timestamp: ago(1000 * 60 * 60 * 2), user: 'Lisa Wong', action: 'Approved', actionType: 'Approve', entityType: 'Requisition', entityId: 'REQ-0085', details: 'Approved stationery request for Finance department', ipAddress: '192.168.1.115', status: 'Success', sessionId: 'ses_jkl012', method: 'POST', endpoint: '/api/requisitions/REQ-0085/approve' },
  { id: '5', timestamp: ago(1000 * 60 * 60 * 5), user: 'Peter Chen', action: 'Login', actionType: 'Login', entityType: 'User', entityId: 'USR-004', details: 'Successful login from new device', ipAddress: '10.0.0.45', status: 'Success', sessionId: 'ses_mno345', method: 'POST', endpoint: '/api/auth/login' },
  { id: '6', timestamp: ago(1000 * 60 * 60 * 8), user: 'Robert Brown', action: 'Exported', actionType: 'Export', entityType: 'Report', entityId: 'RPT-0012', details: 'Exported monthly compliance report as PDF', ipAddress: '192.168.1.120', status: 'Success', sessionId: 'ses_pqr678', method: 'GET', endpoint: '/api/reports/RPT-0012/export' },
  { id: '7', timestamp: ago(1000 * 60 * 60 * 24), user: 'System', action: 'Alert', actionType: 'Alert', entityType: 'System', entityId: 'SYS-001', details: 'Disk usage exceeded 85% threshold on primary server', ipAddress: '127.0.0.1', status: 'Warning', sessionId: 'ses_stu901', method: '-', endpoint: '/system/monitoring' },
  { id: '8', timestamp: ago(1000 * 60 * 60 * 30), user: 'David Lee', action: 'Login Failed', actionType: 'Error', entityType: 'User', entityId: 'USR-008', details: 'Invalid password attempt (3rd attempt)', ipAddress: '203.0.113.50', status: 'Failure', sessionId: 'ses_vwx234', method: 'POST', endpoint: '/api/auth/login' },
  { id: '9', timestamp: ago(1000 * 60 * 60 * 48), user: 'Alice Johnson', action: 'Created', actionType: 'Create', entityType: 'Transfer', entityId: 'TRF-0016', details: 'Initiated property transfer between warehouses', ipAddress: '192.168.1.125', status: 'Success', sessionId: 'ses_yza567', method: 'POST', endpoint: '/api/transfers' },
  { id: '10', timestamp: ago(1000 * 60 * 60 * 72), user: 'Elena Garcia', action: 'Rejected', actionType: 'Reject', entityType: 'Requisition', entityId: 'REQ-0082', details: 'Rejected request due to budget constraints', ipAddress: '192.168.1.130', status: 'Success', sessionId: 'ses_bcd890', method: 'POST', endpoint: '/api/requisitions/REQ-0082/reject' },
  { id: '11', timestamp: ago(1000 * 60 * 60 * 96), user: 'Kevin Martin', action: 'Updated', actionType: 'Update', entityType: 'User', entityId: 'USR-010', details: 'Updated role permissions for user', ipAddress: '192.168.1.135', status: 'Success', sessionId: 'ses_efg123', method: 'PUT', endpoint: '/api/users/USR-010' },
  { id: '12', timestamp: ago(1000 * 60 * 60 * 120), user: 'System', action: 'Backup', actionType: 'Create', entityType: 'Backup', entityId: 'BAK-0056', details: 'Automated daily backup completed successfully', ipAddress: '127.0.0.1', status: 'Success', sessionId: 'ses_hij456', method: '-', endpoint: '/system/backup' },
];

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
  selectedLog = signal<ActivityLog | null>(null);
  showExportDropdown = signal(false);
  useMockData = signal(false);

  searchQuery = signal('');
  userFilter = signal('All');
  actionTypeFilter = signal('All');
  entityTypeFilter = signal('All');
  statusFilter = signal('All');
  currentPage = signal(1);
  rowsPerPage = signal(10);
  activityLogs = signal<ActivityLog[]>([]);
  totalLogs = signal(0);

  ngOnInit(): void { this.loadLogs(); }

  loadLogs(): void {
    this.activityLogsService.getAll().subscribe({
      next: (logs) => {
        const validLogs = logs as ActivityLog[];
        if (validLogs?.length) {
          this.activityLogs.set(validLogs);
          this.totalLogs.set(validLogs.length);
          this.useMockData.set(false);
        } else {
          this.fallbackToMock();
        }
      },
      error: () => this.fallbackToMock()
    });
  }

  private fallbackToMock(): void {
    this.activityLogs.set(MOCK_LOGS);
    this.totalLogs.set(MOCK_LOGS.length);
    this.useMockData.set(true);
  }

  filteredLogs = computed(() => {
    let result = [...this.activityLogs()];
    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      result = result.filter(l =>
        l.user.toLowerCase().includes(q) || l.entityType.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q) || l.action.toLowerCase().includes(q)
      );
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
    if (total === 0) return { start: 0, end: 0 };
    const start = (this.currentPage() - 1) * this.rowsPerPage() + 1;
    return { start, end: Math.min(this.currentPage() * this.rowsPerPage(), total) };
  });

  summaryStats = computed(() => {
    const all = this.activityLogs();
    const total = all.length || 1;
    const success = all.filter(l => l.status === 'Success').length;
    const failures = all.filter(l => l.status === 'Failure').length;
    const warnings = all.filter(l => l.status === 'Warning').length;
    return {
      total: all.length,
      success,
      failures,
      warnings,
      successPct: Math.round((success / total) * 100),
      failurePct: Math.round((failures / total) * 100),
      warningPct: Math.round((warnings / total) * 100),
    };
  });

  uniqueUsers = computed(() => [...new Set(this.activityLogs().map(l => l.user))]);

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
    const icons: Record<string, string> = { 'Create': 'bi-plus-circle', 'Update': 'bi-pencil', 'Delete': 'bi-trash', 'View': 'bi-eye', 'Login': 'bi-key', 'Logout': 'bi-box-arrow-right', 'Export': 'bi-download', 'Import': 'bi-upload', 'Approve': 'bi-check-circle', 'Reject': 'bi-x-circle', 'Alert': 'bi-exclamation-triangle', 'Error': 'bi-x-circle' };
    return icons[actionType] || 'bi-circle';
  }

  getActionColor(actionType: string): string {
    const colors: Record<string, string> = { 'Create': 'green', 'Update': 'blue', 'Delete': 'red', 'View': 'gray', 'Login': 'green', 'Logout': 'gray', 'Export': 'purple', 'Import': 'purple', 'Approve': 'green', 'Reject': 'red', 'Alert': 'orange', 'Error': 'red' };
    return colors[actionType] || 'gray';
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = { 'Success': 'green', 'Failure': 'red', 'Warning': 'orange' };
    return colors[status] || 'gray';
  }

  formatTimestamp(date: any): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  formatTimeAgo(date: any): string {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(diff / 86400000);
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  exportLogs(format: string): void { this.showExportDropdown.set(false); }

  openDetailsModal(log: ActivityLog): void { this.selectedLog.set(log); this.showDetailsModal.set(true); }
  closeDetailsModal(): void { this.showDetailsModal.set(false); this.selectedLog.set(null); }

  openLogSettings(): void {}

  copyDetails(): void {
    const log = this.selectedLog();
    if (!log) return;
    const text = `Timestamp: ${this.formatTimestamp(log.timestamp)}\nUser: ${log.user}\nAction: ${log.action}\nEntity: ${log.entityType} (${log.entityId})\nStatus: ${log.status}\nDetails: ${log.details}`;
    navigator.clipboard.writeText(text);
  }
}
