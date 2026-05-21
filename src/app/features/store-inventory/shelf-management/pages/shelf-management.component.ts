import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShelvesService, ShelfLocationDto, CreateShelfLocationRequest } from '../../../../core/services/shelves.service';
import { WarehousesService, WarehouseDto } from '../../../../core/services/warehouses.service';
import { InventoryService } from '../../../../core/services/inventory.service';

export interface ShelfRow {
  id: string;
  code: string;
  location: string;
  items: number;
  value: number;
  occupancy: number;
  category: string;
  isActive: boolean;
  raw: ShelfLocationDto;
}

@Component({
  selector: 'app-shelf-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shelf-management.component.html',
  styleUrls: ['./shelf-management.component.scss'],
})
export class ShelfManagementComponent implements OnInit {
  private readonly shelvesService = inject(ShelvesService);
  private readonly warehousesService = inject(WarehousesService);
  private readonly inventoryService = inject(InventoryService);

  warehouses = signal<WarehouseDto[]>([]);
  selectedWarehouseId = signal<string>('');
  searchTerm = signal('');
  aisleFilter = signal('All Aisles');

  shelfRows = signal<ShelfRow[]>([]);
  qtyByShelfId = signal<Record<string, number>>({});

  loading = signal(false);
  loadingWarehouses = signal(false);
  error = signal<string | null>(null);

  showAddShelfModal = signal(false);
  showShelfDetailsModal = signal(false);
  showRearrangeModal = signal(false);
  showMoveItemsModal = signal(false);
  selectedShelf = signal<ShelfRow | null>(null);
  saving = signal(false);

  addForm = {
    shelfCode: '',
    shelfName: '',
    aisle: '',
    section: '',
    level: '',
    position: '',
    capacity: 500,
    description: '',
  };

  aisles = ['All Aisles', 'A-01', 'A-02', 'B-01', 'B-02', 'C-01'];

  readonly selectedWarehouseLabel = computed(() => {
    const id = this.selectedWarehouseId();
    const w = this.warehouses().find((x) => x.id === id);
    return w?.warehouseName ?? 'Warehouse';
  });

  readonly totalShelves = computed(() => this.shelfRows().length);
  readonly occupiedShelves = computed(() =>
    this.shelfRows().filter((r) => r.items > 0 || (r.raw.currentUtilization ?? 0) > 0).length,
  );
  readonly emptyShelves = computed(() => this.totalShelves() - this.occupiedShelves());
  readonly utilizationPct = computed(() => {
    const rows = this.shelfRows();
    if (!rows.length) return 0;
    const sum = rows.reduce((a, r) => a + r.occupancy, 0);
    return Math.round(sum / rows.length);
  });

  filteredRows = computed(() => {
    const q = this.searchTerm().toLowerCase().trim();
    const aisle = this.aisleFilter();
    return this.shelfRows().filter((r) => {
      const hay = `${r.code} ${r.location} ${r.category}`.toLowerCase();
      const matchQ = !q || hay.includes(q);
      const matchAisle =
        aisle === 'All Aisles' ||
        (r.raw.aisle && r.raw.aisle.includes(aisle.replace('All Aisles', ''))) ||
        r.location.toUpperCase().includes(aisle.toUpperCase());
      return matchQ && matchAisle;
    });
  });

  ngOnInit(): void {
    this.loadWarehouses();
  }

  loadWarehouses(): void {
    this.loadingWarehouses.set(true);
    this.error.set(null);
    this.warehousesService.getAll().subscribe({
      next: (res) => {
        this.loadingWarehouses.set(false);
        const list = Array.isArray(res.data) ? res.data : [];
        if (list.length) {
          this.warehouses.set(list);
          if (!this.selectedWarehouseId()) {
            this.selectedWarehouseId.set(list[0].id);
          }
          this.reloadAll();
        } else {
          this.error.set(
            res.success === false ? res.message || 'Could not load warehouses.' : 'No warehouses found.',
          );
        }
      },
      error: (err) => {
        this.loadingWarehouses.set(false);
        this.error.set(this.errMsg(err, 'Failed to load warehouses.'));
      },
    });
  }

  onWarehouseChange(id: string): void {
    this.selectedWarehouseId.set(id || '');
    this.reloadAll();
  }

  onAisleChange(value: string): void {
    this.aisleFilter.set(value);
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  reloadAll(): void {
    const wid = this.selectedWarehouseId();
    if (!wid) {
      this.shelfRows.set([]);
      return;
    }
    this.loadShelvesAndStock(wid);
  }

  private loadShelvesAndStock(warehouseId: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.shelvesService.getAll({ warehouseId }).subscribe({
      next: (res) => {
        const dtoList = Array.isArray(res.data) ? res.data : [];
        if (res.success === false && dtoList.length === 0) {
          this.loading.set(false);
          this.error.set(res.message || 'Could not load shelves.');
          return;
        }
        const rows = dtoList.map((d) => this.toRow(d));
        this.shelfRows.set(rows);
        this.inventoryService.getStockOverview({ warehouseId }).subscribe({
          next: (inv) => {
            const map: Record<string, number> = {};
            if (inv.success !== false && Array.isArray(inv.data)) {
              for (const line of inv.data) {
                const sid = line.shelfId;
                if (!sid) continue;
                map[sid] = (map[sid] ?? 0) + (Number(line.currentStock) || 0);
              }
            }
            this.qtyByShelfId.set(map);
            this.shelfRows.update((list) =>
              list.map((r) => {
                const items = map[r.id] ?? 0;
                const cap = r.raw.capacity && r.raw.capacity > 0 ? r.raw.capacity : 0;
                const util = r.raw.currentUtilization ?? 0;
                const occupancy =
                  cap > 0 ? Math.min(100, Math.round((items / cap) * 100)) : Math.min(100, util);
                return { ...r, items, occupancy };
              }),
            );
            this.loading.set(false);
          },
          error: (err) => {
            this.loading.set(false);
            this.error.set(this.errMsg(err, 'Shelves loaded; stock counts unavailable.'));
          },
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(this.errMsg(err, 'Failed to load shelves.'));
      },
    });
  }

  private toRow(d: ShelfLocationDto): ShelfRow {
    const parts = [d.aisle, d.section, d.level, d.position].filter(Boolean).join(' · ');
    const location = [d.warehouseName, parts || d.description || '—'].filter(Boolean).join(' — ');
    const cap = d.capacity && d.capacity > 0 ? d.capacity : 0;
    const util = d.currentUtilization ?? 0;
    const occupancy = cap ? Math.min(100, Math.round((util / cap) * 100)) : util;
    return {
      id: d.id,
      code: d.shelfCode || d.shelfName || d.id,
      location,
      items: 0,
      value: 0,
      occupancy,
      category: d.description?.slice(0, 40) || '—',
      isActive: d.isActive,
      raw: d,
    };
  }

  openAddShelfModal(): void {
    if (!this.selectedWarehouseId()) {
      this.error.set('Select a warehouse first (load warehouses from the server).');
      return;
    }
    this.addForm = {
      shelfCode: '',
      shelfName: '',
      aisle: '',
      section: '',
      level: '',
      position: '',
      capacity: 500,
      description: '',
    };
    this.error.set(null);
    this.showAddShelfModal.set(true);
  }

  closeAddShelfModal(): void {
    this.showAddShelfModal.set(false);
  }

  createShelf(): void {
    const wid = this.selectedWarehouseId();
    const code = this.addForm.shelfCode.trim();
    const name = this.addForm.shelfName.trim() || code;
    if (!wid) {
      this.error.set('Warehouse is required.');
      return;
    }
    if (!code) {
      this.error.set('Shelf code is required.');
      return;
    }
    const payload: CreateShelfLocationRequest = {
      shelfCode: code,
      shelfName: name,
      warehouseId: wid,
      aisle: this.addForm.aisle.trim() || undefined,
      section: this.addForm.section.trim() || undefined,
      level: this.addForm.level.trim() || undefined,
      position: this.addForm.position.trim() || undefined,
      capacity: this.addForm.capacity > 0 ? this.addForm.capacity : undefined,
      description: this.addForm.description.trim() || undefined,
    };
    this.saving.set(true);
    this.error.set(null);
    this.shelvesService.create(payload).subscribe({
      next: (res) => {
        this.saving.set(false);
        if (res.success !== false) {
          this.closeAddShelfModal();
          this.reloadAll();
        } else {
          this.error.set(res.message || 'Create shelf failed.');
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(this.errMsg(err, 'Create shelf failed.'));
      },
    });
  }

  openShelfDetailsModal(shelf: ShelfRow): void {
    this.selectedShelf.set(shelf);
    this.showShelfDetailsModal.set(true);
  }

  closeShelfDetailsModal(): void {
    this.showShelfDetailsModal.set(false);
    this.selectedShelf.set(null);
  }

  openRearrangeModal(): void {
    this.showRearrangeModal.set(true);
  }

  closeRearrangeModal(): void {
    this.showRearrangeModal.set(false);
  }

  openMoveItemsModal(): void {
    this.showMoveItemsModal.set(true);
  }

  closeMoveItemsModal(): void {
    this.showMoveItemsModal.set(false);
  }

  viewShelf(shelf: ShelfRow): void {
    this.openShelfDetailsModal(shelf);
  }

  editShelf(shelf: ShelfRow): void {
    this.openShelfDetailsModal(shelf);
  }

  viewItems(_shelf: ShelfRow): void {
    /* Navigate or open stock-by-shelf when route exists */
  }

  printShelf(_shelf: ShelfRow): void {
    window.print();
  }

  deleteShelf(shelf: ShelfRow): void {
    if (!confirm(`Delete shelf "${shelf.code}"? This cannot be undone.`)) return;
    this.shelvesService.delete(shelf.id).subscribe({
      next: (res) => {
        if (res.success !== false) {
          this.reloadAll();
        } else {
          this.error.set(res.message || 'Delete failed.');
        }
      },
      error: (err) => this.error.set(this.errMsg(err, 'Delete failed.')),
    });
  }

  rearrangeShelves(): void {
    this.closeRearrangeModal();
  }

  moveItems(): void {
    this.closeMoveItemsModal();
  }

  getOccupancyBar(occupancy: number): string {
    const n = Math.max(0, Math.min(100, Math.round(occupancy)));
    const filled = Math.max(0, Math.min(8, Math.round(n / 12.5)));
    return '█'.repeat(filled) + '░'.repeat(8 - filled);
  }

  getOccupancyColor(occupancy: number): string {
    if (occupancy >= 50) return 'green';
    if (occupancy >= 10) return 'yellow';
    return 'red';
  }

  private errMsg(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const e = err as { error?: { message?: string } | string; status?: number; statusText?: string };
      let m = fallback;
      const b = e.error;
      if (b && typeof b === 'object' && 'message' in b && typeof (b as { message: string }).message === 'string') {
        m = (b as { message: string }).message;
      } else if (typeof b === 'string') m = b;
      if (e.status) m = `[${e.status}] ${m}`;
      return m;
    }
    return fallback;
  }
}
