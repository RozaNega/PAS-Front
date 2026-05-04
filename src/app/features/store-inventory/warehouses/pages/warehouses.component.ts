import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  searchTerm = signal('');
  statusFilter = signal('All');
  typeFilter = signal('All Types');
  showModal = signal(false);
  selectedWarehouse = signal<Warehouse | null>(null);

  statuses = ['All', 'Active', 'Limited', 'Inactive'];

  warehouses = signal<Warehouse[]>([
    { id: '1', name: 'Warehouse A', code: 'WH-01', location: 'Addis Ababa', items: 5234, value: 1245000, shelves: 24, status: 'Active', type: 'Main Warehouse', maxCapacity: 10000 },
    { id: '2', name: 'Warehouse B', code: 'WH-02', location: 'Addis Ababa', items: 3876, value: 890000, shelves: 18, status: 'Active', type: 'Secondary WH', maxCapacity: 8000 },
    { id: '3', name: 'Warehouse C', code: 'WH-03', location: 'Dire Dawa', items: 2145, value: 450000, shelves: 12, status: 'Limited', type: 'Cold Storage', maxCapacity: 5000 },
    { id: '4', name: 'Storage Unit', code: 'ST-01', location: 'Bole Area', items: 1090, value: 156000, shelves: 8, status: 'Active', type: 'Storage', maxCapacity: 3000 }
  ]);

  modalFormData = signal({
    name: '',
    code: '',
    type: 'Main Warehouse',
    address: '',
    maxCapacity: 10000,
    managerName: '',
    contactPhone: ''
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
    this.filterWarehouses();
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
      name: '',
      code: '',
      type: 'Main Warehouse',
      address: '',
      maxCapacity: 10000,
      managerName: '',
      contactPhone: ''
    });
    this.showModal.set(true);
  }

  openEditModal(warehouse: Warehouse): void {
    this.selectedWarehouse.set(warehouse);
    this.modalFormData.set({
      name: warehouse.name,
      code: warehouse.code,
      type: warehouse.type,
      address: warehouse.location,
      maxCapacity: 10000,
      managerName: '',
      contactPhone: ''
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
      this.warehouses.update(whs =>
        whs.map(w => w.id === editing.id ? { ...w, name: data.name, code: data.code, type: data.type, location: data.address } : w)
      );
    } else {
      const newWarehouse: Warehouse = {
        id: Date.now().toString(),
        name: data.name,
        code: data.code,
        location: data.address,
        items: 0,
        value: 0,
        shelves: 0,
        status: 'Active',
        type: data.type
      };
      this.warehouses.update(whs => [...whs, newWarehouse]);
    }

    this.filterWarehouses();
    this.closeModal();
  }

  deleteWarehouse(id: string): void {
    if (confirm('Are you sure you want to delete this warehouse?')) {
      this.warehouses.update(whs => whs.filter(w => w.id !== id));
      this.filterWarehouses();
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
