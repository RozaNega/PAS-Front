import { Component, OnInit, signal, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InventoryService, InventoryStockDto } from '../../../../core/services/inventory.service';
import { WarehousesService, WarehouseDto } from '../../../../core/services/warehouses.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-stock-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './stock-overview.component.html',
  styleUrls: ['./stock-overview.component.scss']
})
export class StockOverviewComponent implements OnInit {
  private readonly inventoryService = inject(InventoryService);
  private readonly warehousesService = inject(WarehousesService);
  private readonly router = inject(Router);

  // State
  searchTerm = signal('');
  warehouseFilter = signal('All');
  stockFilter = signal('All');
  currentPage = signal(1);
  rowsPerPage = signal(10);
  loading = signal(false);
  error = signal<string | null>(null);
  selectedItems = signal<Set<string>>(new Set());

  // Data
  stockItems = signal<InventoryStockDto[]>([]);
  warehouses = signal<WarehouseDto[]>([]);
  totalItems = signal(0);

  // Filter options
  stockFilters = ['All', 'In Stock', 'Low Stock', 'Out of Stock'];

  totalValue = computed(() => {
    return this.stockItems().reduce((sum, item) => sum + (item.currentStock * ((item as Record<string, unknown>)['unitPrice'] as number || 15)), 0);
  });

  lowStockCount = computed(() => {
    return this.stockItems().filter(item =>
      (item.currentQuantity ?? item.currentStock ?? 0) <= item.minimumThreshold
    ).length;
  });

  outOfStockCount = computed(() => {
    return this.stockItems().filter(item => (item.currentQuantity ?? item.currentStock ?? 0) === 0).length;
  });

  // Computed for bulk operations
  selectedCount = computed(() => this.selectedItems().size);
  hasSelection = computed(() => this.selectedItems().size > 0);
  selectedItemsData = computed(() => {
    const selected = this.selectedItems();
    return this.filteredStockItems().filter(item => selected.has(item.id));
  });
  allPageItemsSelected = computed(() => {
    const pageItems = this.pagedStockItems();
    return pageItems.length > 0 && pageItems.every(item => this.selectedItems().has(item.id));
  });

  constructor() {
    // Reload data when filters change
    effect(() => {
      const search = this.searchTerm();
      const warehouse = this.warehouseFilter();
      const stock = this.stockFilter();
      const page = this.currentPage();
      
      this.loadStockOverview();
    });
  }

  ngOnInit(): void {
    this.loadWarehouses();
    this.loadStockOverview();
  }

  // Computed properties
  filteredStockItems = computed(() => {
    let result = [...this.stockItems()];

    if (this.searchTerm()) {
      const q = this.searchTerm().toLowerCase();
      result = result.filter(item =>
        item.itemName?.toLowerCase().includes(q) ||
        item.sku?.toLowerCase().includes(q) ||
        item.shelfLocation?.toLowerCase().includes(q) ||
        item.warehouseName?.toLowerCase().includes(q)
      );
    }

    if (this.warehouseFilter() !== 'All') {
      result = result.filter(item => item.warehouseId === this.warehouseFilter());
    }

    if (this.stockFilter() !== 'All') {
      switch (this.stockFilter()) {
        case 'In Stock':
          result = result.filter(item => (item.currentQuantity ?? item.currentStock ?? 0) > item.minimumThreshold);
          break;
        case 'Low Stock':
          result = result.filter(item => 
            (item.currentQuantity ?? item.currentStock ?? 0) > 0 && (item.currentQuantity ?? item.currentStock ?? 0) <= item.minimumThreshold
          );
          break;
        case 'Out of Stock':
          result = result.filter(item => (item.currentQuantity ?? item.currentStock ?? 0) === 0);
          break;
      }
    }

    return result;
  });

  pagedStockItems = computed(() => {
    const start = (this.currentPage() - 1) * this.rowsPerPage();
    const end = start + this.rowsPerPage();
    return this.filteredStockItems().slice(start, end);
  });

  totalPages = computed(() => Math.ceil(this.filteredStockItems().length / this.rowsPerPage()));

  displayRange = computed(() => {
    const start = (this.currentPage() - 1) * this.rowsPerPage() + 1;
    const end = Math.min(this.currentPage() * this.rowsPerPage(), this.filteredStockItems().length);
    return { start, end };
  });

  // Data loading
  loadWarehouses(): void {
    this.warehousesService.getAll({ isActive: true }).subscribe({
      next: (response) => {
        if (response.success !== false && Array.isArray(response.data)) {
          this.warehouses.set(response.data);
        }
      },
      error: (err) => {
        console.error('Error loading warehouses:', err);
      }
    });
  }

  loadStockOverview(): void {
    this.loading.set(true);
    this.error.set(null);

    const params: any = {};

    if (this.searchTerm()) {
      params.searchTerm = this.searchTerm();
    }

    if (this.warehouseFilter() !== 'All') {
      params.warehouseId = this.warehouseFilter();
    }

    if (this.stockFilter() === 'Low Stock') {
      params.lowStockOnly = true;
    }

    console.log('=== STOCK OVERVIEW DEBUG ===');
    console.log('Loading stock overview with params:', params);
    console.log('============================');

    this.inventoryService.getStockOverview(params).subscribe({
      next: (response) => {
        console.log('=== STOCK OVERVIEW API RESPONSE ===');
        console.log('Response:', JSON.stringify(response, null, 2));
        console.log('===================================');
        
        if (response.success !== false && Array.isArray(response.data)) {
          this.stockItems.set(response.data);
          this.totalItems.set(response.data.length);
          console.log('Stock items loaded:', response.data.length);
        } else {
          console.error('API response unsuccessful or no data:', response);
          this.error.set(response.message || 'No stock data received from server');
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('=== STOCK OVERVIEW LOAD ERROR ===');
        console.error('Full error object:', err);
        console.error('==================================');
        
        let errorMessage = 'Failed to load stock overview. Please try again.';
        
        if (err.error) {
          if (err.error.message) {
            errorMessage = err.error.message;
          } else if (err.error.title) {
            errorMessage = err.error.title;
          } else if (typeof err.error === 'string') {
            errorMessage = err.error;
          }
        }
        
        if (err.status) {
          errorMessage = `[${err.status} ${err.statusText}] ${errorMessage}`;
        }
        
        this.error.set(errorMessage);
        this.loading.set(false);
      }
    });
  }

  // Filter handlers
  onSearch(e: Event): void {
    this.searchTerm.set((e.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  onWarehouseFilter(e: Event): void {
    this.warehouseFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onStockFilter(e: Event): void {
    this.stockFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onRowsPerPageChange(e: Event): void {
    this.rowsPerPage.set(+(e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.warehouseFilter.set('All');
    this.stockFilter.set('All');
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  // Navigation
  viewStockMovements(itemId: string): void {
    this.router.navigate(['/admin/inventory/movements'], { 
      queryParams: { itemId } 
    });
  }

  adjustStock(item: InventoryStockDto): void {
    this.router.navigate(['/admin/inventory/adjustment'], { 
      queryParams: { 
        itemId: item.itemId,
        shelfId: item.shelfId,
        currentStock: item.currentQuantity ?? item.currentStock ?? 0
      } 
    });
  }

  // Utility methods
  getStockStatusClass(item: InventoryStockDto): string {
    const qty = item.currentQuantity ?? item.currentStock ?? 0;
    if (qty === 0) return 'badge-danger';
    if (qty <= item.minimumThreshold) return 'badge-warning';
    return 'badge-success';
  }

  getStockStatusText(item: InventoryStockDto): string {
    const qty = item.currentQuantity ?? item.currentStock ?? 0;
    if (qty === 0) return 'Out of Stock';
    if (qty <= item.minimumThreshold) return 'Low Stock';
    return 'In Stock';
  }

  getStockLevelPercentage(item: InventoryStockDto): number {
    const qty = item.currentQuantity ?? item.currentStock ?? 0;
    if (item.maximumThreshold <= 0) return 0;
    return Math.min((qty / item.maximumThreshold) * 100, 100);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatDate(date: string | Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  trackByItemId(index: number, item: InventoryStockDto): string {
    return item.id;
  }

  // Bulk operations
  toggleSelectItem(itemId: string): void {
    const current = new Set(this.selectedItems());
    if (current.has(itemId)) {
      current.delete(itemId);
    } else {
      current.add(itemId);
    }
    this.selectedItems.set(current);
  }

  toggleSelectAll(): void {
    const pageItems = this.pagedStockItems();
    const current = new Set(this.selectedItems());

    if (this.allPageItemsSelected()) {
      pageItems.forEach(item => current.delete(item.id));
    } else {
      pageItems.forEach(item => current.add(item.id));
    }
    this.selectedItems.set(current);
  }

  isItemSelected(itemId: string): boolean {
    return this.selectedItems().has(itemId);
  }

  clearSelection(): void {
    this.selectedItems.set(new Set());
  }

  exportToExcel(): void {
    const data = this.selectedItemsData();
    if (data.length === 0) return;

    const wsData = data.map(item => ({
      'Item Name': item.itemName,
      'SKU': item.sku,
      'Warehouse': item.warehouseName,
      'Shelf Location': item.shelfLocation || 'N/A',
      'Current Stock': item.currentQuantity ?? item.currentStock ?? 0,
      'Reserved': item.reservedQuantity ?? item.reservedStock ?? 0,
      'Available': item.availableQuantity ?? item.availableStock ?? 0,
      'Min Threshold': item.minimumThreshold,
      'Max Threshold': item.maximumThreshold,
      'Unit': item.unitOfMeasure,
      'Last Updated': this.formatDate(item.lastUpdated)
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Overview');
    XLSX.writeFile(wb, `stock-overview-${new Date().toISOString().split('T')[0]}.xlsx`);
    this.clearSelection();
  }

  exportToCSV(): void {
    const data = this.selectedItemsData();
    if (data.length === 0) return;

    const headers = ['Item Name', 'SKU', 'Warehouse', 'Shelf Location', 'Current Stock', 'Reserved', 'Available', 'Min Threshold', 'Max Threshold', 'Unit', 'Last Updated'];
    const rows = data.map(item => [
      item.itemName,
      item.sku,
      item.warehouseName,
      item.shelfLocation || 'N/A',
      item.currentQuantity ?? item.currentStock ?? 0,
      item.reservedQuantity ?? item.reservedStock ?? 0,
      item.availableQuantity ?? item.availableStock ?? 0,
      item.minimumThreshold,
      item.maximumThreshold,
      item.unitOfMeasure,
      this.formatDate(item.lastUpdated)
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-overview-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    this.clearSelection();
  }

  generateQRCodes(): void {
    const data = this.selectedItemsData();
    if (data.length === 0) {
      alert('Please select items first');
      return;
    }
    // Navigate to QR code generation page with selected items
    this.router.navigate(['/admin/inventory/qr-codes'], {
      state: { items: data }
    });
  }

  bulkAdjustStock(): void {
    const data = this.selectedItemsData();
    if (data.length === 0) {
      alert('Please select items first');
      return;
    }
    // Navigate to bulk adjustment page with selected items
    this.router.navigate(['/admin/inventory/bulk-adjust'], {
      state: { items: data }
    });
  }
}
