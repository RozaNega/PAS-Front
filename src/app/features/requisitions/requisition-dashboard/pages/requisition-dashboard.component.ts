import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ServiceRequestService, ServiceRequestDto } from '../../../requisition/service-requests/services/service-request.service';
import { RequisitionsService, StoreIssueVoucherDto } from '../../../../core/services/requisitions.service';

interface SIV {
  id: string;
  sivNumber: string;
  requestNumber: string;
  issuedTo: string;
  issuedBy: string;
  department: string;
  issueDate: string;
  status: 'Pending' | 'Issued' | 'Cancelled';
  totalItems: number;
  totalQuantity: number;
  notes?: string;
}

type TabType = 'all' | 'pending' | 'approved' | 'rejected' | 'completed' | 'sivs';

interface UnifiedItem {
  type: 'Requisition' | 'SIV';
  id: string;
  number: string;
  name: string;
  department: string;
  items: number;
  quantity: number;
  status: string;
  statusClass: string;
  date: string;
  source: ServiceRequestDto | SIV;
}



@Component({
  selector: 'app-requisition-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './requisition-dashboard.component.html',
  styleUrls: ['./requisition-dashboard.component.scss']
})
export class RequisitionDashboardComponent implements OnInit {
  private readonly serviceRequestService = inject(ServiceRequestService);
  private readonly requisitionsService = inject(RequisitionsService);
  private readonly router = inject(Router);

  activeTab = signal<TabType>('all');
  searchQuery = signal('');
  statusFilter = signal('All');
  departmentFilter = signal('All');
  urgencyFilter = signal('All');
  currentPage = signal(1);
  rowsPerPage = signal(10);

  requisitions = signal<ServiceRequestDto[]>([]);
  sivs = signal<SIV[]>([]);

  showDetailModal = signal(false);
  selectedRequisition = signal<ServiceRequestDto | null>(null);
  showSivDetailModal = signal(false);
  selectedSiv = signal<SIV | null>(null);

  showApproveModal = signal(false);
  approveTarget = signal<ServiceRequestDto | null>(null);
  approveForm = signal<{ remarks: string }>({ remarks: '' });

  showRejectModal = signal(false);
  rejectTarget = signal<ServiceRequestDto | null>(null);
  rejectReason = signal('');

  showDeleteConfirm = signal(false);
  deleteTarget = signal<ServiceRequestDto | SIV | null>(null);

  notification = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  showExportDropdown = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);

  tabCounts = computed(() => {
    const reqs = this.requisitions();
    const sivList = this.sivs();
    return {
      all: reqs.length,
      pending: reqs.filter(r => r.status === 'Pending').length,
      approved: reqs.filter(r => r.status === 'Approved').length,
      rejected: reqs.filter(r => r.status === 'Rejected').length,
      completed: reqs.filter(r => r.status === 'Completed').length,
      sivs: sivList.length,
    };
  });

  tabItems = [
    { key: 'all' as TabType, label: 'All Requests', icon: 'bi bi-list', count: () => this.tabCounts().all },
    { key: 'pending' as TabType, label: 'Pending Approvals', icon: 'bi bi-clock', count: () => this.tabCounts().pending },
    { key: 'approved' as TabType, label: 'Approved', icon: 'bi bi-check-circle', count: () => this.tabCounts().approved },
    { key: 'rejected' as TabType, label: 'Rejected', icon: 'bi bi-x-circle', count: () => this.tabCounts().rejected },
    { key: 'completed' as TabType, label: 'Completed', icon: 'bi bi-check2-all', count: () => this.tabCounts().completed },
    { key: 'sivs' as TabType, label: 'SIVs', icon: 'bi bi-box-seam', count: () => this.tabCounts().sivs },
  ];

  summaryStats = computed(() => {
    const reqs = this.requisitions();
    const sivList = this.sivs();
    return {
      totalReqs: reqs.length,
      pendingCount: reqs.filter(r => r.status === 'Pending').length,
      approvedCount: reqs.filter(r => r.status === 'Approved').length,
      rejectedCount: reqs.filter(r => r.status === 'Rejected').length,
      completedCount: reqs.filter(r => r.status === 'Completed').length,
      sivCount: sivList.length,
    };
  });

  filteredItems = computed(() => {
    const tab = this.activeTab();
    const q = this.searchQuery().toLowerCase();
    const statusF = this.statusFilter();
    const deptF = this.departmentFilter();
    const urgentF = this.urgencyFilter();

    const mapReq = (r: ServiceRequestDto): UnifiedItem => ({
      type: 'Requisition', id: r.id, number: r.srNumber || '—', name: r.requesterName || '—',
      department: r.department || '—', items: r.totalItems || 0, quantity: r.totalQuantity || 0,
      status: r.status || 'Pending', statusClass: (r.status || 'Pending').toLowerCase(), date: r.requestDate || new Date().toISOString(), source: r,
    });
    const mapSiv = (s: SIV): UnifiedItem => ({
      type: 'SIV', id: s.id, number: s.sivNumber, name: s.issuedTo,
      department: s.department, items: s.totalItems, quantity: s.totalQuantity,
      status: s.status, statusClass: s.status.toLowerCase(), date: s.issueDate, source: s,
    });

    let items: UnifiedItem[] = [];
    if (tab === 'all' || tab === 'sivs') {
      items = [...this.requisitions().map(mapReq), ...this.sivs().map(mapSiv)];
    } else {
      const statusMap: Record<string, string> = {
        pending: 'Pending', approved: 'Approved', rejected: 'Rejected', completed: 'Completed',
      };
      items = this.requisitions().filter(r => r.status === statusMap[tab]).map(mapReq);
    }

    if (q) {
      items = items.filter(item =>
        item.number.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.department.toLowerCase().includes(q)
      );
    }
    if (statusF !== 'All') {
      items = items.filter(item => item.status === statusF);
    }
    if (deptF !== 'All') {
      items = items.filter(item => item.department === deptF);
    }
    if (urgentF !== 'All' && tab !== 'sivs') {
      items = items.filter(item => item.type === 'Requisition' && (item.source as ServiceRequestDto).urgency === urgentF);
    }

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  pagedItems = computed(() => {
    const start = (this.currentPage() - 1) * this.rowsPerPage();
    return this.filteredItems().slice(start, start + this.rowsPerPage());
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredItems().length / this.rowsPerPage())));

  displayRange = computed(() => {
    const count = this.filteredItems().length;
    if (count === 0) return { start: 0, end: 0 };
    const start = (this.currentPage() - 1) * this.rowsPerPage() + 1;
    return { start, end: Math.min(this.currentPage() * this.rowsPerPage(), count) };
  });

  uniqueDepartments = computed(() => {
    const seen = new Set<string>();
    return [...this.requisitions(), ...this.sivs()].filter(item => {
      if (!item.department) return false;
      if (seen.has(item.department)) return false;
      seen.add(item.department);
      return true;
    }).map(item => item.department!).sort();
  });

  ngOnInit(): void {
    this.loadRequisitions();
    this.loadSIVs();
  }

  loadSIVs(): void {
    this.requisitionsService.getAllSIVs().subscribe({
      next: (response) => {
        if (response.success !== false && Array.isArray(response.data)) {
          const apiSivs: SIV[] = response.data.map(siv => ({
            id: String(siv.id),
            sivNumber: siv.voucherNumber || `SIV-${String(siv.id).slice(0, 8)}`,
            requestNumber: String(siv.serviceRequestId || ''),
            issuedTo: siv.issuedBy || '—',
            issuedBy: siv.issuedBy || '—',
            department: '—',
            issueDate: siv.issueDate || new Date().toISOString(),
            status: (siv.status || '').toLowerCase().includes('pending') ? 'Pending' : 'Issued',
            totalItems: (siv.items ?? []).length,
            totalQuantity: (siv.items ?? []).reduce((s: number, i: any) => s + (Number(i.quantity) || 0), 0) || 0,
          }));
          this.sivs.set(apiSivs);
        }
      },
      error: () => {
      },
    });
  }

  loadRequisitions(): void {
    this.loading.set(true);
    this.error.set(null);

    this.serviceRequestService.getAll().subscribe({
      next: (response) => {
        if (response.success !== false && Array.isArray(response.data)) {
          this.requisitions.set(response.data);
        } else {
          this.error.set(response.message || 'No requisition data received from server');
        }
        this.loading.set(false);
      },
      error: (err: unknown) => {
        console.error('Error loading requisitions', err);
        this.error.set('Failed to load requisitions. Please try again.');
        this.loading.set(false);
      },
    });
  }

  switchTab(tab: TabType): void {
    this.activeTab.set(tab);
    this.currentPage.set(1);
  }

  onSearch(e: Event): void {
    this.searchQuery.set((e.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  onStatusFilter(e: Event): void {
    this.statusFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onDepartmentFilter(e: Event): void {
    this.departmentFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onUrgencyFilter(e: Event): void {
    this.urgencyFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onRowsPerPageChange(e: Event): void {
    this.rowsPerPage.set(+(e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('All');
    this.departmentFilter.set('All');
    this.urgencyFilter.set('All');
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  getPageArray(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  openDetailModal(item: UnifiedItem): void {
    if (item.type === 'SIV') {
      this.selectedSiv.set(item.source as SIV);
      this.showSivDetailModal.set(true);
    } else {
      this.selectedRequisition.set(item.source as ServiceRequestDto);
      this.showDetailModal.set(true);
    }
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedRequisition.set(null);
  }

  closeSivDetailModal(): void {
    this.showSivDetailModal.set(false);
    this.selectedSiv.set(null);
  }

  navigateToIssueSiv(item: UnifiedItem): void {
    if (item.type === 'Requisition') {
      this.router.navigate(['/admin/sivs/new'], {
        queryParams: { serviceRequestId: item.id },
      });
    }
  }

  isIssueable(status: string): boolean {
    return ['Manager Approved', 'Approved', 'Admin Approved', 'Compliance Review'].includes(status);
  }



  exportCSV(): void {
    this.showExportDropdown.set(false);
    const rows = this.filteredItems();
    if (!rows.length) return;

    const header = ['Type', 'Number', 'Name', 'Department', 'Items', 'Status', 'Date'];
    const lines = rows.map(item => [
      item.type,
      item.number,
      `"${item.name}"`,
      item.department,
      String(item.items),
      item.status,
      this.formatDate(item.date),
    ].join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'requisitions-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  sivRequestNumber(item: UnifiedItem): string {
    return (item.source as SIV).requestNumber;
  }

  reqPurpose(item: UnifiedItem): string {
    return (item.source as ServiceRequestDto).purpose || '—';
  }

  reqUrgency(item: UnifiedItem): string {
    return (item.source as ServiceRequestDto).urgency || 'Normal';
  }

  reqUrgencyClass(item: UnifiedItem): string {
    return 'urgency-' + ((item.source as ServiceRequestDto).urgency || 'normal').toLowerCase();
  }

  getDeleteLabel(target: ServiceRequestDto | SIV): string {
    if ('urgency' in target) {
      return (target as ServiceRequestDto).srNumber || '—';
    }
    return (target as SIV).sivNumber;
  }

  formatDate(iso: string): string {
    if (!iso) return '\u2014';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private autoDismissNotification(): void {
    setTimeout(() => this.notification.set(null), 4000);
  }

  dismissNotification(): void {
    this.notification.set(null);
  }
}
