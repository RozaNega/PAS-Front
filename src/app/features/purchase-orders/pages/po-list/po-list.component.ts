import { Component, signal, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PurchaseOrderService } from '../../../../core/services/purchase-order.service';
import { PurchaseOrder } from '../../../../core/models/purchase-order.model';

@Component({
  selector: 'app-po-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './po-list.component.html',
  styleUrls: ['./po-list.component.scss'],
})
export class PoListComponent {
  private readonly poService = inject(PurchaseOrderService);
  private readonly router = inject(Router);

  readonly currentYear = new Date().getFullYear();

  private rowMatchesStatus(row: PurchaseOrder, expected: string): boolean {
    return (row.status ?? '').toLowerCase() === expected.toLowerCase();
  }

  statusEquals(po: PurchaseOrder, expected: string): boolean {
    return this.rowMatchesStatus(po, expected);
  }

  displayCell(value: string | undefined | null): string {
    if (value === undefined || value === null) return '\u2014';
    const s = String(value).trim();
    return s.length ? s : '\u2014';
  }

  hasCell(value: string | undefined | null): boolean {
    return this.displayCell(value) !== '\u2014';
  }

  readonly statusCounts = computed(() => {
    const rows = this.purchaseOrders();
    return {
      all: rows.length,
      pending: rows.filter((r) => this.rowMatchesStatus(r, 'Pending Approval')).length,
      approved: rows.filter((r) => this.rowMatchesStatus(r, 'Approved')).length,
      ordered: rows.filter((r) => this.rowMatchesStatus(r, 'Ordered')).length,
      received: rows.filter((r) => this.rowMatchesStatus(r, 'Received')).length,
      completed: rows.filter((r) => this.rowMatchesStatus(r, 'Completed')).length,
      cancelled: rows.filter((r) => this.rowMatchesStatus(r, 'Cancelled')).length,
    };
  });

  searchTerm = signal('');
  statusFilter = signal('All');
  supplierFilter = signal('All');
  currentPage = signal(1);
  rowsPerPage = signal(10);
  loading = signal(false);
  error = signal<string | null>(null);

  purchaseOrders = signal<PurchaseOrder[]>([]);

  statuses = ['All', 'Pending Approval', 'Approved', 'Ordered', 'Received', 'Completed', 'Cancelled'];

  readonly suppliers = computed(() => {
    const unique = new Set(this.purchaseOrders().map((p) => p.supplierName));
    return ['All', ...Array.from(unique).sort()];
  });

  constructor() {
    effect(() => {
      this.searchTerm();
      this.supplierFilter();
      this.loadPos();
    });
  }

  filteredPos = computed(() => {
    let result = [...this.purchaseOrders()];

    if (this.searchTerm()) {
      const q = this.searchTerm().toLowerCase();
      result = result.filter(
        (po) =>
          po.poNumber?.toLowerCase().includes(q) ||
          po.supplierName?.toLowerCase().includes(q) ||
          po.createdBy?.toLowerCase().includes(q),
      );
    }

    if (this.statusFilter() !== 'All') {
      result = result.filter((po) => this.rowMatchesStatus(po, this.statusFilter()));
    }

    if (this.supplierFilter() !== 'All') {
      result = result.filter((po) => po.supplierName === this.supplierFilter());
    }

    return result;
  });

  pagedPos = computed(() => {
    const start = (this.currentPage() - 1) * this.rowsPerPage();
    const end = start + this.rowsPerPage();
    return this.filteredPos().slice(start, end);
  });

  totalPages = computed(() => Math.ceil(this.filteredPos().length / this.rowsPerPage()));

  displayRange = computed(() => {
    const start = (this.currentPage() - 1) * this.rowsPerPage() + 1;
    const end = Math.min(this.currentPage() * this.rowsPerPage(), this.filteredPos().length);
    return { start, end };
  });

  loadPos(): void {
    this.loading.set(true);
    this.error.set(null);
    try {
      const all = this.poService.getAll();
      this.purchaseOrders.set(all);
    } catch (err) {
      this.error.set('Failed to load purchase orders.');
    } finally {
      this.loading.set(false);
    }
  }

  onSearch(e: Event): void {
    this.searchTerm.set((e.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  onStatusFilter(e: Event): void {
    this.statusFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onSupplierFilter(e: Event): void {
    this.supplierFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onRowsPerPageChange(e: Event): void {
    this.rowsPerPage.set(+(e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('All');
    this.supplierFilter.set('All');
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  closeSheet(sheet: HTMLDetailsElement): void {
    sheet.removeAttribute('open');
  }

  viewPo(id: string): void {
    this.router.navigate(['/admin/purchase-orders', id]);
  }

  createNewPo(): void {
    void this.router.navigate(['/admin/purchase-orders/new']);
  }

  approvePo(po: PurchaseOrder): void {
    if (!confirm(`Approve PO ${po.poNumber}?`)) return;
    this.poService.approve(po.id, po.createdBy);
    this.loadPos();
  }

  rejectPo(po: PurchaseOrder): void {
    const reason = prompt(`Reason for rejecting PO ${po.poNumber}:`);
    if (!reason) return;
    this.poService.reject(po.id, po.createdBy, reason);
    this.loadPos();
  }

  markOrdered(po: PurchaseOrder): void {
    this.poService.markOrdered(po.id);
    this.loadPos();
  }

  markReceived(po: PurchaseOrder): void {
    this.poService.markReceived(po.id);
    this.loadPos();
  }

  cancelPo(po: PurchaseOrder): void {
    if (!confirm(`Cancel PO ${po.poNumber}? This cannot be undone.`)) return;
    this.poService.cancel(po.id);
    this.loadPos();
  }

  exportPos(format: string, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    const rows = this.filteredPos();
    if (!rows.length) {
      alert('No purchase orders to export for the current filters.');
      return;
    }
    const escape = (v: string | number | undefined | null) => {
      const s = String(v ?? '');
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const headers = [
      'PO Number',
      'Supplier',
      'Status',
      'Total Cost',
      'Created By',
      'Created Date',
      'Approved By',
      'Approved Date',
    ];
    const lines = [
      headers.join(','),
      ...rows.map((r) =>
        [
          escape(r.poNumber),
          escape(r.supplierName),
          escape(r.status),
          escape(r.totalCost),
          escape(r.createdBy),
          escape(this.formatDate(r.createdDate)),
          escape(r.approvedBy || ''),
          escape(r.approvedDate ? this.formatDate(r.approvedDate) : ''),
        ].join(','),
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ext = format === 'excel' ? 'xls' : 'csv';
    a.download = `purchase-orders.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    if (format === 'pdf') {
      window.print();
    }
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'draft':
        return 'req-badge--neutral';
      case 'pending approval':
        return 'req-badge--warning';
      case 'approved':
        return 'req-badge--success';
      case 'rejected':
        return 'req-badge--danger';
      case 'ordered':
        return 'req-badge--info';
      case 'received':
        return 'req-badge--primary';
      case 'completed':
        return 'req-badge--success';
      case 'cancelled':
        return 'req-badge--danger';
      default:
        return 'req-badge--neutral';
    }
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return '\u2014';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  trackByPoId(index: number, item: PurchaseOrder): string {
    return item.id;
  }
}
