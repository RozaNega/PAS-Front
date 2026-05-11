import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../../../core/services/inventory.service';

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
  readonly inventoryService = inject(InventoryService);
  searchTerm = signal('');
  statusFilter = signal('All');
  typeFilter = signal('All Types');
  showModal = signal(false);
  selectedWarehouse = signal<Warehouse | null>(null);
  isLoading = signal(false);

  statuses = ['All', 'Active', 'Limited', 'Inactive'];

  warehouses = signal<Warehouse[]>([
    { id: '1', name: 'Warehouse A', code: 'WH-01', location: 'Addis Ababa', items: 5234, value: 1245000, shelves: 24, status: 'Active', type: 'Main Warehouse', maxCapacity: 10000 },
    { id: '2', name: 'Warehouse B', code: 'WH-02', location: 'Addis Ababa', items: 3876, value: 890000, shelves: 18, status: 'Active', type: 'Secondary WH', maxCapacity: 8000 },
    { id: '3', name: 'Warehouse C', code: 'WH-03', location: 'Dire Dawa', items: 2145, value: 450000, shelves: 12, status: 'Limited', type: 'Cold Storage', maxCapacity: 5000 },
    { id: '4', name: 'Storage Unit', code: 'ST-01', location: 'Bole Area', items: 1090, value: 156000, shelves: 8, status: 'Active', type: 'Storage', maxCapacity: 3000 }
  ]);

  modalFormData = signal({
    warehouseName: '',
    locationCode: '',
    address: '',
    city: '',
    country: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: ''
  });

  // Computed properties for summary
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
    this.inventoryService.getAllWarehouses().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.warehouses.set(response.data.map(wh => ({
            id: wh.id,
            name: wh.name,
            code: wh.id.substring(0, 8).toUpperCase(),
            location: wh.location || '',
            items: 0,
            value: 0,
            shelves: 0,
            status: wh.isActive ? 'Active' : 'Inactive',
            type: 'Main Warehouse',
            maxCapacity: 10000
          })));
          this.filterWarehouses();
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading warehouses:', error);
        this.isLoading.set(false);
      }
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
    this.modalFormData.set({
      warehouseName: '',
      locationCode: '',
      address: '',
      city: '',
      country: '',
      contactPerson: '',
      contactPhone: '',
      contactEmail: ''
    });
    this.showModal.set(true);
  }

  openEditModal(warehouse: Warehouse): void {
    this.selectedWarehouse.set(warehouse);
    this.modalFormData.set({
      warehouseName: warehouse.name,
      locationCode: warehouse.code,
      address: warehouse.location,
      city: '',
      country: '',
      contactPerson: '',
      contactPhone: '',
      contactEmail: ''
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedWarehouse.set(null);
  }

  saveWarehouse(): void {
    const data = this.modalFormData();
    const editing = this.selectedWarehouse();

    if (editing) {
      this.inventoryService.updateWarehouse(editing.id, {
        WarehouseName: data.warehouseName,
        LocationCode: data.locationCode,
        Address: data.address,
        City: data.city,
        Country: data.country,
        ContactPerson: data.contactPerson,
        ContactPhone: data.contactPhone,
        ContactEmail: data.contactEmail
      }).subscribe({
        next: () => {
          this.warehouses.update(whs =>
            whs.map(w => w.id === editing.id ? { ...w, name: data.warehouseName, code: data.locationCode, location: data.address } : w)
          );
          this.filterWarehouses();
          this.closeModal();
        },
        error: (error) => {
          console.error('Error updating warehouse:', error);
          if (error.status !== 401) {
            alert('Failed to update warehouse: ' + (error.error?.message || error.message || 'Server error'));
          }
        }
      });
    } else {
      this.inventoryService.createWarehouse({
        WarehouseName: data.warehouseName,
        LocationCode: data.locationCode,
        Address: data.address,
        City: data.city,
        Country: data.country,
        ContactPerson: data.contactPerson,
        ContactPhone: data.contactPhone,
        ContactEmail: data.contactEmail
      }).subscribe({
        next: (response) => {
          if (response.success) {
            const newWarehouse: Warehouse = {
              id: response.data || Date.now().toString(),
              name: data.warehouseName,
              code: data.locationCode,
              location: data.address,
              items: 0,
              value: 0,
              shelves: 0,
              status: 'Active',
              type: 'Main Warehouse'
            };
            this.warehouses.update(whs => [...whs, newWarehouse]);
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
        }
      });
    }
  }

  deleteWarehouse(id: string): void {
    if (confirm('Are you sure you want to delete this warehouse?')) {
      this.inventoryService.deleteWarehouse(id).subscribe({
        next: () => {
          this.warehouses.update(whs => whs.filter(w => w.id !== id));
          this.filterWarehouses();
        },
        error: (error) => {
          console.error('Error deleting warehouse:', error);
          if (error.status !== 401) {
            alert('Failed to delete warehouse: ' + (error.error?.message || error.message || 'Server error'));
          }
        }
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
