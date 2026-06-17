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
    this.shelvesService.getAll({}).subscribe({
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

  private parseAddress(d: ShelfLocationDto): { aisle: string; rack: string; shelfNumber: string } {
    const fa = d.fullAddress || '';
    if (fa.includes('-')) {
      const parts = fa.split('-');
      return { aisle: parts[0] || '—', rack: parts[1] || '—', shelfNumber: parts.slice(2).join('-') || '—' };
    }
    return { aisle: d.aisle || '—', rack: d.rack || '—', shelfNumber: d.shelfNumber || '—' };
  }

  private mapDtoToDisplay(d: ShelfLocationDto): ShelfDisplay {
    const addr = this.parseAddress(d);
    const cap = d.capacity && d.capacity > 0 ? d.capacity : 0;
    const totalQty = d.totalQuantity || 0;
    const itemCount = d.itemCount || 0;
    const occupancy = cap > 0 ? Math.min(100, Math.round((totalQty / cap) * 100)) : 0;
    const value = 0;
    return {
      id: d.id,
      warehouseId: d.warehouseId || '',
      warehouseName: d.warehouseName || '',
      aisle: addr.aisle,
      rack: addr.rack,
      shelfNumber: addr.shelfNumber,
      zone: d.zone || '—',
      binType: d.binType || 'Standard',
      length: d.length || 0,
      width: d.width || 0,
      height: d.height || 0,
      maxWeight: d.maxWeight || 0,
      items: itemCount,
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
    this.detailItems.set([]);
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
