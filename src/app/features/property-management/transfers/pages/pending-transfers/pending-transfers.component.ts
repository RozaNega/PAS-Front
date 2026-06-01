import { Component, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Transfer {
  id: string;
  tagNumber: string;
  propertyName: string;
  propertyCategory: string;
  fromLocation: string;
  fromDetails: string;
  toLocation: string;
  toDetails: string;
  reason: string;
  requestedBy: string;
  requesterDepartment: string;
  requestedDate: string;
  requiredByDate: string;
  priority: 'urgent' | 'medium' | 'normal';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  comments: string;
  isActive: boolean;
  createdAt: string;
}

type ModalMode = 'detail' | 'approve' | 'delete' | null;

@Component({
  selector: 'app-pending-transfers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pending-transfers.component.html',
  styleUrls: ['./pending-transfers.component.scss']
})
export class PendingTransfersComponent {
  transfers = signal<Transfer[]>([]);
  mockUsed = false;

  searchTerm = signal('');
  statusFilter = signal('All');
  priorityFilter = signal('All');
  fromLocationFilter = signal('All');
  page = signal(1);
  pageSize = 10;
  isLoading = signal(false);
  loadError = signal<string | null>(null);
  notification = signal<{ type: string; message: string } | null>(null);
  showModal = signal(false);
  modalMode = signal<ModalMode>(null);
  selectedTransfer = signal<Transfer | null>(null);
  transferToDelete = signal<Transfer | null>(null);

  approveComments = signal('');

  statuses = ['All', 'pending', 'approved', 'rejected', 'completed'];
  priorities = ['All', 'urgent', 'medium', 'normal'];

  totalTransfers = computed(() => this.transfers().length);
  pendingCount = computed(() => this.transfers().filter(t => t.status === 'pending').length);
  approvedCount = computed(() => this.transfers().filter(t => t.status === 'approved').length);
  rejectedCount = computed(() => this.transfers().filter(t => t.status === 'rejected').length);
  completedCount = computed(() => this.transfers().filter(t => t.status === 'completed').length);
  urgentCount = computed(() => this.transfers().filter(t => t.priority === 'urgent').length);
  approvedPct = computed(() => Math.round((this.approvedCount() / (this.totalTransfers() || 1)) * 100));

  filteredTransfers = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const status = this.statusFilter();
    const priority = this.priorityFilter();
    const fromLoc = this.fromLocationFilter();
    return this.transfers().filter(t => {
      const matchesSearch = !search ||
        t.id.toLowerCase().includes(search) ||
        t.propertyName.toLowerCase().includes(search) ||
        t.tagNumber.toLowerCase().includes(search) ||
        t.requestedBy.toLowerCase().includes(search) ||
        t.fromLocation.toLowerCase().includes(search) ||
        t.toLocation.toLowerCase().includes(search);
      const matchesStatus = status === 'All' || t.status === status;
      const matchesPriority = priority === 'All' || t.priority === priority;
      const matchesFrom = fromLoc === 'All' || t.fromLocation.includes(fromLoc);
      return matchesSearch && matchesStatus && matchesPriority && matchesFrom;
    });
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredTransfers().length / this.pageSize))
  );

  pagedTransfers = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredTransfers().slice(start, start + this.pageSize);
  });

  fromLocations = computed(() => {
    const locs = new Set(this.transfers().map(t => t.fromLocation));
    return ['All', ...Array.from(locs)];
  });

  constructor() {
    effect(() => {
      if (this.notification()) {
        setTimeout(() => this.notification.set(null), 4000);
      }
    });
    this.loadData();
  }

  private createMockTransfers(): Transfer[] {
    const ts = '2025-06-01T10:00:00.000Z';
    const people = [
      { name: 'Abebe Kebede', dept: 'IT Department' },
      { name: 'Sara Tilahun', dept: 'Human Resources' },
      { name: 'Getachew Tadesse', dept: 'Finance' },
      { name: 'Meron Alemu', dept: 'Marketing' },
      { name: 'Tadesse Hailu', dept: 'Operations' },
      { name: 'Hanna Solomon', dept: 'Procurement' },
      { name: 'Biruk Desta', dept: 'Logistics' },
      { name: 'Tsion Girma', dept: 'IT Department' },
      { name: 'Elias Worku', dept: 'Maintenance' },
      { name: 'Selam Tesfaye', dept: 'Administration' },
    ];
    const fromLocs = [
      { loc: 'HQ Bole, Floor 2', det: 'Room 201, IT Wing' },
      { loc: 'HQ Bole, Floor 1', det: 'Room 105, HR Section' },
      { loc: 'HQ Bole, Floor 3', det: 'Room 310, Finance Office' },
      { loc: 'HQ Kazanchis', det: 'Building A, Procurement' },
      { loc: 'Central Warehouse', det: 'Aisle 3, Shelf 14' },
      { loc: 'Branch Office - Merkato', det: 'Ground Floor, Sales' },
      { loc: 'Cargo Terminal - Bole', det: 'Sector 2, Bay 7' },
      { loc: 'HQ Bole, Floor 4', det: 'Room 401, Executive Suite' },
      { loc: 'Central Warehouse', det: 'Aisle 1, Shelf 08' },
      { loc: 'Branch Office - Lideta', det: 'Room 12, Admin Block' },
    ];
    const toLocs = [
      { loc: 'Central Warehouse', det: 'Aisle 5, Shelf 22' },
      { loc: 'Branch Office - Merkato', det: 'Room 8, Storage' },
      { loc: 'HQ Kazanchis', det: 'Building B, Records Room' },
      { loc: 'HQ Bole, Floor 2', det: 'Room 204, IT Section' },
      { loc: 'Cargo Terminal - Bole', det: 'Sector 1, Bay 3' },
      { loc: 'Central Warehouse', det: 'Aisle 7, Shelf 31' },
      { loc: 'Branch Office - Lideta', det: 'Floor 2, Office 6' },
      { loc: 'HQ Bole, Floor 3', det: 'Room 305, Finance Wing' },
      { loc: 'Branch Office - Piassa', det: 'Room 2, Sales Desk' },
      { loc: 'HQ Kazanchis', det: 'Building C, Logistics' },
    ];
    const properties = [
      { name: 'Dell Latitude 5540 Laptop', tag: 'TAG-001', cat: 'Electronics' },
      { name: 'HP LaserJet Pro M404', tag: 'TAG-002', cat: 'Office Equipment' },
      { name: 'Executive Office Desk', tag: 'TAG-003', cat: 'Furniture' },
      { name: 'Cisco SG350 Switch', tag: 'TAG-004', cat: 'Networking' },
      { name: 'Canon EOS 1500D Camera', tag: 'TAG-005', cat: 'Electronics' },
      { name: 'Ergonomic Office Chair', tag: 'TAG-006', cat: 'Furniture' },
      { name: 'Samsung 55" LED TV', tag: 'TAG-007', cat: 'Electronics' },
      { name: 'Lenovo ThinkCentre M80', tag: 'TAG-008', cat: 'Electronics' },
      { name: 'Steel Filing Cabinet', tag: 'TAG-009', cat: 'Furniture' },
      { name: 'UPS APC Back-UPS 1500VA', tag: 'TAG-010', cat: 'Electronics' },
      { name: 'Projector Epson EB-U50', tag: 'TAG-011', cat: 'Electronics' },
      { name: 'Conference Table 8-Seater', tag: 'TAG-012', cat: 'Furniture' },
      { name: 'MacBook Pro 14" M3', tag: 'TAG-013', cat: 'Electronics' },
      { name: 'Server Rack 42U', tag: 'TAG-014', cat: 'Infrastructure' },
      { name: 'Paper Shredder Fellowes', tag: 'TAG-015', cat: 'Office Equipment' },
      { name: 'Air Conditioner 3 Ton', tag: 'TAG-016', cat: 'HVAC' },
      { name: 'Fire Extinguisher 6kg', tag: 'TAG-017', cat: 'Safety' },
      { name: 'Biometric Scanner', tag: 'TAG-018', cat: 'Security' },
      { name: 'Water Dispenser', tag: 'TAG-019', cat: 'Appliances' },
      { name: 'Whiteboard 4x6 ft', tag: 'TAG-020', cat: 'Office Supplies' },
    ];
    const reasons = [
      'Staff relocation to new office',
      'Equipment surplus reallocation',
      'Department restructuring',
      'New hire setup at branch',
      'Asset consolidation initiative',
      'Upgrade to newer model',
      'End of lease at current location',
      'Security upgrade requirement',
      'Warehouse inventory rebalancing',
      'Temporary loan to other department',
    ];
    const priorities: Transfer['priority'][] = ['urgent', 'medium', 'normal'];
    const statuses: Transfer['status'][] = ['pending', 'approved', 'rejected', 'completed'];

    const transfers: Transfer[] = [];
    for (let i = 0; i < 20; i++) {
      const person = people[i % people.length];
      const from = fromLocs[i % fromLocs.length];
      const to = toLocs[(i + 3) % toLocs.length];
      const prop = properties[i % properties.length];
      const prio = priorities[i % priorities.length];
      const stat = i < 10 ? 'pending' : statuses[(i - 10) % statuses.length];
      const daysAgo = 1 + (i % 14);
      const requiredDays = 7 + (i % 21);
      const d = new Date(Date.now() - daysAgo * 86400000);
      const reqd = new Date(Date.now() + requiredDays * 86400000);
      transfers.push({
        id: `TRF-${String(2024 + Math.floor(i / 12)).slice(-2)}-${String(1001 + i).slice(-4)}`,
        tagNumber: prop.tag,
        propertyName: prop.name,
        propertyCategory: prop.cat,
        fromLocation: from.loc,
        fromDetails: from.det,
        toLocation: to.loc,
        toDetails: to.det,
        reason: reasons[i % reasons.length],
        requestedBy: `${person.name} (${person.dept})`,
        requesterDepartment: person.dept,
        requestedDate: d.toISOString(),
        requiredByDate: reqd.toISOString(),
        priority: prio,
        status: stat,
        comments: '',
        isActive: i % 7 !== 0,
        createdAt: d.toISOString(),
      });
    }
    return transfers;
  }

  loadData(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    setTimeout(() => {
      this.transfers.set(this.createMockTransfers());
      this.mockUsed = true;
      this.page.set(1);
      this.isLoading.set(false);
      this.notification.set({ type: 'info', message: 'Showing sample data. Connect to the API for live data.' });
    }, 500);
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) {
      this.page.set(p);
    }
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    this.page.set(1);
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.page.set(1);
  }

  onPriorityFilterChange(value: string): void {
    this.priorityFilter.set(value);
    this.page.set(1);
  }

  onFromLocationChange(value: string): void {
    this.fromLocationFilter.set(value);
    this.page.set(1);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('All');
    this.priorityFilter.set('All');
    this.fromLocationFilter.set('All');
    this.page.set(1);
  }

  openDetailModal(transfer: Transfer): void {
    this.selectedTransfer.set(transfer);
    this.modalMode.set('detail');
    this.showModal.set(true);
  }

  openApproveModal(transfer: Transfer): void {
    this.selectedTransfer.set(transfer);
    this.approveComments.set('');
    this.modalMode.set('approve');
    this.showModal.set(true);
  }

  openDeleteModal(transfer: Transfer): void {
    this.transferToDelete.set(transfer);
    this.modalMode.set('delete');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.modalMode.set(null);
    this.selectedTransfer.set(null);
    this.transferToDelete.set(null);
    this.approveComments.set('');
  }

  approveTransfer(): void {
    const t = this.selectedTransfer();
    if (!t) return;
    this.transfers.update(arr => arr.map(tr =>
      tr.id === t.id ? { ...tr, status: 'approved' as const, comments: this.approveComments() } : tr
    ));
    this.notification.set({ type: 'success', message: `Transfer "${t.id}" approved.` });
    this.closeModal();
  }

  rejectTransfer(transfer: Transfer): void {
    this.transfers.update(arr => arr.map(tr =>
      tr.id === transfer.id ? { ...tr, status: 'rejected' as const } : tr
    ));
    this.notification.set({ type: 'warning', message: `Transfer "${transfer.id}" rejected.` });
  }

  confirmDelete(): void {
    const t = this.transferToDelete();
    if (!t) return;
    this.transfers.update(arr => arr.filter(tr => tr.id !== t.id));
    this.notification.set({ type: 'success', message: `Transfer "${t.id}" deleted.` });
    this.closeModal();
    this.page.set(1);
  }

  exportCSV(): void {
    const items = this.filteredTransfers();
    const header = 'ID,Tag,Property,Category,From,From Details,To,To Details,Reason,Requested By,Department,Requested Date,Required By,Priority,Status,Comments,Active,Created';
    const rows = items.map(t =>
      `"${t.id}","${t.tagNumber}","${t.propertyName}","${t.propertyCategory}","${t.fromLocation}","${t.fromDetails}","${t.toLocation}","${t.toDetails}","${t.reason}","${t.requestedBy}","${t.requesterDepartment}","${t.requestedDate}","${t.requiredByDate}","${t.priority}","${t.status}","${t.comments}","${t.isActive}","${t.createdAt}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transfers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.notification.set({ type: 'success', message: `Exported ${items.length} transfers to CSV.` });
  }

  getPriorityBadgeClass(priority: string): string {
    const classes: Record<string, string> = {
      urgent: 'badge-red',
      medium: 'badge-yellow',
      normal: 'badge-green',
    };
    return classes[priority] || 'badge-gray';
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'badge-yellow',
      approved: 'badge-green',
      rejected: 'badge-red',
      completed: 'badge-blue',
    };
    return classes[status] || 'badge-gray';
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      pending: 'bi-hourglass-split',
      approved: 'bi-check-circle',
      rejected: 'bi-x-circle',
      completed: 'bi-check2-all',
    };
    return icons[status] || 'bi-question-circle';
  }

  getPriorityIcon(priority: string): string {
    const icons: Record<string, string> = {
      urgent: 'bi-exclamation-triangle-fill',
      medium: 'bi-arrow-up-circle',
      normal: 'bi-arrow-down-circle',
    };
    return icons[priority] || 'bi-question-circle';
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  }

  hasActiveFilters(): boolean {
    return this.searchTerm() !== '' || this.statusFilter() !== 'All' || this.priorityFilter() !== 'All' || this.fromLocationFilter() !== 'All';
  }

  isMockBadge(): boolean {
    return this.mockUsed;
  }

  notificationIcon(type: string): string {
    const icons: Record<string, string> = {
      success: 'bi-check-circle-fill',
      warning: 'bi-exclamation-triangle-fill',
      error: 'bi-x-circle-fill',
      info: 'bi-info-circle-fill',
    };
    return icons[type] || 'bi-info-circle-fill';
  }
}
