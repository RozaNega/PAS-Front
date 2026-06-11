import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReceivingNoteService, ReceivingNoteDto } from '../../receiving-notes/services/receiving-note.service';

interface GrnItem {
  itemName: string;
  quantity: number;
  unit: string;
  received: number;
}

interface GrnRecord {
  id: string;
  grnNumber: string;
  grnDate: string;
  supplierName: string;
  supplierId: string;
  poNumber: string;
  deliveryNoteNumber: string;
  receivedBy: string;
  items: GrnItem[];
  status: 'Pending Inspection' | 'Passed' | 'Failed' | 'Partially Received';
  totalValue: number;
  notes: string;
  createdAt: string;
}

interface CreateForm {
  grnNumber: string;
  grnDate: string;
  supplierName: string;
  supplierId: string;
  poNumber: string;
  deliveryNoteNumber: string;
  receivedBy: string;
  items: GrnItem[];
  notes: string;
}



@Component({
  selector: 'app-grn',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './grn.component.html',
  styleUrls: ['./grn.component.scss'],
})
export class GrnComponent implements OnInit {
  private readonly receivingNotes = inject(ReceivingNoteService);

  searchTerm = signal('');
  statusFilter = signal('All');
  supplierFilter = signal('All');
  currentPage = signal(1);
  rowsPerPage = signal(10);
  loading = signal(false);
  error = signal<string | null>(null);

  allNotes = signal<GrnRecord[]>([]);

  readonly statuses = ['All', 'Pending Inspection', 'Passed', 'Failed', 'Partially Received'];

  uniqueSuppliers = computed(() => {
    const seen = new Set<string>();
    return this.allNotes().filter(g => {
      if (seen.has(g.supplierName)) return false;
      seen.add(g.supplierName);
      return true;
    }).map(g => g.supplierName).sort();
  });

  summaryStats = computed(() => {
    const all = this.allNotes();
    const itemsCount = all.reduce((acc, g) => acc + g.items.reduce((s, i) => s + i.quantity, 0), 0);
    const thisWeek = all.filter(g => {
      const d = new Date(g.grnDate);
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return d >= weekStart;
    }).length;
    return {
      total: all.length,
      totalItems: itemsCount,
      pendingCount: all.filter(g => g.status === 'Pending Inspection').length,
      passedCount: all.filter(g => g.status === 'Passed').length,
      failedCount: all.filter(g => g.status === 'Failed').length,
      thisWeekCount: thisWeek,
      totalValue: all.reduce((s, g) => s + g.totalValue, 0),
    };
  });

  filteredGRNs = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const status = this.statusFilter();
    const supplier = this.supplierFilter();
    return this.allNotes().filter(g => {
      const matchesSearch = !search || g.grnNumber.toLowerCase().includes(search) || g.supplierName.toLowerCase().includes(search);
      const matchesStatus = status === 'All' || g.status === status;
      const matchesSupplier = supplier === 'All' || g.supplierName === supplier;
      return matchesSearch && matchesStatus && matchesSupplier;
    });
  });

  pagedGRNs = computed(() => {
    const start = (this.currentPage() - 1) * this.rowsPerPage();
    return this.filteredGRNs().slice(start, start + this.rowsPerPage());
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredGRNs().length / this.rowsPerPage())));

  displayRange = computed(() => {
    const total = this.filteredGRNs().length;
    if (total === 0) return { start: 0, end: 0 };
    const start = (this.currentPage() - 1) * this.rowsPerPage() + 1;
    const end = Math.min(this.currentPage() * this.rowsPerPage(), total);
    return { start, end };
  });

  showDetailModal = signal(false);
  selectedGrn = signal<GrnRecord | null>(null);

  showCreateModal = signal(false);
  createForm = signal<CreateForm>({
    grnNumber: '',
    grnDate: new Date().toISOString().split('T')[0],
    supplierName: '',
    supplierId: '',
    poNumber: '',
    deliveryNoteNumber: '',
    receivedBy: '',
    items: [{ itemName: '', quantity: 1, unit: 'pcs', received: 1 }],
    notes: '',
  });

  showDeleteConfirm = signal(false);
  deleteTargetGrn = signal<GrnRecord | null>(null);

  notification = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  ngOnInit(): void {
    this.loadGrns();
  }

  loadGrns(): void {
    this.loading.set(true);
    this.error.set(null);
    this.receivingNotes.getAll().subscribe({
      next: (res) => {
        if (res.success !== false && Array.isArray(res.data) && res.data.length > 0) {
          const mapped = this.mapDtoToRecords(res.data);
          this.allNotes.set(mapped);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  private mapDtoToRecords(dtos: ReceivingNoteDto[]): GrnRecord[] {
    return dtos.map((d, i) => ({
      id: d.id,
      grnNumber: d.noteNumber || d.grnNumber || `GRN-${d.id.slice(0, 8)}`,
      grnDate: d.receivingDate || new Date().toISOString(),
      supplierName: d.supplierName || 'Unknown',
      supplierId: d.supplierId,
      poNumber: '',
      deliveryNoteNumber: '',
      receivedBy: d.receivedBy || '—',
      items: Array.isArray(d.items) ? d.items.map((it: any) => ({
        itemName: it.itemName || it.name || 'Item',
        quantity: it.quantity || it.quantityReceived || 1,
        unit: it.unit || 'pcs',
        received: it.received || it.quantityReceived || 0,
      })) : [{ itemName: 'Item', quantity: d.totalQuantity || 1, unit: 'pcs', received: d.totalQuantity || 1 }],
      status: this.mapStatus(d.status),
      totalValue: 0,
      notes: '',
      createdAt: d.receivingDate || new Date().toISOString(),
    }));
  }

  private mapStatus(api: string | undefined): GrnRecord['status'] {
    const s = (api || '').toLowerCase();
    if (s.includes('fail') || s.includes('reject')) return 'Failed';
    if (s.includes('pass') || s.includes('approv') || s.includes('complete') || s.includes('released')) return 'Passed';
    if (s.includes('partial')) return 'Partially Received';
    return 'Pending Inspection';
  }

  onSearch(value: string): void { this.searchTerm.set(value); this.currentPage.set(1); }
  onStatusFilter(value: string): void { this.statusFilter.set(value); this.currentPage.set(1); }
  onSupplierFilter(value: string): void { this.supplierFilter.set(value); this.currentPage.set(1); }
  onRowsPerPageChange(value: string): void { this.rowsPerPage.set(+value); this.currentPage.set(1); }

  resetFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('All');
    this.supplierFilter.set('All');
    this.currentPage.set(1);
  }

  goToPage(page: number): void { this.currentPage.set(page); }

  openDetailModal(grn: GrnRecord): void {
    this.selectedGrn.set(grn);
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedGrn.set(null);
  }

  openCreateModal(): void {
    this.createForm.set({
      grnNumber: `GRN-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      grnDate: new Date().toISOString().split('T')[0],
      supplierName: '',
      supplierId: '',
      poNumber: '',
      deliveryNoteNumber: '',
      receivedBy: '',
      items: [{ itemName: '', quantity: 1, unit: 'pcs', received: 1 }],
      notes: '',
    });
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.createForm.set({} as CreateForm);
  }

  createGrn(): void {
    const form = this.createForm();
    if (!form.grnNumber || !form.supplierName) {
      this.notification.set({ type: 'error', message: 'Please fill in all required fields.' });
      this.autoDismissNotification();
      return;
    }
    const payload = {
      grnNumber: form.grnNumber,
      grnDate: form.grnDate,
      supplierName: form.supplierName,
      supplierId: form.supplierId,
      poNumber: form.poNumber,
      deliveryNoteNumber: form.deliveryNoteNumber,
      receivedBy: form.receivedBy,
      items: form.items.filter(i => i.itemName.trim()).map(i => ({
        itemName: i.itemName,
        quantity: i.quantity,
        unit: i.unit,
        received: i.received,
      })),
      notes: form.notes,
      status: 'Pending Inspection',
    };

    this.loading.set(true);
    this.receivingNotes.create(payload).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) {
          this.loadGrns();
          this.showCreateModal.set(false);
          this.notification.set({ type: 'success', message: `GRN ${form.grnNumber} created successfully.` });
        } else {
          this.notification.set({ type: 'error', message: 'Failed to create GRN: ' + (res.message || 'Unknown error') });
        }
        this.autoDismissNotification();
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.status === 0 ? 'Cannot connect to server.' : err?.error?.message || 'Error creating GRN.';
        this.notification.set({ type: 'error', message: msg });
        this.autoDismissNotification();
      },
    });
  }

  confirmDelete(grn: GrnRecord): void {
    this.deleteTargetGrn.set(grn);
    this.showDeleteConfirm.set(true);
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.deleteTargetGrn.set(null);
  }

  executeDelete(): void {
    const target = this.deleteTargetGrn();
    if (!target) return;
    this.allNotes.update(list => list.filter(g => g.id !== target.id));
    this.notification.set({ type: 'success', message: `GRN ${target.grnNumber} deleted.` });
    this.autoDismissNotification();
    this.cancelDelete();
  }

  updateCreateFormGrnNumber(value: string): void { this.createForm.update(f => ({ ...f, grnNumber: value })); }
  updateCreateFormGrnDate(value: string): void { this.createForm.update(f => ({ ...f, grnDate: value })); }
  updateCreateFormSupplierName(value: string): void { this.createForm.update(f => ({ ...f, supplierName: value })); }
  updateCreateFormPoNumber(value: string): void { this.createForm.update(f => ({ ...f, poNumber: value })); }
  updateCreateFormDeliveryNote(value: string): void { this.createForm.update(f => ({ ...f, deliveryNoteNumber: value })); }
  updateCreateFormReceivedBy(value: string): void { this.createForm.update(f => ({ ...f, receivedBy: value })); }
  updateCreateFormNotes(value: string): void { this.createForm.update(f => ({ ...f, notes: value })); }
  updateCreateFormItemName(index: number, value: string): void {
    this.createForm.update(f => {
      const items = [...f.items];
      items[index] = { ...items[index], itemName: value };
      return { ...f, items };
    });
  }
  updateCreateFormItemQuantity(index: number, value: number): void {
    this.createForm.update(f => {
      const items = [...f.items];
      items[index] = { ...items[index], quantity: value };
      return { ...f, items };
    });
  }
  updateCreateFormItemReceived(index: number, value: number): void {
    this.createForm.update(f => {
      const items = [...f.items];
      items[index] = { ...items[index], received: value };
      return { ...f, items };
    });
  }
  updateCreateFormItemUnit(index: number, value: string): void {
    this.createForm.update(f => {
      const items = [...f.items];
      items[index] = { ...items[index], unit: value };
      return { ...f, items };
    });
  }

  addCreateFormItem(): void {
    this.createForm.update(f => ({ ...f, items: [...f.items, { itemName: '', quantity: 1, unit: 'pcs', received: 1 }] }));
  }

  removeCreateFormItem(index: number): void {
    this.createForm.update(f => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
  }

  exportCsv(): void {
    const rows = this.filteredGRNs();
    const header = ['GRN#', 'Date', 'Supplier', 'PO#', 'Items', 'Status', 'Total Value'];
    const lines = [header.join(',')].concat(
      rows.map(r => [
        r.grnNumber,
        new Date(r.grnDate).toLocaleDateString('en-US'),
        `"${r.supplierName.replace(/"/g, '""')}"`,
        r.poNumber,
        String(r.items.length),
        r.status,
        r.totalValue.toFixed(2),
      ].join(',')),
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grn-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  autoDismissNotification(): void {
    setTimeout(() => this.notification.set(null), 4000);
  }

  dismissNotification(): void {
    this.notification.set(null);
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getStatusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      'Pending Inspection': 'pending-inspection',
      'Passed': 'passed',
      'Failed': 'failed',
      'Partially Received': 'partial',
    };
    return map[status] || '';
  }

  getTotalReceived(items: GrnItem[]): number {
    return items.reduce((s, i) => s + i.received, 0);
  }

  getTotalOrdered(items: GrnItem[]): number {
    return items.reduce((s, i) => s + i.quantity, 0);
  }
}
