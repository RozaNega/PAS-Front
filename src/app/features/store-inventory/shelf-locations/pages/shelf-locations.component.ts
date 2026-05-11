import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../../../core/services/inventory.service';

interface Shelf {
  id: string;
  aisle: string;
  rack: string;
  shelf: string;
  items: number;
  value: number;
  occupancy: number;
}

@Component({
  selector: 'app-shelf-locations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shelf-locations.component.html',
  styleUrls: ['./shelf-locations.component.scss']
})
export class ShelfLocationsComponent {
  readonly inventoryService = inject(InventoryService);
  selectedWarehouse = signal('Warehouse A');
  searchTerm = signal('');
  aisleFilter = signal('All Aisles');
  showModal = signal(false);
  selectedShelf = signal<Shelf | null>(null);
  isLoading = signal(false);

  warehouses = ['Warehouse A', 'Warehouse B', 'Warehouse C', 'Storage'];

  shelves = signal<Shelf[]>([
    { id: '1', aisle: 'A-01', rack: 'R-01', shelf: 'S-01', items: 234, value: 45678, occupancy: 80 },
    { id: '2', aisle: 'A-01', rack: 'R-01', shelf: 'S-02', items: 189, value: 34567, occupancy: 70 },
    { id: '3', aisle: 'A-01', rack: 'R-01', shelf: 'S-03', items: 156, value: 28901, occupancy: 60 },
    { id: '4', aisle: 'A-01', rack: 'R-02', shelf: 'S-01', items: 98, value: 12345, occupancy: 40 },
    { id: '5', aisle: 'A-02', rack: 'R-01', shelf: 'S-01', items: 67, value: 8901, occupancy: 30 },
    { id: '6', aisle: 'A-01', rack: 'R-02', shelf: 'S-02', items: 34, value: 4567, occupancy: 20 },
    { id: '7', aisle: 'A-01', rack: 'R-02', shelf: 'S-03', items: 23, value: 2345, occupancy: 15 },
    { id: '8', aisle: 'A-01', rack: 'R-02', shelf: 'S-04', items: 12, value: 1234, occupancy: 10 },
    { id: '9', aisle: 'A-02', rack: 'R-01', shelf: 'S-02', items: 5, value: 567, occupancy: 5 }
  ]);

  modalFormData = signal({
    aisle: 'A-01',
    rack: 'R-01',
    shelfNumber: 'S-01',
    shelfType: 'Standard',
    qrValue: '',
    maxCapacity: 100,
    maxWeight: 500,
    categoryRestriction: 'All Categories'
  });

  // Computed properties for summary
  totalShelves = computed(() => {
    return this.shelves().length;
  });

  totalItems = computed(() => {
    return this.shelves().reduce((sum, shelf) => sum + shelf.items, 0);
  });

  totalValue = computed(() => {
    return this.shelves().reduce((sum, shelf) => sum + shelf.value, 0);
  });

  avgOccupancy = computed(() => {
    const shelves = this.shelves();
    if (shelves.length === 0) return 0;
    const totalOccupancy = shelves.reduce((sum, shelf) => sum + shelf.occupancy, 0);
    return Math.round(totalOccupancy / shelves.length);
  });

  emptyShelves = computed(() => {
    return this.shelves().filter(shelf => shelf.items === 0).length;
  });

  filteredShelves = signal<Shelf[]>([]);

  constructor() {
    this.loadShelves();
  }

  loadShelves(): void {
    this.isLoading.set(true);
    this.inventoryService.getAllShelves().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.shelves.set(response.data.map(shelf => ({
            id: shelf.id,
            aisle: shelf.aisle || '',
            rack: shelf.rack || '',
            shelf: shelf.shelfNumber || '',
            items: 0,
            value: 0,
            occupancy: 0
          })));
          this.filterShelves();
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading shelves:', error);
        this.isLoading.set(false);
      }
    });
  }

  filterShelves(): void {
    const search = this.searchTerm().toLowerCase();

    this.filteredShelves.set(
      this.shelves().filter(shelf => {
        const matchesSearch = shelf.aisle.toLowerCase().includes(search) || 
                              shelf.rack.toLowerCase().includes(search) || 
                              shelf.shelf.toLowerCase().includes(search);
        return matchesSearch;
      })
    );
  }

  onWarehouseChange(value: string): void {
    this.selectedWarehouse.set(value);
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

  openAddModal(): void {
    this.selectedShelf.set(null);
    const nextShelfNum = this.shelves().length + 1;
    this.modalFormData.set({
      aisle: 'A-01',
      rack: 'R-01',
      shelfNumber: `S-${nextShelfNum.toString().padStart(2, '0')}`,
      shelfType: 'Standard',
      qrValue: `${this.selectedWarehouse().split(' ')[1]}-A01-R01-S${nextShelfNum.toString().padStart(2, '0')}`,
      maxCapacity: 100,
      maxWeight: 500,
      categoryRestriction: 'All Categories'
    });
    this.showModal.set(true);
  }

  openEditModal(shelf: Shelf): void {
    this.selectedShelf.set(shelf);
    this.modalFormData.set({
      aisle: shelf.aisle,
      rack: shelf.rack,
      shelfNumber: shelf.shelf,
      shelfType: 'Standard',
      qrValue: `${this.selectedWarehouse().split(' ')[1]}-${shelf.aisle}-${shelf.rack}-${shelf.shelf}`,
      maxCapacity: 100,
      maxWeight: 500,
      categoryRestriction: 'All Categories'
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedShelf.set(null);
  }

  saveShelf(): void {
    const data = this.modalFormData();
    const editing = this.selectedShelf();

    if (editing) {
      this.inventoryService.updateShelf(editing.id, {
        warehouseId: this.selectedWarehouse(),
        aisle: data.aisle,
        rack: data.rack,
        shelfNumber: data.shelfNumber,
        zone: '',
        binType: data.shelfType,
        capacity: data.maxCapacity
      }).subscribe({
        next: () => {
          this.shelves.update(shelves =>
            shelves.map(s => s.id === editing.id ? { ...s, aisle: data.aisle, rack: data.rack, shelf: data.shelfNumber } : s)
          );
          this.filterShelves();
          this.closeModal();
        },
        error: (error) => {
          console.error('Error updating shelf:', error);
          alert('Failed to update shelf');
        }
      });
    } else {
      this.inventoryService.createShelf({
        warehouseId: this.selectedWarehouse(),
        aisle: data.aisle,
        rack: data.rack,
        shelfNumber: data.shelfNumber,
        zone: '',
        binType: data.shelfType,
        capacity: data.maxCapacity
      }).subscribe({
        next: (response) => {
          if (response.success) {
            const newShelf: Shelf = {
              id: response.data || Date.now().toString(),
              aisle: data.aisle,
              rack: data.rack,
              shelf: data.shelfNumber,
              items: 0,
              value: 0,
              occupancy: 0
            };
            this.shelves.update(shelves => [...shelves, newShelf]);
            this.filterShelves();
            this.closeModal();
          }
        },
        error: (error) => {
          console.error('Error creating shelf:', error);
          alert('Failed to create shelf');
        }
      });
    }
  }

  deleteShelf(id: string): void {
    if (confirm('Are you sure you want to delete this shelf?')) {
      this.inventoryService.deleteShelf(id).subscribe({
        next: () => {
          this.shelves.update(shelves => shelves.filter(s => s.id !== id));
          this.filterShelves();
        },
        error: (error) => {
          console.error('Error deleting shelf:', error);
          alert('Failed to delete shelf');
        }
      });
    }
  }

  formatValue(value: number): string {
    if (value >= 1000) {
      return '$' + (value / 1000).toFixed(0) + 'K';
    }
    return '$' + value.toString();
  }
}
