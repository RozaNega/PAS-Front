import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Shelf {
  aisle: string;
  rack: string;
  items: number;
  value: number;
  occupancy: number;
  status: string;
  lastUpdated: string;
}

@Component({
  selector: 'app-warehouse-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './warehouse-view.component.html',
  styleUrls: ['./warehouse-view.component.scss']
})
export class WarehouseViewComponent {
  selectedWarehouse = signal('Warehouse A');
  viewMode = signal('grid');
  warehouses = ['Warehouse A', 'Warehouse B', 'Warehouse C', 'Warehouse D'];

  shelves = signal<Shelf[]>([
    { aisle: 'A-01', rack: 'R-01', items: 234, value: 45678, occupancy: 78, status: '🟢', lastUpdated: 'Dec 15, 2024' },
    { aisle: 'A-01', rack: 'R-02', items: 189, value: 34567, occupancy: 63, status: '🟢', lastUpdated: 'Dec 14, 2024' },
    { aisle: 'A-01', rack: 'R-03', items: 98, value: 12345, occupancy: 33, status: '🟡', lastUpdated: 'Dec 13, 2024' },
    { aisle: 'A-01', rack: 'R-04', items: 156, value: 8901, occupancy: 52, status: '🟢', lastUpdated: 'Dec 15, 2024' },
    { aisle: 'A-02', rack: 'R-01', items: 67, value: 4567, occupancy: 22, status: '🟡', lastUpdated: 'Dec 12, 2024' },
    { aisle: 'A-02', rack: 'R-02', items: 34, value: 2345, occupancy: 11, status: '🔴', lastUpdated: 'Dec 10, 2024' }
  ]);

  showWarehouseDetailsModal = signal(false);

  onWarehouseChange(value: string): void {
    this.selectedWarehouse.set(value);
  }

  setViewMode(mode: string): void {
    this.viewMode.set(mode);
  }

  openWarehouseDetailsModal(): void {
    this.showWarehouseDetailsModal.set(true);
  }

  closeWarehouseDetailsModal(): void {
    this.showWarehouseDetailsModal.set(false);
  }

  viewShelf(shelf: Shelf): void {
    console.log('View shelf:', shelf.aisle, shelf.rack);
  }

  editShelf(shelf: Shelf): void {
    console.log('Edit shelf:', shelf.aisle, shelf.rack);
  }

  viewItems(shelf: Shelf): void {
    console.log('View items:', shelf.aisle, shelf.rack);
  }

  printShelf(shelf: Shelf): void {
    console.log('Print shelf:', shelf.aisle, shelf.rack);
  }

  addShelf(): void {
    console.log('Add shelf');
  }

  rearrangeShelves(): void {
    console.log('Rearrange shelves');
  }

  exportData(): void {
    console.log('Export data');
  }

  printLayout(): void {
    console.log('Print layout');
  }

  scanQRCode(): void {
    console.log('Scan QR code');
  }

  getOccupancyBar(occupancy: number): string {
    const filled = Math.floor(occupancy / 10);
    return '█'.repeat(filled) + '░'.repeat(8 - filled);
  }

  getOccupancyColor(occupancy: number): string {
    if (occupancy >= 70) return 'green';
    if (occupancy >= 30) return 'yellow';
    return 'red';
  }
}
