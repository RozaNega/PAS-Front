import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface StockItem {
  sku: string;
  name: string;
  category: string;
  warehouse: string;
  shelf: string;
  quantity: number;
  status: 'good' | 'low' | 'critical';
}

interface StockLocation {
  warehouse: string;
  shelfLocation: string;
  quantity: number;
  reserved: number;
  available: number;
}

interface StockMovement {
  date: string;
  type: string;
  quantity: number;
  reference: string;
  user: string;
  balance: number;
}

@Component({
  selector: 'app-current-stock',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './current-stock.component.html',
  styleUrls: ['./current-stock.component.scss']
})
export class CurrentStockComponent {
  // Search and filters
  searchTerm = signal('');
  warehouseFilter = signal('All Warehouses');
  categoryFilter = signal('All Categories');
  statusFilter = signal('All Status');

  // Modal states
  showDetailsModal = signal(false);
  selectedStock = signal<StockItem | null>(null);

  // Summary data
  summary = signal({
    totalItems: 1234,
    totalValue: 2543890,
    totalUnits: 12345,
    lowStock: 4,
    inStock: 1189
  });

  // Stock items data
  stockItems = signal<StockItem[]>([
    { sku: 'LAP-001', name: 'Dell XPS Laptop', category: 'Electronics', warehouse: 'Warehouse A', shelf: 'A-01-S-03', quantity: 45, status: 'good' },
    { sku: 'MON-002', name: 'HP 27" Monitor', category: 'Electronics', warehouse: 'Warehouse A', shelf: 'A-01-S-05', quantity: 67, status: 'good' },
    { sku: 'CHR-003', name: 'Office Chair', category: 'Furniture', warehouse: 'Warehouse B', shelf: 'B-02-S-01', quantity: 23, status: 'low' },
    { sku: 'CAB-004', name: 'USB Cables', category: 'Accessories', warehouse: 'Warehouse A', shelf: 'A-03-S-02', quantity: 5, status: 'critical' },
    { sku: 'PAP-005', name: 'A4 Paper (Box)', category: 'Stationery', warehouse: 'Warehouse B', shelf: 'B-01-S-04', quantity: 120, status: 'good' },
    { sku: 'TON-006', name: 'Toner Cartridge', category: 'Supplies', warehouse: 'Warehouse A', shelf: 'A-02-S-01', quantity: 8, status: 'low' }
  ]);

  // Stock locations for modal
  stockLocations = signal<StockLocation[]>([
    { warehouse: 'Warehouse A', shelfLocation: 'A-01-R-03-S-03', quantity: 35, reserved: 5, available: 30 },
    { warehouse: 'Warehouse B', shelfLocation: 'B-02-R-01-S-02', quantity: 10, reserved: 2, available: 8 }
  ]);

  // Stock movement history
  stockMovements = signal<StockMovement[]>([
    { date: 'Dec 15, 2024', type: '📥 Receiving', quantity: 10, reference: 'GRN-2024-045', user: 'John Doe', balance: 45 },
    { date: 'Dec 14, 2024', type: '📤 Issue', quantity: -3, reference: 'SIV-2024-012', user: 'Sarah Smith', balance: 35 },
    { date: 'Dec 10, 2024', type: '🔄 Transfer', quantity: 5, reference: 'TRF-2024-008', user: 'Mike Wilson', balance: 38 },
    { date: 'Dec 05, 2024', type: '📥 Receiving', quantity: 20, reference: 'GRN-2024-040', user: 'John Doe', balance: 33 }
  ]);

  // Filter options
  warehouses = ['All Warehouses', 'Warehouse A', 'Warehouse B', 'Warehouse C'];
  categories = ['All Categories', 'Electronics', 'Furniture', 'Accessories', 'Stationery', 'Supplies'];
  statuses = ['All Status', 'Good', 'Low', 'Critical'];

  // Filter stock items
  filteredStock = computed(() => {
    let filtered = this.stockItems();
    
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(term) ||
        item.sku.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term)
      );
    }

    if (this.warehouseFilter() !== 'All Warehouses') {
      filtered = filtered.filter(item => item.warehouse === this.warehouseFilter());
    }

    if (this.categoryFilter() !== 'All Categories') {
      filtered = filtered.filter(item => item.category === this.categoryFilter());
    }

    if (this.statusFilter() !== 'All Status') {
      filtered = filtered.filter(item => item.status === this.statusFilter().toLowerCase());
    }

    return filtered;
  });

  // Get status color
  getStatusColor(status: string): string {
    switch (status) {
      case 'good': return 'green';
      case 'low': return 'yellow';
      case 'critical': return 'red';
      default: return 'gray';
    }
  }

  // Get status emoji
  getStatusEmoji(status: string): string {
    switch (status) {
      case 'good': return '🟢';
      case 'low': return '🟡';
      case 'critical': return '🔴';
      default: return '⚪';
    }
  }

  // Format number
  formatNumber(num: number): string {
    return num.toLocaleString();
  }

  // Format value
  formatValue(value: number): string {
    return '$' + value.toLocaleString();
  }

  // Open details modal
  openDetailsModal(item: StockItem) {
    this.selectedStock.set(item);
    this.showDetailsModal.set(true);
  }

  // Close modal
  closeModal() {
    this.showDetailsModal.set(false);
    this.selectedStock.set(null);
  }

  // Export data
  exportData() {
    console.log('Exporting stock data...');
  }

  // Refresh data
  refreshData() {
    console.log('Refreshing stock data...');
  }

  // Apply filters
  applyFilters() {
    // Filter logic is handled by computed property
  }

  // Reset filters
  resetFilters() {
    this.searchTerm.set('');
    this.warehouseFilter.set('All Warehouses');
    this.categoryFilter.set('All Categories');
    this.statusFilter.set('All Status');
  }
}
