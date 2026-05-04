import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface LowStockItem {
  id: string;
  severity: 'Critical' | 'Warning' | 'Info';
  name: string;
  sku: string;
  current: number;
  minStock: number;
  deficit: number;
  location: string;
  lastOrder: string;
  daysUntilEmpty: string;
  daysOverdue: string;
}

@Component({
  selector: 'app-low-stock',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './low-stock.component.html',
  styleUrls: ['./low-stock.component.scss']
})
export class LowStockComponent {
  alertThreshold = signal('Show items below min stock');
  warehouseFilter = signal('All Warehouses');
  categoryFilter = signal('All Categories');

  warehouses = ['All Warehouses', 'Warehouse A', 'Warehouse B', 'Warehouse C'];
  categories = ['All Categories', 'Electronics', 'Supplies', 'Furniture'];

  criticalAlerts = signal<LowStockItem[]>([
    {
      id: '1',
      severity: 'Critical',
      name: 'USB Cables',
      sku: 'CAB-004',
      current: 5,
      minStock: 50,
      deficit: -45,
      location: 'Warehouse A - Aisle 5 - Shelf B-03',
      lastOrder: 'Nov 15, 2024 (30 days ago)',
      daysUntilEmpty: '2 days',
      daysOverdue: '15 days'
    }
  ]);

  warningAlerts = signal<LowStockItem[]>([
    {
      id: '2',
      severity: 'Warning',
      name: 'Printer Paper',
      sku: 'PAP-005',
      current: 8,
      minStock: 20,
      deficit: -12,
      location: 'Warehouse B - Aisle 2 - Shelf A-01',
      lastOrder: 'Nov 20, 2024 (25 days ago)',
      daysUntilEmpty: '5 days',
      daysOverdue: '5 days'
    },
    {
      id: '3',
      severity: 'Warning',
      name: 'Toner Cartridge (Black)',
      sku: 'TON-006',
      current: 3,
      minStock: 10,
      deficit: -7,
      location: 'Warehouse A - Aisle 3 - Shelf C-02',
      lastOrder: 'Nov 18, 2024 (27 days ago)',
      daysUntilEmpty: '3 days',
      daysOverdue: '7 days'
    }
  ]);

  allLowStock = signal<LowStockItem[]>([
    { id: '1', severity: 'Critical', name: 'USB Cables', sku: 'CAB-004', current: 5, minStock: 50, deficit: -45, location: 'Warehouse A - Aisle 5 - Shelf B-03', lastOrder: 'Nov 15, 2024', daysUntilEmpty: '2 days', daysOverdue: '15 days' },
    { id: '2', severity: 'Warning', name: 'Printer Paper', sku: 'PAP-005', current: 8, minStock: 20, deficit: -12, location: 'Warehouse B - Aisle 2 - Shelf A-01', lastOrder: 'Nov 20, 2024', daysUntilEmpty: '5 days', daysOverdue: '5 days' },
    { id: '3', severity: 'Warning', name: 'Toner Cartridge (Black)', sku: 'TON-006', current: 3, minStock: 10, deficit: -7, location: 'Warehouse A - Aisle 3 - Shelf C-02', lastOrder: 'Nov 18, 2024', daysUntilEmpty: '3 days', daysOverdue: '7 days' },
    { id: '4', severity: 'Info', name: 'A4 Notebooks', sku: 'NOT-007', current: 45, minStock: 50, deficit: -5, location: 'Warehouse C - Aisle 1 - Shelf A-05', lastOrder: 'Nov 22, 2024', daysUntilEmpty: '15 days', daysOverdue: '0 days' }
  ]);

  showModal = signal(false);
  selectedItem = signal<LowStockItem | null>(null);

  categoryAnalysis = signal([
    { name: 'Electronics', items: 2, percentage: 100 },
    { name: 'Supplies', items: 1, percentage: 50 },
    { name: 'Furniture', items: 1, percentage: 50 }
  ]);

  warehouseAnalysis = signal([
    { name: 'Warehouse A', items: 3, percentage: 100 },
    { name: 'Warehouse B', items: 1, percentage: 33 }
  ]);

  refreshData(): void {
    console.log('Refreshing low stock data...');
  }

  openOrderModal(item: LowStockItem): void {
    this.selectedItem.set(item);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedItem.set(null);
  }

  createOrder(): void {
    console.log('Creating purchase order for:', this.selectedItem()?.name);
    this.closeModal();
  }

  getSeverityIcon(severity: string): string {
    const icons: { [key: string]: string } = {
      Critical: '🔴',
      Warning: '🟡',
      Info: '🔵'
    };
    return icons[severity] || '⚪';
  }

  getSeverityClass(severity: string): string {
    const classes: { [key: string]: string } = {
      Critical: 'critical',
      Warning: 'warning',
      Info: 'info'
    };
    return classes[severity] || '';
  }
}
