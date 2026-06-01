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

const MOCK_GRNS: GrnRecord[] = [
  { id: 'GRN-001', grnNumber: 'GRN-2026-0001', grnDate: new Date('2026-05-28').toISOString(), supplierName: 'TechWorld Supplies', supplierId: 'SUP-001', poNumber: 'PO-2026-1201', deliveryNoteNumber: 'DN-8876', receivedBy: 'John Doe', items: [{ itemName: 'Dell XPS Laptop', quantity: 10, unit: 'pcs', received: 10 }, { itemName: 'HP Monitor 24"', quantity: 15, unit: 'pcs', received: 15 }], status: 'Passed', totalValue: 45250, notes: 'All items in good condition', createdAt: new Date('2026-05-28').toISOString() },
  { id: 'GRN-002', grnNumber: 'GRN-2026-0002', grnDate: new Date('2026-05-28').toISOString(), supplierName: 'Global Logistics Co', supplierId: 'SUP-002', poNumber: 'PO-2026-1202', deliveryNoteNumber: 'DN-8877', receivedBy: 'Sarah Smith', items: [{ itemName: 'Office Chairs', quantity: 25, unit: 'pcs', received: 20 }, { itemName: 'Standing Desks', quantity: 10, unit: 'pcs', received: 10 }], status: 'Partially Received', totalValue: 18750, notes: '5 chairs damaged, awaiting replacement', createdAt: new Date('2026-05-28').toISOString() },
  { id: 'GRN-003', grnNumber: 'GRN-2026-0003', grnDate: new Date('2026-05-27').toISOString(), supplierName: 'OfficeMart Inc', supplierId: 'SUP-003', poNumber: 'PO-2026-1199', deliveryNoteNumber: 'DN-8865', receivedBy: 'Mike Wilson', items: [{ itemName: 'A4 Paper Box', quantity: 50, unit: 'boxes', received: 50 }, { itemName: 'Stapler', quantity: 30, unit: 'pcs', received: 0 }], status: 'Pending Inspection', totalValue: 3200, notes: 'Pending quality inspection', createdAt: new Date('2026-05-27').toISOString() },
  { id: 'GRN-004', grnNumber: 'GRN-2026-0004', grnDate: new Date('2026-05-27').toISOString(), supplierName: 'TechWorld Supplies', supplierId: 'SUP-001', poNumber: 'PO-2026-1198', deliveryNoteNumber: 'DN-8864', receivedBy: 'John Doe', items: [{ itemName: 'Network Switch 48-port', quantity: 5, unit: 'pcs', received: 5 }], status: 'Passed', totalValue: 12500, notes: '', createdAt: new Date('2026-05-27').toISOString() },
  { id: 'GRN-005', grnNumber: 'GRN-2026-0005', grnDate: new Date('2026-05-26').toISOString(), supplierName: 'Fresh Foods Ltd', supplierId: 'SUP-004', poNumber: 'PO-2026-1195', deliveryNoteNumber: 'DN-8859', receivedBy: 'Lisa Wong', items: [{ itemName: 'Catering Supplies Pack', quantity: 20, unit: 'pcs', received: 18 }], status: 'Failed', totalValue: 4800, notes: 'Items expired, returned to supplier', createdAt: new Date('2026-05-26').toISOString() },
  { id: 'GRN-006', grnNumber: 'GRN-2026-0006', grnDate: new Date('2026-05-26').toISOString(), supplierName: 'BuildRight Materials', supplierId: 'SUP-005', poNumber: 'PO-2026-1194', deliveryNoteNumber: 'DN-8858', receivedBy: 'Robert Brown', items: [{ itemName: 'Cement 50kg Bags', quantity: 100, unit: 'bags', received: 100 }, { itemName: 'Steel Rebars 12mm', quantity: 50, unit: 'pcs', received: 45 }], status: 'Partially Received', totalValue: 28500, notes: '5 rebars missing', createdAt: new Date('2026-05-26').toISOString() },
  { id: 'GRN-007', grnNumber: 'GRN-2026-0007', grnDate: new Date('2026-05-25').toISOString(), supplierName: 'Global Logistics Co', supplierId: 'SUP-002', poNumber: 'PO-2026-1192', deliveryNoteNumber: 'DN-8855', receivedBy: 'Alice Johnson', items: [{ itemName: 'Industrial Shelving', quantity: 8, unit: 'pcs', received: 8 }], status: 'Passed', totalValue: 9600, notes: '', createdAt: new Date('2026-05-25').toISOString() },
  { id: 'GRN-008', grnNumber: 'GRN-2026-0008', grnDate: new Date('2026-05-25').toISOString(), supplierName: 'OfficeMart Inc', supplierId: 'SUP-003', poNumber: 'PO-2026-1190', deliveryNoteNumber: 'DN-8852', receivedBy: 'Mike Wilson', items: [{ itemName: 'Whiteboard Markers', quantity: 60, unit: 'boxes', received: 60 }, { itemName: 'Printer Toner', quantity: 12, unit: 'pcs', received: 12 }], status: 'Pending Inspection', totalValue: 2400, notes: 'Awaiting QA sign-off', createdAt: new Date('2026-05-25').toISOString() },
  { id: 'GRN-009', grnNumber: 'GRN-2026-0009', grnDate: new Date('2026-05-24').toISOString(), supplierName: 'TechWorld Supplies', supplierId: 'SUP-001', poNumber: 'PO-2026-1188', deliveryNoteNumber: 'DN-8849', receivedBy: 'John Doe', items: [{ itemName: 'Server Rack 42U', quantity: 2, unit: 'pcs', received: 2 }, { itemName: 'UPS Battery Backup', quantity: 4, unit: 'pcs', received: 4 }], status: 'Passed', totalValue: 15800, notes: '', createdAt: new Date('2026-05-24').toISOString() },
  { id: 'GRN-010', grnNumber: 'GRN-2026-0010', grnDate: new Date('2026-05-24').toISOString(), supplierName: 'Fresh Foods Ltd', supplierId: 'SUP-004', poNumber: 'PO-2026-1186', deliveryNoteNumber: 'DN-8847', receivedBy: 'Elena Garcia', items: [{ itemName: 'Coffee Beans 5kg', quantity: 8, unit: 'bags', received: 0 }], status: 'Failed', totalValue: 1600, notes: 'Moisture damage, rejected', createdAt: new Date('2026-05-24').toISOString() },
  { id: 'GRN-011', grnNumber: 'GRN-2026-0011', grnDate: new Date('2026-05-23').toISOString(), supplierName: 'BuildRight Materials', supplierId: 'SUP-005', poNumber: 'PO-2026-1184', deliveryNoteNumber: 'DN-8844', receivedBy: 'Kevin Martin', items: [{ itemName: 'Paint Bucket 20L', quantity: 15, unit: 'pcs', received: 15 }, { itemName: 'Paint Brushes', quantity: 30, unit: 'pcs', received: 30 }], status: 'Passed', totalValue: 6750, notes: 'Quality check passed', createdAt: new Date('2026-05-23').toISOString() },
  { id: 'GRN-012', grnNumber: 'GRN-2026-0012', grnDate: new Date('2026-05-23').toISOString(), supplierName: 'OfficeMart Inc', supplierId: 'SUP-003', poNumber: 'PO-2026-1182', deliveryNoteNumber: 'DN-8841', receivedBy: 'Neha Patel', items: [{ itemName: 'Filing Cabinets', quantity: 6, unit: 'pcs', received: 4 }], status: 'Partially Received', totalValue: 4200, notes: '2 cabinets backordered', createdAt: new Date('2026-05-23').toISOString() },
  { id: 'GRN-013', grnNumber: 'GRN-2026-0013', grnDate: new Date('2026-05-22').toISOString(), supplierName: 'Global Logistics Co', supplierId: 'SUP-002', poNumber: 'PO-2026-1180', deliveryNoteNumber: 'DN-8839', receivedBy: 'Tom Clark', items: [{ itemName: 'Safety Helmets', quantity: 40, unit: 'pcs', received: 40 }, { itemName: 'Safety Vest', quantity: 40, unit: 'pcs', received: 35 }], status: 'Pending Inspection', totalValue: 5600, notes: '', createdAt: new Date('2026-05-22').toISOString() },
  { id: 'GRN-014', grnNumber: 'GRN-2026-0014', grnDate: new Date('2026-05-22').toISOString(), supplierName: 'TechWorld Supplies', supplierId: 'SUP-001', poNumber: 'PO-2026-1178', deliveryNoteNumber: 'DN-8836', receivedBy: 'Julia Rodriguez', items: [{ itemName: 'Keyboard Wireless', quantity: 25, unit: 'pcs', received: 25 }, { itemName: 'Mouse Optical', quantity: 30, unit: 'pcs', received: 30 }], status: 'Passed', totalValue: 3850, notes: 'Bulk order, all OK', createdAt: new Date('2026-05-22').toISOString() },
  { id: 'GRN-015', grnNumber: 'GRN-2026-0015', grnDate: new Date('2026-05-21').toISOString(), supplierName: 'Fresh Foods Ltd', supplierId: 'SUP-004', poNumber: 'PO-2026-1176', deliveryNoteNumber: 'DN-8833', receivedBy: 'Henry Kim', items: [{ itemName: 'Bottled Water 500ml', quantity: 200, unit: 'bottles', received: 200 }], status: 'Passed', totalValue: 2400, notes: 'Delivered on time', createdAt: new Date('2026-05-21').toISOString() },
];

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
  useMockData = signal(false);

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
          this.useMockData.set(false);
        } else {
          this.fallbackToMock();
        }
        this.loading.set(false);
      },
      error: () => {
        this.fallbackToMock();
        this.loading.set(false);
      },
    });
  }

  private fallbackToMock(): void {
    this.allNotes.set(MOCK_GRNS);
    this.useMockData.set(true);
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
    const newGrn: GrnRecord = {
      id: `GRN-${Date.now()}`,
      grnNumber: form.grnNumber,
      grnDate: form.grnDate ? new Date(form.grnDate).toISOString() : new Date().toISOString(),
      supplierName: form.supplierName,
      supplierId: form.supplierId || `SUP-${Date.now()}`,
      poNumber: form.poNumber,
      deliveryNoteNumber: form.deliveryNoteNumber,
      receivedBy: form.receivedBy || 'Receiving',
      items: form.items.filter(i => i.itemName.trim()),
      status: 'Pending Inspection',
      totalValue: 0,
      notes: form.notes,
      createdAt: new Date().toISOString(),
    };
    this.allNotes.update(list => [newGrn, ...list]);
    this.showCreateModal.set(false);
    this.notification.set({ type: 'success', message: `GRN ${newGrn.grnNumber} created successfully.` });
    this.autoDismissNotification();
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
