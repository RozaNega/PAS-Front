import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface RequisitionItem {
  name: string;
  quantity: number;
  unit: string;
}

interface Requisition {
  id: string;
  requestNumber: string;
  requesterName: string;
  department: string;
  purpose: string;
  urgency: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed' | 'Cancelled';
  totalItems: number;
  totalQuantity: number;
  requestDate: string;
  approvedDate?: string;
  completedDate?: string;
  notes?: string;
  items?: RequisitionItem[];
}

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
  source: Requisition | SIV;
}

const MOCK_REQUISITIONS: Requisition[] = [
  { id: 'REQ-001', requestNumber: 'SR-2026-0001', requesterName: 'John Doe', department: 'IT', purpose: 'Laptop replacement for new hire', urgency: 'High', status: 'Pending', totalItems: 2, totalQuantity: 5, requestDate: '2026-05-28T09:00:00.000Z', items: [{ name: 'Dell Laptop', quantity: 2, unit: 'pcs' }, { name: 'Laptop Bag', quantity: 3, unit: 'pcs' }] },
  { id: 'REQ-002', requestNumber: 'SR-2026-0002', requesterName: 'Sarah Smith', department: 'Operations', purpose: 'Emergency server repair parts', urgency: 'Critical', status: 'Pending', totalItems: 3, totalQuantity: 8, requestDate: '2026-05-28T10:30:00.000Z', items: [{ name: 'Server PSU', quantity: 2, unit: 'pcs' }, { name: 'RAM 32GB', quantity: 4, unit: 'pcs' }, { name: 'SAS Cable', quantity: 2, unit: 'pcs' }] },
  { id: 'REQ-003', requestNumber: 'SR-2026-0003', requesterName: 'Mike Wilson', department: 'Warehouse', purpose: 'Industrial shelving units', urgency: 'Medium', status: 'Approved', totalItems: 2, totalQuantity: 12, requestDate: '2026-05-27T08:00:00.000Z', approvedDate: '2026-05-28T14:00:00.000Z', items: [{ name: 'Heavy Duty Shelving', quantity: 4, unit: 'pcs' }, { name: 'Shelf Brackets', quantity: 8, unit: 'pcs' }] },
  { id: 'REQ-004', requestNumber: 'SR-2026-0004', requesterName: 'Peter Chen', department: 'HR', purpose: 'Office supplies for new staff', urgency: 'Low', status: 'Approved', totalItems: 3, totalQuantity: 45, requestDate: '2026-05-26T11:00:00.000Z', approvedDate: '2026-05-27T09:00:00.000Z', items: [{ name: 'A4 Paper Box', quantity: 10, unit: 'boxes' }, { name: 'Ballpoint Pens', quantity: 25, unit: 'pcs' }, { name: 'Sticky Notes', quantity: 10, unit: 'packs' }] },
  { id: 'REQ-005', requestNumber: 'SR-2026-0005', requesterName: 'Lisa Wong', department: 'Finance', purpose: 'Audit software license renewal', urgency: 'High', status: 'Rejected', totalItems: 1, totalQuantity: 1, requestDate: '2026-05-25T09:30:00.000Z', notes: 'Budget not available for this fiscal year', items: [{ name: 'AuditPro License', quantity: 1, unit: 'license' }] },
  { id: 'REQ-006', requestNumber: 'SR-2026-0006', requesterName: 'Robert Brown', department: 'Compliance', purpose: 'Staff training materials', urgency: 'Medium', status: 'Completed', totalItems: 2, totalQuantity: 30, requestDate: '2026-05-24T08:00:00.000Z', approvedDate: '2026-05-25T10:00:00.000Z', completedDate: '2026-05-28T16:00:00.000Z', items: [{ name: 'Training Manuals', quantity: 20, unit: 'pcs' }, { name: 'Compliance Posters', quantity: 10, unit: 'pcs' }] },
  { id: 'REQ-007', requestNumber: 'SR-2026-0007', requesterName: 'Alice Johnson', department: 'Property', purpose: 'Furniture repair supplies', urgency: 'Low', status: 'Pending', totalItems: 2, totalQuantity: 15, requestDate: '2026-05-28T07:00:00.000Z', items: [{ name: 'Wood Glue', quantity: 5, unit: 'bottles' }, { name: 'Sanding Paper Pack', quantity: 10, unit: 'packs' }] },
  { id: 'REQ-008', requestNumber: 'SR-2026-0008', requesterName: 'David Lee', department: 'Warehouse', purpose: 'Safety equipment replacement', urgency: 'High', status: 'Approved', totalItems: 3, totalQuantity: 35, requestDate: '2026-05-27T13:00:00.000Z', approvedDate: '2026-05-28T11:00:00.000Z', items: [{ name: 'Safety Helmets', quantity: 15, unit: 'pcs' }, { name: 'Safety Vests', quantity: 15, unit: 'pcs' }, { name: 'First Aid Kits', quantity: 5, unit: 'pcs' }] },
  { id: 'REQ-009', requestNumber: 'SR-2026-0009', requesterName: 'Elena Garcia', department: 'Sales', purpose: 'Marketing collateral printing', urgency: 'Medium', status: 'Rejected', totalItems: 2, totalQuantity: 500, requestDate: '2026-05-26T15:00:00.000Z', notes: 'Use existing stock before ordering new', items: [{ name: 'Brochures', quantity: 300, unit: 'pcs' }, { name: 'Business Cards', quantity: 200, unit: 'pcs' }] },
  { id: 'REQ-010', requestNumber: 'SR-2026-0010', requesterName: 'Kevin Martin', department: 'IT', purpose: 'Cable management accessories', urgency: 'Low', status: 'Completed', totalItems: 2, totalQuantity: 50, requestDate: '2026-05-23T09:00:00.000Z', approvedDate: '2026-05-24T08:00:00.000Z', completedDate: '2026-05-27T12:00:00.000Z', items: [{ name: 'Cable Ties Pack', quantity: 30, unit: 'packs' }, { name: 'Cable Labels', quantity: 20, unit: 'rolls' }] },
  { id: 'REQ-011', requestNumber: 'SR-2026-0011', requesterName: 'Neha Patel', department: 'Operations', purpose: 'Backup generator fuel', urgency: 'Critical', status: 'Pending', totalItems: 1, totalQuantity: 100, requestDate: '2026-05-29T06:00:00.000Z', items: [{ name: 'Diesel Fuel', quantity: 100, unit: 'liters' }] },
  { id: 'REQ-012', requestNumber: 'SR-2026-0012', requesterName: 'Tom Clark', department: 'HR', purpose: 'Recruitment drive materials', urgency: 'Medium', status: 'Approved', totalItems: 3, totalQuantity: 60, requestDate: '2026-05-25T10:00:00.000Z', approvedDate: '2026-05-26T09:00:00.000Z', items: [{ name: 'Job Fair Banner', quantity: 2, unit: 'pcs' }, { name: 'Company Brochures', quantity: 50, unit: 'pcs' }, { name: 'Branded Pens', quantity: 8, unit: 'boxes' }] },
  { id: 'REQ-013', requestNumber: 'SR-2026-0013', requesterName: 'Julia Rodriguez', department: 'HR', purpose: 'Printer toner and paper', urgency: 'Low', status: 'Cancelled', totalItems: 2, totalQuantity: 15, requestDate: '2026-05-24T12:00:00.000Z', notes: 'Cancelled by requester', items: [{ name: 'Printer Toner', quantity: 5, unit: 'pcs' }, { name: 'A4 Paper', quantity: 10, unit: 'reams' }] },
  { id: 'REQ-014', requestNumber: 'SR-2026-0014', requesterName: 'Henry Kim', department: 'Warehouse', purpose: 'Forklift spare parts', urgency: 'High', status: 'Completed', totalItems: 2, totalQuantity: 8, requestDate: '2026-05-22T08:00:00.000Z', approvedDate: '2026-05-23T10:00:00.000Z', completedDate: '2026-05-26T15:00:00.000Z', items: [{ name: 'Forklift Tires', quantity: 4, unit: 'pcs' }, { name: 'Hydraulic Fluid', quantity: 4, unit: 'liters' }] },
  { id: 'REQ-015', requestNumber: 'SR-2026-0015', requesterName: 'Megan White', department: 'Compliance', purpose: 'Security audit equipment', urgency: 'High', status: 'Pending', totalItems: 3, totalQuantity: 22, requestDate: '2026-05-29T08:00:00.000Z', items: [{ name: 'Security Cameras', quantity: 10, unit: 'pcs' }, { name: 'Access Cards', quantity: 10, unit: 'pcs' }, { name: 'Lock Sets', quantity: 2, unit: 'pcs' }] },
  { id: 'REQ-016', requestNumber: 'SR-2026-0016', requesterName: 'John Doe', department: 'IT', purpose: 'UPS battery replacement', urgency: 'Low', status: 'Approved', totalItems: 1, totalQuantity: 6, requestDate: '2026-05-21T14:00:00.000Z', approvedDate: '2026-05-22T09:00:00.000Z', items: [{ name: 'UPS Battery Pack', quantity: 6, unit: 'pcs' }] },
  { id: 'REQ-017', requestNumber: 'SR-2026-0017', requesterName: 'Lisa Wong', department: 'Finance', purpose: 'Fraud investigation tools', urgency: 'Critical', status: 'Rejected', totalItems: 2, totalQuantity: 3, requestDate: '2026-05-20T11:00:00.000Z', notes: 'Requires board approval first', items: [{ name: 'Forensic Software', quantity: 1, unit: 'license' }, { name: 'External HDD', quantity: 2, unit: 'pcs' }] },
  { id: 'REQ-018', requestNumber: 'SR-2026-0018', requesterName: 'Alice Johnson', department: 'Property', purpose: 'Office renovation materials', urgency: 'Medium', status: 'Completed', totalItems: 3, totalQuantity: 75, requestDate: '2026-05-19T09:00:00.000Z', approvedDate: '2026-05-20T08:00:00.000Z', completedDate: '2026-05-28T10:00:00.000Z', items: [{ name: 'Paint Buckets', quantity: 15, unit: 'pcs' }, { name: 'Paint Brushes', quantity: 30, unit: 'pcs' }, { name: 'Drop Cloths', quantity: 30, unit: 'pcs' }] },
  { id: 'REQ-019', requestNumber: 'SR-2026-0019', requesterName: 'Elena Garcia', department: 'Sales', purpose: 'Client gift hampers', urgency: 'Medium', status: 'Pending', totalItems: 2, totalQuantity: 25, requestDate: '2026-05-29T12:00:00.000Z', items: [{ name: 'Gift Hampers', quantity: 10, unit: 'pcs' }, { name: 'Greeting Cards', quantity: 15, unit: 'pcs' }] },
  { id: 'REQ-020', requestNumber: 'SR-2026-0020', requesterName: 'Sarah Smith', department: 'Operations', purpose: 'Logistics tracking software', urgency: 'High', status: 'Approved', totalItems: 1, totalQuantity: 1, requestDate: '2026-05-18T10:00:00.000Z', approvedDate: '2026-05-19T14:00:00.000Z', items: [{ name: 'LogiTrack License', quantity: 1, unit: 'license' }] },
];

const MOCK_SIVS: SIV[] = [
  { id: 'SIV-001', sivNumber: 'SIV-2026-0001', requestNumber: 'SR-2026-0003', issuedTo: 'Mike Wilson', issuedBy: 'John Doe', department: 'Warehouse', issueDate: '2026-05-28T14:30:00.000Z', status: 'Issued', totalItems: 2, totalQuantity: 12 },
  { id: 'SIV-002', sivNumber: 'SIV-2026-0002', requestNumber: 'SR-2026-0008', issuedTo: 'David Lee', issuedBy: 'Sarah Smith', department: 'Warehouse', issueDate: '2026-05-28T11:30:00.000Z', status: 'Issued', totalItems: 3, totalQuantity: 35 },
  { id: 'SIV-003', sivNumber: 'SIV-2026-0003', requestNumber: 'SR-2026-0006', issuedTo: 'Robert Brown', issuedBy: 'Neha Patel', department: 'Compliance', issueDate: '2026-05-28T16:00:00.000Z', status: 'Issued', totalItems: 2, totalQuantity: 30 },
  { id: 'SIV-004', sivNumber: 'SIV-2026-0004', requestNumber: 'SR-2026-0010', issuedTo: 'Kevin Martin', issuedBy: 'Mike Wilson', department: 'IT', issueDate: '2026-05-27T12:00:00.000Z', status: 'Issued', totalItems: 2, totalQuantity: 50 },
  { id: 'SIV-005', sivNumber: 'SIV-2026-0005', requestNumber: 'SR-2026-0014', issuedTo: 'Henry Kim', issuedBy: 'Alice Johnson', department: 'Warehouse', issueDate: '2026-05-26T15:00:00.000Z', status: 'Issued', totalItems: 2, totalQuantity: 8 },
  { id: 'SIV-006', sivNumber: 'SIV-2026-0006', requestNumber: 'SR-2026-0012', issuedTo: 'Tom Clark', issuedBy: 'John Doe', department: 'HR', issueDate: '2026-05-26T09:30:00.000Z', status: 'Pending', totalItems: 3, totalQuantity: 60 },
  { id: 'SIV-007', sivNumber: 'SIV-2026-0007', requestNumber: 'SR-2026-0018', issuedTo: 'Alice Johnson', issuedBy: 'Sarah Smith', department: 'Property', issueDate: '2026-05-28T10:00:00.000Z', status: 'Issued', totalItems: 3, totalQuantity: 75 },
  { id: 'SIV-008', sivNumber: 'SIV-2026-0008', requestNumber: 'SR-2026-0001', issuedTo: 'John Doe', issuedBy: 'Peter Chen', department: 'IT', issueDate: '2026-05-29T08:00:00.000Z', status: 'Pending', totalItems: 2, totalQuantity: 5 },
  { id: 'SIV-009', sivNumber: 'SIV-2026-0009', requestNumber: 'SR-2026-0016', issuedTo: 'John Doe', issuedBy: 'Lisa Wong', department: 'IT', issueDate: '2026-05-22T10:00:00.000Z', status: 'Cancelled', totalItems: 1, totalQuantity: 6, notes: 'Cancelled due to stock unavailability' },
  { id: 'SIV-010', sivNumber: 'SIV-2026-0010', requestNumber: 'SR-2026-0013', issuedTo: 'Julia Rodriguez', issuedBy: 'Tom Clark', department: 'HR', issueDate: '2026-05-24T12:00:00.000Z', status: 'Cancelled', totalItems: 2, totalQuantity: 15, notes: 'Request was cancelled by requester' },
];

@Component({
  selector: 'app-requisition-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './requisition-dashboard.component.html',
  styleUrls: ['./requisition-dashboard.component.scss']
})
export class RequisitionDashboardComponent implements OnInit {
  activeTab = signal<TabType>('all');
  searchQuery = signal('');
  statusFilter = signal('All');
  departmentFilter = signal('All');
  urgencyFilter = signal('All');
  currentPage = signal(1);
  rowsPerPage = signal(10);

  requisitions = signal<Requisition[]>([]);
  sivs = signal<SIV[]>([]);

  showDetailModal = signal(false);
  selectedRequisition = signal<Requisition | null>(null);
  showSivDetailModal = signal(false);
  selectedSiv = signal<SIV | null>(null);

  showApproveModal = signal(false);
  approveTarget = signal<Requisition | null>(null);
  approveForm = signal<{ remarks: string }>({ remarks: '' });

  showRejectModal = signal(false);
  rejectTarget = signal<Requisition | null>(null);
  rejectReason = signal('');

  showDeleteConfirm = signal(false);
  deleteTarget = signal<Requisition | SIV | null>(null);

  notification = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  showExportDropdown = signal(false);

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

    const mapReq = (r: Requisition): UnifiedItem => ({
      type: 'Requisition', id: r.id, number: r.requestNumber, name: r.requesterName,
      department: r.department, items: r.totalItems, quantity: r.totalQuantity,
      status: r.status, statusClass: r.status.toLowerCase(), date: r.requestDate, source: r,
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
      items = items.filter(item => item.type === 'Requisition' && (item.source as Requisition).urgency === urgentF);
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
      if (seen.has(item.department)) return false;
      seen.add(item.department);
      return true;
    }).map(item => item.department).sort();
  });

  ngOnInit(): void {
    this.requisitions.set(MOCK_REQUISITIONS);
    this.sivs.set(MOCK_SIVS);
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
      this.selectedRequisition.set(item.source as Requisition);
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

  openApproveModal(item: UnifiedItem): void {
    if (item.type !== 'Requisition') return;
    this.approveTarget.set(item.source as Requisition);
    this.approveForm.set({ remarks: '' });
    this.showApproveModal.set(true);
  }

  closeApproveModal(): void {
    this.showApproveModal.set(false);
    this.approveTarget.set(null);
    this.approveForm.set({ remarks: '' });
  }

  updateApproveRemarks(e: Event): void {
    this.approveForm.update(f => ({ ...f, remarks: (e.target as HTMLTextAreaElement).value }));
  }

  executeApprove(): void {
    const target = this.approveTarget();
    if (!target) return;
    this.requisitions.update(list =>
      list.map(r => r.id === target.id ? { ...r, status: 'Approved' as const, approvedDate: new Date().toISOString() } as Requisition : r)
    );
    this.notification.set({ type: 'success', message: `${target.requestNumber} approved successfully.` });
    this.autoDismissNotification();
    this.closeApproveModal();
  }

  openRejectModal(item: UnifiedItem): void {
    if (item.type !== 'Requisition') return;
    this.rejectTarget.set(item.source as Requisition);
    this.rejectReason.set('');
    this.showRejectModal.set(true);
  }

  closeRejectModal(): void {
    this.showRejectModal.set(false);
    this.rejectTarget.set(null);
    this.rejectReason.set('');
  }

  updateRejectReason(e: Event): void {
    this.rejectReason.set((e.target as HTMLTextAreaElement).value);
  }

  executeReject(): void {
    const target = this.rejectTarget();
    if (!target) return;
    if (!this.rejectReason().trim()) {
      this.notification.set({ type: 'error', message: 'Please provide a rejection reason.' });
      this.autoDismissNotification();
      return;
    }
    this.requisitions.update(list =>
      list.map(r => r.id === target.id ? { ...r, status: 'Rejected' as const, notes: this.rejectReason() } as Requisition : r)
    );
    this.notification.set({ type: 'success', message: `${target.requestNumber} rejected.` });
    this.autoDismissNotification();
    this.closeRejectModal();
  }

  confirmDelete(item: UnifiedItem): void {
    this.deleteTarget.set(item.source);
    this.showDeleteConfirm.set(true);
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.deleteTarget.set(null);
  }

  executeDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    if ('urgency' in target) {
      const req = target as Requisition;
      this.requisitions.update(list => list.filter(r => r.id !== req.id));
      this.notification.set({ type: 'success', message: `${req.requestNumber} deleted.` });
    } else {
      const siv = target as SIV;
      this.sivs.update(list => list.filter(s => s.id !== siv.id));
      this.notification.set({ type: 'success', message: `${siv.sivNumber} deleted.` });
    }
    this.autoDismissNotification();
    this.cancelDelete();
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
    return (item.source as Requisition).purpose;
  }

  reqUrgency(item: UnifiedItem): string {
    return (item.source as Requisition).urgency;
  }

  reqUrgencyClass(item: UnifiedItem): string {
    return 'urgency-' + (item.source as Requisition).urgency.toLowerCase();
  }

  getDeleteLabel(target: Requisition | SIV): string {
    if ('urgency' in target) {
      return (target as Requisition).requestNumber;
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
