import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { WarehousesService, WarehouseDto, CreateWarehouseRequest, UpdateWarehouseRequest } from '../../../../core/services/warehouses.service';
import { pasApiUrlHint } from '../../../../core/config/api-base';

interface Warehouse {
  id: string;
  name: string;
  code: string;
  location: string;
  items: number;
  value: number;
  shelves: number;
  status: 'Active' | 'Limited' | 'Inactive';
  type: string;
  maxCapacity?: number;
}

@Component({
  selector: 'app-warehouses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './warehouses.component.html',
  styleUrls: ['./warehouses.component.scss']
})
export class WarehousesComponent {
  readonly warehousesService = inject(WarehousesService);
  readonly apiConnectionHint = pasApiUrlHint();
  searchTerm = signal('');
  statusFilter = signal('All');
  typeFilter = signal('All Types');
  showModal = signal(false);
  selectedWarehouse = signal<Warehouse | null>(null);
  isLoading = signal(false);

  statuses = ['All', 'Active', 'Limited', 'Inactive'];

  warehouses = signal<Warehouse[]>([]);
  loadError = signal<string | null>(null);

  modalFormData = {
    warehouseName: '',
    locationCode: '',
    address: '',
    city: '',
    country: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: ''
  };

  // Computed properties for summary
  activeWarehouseCount = computed(() => this.warehouses().filter((w) => w.status === 'Active').length);

  totalItems = computed(() => {
    return this.warehouses().reduce((sum, wh) => sum + wh.items, 0);
  });

  totalValue = computed(() => {
    return this.warehouses().reduce((sum, wh) => sum + wh.value, 0);
  });

  totalShelves = computed(() => {
    return this.warehouses().reduce((sum, wh) => sum + wh.shelves, 0);
  });

  avgOccupancy = computed(() => {
    const whs = this.warehouses();
    if (whs.length === 0) return 0;
    const totalOccupancy = whs.reduce((sum, wh) => {
      const capacity = wh.maxCapacity || 10000;
      const occupancy = (wh.items / capacity) * 100;
      return sum + occupancy;
    }, 0);
    return Math.round(totalOccupancy / whs.length);
  });

  filteredWarehouses = signal<Warehouse[]>([]);

  constructor() {
    this.loadWarehouses();
  }

  loadWarehouses(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.warehousesService.getAll().subscribe({
      next: (response) => {
        const rows = Array.isArray(response.data) ? response.data : [];
        this.warehouses.set(
          rows.map((wh) => ({
            id: wh.id,
            name: wh.warehouseName,
            code: wh.warehouseCode,
            location: wh.location || '',
            items: wh.currentUtilization ?? 0,
            value: 0,
            shelves: 0,
            status: wh.isActive ? 'Active' : 'Inactive',
            type: 'Warehouse',
            maxCapacity: wh.capacity ?? 10000,
          })),
        );
        if (rows.length === 0) {
          this.loadError.set(
            response.success === false
              ? response.message || 'No warehouses returned from the API.'
              : 'No warehouses in the database yet.',
          );
        } else {
          this.loadError.set(null);
        }
        this.filterWarehouses();
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        console.error('Error loading warehouses:', error);
        let msg = 'Failed to reach the server.';
        if (error instanceof HttpErrorResponse) {
          if (error.status === 0) {
            msg = 'Cannot reach the API (network). Is the backend running on port 5028?';
          } else {
            msg = `HTTP ${error.status}: ${error.message || 'request failed'}.`;
          }
        }
        this.loadError.set(msg);
        this.warehouses.set([]);
        this.filterWarehouses();
        this.isLoading.set(false);
      },
    });
  }

  filterWarehouses(): void {
    const search = this.searchTerm().toLowerCase();
    const status = this.statusFilter();
    const type = this.typeFilter();

    this.filteredWarehouses.set(
      this.warehouses().filter(wh => {
        const matchesSearch = wh.name.toLowerCase().includes(search) || wh.code.toLowerCase().includes(search) || wh.location.toLowerCase().includes(search);
        const matchesStatus = status === 'All' || wh.status === status;
        const matchesType = type === 'All Types' || wh.type === type;
        return matchesSearch && matchesStatus && matchesType;
      })
    );
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.filterWarehouses();
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.filterWarehouses();
  }

  onTypeFilterChange(value: string): void {
    this.typeFilter.set(value);
    this.filterWarehouses();
  }

  openAddModal(): void {
    this.selectedWarehouse.set(null);
    this.modalFormData = {
      warehouseName: '',
      locationCode: '',
      address: '',
      city: '',
      country: '',
      contactPerson: '',
      contactPhone: '',
      contactEmail: ''
    };
    this.showModal.set(true);
  }

  openEditModal(warehouse: Warehouse): void {
    this.selectedWarehouse.set(warehouse);
    this.modalFormData = {
      warehouseName: warehouse.name,
      locationCode: warehouse.code,
      address: warehouse.location,
      city: '',
      country: '',
      contactPerson: '',
      contactPhone: '',
      contactEmail: ''
    };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedWarehouse.set(null);
  }

  saveWarehouse(): void {
    const data = this.modalFormData;
    const editing = this.selectedWarehouse();

    if (editing) {
      const payload: UpdateWarehouseRequest = {
        id: editing.id,
        warehouseName: data.warehouseName,
        warehouseCode: data.locationCode || editing.code,
        location: data.address || editing.location,
        isActive: editing.status !== 'Inactive',
      };
      this.warehousesService.update(payload).subscribe({
        next: (res) => {
          if (res.success !== false) {
            this.warehouses.update((whs) =>
              whs.map((w) =>
                w.id === editing.id
                  ? { ...w, name: data.warehouseName, code: payload.warehouseCode ?? w.code, location: payload.location ?? w.location }
                  : w,
              ),
            );
            this.filterWarehouses();
            this.closeModal();
          } else {
            alert(res.message || 'Update failed');
          }
        },
        error: (error) => {
          console.error('Error updating warehouse:', error);
          if (error.status !== 401) {
            alert('Failed to update warehouse: ' + (error.error?.message || error.message || 'Server error'));
          }
        },
      });
    } else {
      const createPayload: CreateWarehouseRequest = {
        warehouseName: data.warehouseName,
        warehouseCode: data.locationCode || `WH-${Date.now()}`,
        location: data.address || '—',
        description: [data.city, data.country].filter(Boolean).join(', ') || undefined,
        managerName: data.contactPerson || undefined,
        contactNumber: data.contactPhone || undefined,
      };
      this.warehousesService.create(createPayload).subscribe({
        next: (response) => {
          if (response.success !== false) {
            const newId = typeof response.data === 'string' && response.data ? response.data : crypto.randomUUID();
            const newWarehouse: Warehouse = {
              id: newId || crypto.randomUUID(),
              name: data.warehouseName,
              code: createPayload.warehouseCode,
              location: createPayload.location,
              items: 0,
              value: 0,
              shelves: 0,
              status: 'Active',
              type: 'Warehouse',
            };
            this.warehouses.update((whs) => [...whs, newWarehouse]);
            this.filterWarehouses();
            this.closeModal();
          } else {
            alert('Failed to create warehouse: ' + (response.message || 'Unknown error'));
          }
        },
        error: (error) => {
          console.error('Error creating warehouse:', error);
          if (error.status !== 401) {
            alert('Failed to create warehouse: ' + (error.error?.message || error.message || 'Server error'));
          }
        },
      });
    }
  }

  deleteWarehouse(id: string): void {
    if (confirm('Are you sure you want to delete this warehouse?')) {
      this.warehousesService.delete(id).subscribe({
        next: (res) => {
          if (res.success !== false) {
            this.warehouses.update((whs) => whs.filter((w) => w.id !== id));
            this.filterWarehouses();
          } else {
            alert(res.message || 'Delete failed');
          }
        },
        error: (error) => {
          console.error('Error deleting warehouse:', error);
          if (error.status !== 401) {
            alert('Failed to delete warehouse: ' + (error.error?.message || error.message || 'Server error'));
          }
        },
      });
    }
  }

  formatValue(value: number): string {
    if (value >= 1000000) {
      return '$' + (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return '$' + (value / 1000).toFixed(0) + 'K';
    }
    return '$' + value.toString();
  }

  formatNumber(value: number): string {
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      Active: 'green',
      Limited: 'yellow',
      Inactive: 'gray'
    };
    return colors[status] || 'gray';
  }
}
