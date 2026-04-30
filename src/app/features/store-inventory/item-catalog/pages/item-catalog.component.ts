import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Item {
  sku: string;
  name: string;
  category: string;
  uom: string;
  minStock: number;
  currentStock: number;
  status: 'Active' | 'Low Stock' | 'Out of Stock';
  price: number;
}

interface StockLocation {
  warehouse: string;
  shelfLocation: string;
  quantity: number;
  reserved: number;
  available: number;
}

interface Movement {
  date: string;
  type: string;
  quantity: number;
  reference: string;
  user: string;
  balance: number;
}

@Component({
  selector: 'app-item-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './item-catalog.component.html',
  styleUrls: ['./item-catalog.component.scss']
})
export class ItemCatalogComponent {
  searchTerm = signal('');
  categoryFilter = signal('All Categories');
  statusFilter = signal('All Status');
  sortBy = signal('Name');
  viewMode = signal('table'); // 'card' or 'table'

  categories = ['All Categories', 'Electronics', 'Furniture', 'Stationery', 'Supplies', 'IT Equipment', 'Accessories'];
  statuses = ['All Status', 'Active', 'Low Stock', 'Out of Stock'];
  sortOptions = ['Name', 'SKU', 'Category', 'Stock', 'Price'];

  items = signal<Item[]>([
    { sku: 'LAP-001', name: 'Dell XPS Laptop', category: 'Electronics', uom: 'PCS', minStock: 10, currentStock: 45, status: 'Active', price: 2499 },
    { sku: 'MON-002', name: 'HP 27" Monitor', category: 'Electronics', uom: 'PCS', minStock: 15, currentStock: 67, status: 'Active', price: 350 },
    { sku: 'CHR-003', name: 'Office Chair', category: 'Furniture', uom: 'PCS', minStock: 50, currentStock: 23, status: 'Low Stock', price: 450 },
    { sku: 'CAB-004', name: 'USB Cables', category: 'Accessories', uom: 'PCS', minStock: 50, currentStock: 5, status: 'Out of Stock', price: 5 },
    { sku: 'PAP-005', name: 'A4 Paper', category: 'Stationery', uom: 'BOX', minStock: 100, currentStock: 120, status: 'Active', price: 25 },
    { sku: 'TON-006', name: 'Toner Cartridge', category: 'Supplies', uom: 'PCS', minStock: 20, currentStock: 8, status: 'Low Stock', price: 75 },
    { sku: 'SER-007', name: 'Server Rack', category: 'IT Equipment', uom: 'PCS', minStock: 5, currentStock: 8, status: 'Active', price: 2800 },
    { sku: 'SWI-008', name: 'Cisco Switch', category: 'Networking', uom: 'PCS', minStock: 10, currentStock: 12, status: 'Active', price: 1200 }
  ]);

  showItemModal = signal(false);
  showAddModal = signal(false);
  showBulkImportModal = signal(false);
  selectedItem = signal<Item | null>(null);

  // Computed summary statistics
  totalItems = computed(() => this.items().length);
  activeItems = computed(() => this.items().filter(i => i.status === 'Active').length);
  categoryCount = computed(() => 45);
  lowStockItems = computed(() => this.items().filter(i => i.status === 'Low Stock').length);
  outOfStockItems = computed(() => this.items().filter(i => i.status === 'Out of Stock').length);

  filteredItems = signal<Item[]>([]);

  // Stock locations for selected item
  stockLocations = signal<StockLocation[]>([
    { warehouse: 'Warehouse A', shelfLocation: 'A-01-R-03-S-03', quantity: 35, reserved: 3, available: 32 },
    { warehouse: 'Warehouse B', shelfLocation: 'B-02-R-01-S-02', quantity: 10, reserved: 2, available: 8 }
  ]);

  // Recent movements for selected item
  recentMovements = signal<Movement[]>([
    { date: 'Dec 15, 2024', type: '📥 Receiving', quantity: 10, reference: 'GRN-2024-045', user: 'John Doe', balance: 45 },
    { date: 'Dec 14, 2024', type: '📤 Issue', quantity: -3, reference: 'SIV-2024-012', user: 'Sarah Smith', balance: 35 },
    { date: 'Dec 10, 2024', type: '🔄 Transfer', quantity: 5, reference: 'TRF-2024-008', user: 'Mike Wilson', balance: 38 }
  ]);

  constructor() {
    this.filterItems();
  }

  filterItems(): void {
    const search = this.searchTerm().toLowerCase();
    const category = this.categoryFilter();
    const status = this.statusFilter();

    this.filteredItems.set(
      this.items().filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(search) || 
                              item.sku.toLowerCase().includes(search) ||
                              item.category.toLowerCase().includes(search);
        const matchesCategory = category === 'All Categories' || item.category === category;
        const matchesStatus = status === 'All Status' || item.status === status;
        return matchesSearch && matchesCategory && matchesStatus;
      })
    );
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.filterItems();
  }

  onCategoryChange(value: string): void {
    this.categoryFilter.set(value);
    this.filterItems();
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(value);
    this.filterItems();
  }

  onSortChange(value: string): void {
    this.sortBy.set(value);
    this.sortItems();
  }

  sortItems(): void {
    const sort = this.sortBy();
    const sorted = [...this.filteredItems()];
    
    switch(sort) {
      case 'Name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'SKU':
        sorted.sort((a, b) => a.sku.localeCompare(b.sku));
        break;
      case 'Category':
        sorted.sort((a, b) => a.category.localeCompare(b.category));
        break;
      case 'Stock':
        sorted.sort((a, b) => b.currentStock - a.currentStock);
        break;
      case 'Price':
        sorted.sort((a, b) => b.price - a.price);
        break;
    }
    
    this.filteredItems.set(sorted);
  }

  toggleViewMode(mode: 'card' | 'table'): void {
    this.viewMode.set(mode);
  }

  openItemModal(item: Item): void {
    this.selectedItem.set(item);
    this.showItemModal.set(true);
  }

  closeItemModal(): void {
    this.showItemModal.set(false);
    this.selectedItem.set(null);
  }

  openAddModal(): void {
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
  }

  openBulkImportModal(): void {
    this.showBulkImportModal.set(true);
  }

  closeBulkImportModal(): void {
    this.showBulkImportModal.set(false);
  }

  editItem(item: Item): void {
    console.log('Edit item:', item.sku);
  }

  adjustStock(item: Item): void {
    console.log('Adjust stock for:', item.sku);
  }

  viewStock(item: Item): void {
    this.openItemModal(item);
  }

  bulkEdit(): void {
    console.log('Bulk edit selected items');
  }

  bulkAdjustStock(): void {
    console.log('Bulk adjust stock');
  }

  bulkExport(): void {
    console.log('Bulk export items');
  }

  generateQRCodes(): void {
    console.log('Generate QR codes');
  }

  formatValue(value: number): string {
    if (value >= 1000) {
      return '$' + (value / 1000).toFixed(0) + 'K';
    }
    return '$' + value.toString();
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'Active': '🟢',
      'Low Stock': '🟡',
      'Out of Stock': '🔴'
    };
    return icons[status] || '⚪';
  }

  getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      'Electronics': '📱',
      'Furniture': '🪑',
      'Accessories': '🔌',
      'Stationery': '📄',
      'Supplies': '📦',
      'IT Equipment': '💻',
      'Networking': '🌐'
    };
    return icons[category] || '📦';
  }
}
