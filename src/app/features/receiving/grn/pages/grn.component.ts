import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ReceivingNoteService, ReceivingNoteDto } from '../../receiving-notes/services/receiving-note.service';
import { SupplierService } from '../../suppliers/services/supplier.service';
import { SupplierModel } from '../../suppliers/models/supplier.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ApiService } from '../../../../core/services/api.service';
import { normalizePasListResponse } from '../../../../core/utils/pas-api-json.util';

export interface GRNRow {
  id: string;
  grnNumber: string;
  date: string;
  supplier: string;
  items: number;
  status: 'Pending Inspection' | 'Passed' | 'Failed';
}

export interface CatalogItemRow {
  id: string;
  name: string;
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
  private readonly suppliersApi = inject(SupplierService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);

  catalogItems = signal<CatalogItemRow[]>([]);

  searchTerm = signal('');
  dateRange = { start: '', end: '' };
  statusFilter = signal('All');
  supplierFilter = signal('All Suppliers');

  readonly statuses = ['All', 'Pending Inspection', 'Passed', 'Failed'];
  suppliers = signal<SupplierModel[]>([]);

  allNotes = signal<ReceivingNoteDto[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  filteredGRNs = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const status = this.statusFilter();
    const supplier = this.supplierFilter();
    return this.allNotes().map((n) => this.toGrnRow(n)).filter((grn) => {
      const matchesSearch =
        !search ||
        grn.grnNumber.toLowerCase().includes(search) ||
        grn.supplier.toLowerCase().includes(search);
      const matchesStatus = status === 'All' || grn.status === status;
      const matchesSupplier = supplier === 'All Suppliers' || grn.supplier === supplier;
      return matchesSearch && matchesStatus && matchesSupplier;
    });
  });

  summary = computed(() => {
    const rows = this.allNotes().map((n) => this.toGrnRow(n));
    const pending = rows.filter((r) => r.status === 'Pending Inspection').length;
    const totalQty = this.allNotes().reduce((acc, n) => acc + (Array.isArray(n.items) ? n.items.length : n.totalQuantity ?? 0), 0);
    return {
      totalGRNs: rows.length,
      totalItems: totalQty,
      totalValue: 0,
      pendingInspection: pending,
      thisWeek: rows.length,
    };
  });

  showModal = signal(false);
  modalStep = signal(1);

  modalDraft = {
    grnNumber: '',
    dateReceived: '',
    supplierId: '',
    defaultItemId: '',
    poNumber: '',
    deliveryNote: '',
    receivedBy: '',
    notes: '',
  };

  showDetail = signal(false);
  detailLoading = signal(false);
  detailNote = signal<ReceivingNoteDto | null>(null);

  ngOnInit(): void {
    this.reload();
    this.loadSuppliers();
    this.loadCatalogItems();
    this.route.queryParamMap.subscribe((q) => {
      const id = q.get('id');
      if (id) {
        this.viewGrn(id);
      }
    });
  }

  private loadCatalogItems(): void {
    this.api.get<unknown>('ItemMasters', { pageNumber: 1, pageSize: 200 }).subscribe({
      next: (raw) => {
        const n = normalizePasListResponse<Record<string, unknown>>(raw);
        const rows = n.data ?? [];
        const mapped: CatalogItemRow[] = rows.map((r) => {
          const id = String(r['id'] ?? '');
          const name =
            String(r['name'] ?? r['itemName'] ?? r['description'] ?? r['sku'] ?? id) || id;
          return { id, name };
        }).filter((r) => r.id);
        this.catalogItems.set(mapped);
      },
      error: () => this.catalogItems.set([]),
    });
  }

  private formatHttpError(err: unknown): string {
    const e = err as HttpErrorResponse;
    const body = e?.error as Record<string, unknown> | string | undefined;
    const parts: string[] = [];
    if (e?.status) {
      parts.push(`HTTP ${e.status}`);
    }
    if (typeof body === 'string' && body.trim()) {
      parts.push(body);
      return parts.join(' — ');
    }
    if (body && typeof body === 'object') {
      const msg = body['message'] ?? body['Message'] ?? body['title'] ?? body['Title'];
      if (typeof msg === 'string' && msg.trim()) {
        parts.push(msg.trim());
      }
      const errors = body['errors'] ?? body['Errors'];
      if (errors && typeof errors === 'object') {
        for (const [key, val] of Object.entries(errors as Record<string, unknown>)) {
          const v = Array.isArray(val) ? (val as string[]).join(', ') : String(val);
          parts.push(`${key}: ${v}`);
        }
      }
    }
    return parts.length ? parts.join('\n') : e?.message || 'Create failed';
  }

  private toReceivingDateIso(dateOnly: string): string {
    if (!dateOnly) {
      return new Date().toISOString();
    }
    const d = new Date(`${dateOnly}T12:00:00`);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.receivingNotes.getAll().subscribe({
      next: (res) => {
        if (res.success !== false && Array.isArray(res.data)) {
          this.allNotes.set(res.data);
        } else {
          this.error.set(res.message || 'Could not load receiving notes');
          this.allNotes.set([]);
        }
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e?.message || 'Failed to load GRNs');
        this.allNotes.set([]);
        this.loading.set(false);
      },
    });
  }

  private loadSuppliers(): void {
    this.suppliersApi.getAll().subscribe({
      next: (res) => {
        if (res.success !== false && Array.isArray(res.data)) {
          this.suppliers.set(res.data);
        }
      },
      error: () => this.suppliers.set([]),
    });
  }

  private toGrnRow(note: ReceivingNoteDto): GRNRow {
    const grnNumber = note.noteNumber || note.grnNumber || `GRN-${note.id.slice(0, 8)}`;
    const supplier = note.supplierName || '—';
    const itemCount = Array.isArray(note.items) ? note.items.length : note.totalQuantity ?? 0;
    return {
      id: note.id,
      grnNumber,
      date: this.formatDate(note.receivingDate),
      supplier,
      items: itemCount,
      status: this.mapStatus(note.status),
    };
  }

  private mapStatus(api: string | undefined): GRNRow['status'] {
    const s = (api || '').toLowerCase();
    if (s.includes('fail') || s.includes('reject')) return 'Failed';
    if (s.includes('pass') || s.includes('approv') || s.includes('complete') || s.includes('released')) return 'Passed';
    return 'Pending Inspection';
  }

  private formatDate(iso: string | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
  }

  onSupplierFilterChange(value: string): void {
    this.supplierFilter.set(value);
  }

  openCreateModal(): void {
    this.modalStep.set(1);
    const user = this.auth.getCurrentUser();
    this.modalDraft = {
      grnNumber: `GRN-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      dateReceived: new Date().toISOString().split('T')[0],
      supplierId: this.suppliers()[0]?.id ?? '',
      defaultItemId: this.catalogItems()[0]?.id ?? '',
      poNumber: '',
      deliveryNote: '',
      receivedBy: user?.fullName || user?.username || '',
      notes: '',
    };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.modalStep.set(1);
  }

  nextStep(): void {
    if (this.modalStep() < 3) this.modalStep.update((s) => s + 1);
  }

  prevStep(): void {
    if (this.modalStep() > 1) this.modalStep.update((s) => s - 1);
  }

  submitGRN(): void {
    if (!this.modalDraft.supplierId) {
      alert('Please select a supplier.');
      return;
    }
    const itemId = this.modalDraft.defaultItemId || this.catalogItems()[0]?.id;
    if (!itemId) {
      alert(
        'No inventory items were found (ItemMasters). The API requires at least one line item. Add items to the catalog first, then create a GRN.',
      );
      return;
    }

    const line = {
      itemId,
      quantityReceived: 1,
      unitPrice: 0,
    };

    const nn = this.modalDraft.grnNumber?.trim();
    const noteNumber =
      nn && nn.length > 0 ? nn : `GRN-${new Date().getFullYear()}-${Date.now()}`;

    const body: Record<string, unknown> = {
      supplierId: this.modalDraft.supplierId,
      receivingDate: this.toReceivingDateIso(this.modalDraft.dateReceived),
      receivedBy: (this.modalDraft.receivedBy || 'Receiving').trim(),
      items: [line],
      noteNumber,
    };

    const po = this.modalDraft.poNumber?.trim();
    if (po) {
      body['poNumber'] = po;
    }
    const dn = this.modalDraft.deliveryNote?.trim();
    if (dn) {
      body['deliveryNote'] = dn;
    }
    const notes = this.modalDraft.notes?.trim();
    if (notes) {
      body['notes'] = notes;
    }

    this.receivingNotes.create(body).subscribe({
      next: (res) => {
        if (res.success === false) {
          alert(res.message || 'Create failed');
          return;
        }
        const newId = this.extractCreatedId(res);
        if (!newId) {
          alert(
            res.message ||
              'The API did not return a new record id. Open DevTools → Network → the POST ReceivingNotes call and inspect the response. The row may still exist if the API uses a different response shape.',
          );
          return;
        }
        this.confirmPersistedAndNotify(newId);
      },
      error: (e) => alert(this.formatHttpError(e)),
    });
  }

  /** Parses id from create response (string guid, envelope data string, or { id }). */
  private extractCreatedId(res: { data?: unknown }): string | null {
    const d = res.data;
    if (typeof d === 'string' && d.trim()) {
      return d.trim();
    }
    if (typeof d === 'number' && !Number.isNaN(d)) {
      return String(d);
    }
    if (d && typeof d === 'object' && !Array.isArray(d)) {
      const o = d as Record<string, unknown>;
      const id = o['id'] ?? o['Id'];
      if (typeof id === 'string' && id.trim()) {
        return id.trim();
      }
      if (typeof id === 'number' && !Number.isNaN(id)) {
        return String(id);
      }
    }
    return null;
  }

  /** Confirms row exists via GET and tells user where to look in SQL Server. */
  private confirmPersistedAndNotify(newId: string): void {
    this.receivingNotes.getById(newId).subscribe({
      next: (verify) => {
        const row = verify.success !== false ? verify.data : undefined;
        const verified = !!row && this.sameReceivingNoteId((row as ReceivingNoteDto).id, newId);
        const detailNote = verify.message?.includes('GET ') ? `\n\n${verify.message}` : '';
        const lines = [
          `New receiving note id: ${newId}`,
          '',
          verified
            ? `Confirmed: the API returned this GRN (GET detail or list).${detailNote}`
            : 'The API did not return this id in detail or in the first page of the list. Check the Network tab for GET ReceivingNotes and GET ReceivingNotes/{id}.',
          '',
          'In SSMS (same database as the API connection string):',
          `SELECT TOP (50) Id, NoteNumber, SupplierId, ReceivingDate, Status FROM ReceivingNotes ORDER BY ReceivingDate DESC;`,
          `SELECT * FROM ReceivingNotes WHERE Id = CAST('${newId}' AS uniqueidentifier);`,
        ];
        alert(lines.join('\n'));
        this.closeModal();
        this.reload();
      },
      error: (err: HttpErrorResponse) => {
        const detail =
          typeof err.error === 'string'
            ? err.error
            : err.error && typeof err.error === 'object'
              ? JSON.stringify(err.error)
              : '';
        alert(
          [
            `Create returned id: ${newId} but the API could not load that GRN.`,
            `HTTP ${err.status} ${err.statusText || ''}`.trim(),
            err.url ? `URL: ${err.url}` : '',
            detail ? `Body: ${detail.slice(0, 400)}` : '',
            '',
            'Open DevTools → Console for [PAS API] lines, and Network for the failing request.',
            'Table hint: ReceivingNotes',
          ]
            .filter(Boolean)
            .join('\n'),
        );
        this.closeModal();
        this.reload();
      },
    });
  }

  private sameReceivingNoteId(a: string | undefined, b: string): boolean {
    const x = String(a ?? '')
      .replace(/-/g, '')
      .toLowerCase();
    const y = b.replace(/-/g, '').toLowerCase();
    return x.length > 0 && x === y;
  }

  viewGrn(id: string): void {
    this.showDetail.set(true);
    this.detailLoading.set(true);
    this.detailNote.set(null);
    this.receivingNotes.getById(id).subscribe({
      next: (res) => {
        if (res.success !== false && res.data) {
          this.detailNote.set(res.data);
        }
        this.detailLoading.set(false);
      },
      error: () => this.detailLoading.set(false),
    });
  }

  closeDetail(): void {
    this.showDetail.set(false);
    this.detailNote.set(null);
  }

  exportGrn(): void {
    const rows = this.filteredGRNs();
    const header = ['GRN #', 'Date', 'Supplier', 'Items', 'Status'];
    const lines = [header.join(',')].concat(
      rows.map((r) => [r.grnNumber, r.date, `"${r.supplier.replace(/"/g, '""')}"`, String(r.items), r.status].join(',')),
    );
    this.downloadCsv(lines.join('\n'), 'grn-export.csv');
  }

  private downloadCsv(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'Pending Inspection': 'yellow',
      Passed: 'green',
      Failed: 'red',
    };
    return colors[status] || 'gray';
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'Pending Inspection': '🟡',
      Passed: '🟢',
      Failed: '🔴',
    };
    return icons[status] || '⚪';
  }
}
