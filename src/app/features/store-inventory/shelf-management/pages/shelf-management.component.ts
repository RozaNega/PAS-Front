import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Shelf {
  code: string;
  location: string;
  items: number;
  value: number;
  occupancy: number;
  category: string;
}

@Component({
  selector: 'app-shelf-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shelf-management.component.html',
  styleUrls: ['./shelf-management.component.scss']
})
export class ShelfManagementComponent {
  selectedWarehouse = signal('Warehouse A');
  selectedAisle = signal('All Aisles');
  searchTerm = signal('');

  warehouses = ['Warehouse A', 'Warehouse B', 'Warehouse C'];
  aisles = ['All Aisles', 'A-01', 'A-02', 'B-01', 'B-02', 'C-01'];

  shelves = signal<Shelf[]>([
    { code: 'A-01-R-01', location: 'Aisle A, Rack 01', items: 234, value: 45678, occupancy: 78, category: 'Electronics' },
    { code: 'A-01-R-02', location: 'Aisle A, Rack 02', items: 189, value: 34567, occupancy: 63, category: 'Electronics' },
    { code: 'A-01-R-03', location: 'Aisle A, Rack 03', items: 98, value: 12345, occupancy: 33, category: 'Furniture' },
    { code: 'A-02-R-01', location: 'Aisle A, Rack 04', items: 156, value: 8901, occupancy: 52, category: 'Supplies' },
    { code: 'B-01-R-01', location: 'Aisle B, Rack 01', items: 67, value: 4567, occupancy: 22, category: 'Stationery' },
    { code: 'B-01-R-02', location: 'Aisle B, Rack 02', items: 34, value: 2345, occupancy: 11, category: 'Stationery' }
  ]);

  showAddShelfModal = signal(false);
  showShelfDetailsModal = signal(false);
  showRearrangeModal = signal(false);
  showMoveItemsModal = signal(false);
  selectedShelf = signal<Shelf | null>(null);

  onWarehouseChange(value: string): void {
    this.selectedWarehouse.set(value);
  }

  onAisleChange(value: string): void {
    this.selectedAisle.set(value);
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  openAddShelfModal(): void {
    this.showAddShelfModal.set(true);
  }

  closeAddShelfModal(): void {
    this.showAddShelfModal.set(false);
  }

  openShelfDetailsModal(shelf: Shelf): void {
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

  viewShelf(shelf: Shelf): void {
    console.log('View shelf:', shelf.code);
  }

  editShelf(shelf: Shelf): void {
    console.log('Edit shelf:', shelf.code);
  }

  viewItems(shelf: Shelf): void {
    console.log('View items:', shelf.code);
  }

  printShelf(shelf: Shelf): void {
    console.log('Print shelf:', shelf.code);
  }

  deleteShelf(shelf: Shelf): void {
    console.log('Delete shelf:', shelf.code);
  }

  createShelf(): void {
    console.log('Create shelf');
    this.closeAddShelfModal();
  }

  rearrangeShelves(): void {
    console.log('Rearrange shelves');
    this.closeRearrangeModal();
  }

  moveItems(): void {
    console.log('Move items');
    this.closeMoveItemsModal();
  }

  getOccupancyBar(occupancy: number): string {
    const filled = Math.floor(occupancy / 10);
    return '█'.repeat(filled) + '░'.repeat(8 - filled);
  }

  getOccupancyColor(occupancy: number): string {
    if (occupancy >= 50) return 'green';
    if (occupancy >= 10) return 'yellow';
    return 'red';
  }
}
