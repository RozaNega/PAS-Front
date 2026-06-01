import { Component, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ShelvesService, ShelfLocationDto } from '../../../../core/services/shelves.service';
import { WarehousesService, WarehouseDto } from '../../../../core/services/warehouses.service';

interface ShelfDisplay {
  id: string;
  shelfCode: string;
  shelfName: string;
  warehouseId: string;
  warehouseName: string;
  aisle: string;
  section: string;
  level: string;
  position: string;
  items: number;
  value: number;
  capacity: number;
  occupancy: number;
  isActive: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface ShelfForm {
  shelfCode: string;
  shelfName: string;
  warehouseId: string;
  aisle: string;
  section: string;
  level: string;
  position: string;
  capacity: number;
  description: string;
  isActive: boolean;
}

interface ShelfItem {
  name: string;
  sku: string;
  quantity: number;
  unit: string;
}

type ModalMode = 'add-edit' | 'detail' | 'delete' | null;

@Component({
  selector: 'app-shelf-locations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shelf-locations.component.html',
  styleUrls: ['./shelf-locations.component.scss'],
})
export class ShelfLocationsComponent {
  private readonly shelvesService = inject(ShelvesService);
  private readonly warehousesService = inject(WarehousesService);

  searchTerm = signal('');
  selectedWarehouseId = signal('');
  aisleFilter = signal('All');
  occupancyFilter = signal('All');
  page = signal(1);
  pageSize = 10;
  isLoading = signal(false);
  loadError = signal<string | null>(null);
  notification = signal<{ type: string; message: string } | null>(null);
  showModal = signal(false);
  modalMode = signal<ModalMode>(null);
  selectedShelf = signal<ShelfDisplay | null>(null);
  shelfToDelete = signal<ShelfDisplay | null>(null);
  mockUsed = false;

  occupancyOptions = ['All', 'Empty', 'Low', 'Medium', 'Full'];
  warehouseOptions = signal<WarehouseDto[]>([]);

  modalForm: ShelfForm = {
    shelfCode: '',
    shelfName: '',
    warehouseId: '',
    aisle: '',
    section: '',
    level: '',
    position: '',
    capacity: 100,
    description: '',
    isActive: true,
  };

  formErrors = signal<Record<string, string>>({});

  shelves = signal<ShelfDisplay[]>([]);
  detailItems = signal<ShelfItem[]>([]);

  totalShelves = computed(() => this.shelves().length);
  totalItems = computed(() => this.shelves().reduce((sum, s) => sum + s.items, 0));
  totalValue = computed(() => this.shelves().reduce((sum, s) => sum + s.value, 0));
  avgOccupancy = computed(() => {
    const list = this.shelves();
    if (list.length === 0) return 0;
    return Math.round(list.reduce((sum, s) => sum + s.occupancy, 0) / list.length);
  });
  emptyShelves = computed(() => this.shelves().filter(s => s.items === 0).length);
  warehousesCovered = computed(() => {
    const ids = new Set(this.shelves().map(s => s.warehouseId));
    return ids.size;
  });

  occupancyDistribution = computed(() => {
    const list = this.shelves();
    const empty = list.filter(s => s.occupancy === 0).length;
    const low = list.filter(s => s.occupancy > 0 && s.occupancy <= 30).length;
    const medium = list.filter(s => s.occupancy > 30 && s.occupancy <= 70).length;
    const full = list.filter(s => s.occupancy > 70).length;
    const total = list.length || 1;
    return { empty, low, medium, full, total };
  });

  warehouseShelfCount = computed(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const s of this.shelves()) {
      if (!map.has(s.warehouseId)) {
        map.set(s.warehouseId, { name: s.warehouseName, count: 0 });
      }
      map.get(s.warehouseId)!.count++;
    }
    return Array.from(map.values());
  });

  aisleOptions = computed(() => {
    const aisles = [...new Set(this.shelves().map(s => s.aisle).filter(a => a && a !== '—'))];
    aisles.sort((a, b) => a.localeCompare(b));
    return ['All', ...aisles];
  });

  filteredShelves = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const warehouseId = this.selectedWarehouseId();
    const aisle = this.aisleFilter();
    const occFilter = this.occupancyFilter();
    return this.shelves().filter(s => {
      const label = `${s.shelfCode} ${s.shelfName} ${s.aisle} ${s.section}`.toLowerCase();
      const matchesSearch = !search || label.includes(search);
      const matchesWarehouse = !warehouseId || s.warehouseId === warehouseId;
      const matchesAisle = aisle === 'All' || s.aisle === aisle;
      let matchesOcc = true;
      if (occFilter === 'Empty') matchesOcc = s.occupancy === 0;
      else if (occFilter === 'Low') matchesOcc = s.occupancy > 0 && s.occupancy <= 30;
      else if (occFilter === 'Medium') matchesOcc = s.occupancy > 30 && s.occupancy <= 70;
      else if (occFilter === 'Full') matchesOcc = s.occupancy > 70;
      return matchesSearch && matchesWarehouse && matchesAisle && matchesOcc;
    });
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredShelves().length / this.pageSize)));

  pagedShelves = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredShelves().slice(start, start + this.pageSize);
  });

  currentShelfCode = computed(() => {
    const s = this.selectedShelf();
    return s ? `${s.aisle}-${s.section}-${s.level}` : '';
  });

  detailTotalItems = computed(() => this.detailItems().reduce((sum, i) => sum + i.quantity, 0));

  constructor() {
    effect(() => {
      if (this.notification()) {
        setTimeout(() => this.notification.set(null), 4000);
      }
    });
    this.loadData();
  }

  private createMockShelves(): ShelfDisplay[] {
    const now = Date.now();
    const day = 86400000;
    return [
      { id: 'sl-001', shelfCode: 'A-R01-S01', shelfName: 'Aisle A Rack 01 Shelf 01', warehouseId: 'wh-001', warehouseName: 'Main Warehouse', aisle: 'A', section: 'R01', level: 'S01', position: '1', items: 65, value: 97500, capacity: 100, occupancy: 65, isActive: true, description: 'General storage', createdAt: new Date(now - 30 * day).toISOString(), updatedAt: new Date(now - 2 * day).toISOString() },
      { id: 'sl-002', shelfCode: 'A-R01-S02', shelfName: 'Aisle A Rack 01 Shelf 02', warehouseId: 'wh-001', warehouseName: 'Main Warehouse', aisle: 'A', section: 'R01', level: 'S02', position: '2', items: 45, value: 67500, capacity: 100, occupancy: 45, isActive: true, description: 'General storage', createdAt: new Date(now - 28 * day).toISOString(), updatedAt: new Date(now - 3 * day).toISOString() },
      { id: 'sl-003', shelfCode: 'B-R02-S01', shelfName: 'Aisle B Rack 02 Shelf 01', warehouseId: 'wh-001', warehouseName: 'Main Warehouse', aisle: 'B', section: 'R02', level: 'S01', position: '1', items: 120, value: 180000, capacity: 150, occupancy: 80, isActive: true, description: 'Heavy duty storage', createdAt: new Date(now - 25 * day).toISOString(), updatedAt: new Date(now - 1 * day).toISOString() },
      { id: 'sl-004', shelfCode: 'B-R02-S02', shelfName: 'Aisle B Rack 02 Shelf 02', warehouseId: 'wh-001', warehouseName: 'Main Warehouse', aisle: 'B', section: 'R02', level: 'S02', position: '2', items: 140, value: 210000, capacity: 150, occupancy: 93, isActive: true, description: 'Heavy duty storage', createdAt: new Date(now - 22 * day).toISOString(), updatedAt: new Date(now - 4 * day).toISOString() },
      { id: 'sl-005', shelfCode: 'C-R03-S01', shelfName: 'Aisle C Rack 03 Shelf 01', warehouseId: 'wh-001', warehouseName: 'Main Warehouse', aisle: 'C', section: 'R03', level: 'S01', position: '1', items: 0, value: 0, capacity: 80, occupancy: 0, isActive: true, description: 'Available for allocation', createdAt: new Date(now - 20 * day).toISOString(), updatedAt: new Date(now - 5 * day).toISOString() },
      { id: 'sl-006', shelfCode: 'C-R03-S02', shelfName: 'Aisle C Rack 03 Shelf 02', warehouseId: 'wh-001', warehouseName: 'Main Warehouse', aisle: 'C', section: 'R03', level: 'S02', position: '2', items: 20, value: 30000, capacity: 80, occupancy: 25, isActive: true, description: 'Light storage', createdAt: new Date(now - 18 * day).toISOString(), updatedAt: new Date(now - 6 * day).toISOString() },
      { id: 'sl-007', shelfCode: 'A-R01-S01', shelfName: 'Aisle A Rack 01 Shelf 01', warehouseId: 'wh-002', warehouseName: 'Branch Warehouse A', aisle: 'A', section: 'R01', level: 'S01', position: '1', items: 30, value: 45000, capacity: 75, occupancy: 40, isActive: true, description: 'General warehouse A', createdAt: new Date(now - 15 * day).toISOString(), updatedAt: new Date(now - 7 * day).toISOString() },
      { id: 'sl-008', shelfCode: 'A-R01-S02', shelfName: 'Aisle A Rack 01 Shelf 02', warehouseId: 'wh-002', warehouseName: 'Branch Warehouse A', aisle: 'A', section: 'R01', level: 'S02', position: '2', items: 55, value: 82500, capacity: 75, occupancy: 73, isActive: true, description: 'General warehouse A', createdAt: new Date(now - 12 * day).toISOString(), updatedAt: new Date(now - 8 * day).toISOString() },
      { id: 'sl-009', shelfCode: 'B-R02-S01', shelfName: 'Aisle B Rack 02 Shelf 01', warehouseId: 'wh-002', warehouseName: 'Branch Warehouse A', aisle: 'B', section: 'R02', level: 'S01', position: '1', items: 10, value: 15000, capacity: 75, occupancy: 13, isActive: true, description: 'Overflow storage', createdAt: new Date(now - 10 * day).toISOString(), updatedAt: new Date(now - 9 * day).toISOString() },
      { id: 'sl-010', shelfCode: 'A-R01-S01', shelfName: 'Aisle A Rack 01 Shelf 01', warehouseId: 'wh-003', warehouseName: 'Cold Storage Facility', aisle: 'A', section: 'R01', level: 'S01', position: '1', items: 80, value: 240000, capacity: 100, occupancy: 80, isActive: true, description: 'Cold storage zone 1', createdAt: new Date(now - 8 * day).toISOString(), updatedAt: new Date(now - 1 * day).toISOString() },
      { id: 'sl-011', shelfCode: 'A-R01-S02', shelfName: 'Aisle A Rack 01 Shelf 02', warehouseId: 'wh-003', warehouseName: 'Cold Storage Facility', aisle: 'A', section: 'R01', level: 'S02', position: '2', items: 95, value: 285000, capacity: 100, occupancy: 95, isActive: true, description: 'Cold storage zone 1', createdAt: new Date(now - 6 * day).toISOString(), updatedAt: new Date(now - 2 * day).toISOString() },
      { id: 'sl-012', shelfCode: 'B-R02-S01', shelfName: 'Aisle B Rack 02 Shelf 01', warehouseId: 'wh-003', warehouseName: 'Cold Storage Facility', aisle: 'B', section: 'R02', level: 'S01', position: '1', items: 60, value: 180000, capacity: 100, occupancy: 60, isActive: true, description: 'Cold storage zone 2', createdAt: new Date(now - 5 * day).toISOString(), updatedAt: new Date(now - 3 * day).toISOString() },
      { id: 'sl-013', shelfCode: 'A-R01-S01', shelfName: 'Aisle A Rack 01 Shelf 01', warehouseId: 'wh-004', warehouseName: 'Bole Logistics Hub', aisle: 'A', section: 'R01', level: 'S01', position: '1', items: 0, value: 0, capacity: 120, occupancy: 0, isActive: false, description: 'Undergoing maintenance', createdAt: new Date(now - 14 * day).toISOString(), updatedAt: new Date(now - 10 * day).toISOString() },
      { id: 'sl-014', shelfCode: 'A-R01-S02', shelfName: 'Aisle A Rack 01 Shelf 02', warehouseId: 'wh-004', warehouseName: 'Bole Logistics Hub', aisle: 'A', section: 'R01', level: 'S02', position: '2', items: 88, value: 132000, capacity: 120, occupancy: 73, isActive: true, description: 'Logistics overflow', createdAt: new Date(now - 12 * day).toISOString(), updatedAt: new Date(now - 4 * day).toISOString() },
      { id: 'sl-015', shelfCode: 'B-R02-S01', shelfName: 'Aisle B Rack 02 Shelf 01', warehouseId: 'wh-004', warehouseName: 'Bole Logistics Hub', aisle: 'B', section: 'R02', level: 'S01', position: '1', items: 40, value: 60000, capacity: 120, occupancy: 33, isActive: true, description: 'Logistics zone B', createdAt: new Date(now - 10 * day).toISOString(), updatedAt: new Date(now - 5 * day).toISOString() },
      { id: 'sl-016', shelfCode: 'A-R01-S01', shelfName: 'Aisle A Rack 01 Shelf 01', warehouseId: 'wh-005', warehouseName: 'Eastern Distribution Center', aisle: 'A', section: 'R01', level: 'S01', position: '1', items: 35, value: 52500, capacity: 80, occupancy: 44, isActive: true, description: 'Distribution storage', createdAt: new Date(now - 20 * day).toISOString(), updatedAt: new Date(now - 6 * day).toISOString() },
      { id: 'sl-017', shelfCode: 'A-R01-S02', shelfName: 'Aisle A Rack 01 Shelf 02', warehouseId: 'wh-005', warehouseName: 'Eastern Distribution Center', aisle: 'A', section: 'R01', level: 'S02', position: '2', items: 50, value: 75000, capacity: 80, occupancy: 63, isActive: true, description: 'Distribution storage', createdAt: new Date(now - 18 * day).toISOString(), updatedAt: new Date(now - 7 * day).toISOString() },
      { id: 'sl-018', shelfCode: 'B-R02-S01', shelfName: 'Aisle B Rack 02 Shelf 01', warehouseId: 'wh-005', warehouseName: 'Eastern Distribution Center', aisle: 'B', section: 'R02', level: 'S01', position: '1', items: 10, value: 15000, capacity: 80, occupancy: 13, isActive: false, description: 'Inactive - under repair', createdAt: new Date(now - 16 * day).toISOString(), updatedAt: new Date(now - 8 * day).toISOString() },
      { id: 'sl-019', shelfCode: 'A-R01-S01', shelfName: 'Aisle A Rack 01 Shelf 01', warehouseId: 'wh-007', warehouseName: 'Hawassa Textile Storage', aisle: 'A', section: 'R01', level: 'S01', position: '1', items: 72, value: 108000, capacity: 90, occupancy: 80, isActive: true, description: 'Textile fabric storage', createdAt: new Date(now - 25 * day).toISOString(), updatedAt: new Date(now - 3 * day).toISOString() },
      { id: 'sl-020', shelfCode: 'A-R01-S02', shelfName: 'Aisle A Rack 01 Shelf 02', warehouseId: 'wh-007', warehouseName: 'Hawassa Textile Storage', aisle: 'A', section: 'R01', level: 'S02', position: '2', items: 85, value: 127500, capacity: 90, occupancy: 94, isActive: true, description: 'Textile fabric storage', createdAt: new Date(now - 22 * day).toISOString(), updatedAt: new Date(now - 2 * day).toISOString() },
    ];
  }

  loadData(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.warehousesService.getAll().subscribe({
      next: (res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        this.warehouseOptions.set(list);
        this.loadShelves();
      },
      error: () => {
        this.warehouseOptions.set([]);
        this.loadShelves();
      },
    });
  }

  loadShelves(): void {
    this.shelvesService.getAll({ pageSize: 100 }).subscribe({
      next: (res) => {
        const dtoList = Array.isArray(res.data) ? res.data : [];
        const rows = dtoList.map(d => this.mapDtoToDisplay(d));
        if (rows.length > 0) {
          this.shelves.set(rows);
        } else {
          this.useMockFallback();
          this.loadError.set('No shelf locations from API. Showing mock data.');
        }
        this.isLoading.set(false);
        this.page.set(1);
      },
      error: (err) => {
        this.isLoading.set(false);
        let msg = 'Failed to reach the server.';
        if (err instanceof HttpErrorResponse) {
          if (err.status === 0) {
            msg = 'Cannot reach the API (network). Is the backend running on port 5028?';
          } else {
            msg = `HTTP ${err.status}: ${err.message || 'request failed'}.`;
          }
        }
        this.useMockFallback();
        this.notification.set({ type: 'warning', message: msg + ' Showing mock data.' });
      },
    });
  }

  private useMockFallback(): void {
    if (this.mockUsed) return;
    this.mockUsed = true;
    if (this.shelves().length < 5) {
      this.shelves.set(this.createMockShelves());
      this.page.set(1);
    }
  }

  private mapDtoToDisplay(d: ShelfLocationDto): ShelfDisplay {
    const cap = d.capacity && d.capacity > 0 ? d.capacity : 0;
    const util = d.currentUtilization ?? 0;
    const items = cap > 0 ? Math.round((util / 100) * cap) : Math.round(util);
    const occupancy = cap > 0 ? Math.min(100, Math.round((util / cap) * 100)) : util;
    const value = items * 1500;
    return {
      id: d.id,
      shelfCode: d.shelfCode || '',
      shelfName: d.shelfName || '',
      warehouseId: d.warehouseId || '',
      warehouseName: d.warehouseName || '',
      aisle: d.aisle || '—',
      section: d.section || '—',
      level: d.level || '—',
      position: d.position || '—',
      items,
      value,
      capacity: cap,
      occupancy,
      isActive: d.isActive,
      description: d.description || '',
      createdAt: d.createdAt || new Date().toISOString(),
      updatedAt: d.updatedAt || '',
    };
  }

  getOccupancyColor(occ: number): string {
    if (occ >= 80) return '#dc2626';
    if (occ >= 60) return '#f59e0b';
    if (occ >= 30) return '#10b981';
    return '#6b7280';
  }

  getOccupancyLevel(occ: number): string {
    if (occ === 0) return 'Empty';
    if (occ <= 30) return 'Low';
    if (occ <= 70) return 'Medium';
    return 'Full';
  }

  getOccupancyBadgeClass(occ: number): string {
    if (occ === 0) return 'badge-empty';
    if (occ <= 30) return 'badge-low';
    if (occ <= 70) return 'badge-medium';
    return 'badge-full';
  }

  getStatusIcon(active: boolean): string {
    return active ? 'bi-check-circle-fill' : 'bi-x-circle-fill';
  }

  getStatusBadgeClass(active: boolean): string {
    return active ? 'badge-active' : 'badge-inactive';
  }

  getStatusLabel(active: boolean): string {
    return active ? 'Active' : 'Inactive';
  }

  donutPercent(key: 'empty' | 'low' | 'medium' | 'full'): number {
    const dist = this.occupancyDistribution();
    return Math.round((dist[key] / dist.total) * 100);
  }

  donutOffset(key: 'empty' | 'low' | 'medium' | 'full'): number {
    const order: Array<'empty' | 'low' | 'medium' | 'full'> = ['empty', 'low', 'medium', 'full'];
    let offset = 25;
    for (const k of order) {
      if (k === key) break;
      offset -= this.donutPercent(k);
    }
    return offset;
  }

  chartMaxShelfCount(): number {
    const counts = this.warehouseShelfCount();
    if (counts.length === 0) return 10;
    return Math.max(...counts.map(c => c.count), 10);
  }

  barWidth(count: number): number {
    const max = this.chartMaxShelfCount();
    return max > 0 ? Math.round((count / max) * 100) : 0;
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.page.set(1);
  }

  onWarehouseChange(id: string): void {
    this.selectedWarehouseId.set(id);
    this.page.set(1);
  }

  onAisleFilterChange(value: string): void {
    this.aisleFilter.set(value);
    this.page.set(1);
  }

  onOccupancyFilterChange(value: string): void {
    this.occupancyFilter.set(value);
    this.page.set(1);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedWarehouseId.set('');
    this.aisleFilter.set('All');
    this.occupancyFilter.set('All');
    this.page.set(1);
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) {
      this.page.set(p);
    }
  }

  private resetForm(): void {
    this.modalForm = {
      shelfCode: '',
      shelfName: '',
      warehouseId: this.warehouseOptions()[0]?.id || '',
      aisle: '',
      section: '',
      level: '',
      position: '',
      capacity: 100,
      description: '',
      isActive: true,
    };
  }

  openAddModal(): void {
    this.selectedShelf.set(null);
    this.resetForm();
    this.formErrors.set({});
    this.modalMode.set('add-edit');
    this.showModal.set(true);
  }

  openEditModal(shelf: ShelfDisplay): void {
    this.selectedShelf.set(shelf);
    this.modalForm = {
      shelfCode: shelf.shelfCode,
      shelfName: shelf.shelfName,
      warehouseId: shelf.warehouseId,
      aisle: shelf.aisle === '—' ? '' : shelf.aisle,
      section: shelf.section === '—' ? '' : shelf.section,
      level: shelf.level === '—' ? '' : shelf.level,
      position: shelf.position === '—' ? '' : shelf.position,
      capacity: shelf.capacity || 100,
      description: shelf.description,
      isActive: shelf.isActive,
    };
    this.formErrors.set({});
    this.modalMode.set('add-edit');
    this.showModal.set(true);
  }

  openDetailModal(shelf: ShelfDisplay): void {
    this.selectedShelf.set(shelf);
    const itemCount = Math.min(shelf.items, 8);
    const names = ['Widget A', 'Bolt Pack', 'Fastener Kit', 'Panel Set', 'Bracket', 'Seal Ring', 'Cable Tie', 'Gasket'];
    const skus = ['WDG-001', 'BLT-002', 'FST-003', 'PNL-004', 'BRK-005', 'SRL-006', 'CBL-007', 'GSK-008'];
    const items: ShelfItem[] = [];
    let remaining = shelf.items;
    for (let i = 0; i < itemCount; i++) {
      const qty = i < itemCount - 1 ? Math.ceil(remaining / (itemCount - i)) : remaining;
      remaining -= qty;
      items.push({
        name: names[i % names.length],
        sku: skus[i % skus.length],
        quantity: qty,
        unit: 'pcs',
      });
    }
    this.detailItems.set(items);
    this.modalMode.set('detail');
    this.showModal.set(true);
  }

  openDeleteModal(shelf: ShelfDisplay): void {
    this.shelfToDelete.set(shelf);
    this.modalMode.set('delete');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.modalMode.set(null);
    this.selectedShelf.set(null);
    this.shelfToDelete.set(null);
    this.detailItems.set([]);
    this.formErrors.set({});
  }

  validateForm(): boolean {
    const errors: Record<string, string> = {};
    if (!this.modalForm.shelfCode.trim()) errors['shelfCode'] = 'Shelf code is required';
    if (!this.modalForm.shelfName.trim()) errors['shelfName'] = 'Shelf name is required';
    if (!this.modalForm.warehouseId) errors['warehouseId'] = 'Warehouse is required';
    if (!this.modalForm.aisle.trim()) errors['aisle'] = 'Aisle is required';
    if (!this.modalForm.section.trim()) errors['section'] = 'Section is required';
    if (!this.modalForm.level.trim()) errors['level'] = 'Level is required';
    if (this.modalForm.capacity <= 0) errors['capacity'] = 'Capacity must be greater than 0';
    this.formErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  saveShelf(): void {
    if (!this.validateForm()) return;
    const editing = this.selectedShelf();
    if (editing) {
      const updated: ShelfDisplay = {
        ...editing,
        shelfCode: this.modalForm.shelfCode,
        shelfName: this.modalForm.shelfName,
        warehouseId: this.modalForm.warehouseId,
        warehouseName: this.warehouseOptions().find(w => w.id === this.modalForm.warehouseId)?.warehouseName || editing.warehouseName,
        aisle: this.modalForm.aisle,
        section: this.modalForm.section,
        level: this.modalForm.level,
        position: this.modalForm.position,
        capacity: this.modalForm.capacity,
        description: this.modalForm.description,
        isActive: this.modalForm.isActive,
      };
      this.shelves.update(list => list.map(s => s.id === editing.id ? updated : s));
      this.notification.set({ type: 'success', message: `Shelf "${updated.shelfCode}" updated successfully.` });
    } else {
      const newShelf: ShelfDisplay = {
        id: 'sl-' + String(Date.now()).slice(-6),
        shelfCode: this.modalForm.shelfCode,
        shelfName: this.modalForm.shelfName,
        warehouseId: this.modalForm.warehouseId,
        warehouseName: this.warehouseOptions().find(w => w.id === this.modalForm.warehouseId)?.warehouseName || '',
        aisle: this.modalForm.aisle,
        section: this.modalForm.section,
        level: this.modalForm.level,
        position: this.modalForm.position,
        items: 0,
        value: 0,
        capacity: this.modalForm.capacity,
        occupancy: 0,
        isActive: this.modalForm.isActive,
        description: this.modalForm.description,
        createdAt: new Date().toISOString(),
        updatedAt: '',
      };
      this.shelves.update(list => [...list, newShelf]);
      this.notification.set({ type: 'success', message: `Shelf "${newShelf.shelfCode}" created successfully.` });
    }
    this.closeModal();
  }

  confirmDelete(): void {
    const shelf = this.shelfToDelete();
    if (!shelf) return;
    this.shelves.update(list => list.filter(s => s.id !== shelf.id));
    this.notification.set({ type: 'success', message: `Shelf "${shelf.shelfCode}" deleted successfully.` });
    this.closeModal();
    this.page.set(1);
  }

  exportCSV(): void {
    const shelves = this.filteredShelves();
    if (shelves.length === 0) {
      this.notification.set({ type: 'warning', message: 'No shelves to export.' });
      return;
    }
    const header = 'Shelf Code,Name,Warehouse,Aisle,Section,Level,Position,Items,Value,Capacity,Occupancy %,Status,Created';
    const rows = shelves.map(s =>
      `"${s.shelfCode}","${s.shelfName}","${s.warehouseName}","${s.aisle}","${s.section}","${s.level}","${s.position}",${s.items},${s.value},${s.capacity},${s.occupancy},"${this.getStatusLabel(s.isActive)}","${s.createdAt}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shelf_locations_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.notification.set({ type: 'success', message: `Exported ${shelves.length} shelf locations to CSV.` });
  }

  formatValue(value: number): string {
    if (value >= 1000000) return 'Br ' + (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return 'Br ' + (value / 1000).toFixed(0) + 'K';
    return 'Br ' + value.toString();
  }

  formatNumber(value: number): string {
    return value.toLocaleString();
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

  isEditing(): boolean {
    return this.selectedShelf() !== null;
  }

  fieldError(field: string): string {
    return this.formErrors()[field] || '';
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
