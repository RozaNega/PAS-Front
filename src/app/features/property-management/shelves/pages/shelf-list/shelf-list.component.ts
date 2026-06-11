import { Component, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShelvesService, ShelfLocationDto } from '../../../../../core/services/shelves.service';
import { WarehousesService, WarehouseDto } from '../../../../../core/services/warehouses.service';

interface Shelf {
  id: string;
  rack: string;
  shelfNumber: string;
  warehouseId: string;
  warehouseName: string;
  aisle: string;
  zone: string;
  binType: string;
  length: number;
  width: number;
  height: number;
  maxWeight: number;
  capacity: number;
  itemsCount: number;
  status: 'Empty' | 'Low' | 'Partial' | 'Full';
  description: string;
  isActive: boolean;
  createdAt: string;
}

type ModalMode = 'add-edit' | 'detail' | 'delete' | null;

@Component({
  selector: 'app-shelf-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shelf-list.component.html',
  styleUrls: ['./shelf-list.component.scss']
})
export class ShelfListComponent {
  private readonly shelvesService = inject(ShelvesService);
  private readonly warehousesService = inject(WarehousesService);

  selectedWarehouseId = signal('all');
  searchTerm = signal('');
  statusFilter = signal('All');
  page = signal(1);
  pageSize = 10;
  isLoading = signal(false);
  loadError = signal<string | null>(null);
  notification = signal<{ type: string; message: string } | null>(null);
  showModal = signal(false);
  modalMode = signal<ModalMode>(null);
  selectedShelf = signal<Shelf | null>(null);
  shelfToDelete = signal<Shelf | null>(null);

  statuses = ['All', 'Empty', 'Low', 'Partial', 'Full'];
  warehouses = signal<WarehouseDto[]>([]);

  modalForm = {
    rack: '',
    shelfNumber: '',
    aisle: '',
    zone: '',
    binType: '',
    length: 0,
    width: 0,
    height: 0,
    maxWeight: 0,
    capacity: 100,
    description: '',
    isActive: true,
  };

  formErrors = signal<Record<string, string>>({});

  shelves = signal<Shelf[]>([]);

  statusDistribution = computed(() => {
    const s = this.shelves();
    const empty = s.filter(x => x.status === 'Empty').length;
    const low = s.filter(x => x.status === 'Low').length;
    const partial = s.filter(x => x.status === 'Partial').length;
    const full = s.filter(x => x.status === 'Full').length;
    const total = s.length || 1;
    return { empty, low, partial, full, total };
  });

  totalShelves = computed(() => this.shelves().length);
  totalItems = computed(() => this.shelves().reduce((sum, s) => sum + s.itemsCount, 0));
  totalCapacity = computed(() => this.shelves().reduce((sum, s) => sum + s.capacity, 0));
  avgOccupancy = computed(() => {
    const all = this.shelves();
    if (all.length === 0) return 0;
    const total = all.reduce((s, x) => s + (x.capacity > 0 ? (x.itemsCount / x.capacity) * 100 : 0), 0);
    return Math.round(total / all.length);
  });
  activeShelves = computed(() => this.shelves().filter(s => s.isActive).length);
  fullCount = computed(() => this.shelves().filter(s => s.status === 'Full').length);

  filteredShelves = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const status = this.statusFilter();
    const whId = this.selectedWarehouseId();
    return this.shelves().filter(s => {
      const matchesSearch = !search ||
        s.rack.toLowerCase().includes(search) ||
        s.shelfNumber.toLowerCase().includes(search) ||
        s.warehouseName.toLowerCase().includes(search);
      const matchesStatus = status === 'All' || s.status === status;
      const matchesWh = whId === 'all' || s.warehouseId === whId;
      return matchesSearch && matchesStatus && matchesWh;
    });
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredShelves().length / this.pageSize))
  );

  pagedShelves = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredShelves().slice(start, start + this.pageSize);
  });

  groupedByWarehouse = computed(() => {
    const shelves = this.shelves();
    const map = new Map<string, Shelf[]>();
    shelves.forEach(s => {
      const list = map.get(s.warehouseId) || [];
      list.push(s);
      map.set(s.warehouseId, list);
    });
    return Array.from(map.entries()).map(([whId, shelves]) => ({
      warehouseId: whId,
      warehouseName: shelves[0]?.warehouseName || whId,
      shelves,
    }));
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

    this.warehousesService.getAll().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.warehouses.set(response.data);
        }
      },
      error: () => {}
    });

    this.shelvesService.getAll().subscribe({
      next: (response) => {
        if (response.success && response.data && response.data.length > 0) {
          const shelves: Shelf[] = response.data.map((dto: ShelfLocationDto) => ({
            id: dto.id,
            rack: dto.rack || '',
            shelfNumber: dto.shelfNumber || '',
            warehouseId: dto.warehouseId,
            warehouseName: dto.warehouseName,
            aisle: dto.aisle || '',
            zone: dto.zone || '',
            binType: dto.binType || '',
            length: dto.length || 0,
            width: dto.width || 0,
            height: dto.height || 0,
            maxWeight: dto.maxWeight || 0,
            capacity: dto.capacity || 100,
            itemsCount: dto.currentUtilization || 0,
            status: this.calcStatus(dto.currentUtilization || 0, dto.capacity || 100),
            description: dto.description || '',
            isActive: dto.isActive,
            createdAt: dto.createdAt || new Date().toISOString(),
          }));
          this.shelves.set(shelves);
          this.page.set(1);
        }
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        console.error('Error loading shelves:', error);
        this.loadError.set('Failed to load shelves from the server.');
        this.isLoading.set(false);
      },
    });
  }

  private calcStatus(count: number, capacity: number): Shelf['status'] {
    if (count === 0) return 'Empty';
    const pct = count / capacity;
    if (pct <= 0.3) return 'Low';
    if (pct < 1) return 'Partial';
    return 'Full';
  }

  onWarehouseChange(value: string): void {
    this.selectedWarehouseId.set(value);
    this.page.set(1);
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    this.page.set(1);
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.page.set(1);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('All');
    this.selectedWarehouseId.set('all');
    this.page.set(1);
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) {
      this.page.set(p);
    }
  }

  openAddModal(): void {
    this.selectedShelf.set(null);
    this.modalForm = {
      rack: '',
      shelfNumber: '',
      aisle: '',
      zone: '',
      binType: '',
      length: 0,
      width: 0,
      height: 0,
      maxWeight: 0,
      capacity: 100,
      description: '',
      isActive: true,
    };
    this.formErrors.set({});
    this.modalMode.set('add-edit');
    this.showModal.set(true);
  }

  openEditModal(shelf: Shelf): void {
    this.selectedShelf.set(shelf);
    this.modalForm = {
      rack: shelf.rack,
      shelfNumber: shelf.shelfNumber,
      aisle: shelf.aisle,
      zone: shelf.zone,
      binType: shelf.binType,
      length: shelf.length,
      width: shelf.width,
      height: shelf.height,
      maxWeight: shelf.maxWeight,
      capacity: shelf.capacity,
      description: shelf.description,
      isActive: shelf.isActive,
    };
    this.formErrors.set({});
    this.modalMode.set('add-edit');
    this.showModal.set(true);
  }

  openDetailModal(shelf: Shelf): void {
    this.selectedShelf.set(shelf);
    this.modalMode.set('detail');
    this.showModal.set(true);
  }

  openDeleteModal(shelf: Shelf): void {
    this.shelfToDelete.set(shelf);
    this.modalMode.set('delete');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.modalMode.set(null);
    this.selectedShelf.set(null);
    this.shelfToDelete.set(null);
    this.formErrors.set({});
  }

  validateForm(): boolean {
    const errors: Record<string, string> = {};
    if (!this.modalForm.rack.trim()) errors['rack'] = 'Rack is required';
    if (!this.modalForm.shelfNumber.trim()) errors['shelfNumber'] = 'Shelf number is required';
    if (this.modalForm.capacity < 1) errors['capacity'] = 'Capacity must be at least 1';
    this.formErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  saveShelf(): void {
    if (!this.validateForm()) return;
    const data = this.modalForm;
    const editing = this.selectedShelf();
    const wh = this.warehouses().find(w => w.id === this.selectedWarehouseId()) || this.warehouses()[0];

    if (editing) {
      const updated: Shelf = { ...editing,
        rack: data.rack,
        shelfNumber: data.shelfNumber,
        aisle: data.aisle,
        zone: data.zone,
        binType: data.binType,
        length: data.length,
        width: data.width,
        height: data.height,
        maxWeight: data.maxWeight,
        capacity: data.capacity,
        description: data.description,
        isActive: data.isActive,
      };
      this.shelves.update(arr => arr.map(s => s.id === editing.id ? updated : s));
      this.notification.set({ type: 'success', message: `Shelf "${updated.rack}-${updated.shelfNumber}" updated.` });
    } else {
      const newShelf: Shelf = {
        id: 'sh-' + String(Date.now()).slice(-6),
        rack: data.rack,
        shelfNumber: data.shelfNumber,
        warehouseId: wh?.id || 'wh-001',
        warehouseName: wh?.warehouseName || 'Main Warehouse',
        aisle: data.aisle,
        zone: data.zone,
        binType: data.binType,
        length: data.length,
        width: data.width,
        height: data.height,
        maxWeight: data.maxWeight,
        capacity: data.capacity,
        itemsCount: 0,
        status: 'Empty',
        description: data.description,
        isActive: data.isActive,
        createdAt: new Date().toISOString(),
      };
      this.shelves.update(arr => [...arr, newShelf]);
      this.notification.set({ type: 'success', message: `Shelf "${newShelf.rack}-${newShelf.shelfNumber}" created.` });
    }
    this.closeModal();
  }

  confirmDelete(): void {
    const shelf = this.shelfToDelete();
    if (!shelf) return;
    this.shelves.update(arr => arr.filter(s => s.id !== shelf.id));
    this.notification.set({ type: 'success', message: `Shelf "${shelf.rack}-${shelf.shelfNumber}" deleted.` });
    this.closeModal();
    this.page.set(1);
  }

  exportCSV(): void {
    const items = this.filteredShelves();
    const header = 'Rack,Shelf Number,Warehouse,Aisle,Zone,Capacity,Items,Occupancy %,Status,Active,Created';
    const rows = items.map(s =>
      `"${s.rack}","${s.shelfNumber}","${s.warehouseName}","${s.aisle}","${s.zone}",${s.capacity},${s.itemsCount},${s.capacity > 0 ? Math.round(s.itemsCount / s.capacity * 100) : 0},"${s.status}",${s.isActive},"${s.createdAt}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shelves_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.notification.set({ type: 'success', message: `Exported ${items.length} shelves to CSV.` });
  }

  getOccupancyPct(shelf: Shelf): number {
    return shelf.capacity > 0 ? Math.round((shelf.itemsCount / shelf.capacity) * 100) : 0;
  }

  getOccupancyColor(pct: number): string {
    if (pct === 0) return '#6b7280';
    if (pct <= 30) return '#10b981';
    if (pct <= 70) return '#f59e0b';
    if (pct < 100) return '#f97316';
    return '#ef4444';
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      Empty: 'bi-box-seam',
      Low: 'bi-arrow-up-circle',
      Partial: 'bi-exclamation-triangle',
      Full: 'bi-x-octagon',
    };
    return icons[status] || 'bi-question-circle';
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      Empty: 'badge-gray',
      Low: 'badge-green',
      Partial: 'badge-yellow',
      Full: 'badge-red',
    };
    return classes[status] || 'badge-gray';
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

  statusPct(key: 'empty' | 'low' | 'partial' | 'full'): number {
    const d = this.statusDistribution();
    const map: Record<string, number> = { empty: d.empty, low: d.low, partial: d.partial, full: d.full };
    return Math.round((map[key] / d.total) * 100);
  }

  hasActiveFilters(): boolean {
    return this.searchTerm() !== '' || this.statusFilter() !== 'All' || this.selectedWarehouseId() !== 'all';
  }

  itemsPct = computed(() => {
    const cap = this.totalCapacity();
    return cap > 0 ? Math.round((this.totalItems() / cap) * 100) : 0;
  });

  activePct = computed(() => {
    const t = this.totalShelves();
    return t > 0 ? Math.round((this.activeShelves() / t) * 100) : 0;
  });

  donutData = computed(() => {
    const d = this.statusDistribution();
    const entries = [
      { label: 'Empty', value: d.empty, color: '#6b7280' },
      { label: 'Low', value: d.low, color: '#10b981' },
      { label: 'Partial', value: d.partial, color: '#f59e0b' },
      { label: 'Full', value: d.full, color: '#ef4444' },
    ];
    const circumference = 2 * Math.PI * 50;
    let cum = 0;
    return entries.map(e => {
      const pct = e.value / d.total;
      const offset = cum;
      cum += pct * circumference;
      return { ...e, pct: Math.round(pct * 100), offset, circumference };
    });
  });

  whOccupancy = computed(() => {
    const groups = this.groupedByWarehouse();
    return groups.map(g => {
      const totalCap = g.shelves.reduce((s, sh) => s + sh.capacity, 0);
      const totalItems = g.shelves.reduce((s, sh) => s + sh.itemsCount, 0);
      const pct = totalCap > 0 ? Math.round((totalItems / totalCap) * 100) : 0;
      return { name: g.warehouseName, items: totalItems, capacity: totalCap, pct };
    });
  });

  readonly circumference = 2 * Math.PI * 50;

  getDonutOffset(index: number): number {
    return this.donutData()[index]?.offset ?? 0;
  }

  selectedWarehouseName(): string {
    const id = this.selectedWarehouseId();
    if (id === 'all') return 'All Warehouses';
    return this.warehouses().find(w => w.id === id)?.warehouseName || 'Unknown';
  }
}
