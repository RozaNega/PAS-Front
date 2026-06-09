import { Component, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ShelvesService, ShelfLocationDto, CreateShelfLocationRequest, UpdateShelfLocationRequest } from '../../../../core/services/shelves.service';
import { WarehousesService, WarehouseDto, CreateWarehouseRequest } from '../../../../core/services/warehouses.service';

interface ShelfDisplay {
  id: string;
  warehouseId: string;
  warehouseName: string;
  aisle: string;
  rack: string;
  shelfNumber: string;
  zone: string;
  binType: string;
  length: number;
  width: number;
  height: number;
  maxWeight: number;
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
  warehouseName: string;
  aisle: string;
  rack: string;
  shelfNumber: string;
  zone: string;
  binType: string;
  length: number;
  width: number;
  height: number;
  maxWeight: number;
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
  selectedWarehouseName = signal('');
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
  warehousesLoadedFromApi = signal(false);

  showWarehouseForm = signal(false);
  warehouseForm: CreateWarehouseRequest = {
    warehouseName: '',
    locationCode: '',
    address: '',
    city: '',
    country: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
  };
  warehouseFormErrors = signal<Record<string, string>>({});
  isCreatingWarehouse = signal(false);

  modalForm: ShelfForm = {
    warehouseName: '',
    aisle: '',
    rack: '',
    shelfNumber: '',
    zone: '',
    binType: 'Standard',
    length: 0,
    width: 0,
    height: 0,
    maxWeight: 0,
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
    const warehouseName = this.selectedWarehouseName();
    const aisle = this.aisleFilter();
    const occFilter = this.occupancyFilter();
    return this.shelves().filter(s => {
      const label = `${s.rack} ${s.shelfNumber} ${s.aisle} ${s.zone}`.toLowerCase();
      const matchesSearch = !search || label.includes(search);
      const matchesWarehouse = !warehouseName || s.warehouseName === warehouseName;
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
    return s ? `${s.aisle}-${s.rack}-${s.shelfNumber}` : '';
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
      { id: 'sl-001', warehouseId: 'wh-001', warehouseName: 'Main Warehouse', aisle: 'A', rack: 'R01', shelfNumber: 'S01', zone: 'Zone-A', binType: 'Standard', length: 120, width: 60, height: 40, maxWeight: 500, items: 65, value: 97500, capacity: 100, occupancy: 65, isActive: true, description: 'General storage', createdAt: new Date(now - 30 * day).toISOString(), updatedAt: new Date(now - 2 * day).toISOString() },
      { id: 'sl-002', warehouseId: 'wh-001', warehouseName: 'Main Warehouse', aisle: 'A', rack: 'R01', shelfNumber: 'S02', zone: 'Zone-A', binType: 'Standard', length: 120, width: 60, height: 40, maxWeight: 500, items: 45, value: 67500, capacity: 100, occupancy: 45, isActive: true, description: 'General storage', createdAt: new Date(now - 28 * day).toISOString(), updatedAt: new Date(now - 3 * day).toISOString() },
      { id: 'sl-003', warehouseId: 'wh-001', warehouseName: 'Main Warehouse', aisle: 'B', rack: 'R02', shelfNumber: 'S01', zone: 'Zone-B', binType: 'Heavy', length: 120, width: 60, height: 40, maxWeight: 800, items: 120, value: 180000, capacity: 150, occupancy: 80, isActive: true, description: 'Heavy duty storage', createdAt: new Date(now - 25 * day).toISOString(), updatedAt: new Date(now - 1 * day).toISOString() },
      { id: 'sl-004', warehouseId: 'wh-001', warehouseName: 'Main Warehouse', aisle: 'B', rack: 'R02', shelfNumber: 'S02', zone: 'Zone-B', binType: 'Heavy', length: 120, width: 60, height: 40, maxWeight: 800, items: 140, value: 210000, capacity: 150, occupancy: 93, isActive: true, description: 'Heavy duty storage', createdAt: new Date(now - 22 * day).toISOString(), updatedAt: new Date(now - 4 * day).toISOString() },
      { id: 'sl-005', warehouseId: 'wh-001', warehouseName: 'Main Warehouse', aisle: 'C', rack: 'R03', shelfNumber: 'S01', zone: 'Zone-C', binType: 'Light', length: 90, width: 50, height: 35, maxWeight: 300, items: 0, value: 0, capacity: 80, occupancy: 0, isActive: true, description: 'Available for allocation', createdAt: new Date(now - 20 * day).toISOString(), updatedAt: new Date(now - 5 * day).toISOString() },
      { id: 'sl-006', warehouseId: 'wh-001', warehouseName: 'Main Warehouse', aisle: 'C', rack: 'R03', shelfNumber: 'S02', zone: 'Zone-C', binType: 'Light', length: 90, width: 50, height: 35, maxWeight: 300, items: 20, value: 30000, capacity: 80, occupancy: 25, isActive: true, description: 'Light storage', createdAt: new Date(now - 18 * day).toISOString(), updatedAt: new Date(now - 6 * day).toISOString() },
      { id: 'sl-007', warehouseId: 'wh-002', warehouseName: 'Branch Warehouse A', aisle: 'A', rack: 'R01', shelfNumber: 'S01', zone: 'Zone-A', binType: 'Standard', length: 100, width: 50, height: 35, maxWeight: 400, items: 30, value: 45000, capacity: 75, occupancy: 40, isActive: true, description: 'General warehouse A', createdAt: new Date(now - 15 * day).toISOString(), updatedAt: new Date(now - 7 * day).toISOString() },
      { id: 'sl-008', warehouseId: 'wh-002', warehouseName: 'Branch Warehouse A', aisle: 'A', rack: 'R01', shelfNumber: 'S02', zone: 'Zone-A', binType: 'Standard', length: 100, width: 50, height: 35, maxWeight: 400, items: 55, value: 82500, capacity: 75, occupancy: 73, isActive: true, description: 'General warehouse A', createdAt: new Date(now - 12 * day).toISOString(), updatedAt: new Date(now - 8 * day).toISOString() },
      { id: 'sl-009', warehouseId: 'wh-002', warehouseName: 'Branch Warehouse A', aisle: 'B', rack: 'R02', shelfNumber: 'S01', zone: 'Zone-B', binType: 'Standard', length: 100, width: 50, height: 35, maxWeight: 400, items: 10, value: 15000, capacity: 75, occupancy: 13, isActive: true, description: 'Overflow storage', createdAt: new Date(now - 10 * day).toISOString(), updatedAt: new Date(now - 9 * day).toISOString() },
      { id: 'sl-010', warehouseId: 'wh-003', warehouseName: 'Cold Storage Facility', aisle: 'A', rack: 'R01', shelfNumber: 'S01', zone: 'Zone-A', binType: 'Cold', length: 110, width: 55, height: 38, maxWeight: 450, items: 80, value: 240000, capacity: 100, occupancy: 80, isActive: true, description: 'Cold storage zone 1', createdAt: new Date(now - 8 * day).toISOString(), updatedAt: new Date(now - 1 * day).toISOString() },
      { id: 'sl-011', warehouseId: 'wh-003', warehouseName: 'Cold Storage Facility', aisle: 'A', rack: 'R01', shelfNumber: 'S02', zone: 'Zone-A', binType: 'Cold', length: 110, width: 55, height: 38, maxWeight: 450, items: 95, value: 285000, capacity: 100, occupancy: 95, isActive: true, description: 'Cold storage zone 1', createdAt: new Date(now - 6 * day).toISOString(), updatedAt: new Date(now - 2 * day).toISOString() },
      { id: 'sl-012', warehouseId: 'wh-003', warehouseName: 'Cold Storage Facility', aisle: 'B', rack: 'R02', shelfNumber: 'S01', zone: 'Zone-B', binType: 'Cold', length: 110, width: 55, height: 38, maxWeight: 450, items: 60, value: 180000, capacity: 100, occupancy: 60, isActive: true, description: 'Cold storage zone 2', createdAt: new Date(now - 5 * day).toISOString(), updatedAt: new Date(now - 3 * day).toISOString() },
      { id: 'sl-013', warehouseId: 'wh-004', warehouseName: 'Bole Logistics Hub', aisle: 'A', rack: 'R01', shelfNumber: 'S01', zone: 'Zone-A', binType: 'Heavy', length: 130, width: 70, height: 45, maxWeight: 1000, items: 0, value: 0, capacity: 120, occupancy: 0, isActive: false, description: 'Undergoing maintenance', createdAt: new Date(now - 14 * day).toISOString(), updatedAt: new Date(now - 10 * day).toISOString() },
      { id: 'sl-014', warehouseId: 'wh-004', warehouseName: 'Bole Logistics Hub', aisle: 'A', rack: 'R01', shelfNumber: 'S02', zone: 'Zone-A', binType: 'Heavy', length: 130, width: 70, height: 45, maxWeight: 1000, items: 88, value: 132000, capacity: 120, occupancy: 73, isActive: true, description: 'Logistics overflow', createdAt: new Date(now - 12 * day).toISOString(), updatedAt: new Date(now - 4 * day).toISOString() },
      { id: 'sl-015', warehouseId: 'wh-004', warehouseName: 'Bole Logistics Hub', aisle: 'B', rack: 'R02', shelfNumber: 'S01', zone: 'Zone-B', binType: 'Heavy', length: 130, width: 70, height: 45, maxWeight: 1000, items: 40, value: 60000, capacity: 120, occupancy: 33, isActive: true, description: 'Logistics zone B', createdAt: new Date(now - 10 * day).toISOString(), updatedAt: new Date(now - 5 * day).toISOString() },
      { id: 'sl-016', warehouseId: 'wh-005', warehouseName: 'Eastern Distribution Center', aisle: 'A', rack: 'R01', shelfNumber: 'S01', zone: 'Zone-A', binType: 'Standard', length: 100, width: 50, height: 35, maxWeight: 400, items: 35, value: 52500, capacity: 80, occupancy: 44, isActive: true, description: 'Distribution storage', createdAt: new Date(now - 20 * day).toISOString(), updatedAt: new Date(now - 6 * day).toISOString() },
      { id: 'sl-017', warehouseId: 'wh-005', warehouseName: 'Eastern Distribution Center', aisle: 'A', rack: 'R01', shelfNumber: 'S02', zone: 'Zone-A', binType: 'Standard', length: 100, width: 50, height: 35, maxWeight: 400, items: 50, value: 75000, capacity: 80, occupancy: 63, isActive: true, description: 'Distribution storage', createdAt: new Date(now - 18 * day).toISOString(), updatedAt: new Date(now - 7 * day).toISOString() },
      { id: 'sl-018', warehouseId: 'wh-005', warehouseName: 'Eastern Distribution Center', aisle: 'B', rack: 'R02', shelfNumber: 'S01', zone: 'Zone-B', binType: 'Standard', length: 100, width: 50, height: 35, maxWeight: 400, items: 10, value: 15000, capacity: 80, occupancy: 13, isActive: false, description: 'Inactive - under repair', createdAt: new Date(now - 16 * day).toISOString(), updatedAt: new Date(now - 8 * day).toISOString() },
      { id: 'sl-019', warehouseId: 'wh-007', warehouseName: 'Hawassa Textile Storage', aisle: 'A', rack: 'R01', shelfNumber: 'S01', zone: 'Zone-A', binType: 'Light', length: 90, width: 45, height: 30, maxWeight: 300, items: 72, value: 108000, capacity: 90, occupancy: 80, isActive: true, description: 'Textile fabric storage', createdAt: new Date(now - 25 * day).toISOString(), updatedAt: new Date(now - 3 * day).toISOString() },
      { id: 'sl-020', warehouseId: 'wh-007', warehouseName: 'Hawassa Textile Storage', aisle: 'A', rack: 'R01', shelfNumber: 'S02', zone: 'Zone-A', binType: 'Light', length: 90, width: 45, height: 30, maxWeight: 300, items: 85, value: 127500, capacity: 90, occupancy: 94, isActive: true, description: 'Textile fabric storage', createdAt: new Date(now - 22 * day).toISOString(), updatedAt: new Date(now - 2 * day).toISOString() },
    ];
  }

  loadData(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.warehousesService.getAll().subscribe({
      next: (res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        const fromApi = res.success !== false && list.length > 0;
        this.warehousesLoadedFromApi.set(fromApi);
        this.warehouseOptions.set(list);
        if (list.length === 0) {
          this.loadError.set('No warehouses found. Create a warehouse first before adding shelves.');
        } else if (!fromApi) {
          this.loadError.set('Warehouses loaded from cache. Create a warehouse to ensure it exists on the server.');
        }
        this.loadShelves();
      },
      error: (err) => {
        const msg = err instanceof HttpErrorResponse
          ? `HTTP ${err.status}: ${err.message || 'warehouses API failed'}`
          : 'Warehouses API unavailable';
        console.error('[ShelfLocations] Warehouses load failed:', msg);
        this.warehouseOptions.set([]);
        this.warehousesLoadedFromApi.set(false);
        this.loadError.set(`Cannot load warehouses: ${msg}. Create a warehouse first.`);
        this.loadShelves();
      },
    });
  }

  loadShelves(): void {
    this.shelvesService.getAll({ pageSize: 100 }).subscribe({
      next: (res) => {
        const dtoList = Array.isArray(res.data) ? res.data : [];
        if (res.success === false) {
          this.shelves.set([]);
          this.loadError.set(res.message || 'Failed to load shelf locations from the server.');
          this.isLoading.set(false);
          this.page.set(1);
          return;
        }
        const rows = dtoList.map(d => this.mapDtoToDisplay(d));
        this.shelves.set(rows);
        if (rows.length === 0) {
          this.loadError.set('No shelf locations found.');
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
        this.shelves.set([]);
        this.loadError.set(msg);
        this.page.set(1);
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
      warehouseId: d.warehouseId || '',
      warehouseName: d.warehouseName || '',
      aisle: d.aisle || '—',
      rack: d.rack || '—',
      shelfNumber: d.shelfNumber || '—',
      zone: d.zone || '—',
      binType: d.binType || 'Standard',
      length: d.length || 0,
      width: d.width || 0,
      height: d.height || 0,
      maxWeight: d.maxWeight || 0,
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

  onWarehouseChange(name: string): void {
    this.selectedWarehouseName.set(name);
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
    this.selectedWarehouseName.set('');
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
      warehouseName: this.warehouseOptions()[0]?.warehouseName || '',
      aisle: '',
      rack: '',
      shelfNumber: '',
      zone: '',
      binType: 'Standard',
      length: 0,
      width: 0,
      height: 0,
      maxWeight: 0,
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
      warehouseName: shelf.warehouseName,
      aisle: shelf.aisle === '—' ? '' : shelf.aisle,
      rack: shelf.rack === '—' ? '' : shelf.rack,
      shelfNumber: shelf.shelfNumber === '—' ? '' : shelf.shelfNumber,
      zone: shelf.zone === '—' ? '' : shelf.zone,
      binType: shelf.binType || 'Standard',
      length: shelf.length || 0,
      width: shelf.width || 0,
      height: shelf.height || 0,
      maxWeight: shelf.maxWeight || 0,
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
    this.showWarehouseForm.set(false);
    this.warehouseFormErrors.set({});
  }

  toggleWarehouseForm(): void {
    this.showWarehouseForm.set(!this.showWarehouseForm());
    this.warehouseFormErrors.set({});
    if (this.showWarehouseForm()) {
      this.warehouseForm = {
        warehouseName: '',
        locationCode: '',
        address: '',
        city: '',
        country: '',
        contactPerson: '',
        contactPhone: '',
        contactEmail: '',
      };
    }
  }

  validateWarehouseForm(): boolean {
    const errors: Record<string, string> = {};
    if (!this.warehouseForm.warehouseName.trim()) errors['warehouseName'] = 'Warehouse name is required';
    if (!this.warehouseForm.locationCode.trim()) errors['locationCode'] = 'Location code is required';
    this.warehouseFormErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  createWarehouse(): void {
    if (!this.validateWarehouseForm()) return;
    this.isCreatingWarehouse.set(true);
    this.warehousesService.create(this.warehouseForm).subscribe({
      next: (res) => {
        this.isCreatingWarehouse.set(false);
        if (res.success !== false) {
          const newId = res.data || '';
          const newWarehouse: WarehouseDto = {
            id: newId,
            warehouseName: this.warehouseForm.warehouseName,
            locationCode: this.warehouseForm.locationCode,
            address: this.warehouseForm.address,
            city: this.warehouseForm.city,
            country: this.warehouseForm.country,
            contactPerson: this.warehouseForm.contactPerson,
            contactPhone: this.warehouseForm.contactPhone,
            contactEmail: this.warehouseForm.contactEmail,
            isActive: true,
            createdAt: new Date().toISOString(),
          };

          const existing = this.warehouseOptions();
          this.warehouseOptions.set([...existing, newWarehouse]);
          this.warehousesLoadedFromApi.set(true);

          this.modalForm.warehouseName = newWarehouse.warehouseName;
          this.showWarehouseForm.set(false);
          this.warehouseFormErrors.set({});
          this.notification.set({ type: 'success', message: `Warehouse "${newWarehouse.warehouseName}" created successfully.` });
        } else {
          this.notification.set({ type: 'error', message: `Failed to create warehouse: ${res.message || 'Unknown error'}` });
        }
      },
      error: (err) => {
        this.isCreatingWarehouse.set(false);
        let msg = 'Request failed';
        if (err instanceof HttpErrorResponse) {
          msg = `HTTP ${err.status}`;
          if (err.error) {
            if (typeof err.error === 'string') msg += `: ${err.error}`;
            else if (err.error.message) msg += `: ${err.error.message}`;
            else if (err.error.title) msg += `: ${err.error.title}`;
            else msg += `: ${err.statusText || 'Bad Request'}`;
          } else {
            msg += `: ${err.statusText || 'request failed'}`;
          }
        }
        this.notification.set({ type: 'error', message: `Failed to create warehouse: ${msg}` });
      },
    });
  }

  validateForm(): boolean {
    const errors: Record<string, string> = {};
    if (!this.modalForm.warehouseName) errors['warehouseName'] = 'Warehouse is required';
    if (!this.modalForm.aisle.trim()) errors['aisle'] = 'Aisle is required';
    if (!this.modalForm.rack.trim()) errors['rack'] = 'Rack is required';
    if (!this.modalForm.shelfNumber.trim()) errors['shelfNumber'] = 'Shelf number is required';
    if (this.modalForm.capacity <= 0) errors['capacity'] = 'Capacity must be greater than 0';
    this.formErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  saveShelf(): void {
    if (!this.validateForm()) return;
    const editing = this.selectedShelf();

    const payload = editing
      ? {
          id: editing.id,
          warehouseId: editing.warehouseId,
          warehouseName: this.modalForm.warehouseName,
          aisle: this.modalForm.aisle,
          rack: this.modalForm.rack,
          shelfNumber: this.modalForm.shelfNumber,
          zone: this.modalForm.zone,
          binType: this.modalForm.binType,
          length: this.modalForm.length > 0 ? this.modalForm.length : undefined,
          width: this.modalForm.width > 0 ? this.modalForm.width : undefined,
          height: this.modalForm.height > 0 ? this.modalForm.height : undefined,
          maxWeight: this.modalForm.maxWeight > 0 ? this.modalForm.maxWeight : undefined,
          capacity: this.modalForm.capacity > 0 ? this.modalForm.capacity : undefined,
          isActive: this.modalForm.isActive,
        } as any as UpdateShelfLocationRequest
      : {
          warehouseId: this.warehouseOptions().find((w: WarehouseDto) => w.warehouseName === this.modalForm.warehouseName)?.id ?? '',
          warehouseName: this.modalForm.warehouseName,
          aisle: this.modalForm.aisle,
          rack: this.modalForm.rack,
          shelfNumber: this.modalForm.shelfNumber,
          zone: this.modalForm.zone,
          binType: this.modalForm.binType,
          length: this.modalForm.length > 0 ? this.modalForm.length : undefined,
          width: this.modalForm.width > 0 ? this.modalForm.width : undefined,
          height: this.modalForm.height > 0 ? this.modalForm.height : undefined,
          maxWeight: this.modalForm.maxWeight > 0 ? this.modalForm.maxWeight : undefined,
          capacity: this.modalForm.capacity > 0 ? this.modalForm.capacity : undefined,
        } as any as CreateShelfLocationRequest;

    if (!editing) {
      const wh = this.warehouseOptions().find((w: WarehouseDto) => w.warehouseName === this.modalForm.warehouseName);
      if (!wh || !wh.id) {
        this.formErrors.set({ warehouseName: 'Please select a valid warehouse. Create one if none exist.' });
        return;
      }
      payload.warehouseId = wh.id;
    }

    this.isLoading.set(true);
    const op$ = editing
      ? this.shelvesService.update(payload as UpdateShelfLocationRequest)
      : this.shelvesService.create(payload as CreateShelfLocationRequest);

    op$.subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success !== false) {
          this.notification.set({
            type: 'success',
            message: editing
              ? `Shelf "${this.modalForm.rack}-${this.modalForm.shelfNumber}" updated successfully.`
              : `Shelf "${this.modalForm.rack}-${this.modalForm.shelfNumber}" created successfully.`,
          });
          this.closeModal();
          this.loadShelves();
        } else {
          this.notification.set({ type: 'error', message: `Failed: ${res.message || 'Unknown error'}` });
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        let msg = 'Request failed';
        if (err instanceof HttpErrorResponse) {
          msg = `HTTP ${err.status}`;
          if (err.error) {
            if (typeof err.error === 'string') msg += `: ${err.error}`;
            else if (err.error.message) msg += `: ${err.error.message}`;
            else if (err.error.title) msg += `: ${err.error.title}`;
            else if (err.error.errors) {
              const vals = Object.values(err.error.errors).flat();
              msg += `: ${vals.join('; ')}`;
            } else msg += `: ${err.statusText || 'Bad Request'}`;
          } else {
            msg += `: ${err.statusText || 'request failed'}`;
          }
        }
        this.notification.set({ type: 'error', message: `Failed to save shelf: ${msg}` });
      },
    });
  }

  confirmDelete(): void {
    const shelf = this.shelfToDelete();
    if (!shelf) return;
    this.isLoading.set(true);
    this.shelvesService.delete(shelf.id).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success !== false) {
          this.notification.set({ type: 'success', message: `Shelf "${shelf.rack}-${shelf.shelfNumber}" deleted successfully.` });
          this.closeModal();
          this.loadShelves();
        } else {
          this.notification.set({ type: 'error', message: `Failed to delete: ${res.message || 'Unknown error'}` });
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err instanceof HttpErrorResponse
          ? `HTTP ${err.status}: ${err.message || 'request failed'}`
          : 'Request failed';
        this.notification.set({ type: 'error', message: `Failed to delete shelf: ${msg}` });
      },
    });
  }

  exportCSV(): void {
    const shelves = this.filteredShelves();
    if (shelves.length === 0) {
      this.notification.set({ type: 'warning', message: 'No shelves to export.' });
      return;
    }
    const header = 'Warehouse,Aisle,Rack,Shelf Number,Zone,Bin Type,Length,Width,Height,Max Weight,Items,Value,Capacity,Occupancy %,Status,Created';
    const rows = shelves.map(s =>
      `"${s.warehouseName}","${s.aisle}","${s.rack}","${s.shelfNumber}","${s.zone}","${s.binType}",${s.length},${s.width},${s.height},${s.maxWeight},${s.items},${s.value},${s.capacity},${s.occupancy},"${this.getStatusLabel(s.isActive)}","${s.createdAt}"`
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
