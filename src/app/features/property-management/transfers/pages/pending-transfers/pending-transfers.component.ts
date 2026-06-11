import { Component, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransferRecordsService, TransferListDto } from '../../../../../core/services/transfer-records.service';

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
  private readonly transferRecordsService = inject(TransferRecordsService);

  transfers = signal<Transfer[]>([]);

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

  loadData(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.transferRecordsService.getAll().subscribe({
      next: (res) => {
        if (res.success && res.data?.items?.length) {
          this.transfers.set(res.data.items.map(d => this.mapTransferDto(d)));
        }
        this.page.set(1);
        this.isLoading.set(false);
      },
      error: () => {
        this.page.set(1);
        this.isLoading.set(false);
        this.notification.set({ type: 'error', message: 'Failed to load transfer records.' });
      }
    });
  }

  private mapTransferDto(dto: TransferListDto): Transfer {
    return {
      id: dto.transferNumber || dto.id,
      tagNumber: '',
      propertyName: dto.itemName,
      propertyCategory: '',
      fromLocation: dto.fromLocation,
      fromDetails: '',
      toLocation: dto.toLocation,
      toDetails: '',
      reason: '',
      requestedBy: dto.initiatedBy,
      requesterDepartment: '',
      requestedDate: dto.transferDate,
      requiredByDate: '',
      priority: 'normal',
      status: (dto.status as Transfer['status']) || 'pending',
      comments: '',
      isActive: true,
      createdAt: dto.transferDate,
    };
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
