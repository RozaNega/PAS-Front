import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ShelvesService, ShelfLocationDto } from '../../../../core/services/shelves.service';
import { WarehousesService, WarehouseDto } from '../../../../core/services/warehouses.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { pasApiUrlHint } from '../../../../core/config/api-base';

export interface Shelf {
  id: string;
  warehouseId: string;
  aisle: string;
  rack: string;
  shelf: string;
  items: number;
  value: number;
  occupancy: number;
}

interface ShelfModalDraft {
  warehouseId: string;
  aisle: string;
  rack: string;
  shelfNumber: string;
  shelfType: string;
  qrValue: string;
  maxCapacity: number;
  maxWeight: number;
  categoryRestriction: string;
}

@Component({
  selector: 'app-shelf-locations',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './shelf-locations.component.html',
  styleUrls: ['./shelf-locations.component.scss', './shelf-locations-dialog-styles.scss'],
})
export class ShelfLocationsComponent {
  readonly shelvesService = inject(ShelvesService);
  readonly warehousesService = inject(WarehousesService);
  readonly inventoryService = inject(InventoryService);
  private readonly formBuilder = inject(FormBuilder);

  readonly apiConnectionHint = pasApiUrlHint();

  showAddItemDialog = false;
  selectedShelfForItem: Shelf | null = null;
  addItemForm!: FormGroup;

  warehouseOptions = signal<WarehouseDto[]>([]);
  selectedWarehouseId = signal<string>('');
  searchTerm = signal('');
  aisleFilter = signal('All Aisles');
  showModal = signal(false);
  selectedShelf = signal<Shelf | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  shelves = signal<Shelf[]>([]);

  /** Bound with [(ngModel)] — must be a mutable object, not a nested signal. */
  modalDraft: ShelfModalDraft = {
    warehouseId: '',
    aisle: 'A-01',
    rack: 'R-01',
    shelfNumber: 'S-01',
    shelfType: 'Standard',
    qrValue: '',
    maxCapacity: 100,
    maxWeight: 500,
    categoryRestriction: 'All Categories',
  };

  showRearrangeModal = signal(false);
  rearrangeDraft = signal<{ shelfId: string; newAisle: string; newRack: string; newShelf: string } | null>(null);

  readonly selectedWarehouseLabel = computed(() => {
    const id = this.selectedWarehouseId();
    const w = this.warehouseOptions().find((x) => x.id === id);
    return w?.warehouseName ?? 'Warehouse';
  });

  totalShelves = computed(() => this.shelves().length);
  totalItems = computed(() => this.shelves().reduce((sum, s) => sum + s.items, 0));
  totalValue = computed(() => this.shelves().reduce((sum, s) => sum + s.value, 0));
  avgOccupancy = computed(() => {
    const list = this.shelves();
    if (!list.length) return 0;
    return Math.round(list.reduce((a, s) => a + s.occupancy, 0) / list.length);
  });
  emptyShelves = computed(() => this.shelves().filter((s) => s.items === 0).length);

  readonly aisleOptions = computed(() => {
    const aisles = [
      ...new Set(
        this.shelves()
          .map((s) => s.aisle)
          .filter((a) => a && a !== '—'),
      ),
    ];
    aisles.sort((a, b) => a.localeCompare(b));
    return ['All Aisles', ...aisles];
  });

  filteredShelves = signal<Shelf[]>([]);

  constructor() {
    this.addItemForm = this.formBuilder.group({
      itemName: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [100, [Validators.required, Validators.min(1)]],
    });
    this.loadWarehousesThenShelves();
  }

  retryWarehouses(): void {
    this.loadWarehousesThenShelves();
  }

  private formatHttpError(prefix: string, err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return `${prefix} Network error — is the PAS API running (default port 5028)?`;
      }
      return `${prefix} HTTP ${err.status}: ${err.message || 'request failed'}`;
    }
    return `${prefix} ${String(err)}`;
  }

  private loadWarehousesThenShelves(): void {
    this.error.set(null);
    this.warehousesService.getAll().subscribe({
      next: (res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        this.warehouseOptions.set(list);
        if (list.length && !this.selectedWarehouseId()) {
          this.selectedWarehouseId.set(list[0].id);
        }
        if (!list.length) {
          this.error.set(
            res.success === false
              ? res.message || 'No warehouses returned.'
              : 'No warehouses found. Create one in the backend or check the API connection.',
          );
        }
        this.loadShelves();
      },
      error: (err) => {
        console.error(err);
        this.error.set(this.formatHttpError('Could not load warehouses.', err));
        this.warehouseOptions.set([]);
        this.loadShelves();
      },
    });
  }

  loadShelves(): void {
    const wid = this.selectedWarehouseId();
    if (!wid) {
      this.shelves.set([]);
      this.filterShelves();
      return;
    }
    this.isLoading.set(true);
    this.error.set(null);
    this.shelvesService.getAll({ warehouseId: wid }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        const dtoList = Array.isArray(res.data) ? res.data : [];
        if (res.success === false && dtoList.length === 0) {
          this.error.set(res.message || 'Could not load shelves for this warehouse.');
          this.shelves.set([]);
          this.filterShelves();
          return;
        }
        const rows = dtoList.map((d) => this.mapDto(d));
        this.shelves.set(rows);
        this.inventoryService.getStockOverview({ warehouseId: wid }).subscribe({
          next: (inv) => {
            const qty: Record<string, number> = {};
            if (inv.success !== false && Array.isArray(inv.data)) {
              for (const line of inv.data) {
                if (!line.shelfId) continue;
                qty[line.shelfId] = (qty[line.shelfId] ?? 0) + (Number(line.currentStock) || 0);
              }
            }
            this.shelves.update((list) =>
              list.map((s) => {
                const items = qty[s.id] ?? 0;
                const raw = dtoList.find((x) => x.id === s.id);
                const cap = raw?.capacity && raw.capacity > 0 ? raw.capacity : 0;
                const occ = cap ? Math.min(100, Math.round((items / cap) * 100)) : raw?.currentUtilization ?? 0;
                return { ...s, items, occupancy: occ };
              }),
            );
            this.filterShelves();
          },
          error: () => this.filterShelves(),
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        this.error.set(this.formatHttpError('Failed to load shelves.', err));
        console.error(err);
        this.shelves.set([]);
        this.filterShelves();
      },
    });
  }

  private mapDto(d: ShelfLocationDto): Shelf {
    const { aisle, rack, shelf } = this.parseShelfParts(d);
    const cap = d.capacity && d.capacity > 0 ? d.capacity : 0;
    const util = d.currentUtilization ?? 0;
    return {
      id: d.id,
      warehouseId: d.warehouseId,
      aisle,
      rack,
      shelf,
      items: 0,
      value: 0,
      occupancy: cap ? Math.min(100, Math.round((util / cap) * 100)) : util,
    };
  }

  private parseShelfParts(d: ShelfLocationDto): { aisle: string; rack: string; shelf: string } {
    const hasParts = Boolean(d.aisle || d.section || d.position || d.level);
    if (hasParts) {
      return {
        aisle: (d.aisle || '—').trim() || '—',
        rack: (d.section || '—').trim() || '—',
        shelf: (d.position || d.level || d.shelfName || '—').trim() || '—',
      };
    }
    const code = (d.shelfCode || d.shelfName || '').trim();
    if (!code) {
      return { aisle: '—', rack: '—', shelf: '—' };
    }
    const segs = code.split(/[-_/]/).filter((s) => s.length > 0);
    if (segs.length >= 4) {
      return { aisle: segs[0], rack: segs[1], shelf: segs.slice(2).join('-') };
    }
    if (segs.length === 3) {
      return { aisle: segs[0], rack: segs[1], shelf: segs[2] };
    }
    if (segs.length === 2) {
      return { aisle: segs[0], rack: segs[1], shelf: '—' };
    }
    return { aisle: code, rack: '—', shelf: '—' };
  }

  filterShelves(): void {
    const search = this.searchTerm().toLowerCase();
    const aisle = this.aisleFilter();
    this.filteredShelves.set(
      this.shelves().filter((shelf) => {
        const label = `${shelf.aisle} ${shelf.rack} ${shelf.shelf} ${shelf.id}`.toLowerCase();
        const matchesSearch = !search || label.includes(search);
        const matchesAisle = aisle === 'All Aisles' || shelf.aisle === aisle;
        return matchesSearch && matchesAisle;
      }),
    );
  }

  onWarehouseChange(id: string): void {
    this.selectedWarehouseId.set(id);
    this.aisleFilter.set('All Aisles');
    this.loadShelves();
  }

  onAisleFilterChange(value: string): void {
    this.aisleFilter.set(value);
    this.filterShelves();
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.filterShelves();
  }

  getOccupancyColor(occupancy: number): string {
    if (occupancy >= 80) return 'red';
    if (occupancy >= 60) return 'orange';
    if (occupancy >= 40) return 'yellow';
    return 'green';
  }

  private resetModalDraft(): void {
    const n = this.shelves().length + 1;
    const wid = this.selectedWarehouseId() || this.warehouseOptions()[0]?.id || '';
    this.modalDraft = {
      warehouseId: wid,
      aisle: 'A-01',
      rack: 'R-01',
      shelfNumber: `S-${String(n).padStart(2, '0')}`,
      shelfType: 'Standard',
      qrValue: '',
      maxCapacity: 100,
      maxWeight: 500,
      categoryRestriction: 'All Categories',
    };
  }

  openAddModal(): void {
    this.selectedShelf.set(null);
    this.resetModalDraft();
    this.showModal.set(true);
  }

  openEditModal(shelf: Shelf | null): void {
    if (!shelf) return;
    this.selectedShelf.set(shelf);
    this.modalDraft = {
      warehouseId: shelf.warehouseId || this.selectedWarehouseId() || this.warehouseOptions()[0]?.id || '',
      aisle: shelf.aisle,
      rack: shelf.rack,
      shelfNumber: shelf.shelf,
      shelfType: 'Standard',
      qrValue: '',
      maxCapacity: 100,
      maxWeight: 500,
      categoryRestriction: 'All Categories',
    };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedShelf.set(null);
  }

  saveShelf(): void {
    const wid = (this.modalDraft.warehouseId || this.selectedWarehouseId()).trim();
    if (!wid) {
      alert('Select a warehouse in the form above, or load warehouses with Retry.');
      return;
    }
    const data = this.modalDraft;
    const editing = this.selectedShelf();
    const code = `${data.aisle}-${data.rack}-${data.shelfNumber}`.replace(/\s+/g, '');

    if (editing) {
      this.shelvesService
        .update({
          id: editing.id,
          shelfCode: code,
          shelfName: code,
          warehouseId: wid,
          aisle: data.aisle,
          section: data.rack,
          position: data.shelfNumber,
          capacity: data.maxCapacity,
          description: data.shelfType,
          isActive: true,
        })
        .subscribe({
          next: (r) => {
            if (r.success !== false) {
              this.selectedWarehouseId.set(wid);
              this.closeModal();
              this.loadShelves();
            } else alert(r.message || 'Update failed');
          },
          error: (e) => alert((e as { error?: { message?: string } })?.error?.message || 'Update failed'),
        });
    } else {
      this.shelvesService
        .create({
          shelfCode: code,
          shelfName: code,
          warehouseId: wid,
          aisle: data.aisle,
          section: data.rack,
          position: data.shelfNumber,
          capacity: data.maxCapacity,
          description: data.shelfType,
        })
        .subscribe({
          next: (r) => {
            if (r.success !== false) {
              this.selectedWarehouseId.set(wid);
              this.closeModal();
              this.loadShelves();
            } else alert(r.message || 'Create failed');
          },
          error: (e) => alert((e as { error?: { message?: string } })?.error?.message || 'Create failed'),
        });
    }
  }

  deleteShelf(id: string): void {
    if (!confirm('Delete this shelf?')) return;
    this.shelvesService.delete(id).subscribe({
      next: (r) => {
        if (r.success !== false) this.loadShelves();
        else alert(r.message || 'Delete failed');
      },
      error: (e) => alert((e as { error?: { message?: string } })?.error?.message || 'Delete failed'),
    });
  }

  formatValue(value: number): string {
    if (value >= 1000) return '$' + (value / 1000).toFixed(0) + 'K';
    return '$' + value.toString();
  }

  viewShelf(shelf: Shelf): void {
    alert(`Shelf ${shelf.aisle}-${shelf.rack}-${shelf.shelf}\nItems: ${shelf.items}`);
  }

  addItemToShelf(shelf: Shelf): void {
    this.selectedShelfForItem = shelf;
    this.addItemForm.reset({ itemName: '', quantity: 1, unitPrice: 100 });
    this.showAddItemDialog = true;
  }

  closeAddItemDialog(): void {
    this.showAddItemDialog = false;
    this.selectedShelfForItem = null;
    this.addItemForm.reset();
  }

  saveItemToShelf(): void {
    if (this.addItemForm.invalid) {
      this.addItemForm.markAllAsTouched();
      return;
    }
    alert('Add stock through Receiving or Stock Adjustment; ad-hoc shelf line items are not exposed here.');
    this.closeAddItemDialog();
  }

  generateQR(): void {
    const qrCode = `${this.modalDraft.aisle}-${this.modalDraft.rack}-${this.modalDraft.shelfNumber}`;
    this.modalDraft.qrValue = qrCode;
    alert(`QR placeholder: ${qrCode}`);
  }

  getIconClass(type: string): string {
    const iconMap: { [key: string]: string } = {
      Building: 'icon-building',
      Floor: 'icon-floor',
      Department: 'icon-department',
      Room: 'icon-room',
      Warehouse: 'icon-warehouse',
      Aisle: 'icon-aisle',
      Shelf: 'icon-shelf'
    };
    return iconMap[type] || 'icon-default';
  }

  getIconClassSolid(type: string): string {
    const iconMap: { [key: string]: string } = {
      Building: 'bi bi-building',
      Floor: 'bi bi-layers-fill',
      Department: 'bi bi-door-closed',
      Room: 'bi bi-door-closed-fill',
      Warehouse: 'bi bi-box-seam-fill',
      Aisle: 'bi bi-columns-gap',
      Shelf: 'bi bi-stack'
    };
    return iconMap[type] || 'bi bi-geo-alt';
  }

  printQRCodes(): void {
    const shelves = this.filteredShelves();
    if (!shelves.length) {
      alert('No shelves selected for QR code printing.');
      return;
    }

    const qrData = shelves.map((s) => ({
      code: `${s.aisle}-${s.rack}-${s.shelf}`,
      label: `Shelf ${s.aisle}-${s.rack}-${s.shelf}`,
    }));

    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    let html = `
      <html>
        <head>
          <title>Shelf QR Codes</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 10px; }
            .page { page-break-after: always; }
            .qr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 20px; }
            .qr-item { border: 1px solid #ddd; padding: 15px; text-align: center; }
            .qr-code { width: 150px; height: 150px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; font-family: monospace; font-size: 12px; color: #666; }
            .qr-label { font-size: 14px; font-weight: bold; margin-top: 10px; }
          </style>
        </head>
        <body>
          <h1>Shelf QR Codes - ${this.selectedWarehouseLabel()}</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <div class="page">
            <div class="qr-grid">
    `;

    qrData.forEach((item) => {
      html += `
        <div class="qr-item">
          <div class="qr-code">[QR: ${item.code}]</div>
          <div class="qr-label">${item.label}</div>
        </div>
      `;
    });

    html += `
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
    alert(`QR codes for ${shelves.length} shelf(es) sent to print. Note: In production, use a QR code library like qrcode.js`);
  }

  openRearrangeModal(): void {
    if (!this.filteredShelves().length) {
      alert('No shelves available to rearrange.');
      return;
    }
    this.showRearrangeModal.set(true);
  }

  closeRearrangeModal(): void {
    this.showRearrangeModal.set(false);
    this.rearrangeDraft.set(null);
  }

  saveRearrangement(): void {
    const draft = this.rearrangeDraft();
    if (!draft) return;

    const shelf = this.shelves().find((s) => s.id === draft.shelfId);
    if (!shelf) {
      alert('Shelf not found.');
      return;
    }

    this.shelvesService
      .update({
        id: shelf.id,
        aisle: draft.newAisle,
        section: draft.newRack,
        level: draft.newShelf,
        isActive: true,
      })
      .subscribe({
        next: (r) => {
          if (r.success !== false) {
            alert(`Shelf rearranged: ${draft.newAisle}-${draft.newRack}-${draft.newShelf}`);
            this.closeRearrangeModal();
            this.loadShelves();
          } else alert(r.message || 'Rearrangement failed');
        },
        error: (e) => alert((e as { error?: { message?: string } })?.error?.message || 'Rearrangement failed'),
      });
  }

  exportShelfData(): void {
    const shelves = this.filteredShelves();
    if (!shelves.length) {
      alert('No shelves to export.');
      return;
    }

    const csvRows: string[] = ['Aisle,Rack,Shelf,Items,Value,Occupancy %'];
    shelves.forEach((s) => {
      csvRows.push(`${s.aisle},${s.rack},${s.shelf},${s.items},${s.value},${s.occupancy}`);
    });

    const csv = csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shelf-data-${this.selectedWarehouseLabel()}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    alert(`Exported ${shelves.length} shelf(es) to CSV`);
  }
}
