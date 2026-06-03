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

const MOCK_LOGS: LogEntry[] = [
  { id: '1', timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(), user: 'John Doe', action: 'Created property asset', actionType: 'Create', entityType: 'Property', entityId: 'PRP-2026-042', details: 'Added MacBook Pro M3 to IT inventory', ipAddress: '192.168.1.100', status: 'Success' },
  { id: '2', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), user: 'Sarah Smith', action: 'Approved requisition', actionType: 'Approve', entityType: 'Requisition', entityId: 'REQ-2026-891', details: 'Approved stationery request for HR department', ipAddress: '192.168.1.101', status: 'Success' },
  { id: '3', timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(), user: 'Mike Wilson', action: 'Updated stock levels', actionType: 'Update', entityType: 'Stock', entityId: 'STK-045', details: 'Adjusted laptop stock from 24 to 22 units', ipAddress: '192.168.1.102', status: 'Success' },
  { id: '4', timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(), user: 'Lisa Wong', action: 'Exported financial report', actionType: 'Export', entityType: 'Report', entityId: 'RPT-FIN-2026-Q2', details: 'Exported Q2 financial summary report', ipAddress: '192.168.1.103', status: 'Success' },
  { id: '5', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), user: 'Robert Brown', action: 'Login attempt failed', actionType: 'Login', entityType: 'User', entityId: 'EMP-006', details: 'Failed login attempt from unrecognized device', ipAddress: '203.0.113.45', status: 'Failure' },
  { id: '6', timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(), user: 'Alice Johnson', action: 'Transferred property', actionType: 'Update', entityType: 'Property', entityId: 'PRP-2025-128', details: 'Transferred office furniture to Warehouse B', ipAddress: '192.168.1.105', status: 'Success' },
  { id: '7', timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(), user: 'Kevin Martin', action: 'Deleted user account', actionType: 'Delete', entityType: 'User', entityId: 'EMP-016', details: 'Permanently deleted terminated employee account', ipAddress: '192.168.1.106', status: 'Success' },
  { id: '8', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), user: 'System', action: 'Automated backup', actionType: 'Create', entityType: 'Backup', entityId: 'BAK-2026-06-01', details: 'Daily system backup completed successfully (2.4 GB)', ipAddress: '127.0.0.1', status: 'Success' },
  { id: '9', timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(), user: 'Elena Garcia', action: 'Created new request', actionType: 'Create', entityType: 'Requisition', entityId: 'REQ-2026-892', details: 'New purchase request for office supplies', ipAddress: '192.168.1.107', status: 'Success' },
  { id: '10', timestamp: new Date(Date.now() - 1000 * 60 * 40).toISOString(), user: 'David Lee', action: 'Stock adjustment alert', actionType: 'Alert', entityType: 'Stock', entityId: 'STK-101', details: 'Low stock warning: Printer ink cartridges below threshold', ipAddress: '192.168.1.108', status: 'Warning' },
  { id: '11', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), user: 'Neha Patel', action: 'Updated system config', actionType: 'Update', entityType: 'Settings', entityId: 'CFG-001', details: 'Modified email notification settings', ipAddress: '192.168.1.109', status: 'Success' },
  { id: '12', timestamp: new Date(Date.now() - 1000 * 60 * 50).toISOString(), user: 'Tom Clark', action: 'Rejected requisition', actionType: 'Reject', entityType: 'Requisition', entityId: 'REQ-2026-890', details: 'Rejected due to budget constraints', ipAddress: '192.168.1.110', status: 'Success' },
  { id: '13', timestamp: new Date(Date.now() - 1000 * 60 * 55).toISOString(), user: 'Julia Rodriguez', action: 'Viewed employee records', actionType: 'View', entityType: 'Employee', entityId: 'EMP-012', details: 'Accessed personnel file for annual review', ipAddress: '192.168.1.111', status: 'Success' },
  { id: '14', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), user: 'Henry Kim', action: 'System error', actionType: 'Error', entityType: 'System', entityId: 'SYS-ERR-8912', details: 'Database connection timeout on warehouse module', ipAddress: '192.168.1.112', status: 'Failure' },
  { id: '15', timestamp: new Date(Date.now() - 1000 * 60 * 65).toISOString(), user: 'Megan White', action: 'Imported vendor list', actionType: 'Import', entityType: 'Supplier', entityId: 'BULK-003', details: 'Bulk imported 45 vendor records from CSV', ipAddress: '192.168.1.113', status: 'Success' },
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
  useMockData = signal(false);

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
          this.useMockData.set(false);
        } else {
          this.fallback();
        }
        this.loading.set(false);
      },
      error: () => { this.fallback(); this.loading.set(false); }
    });
  }

  private fallback(): void {
    this.activityLogs.set(MOCK_LOGS);
    this.totalLogs.set(MOCK_LOGS.length);
    this.useMockData.set(true);
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

  exportLogs(format: string): void { this.showExportDropdown.set(false); }

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
