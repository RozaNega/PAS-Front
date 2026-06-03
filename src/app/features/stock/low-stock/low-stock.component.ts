import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

interface LowStockItem {
  id: number;
  itemName: string;
  name: string;
  sku: string;
  code: string;
  categoryName: string;
  warehouseName: string;
  warehouse: string;
  warehouseId: number;
  currentStock: number;
  minStockLevel: number;
  minimumThreshold: number;
  unitOfMeasure: string;
  lastUpdated: string;
}

@Component({
  selector: 'app-low-stock',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './low-stock.component.html',
  styleUrls: ['./low-stock.component.scss'],
})
export class LowStockComponent implements OnInit {
  allItems: LowStockItem[] = [];
  lowStockItems: LowStockItem[] = [];
  filteredItems: LowStockItem[] = [];
  paginatedItems: LowStockItem[] = [];
  isLoading = false;
  error: string | null = null;

  warehouses: any[] = [];
  categories: string[] = [];

  currentPage = 1;
  pageSize = 15;
  totalCount = 0;
  totalPages = 0;

  filters = {
    search: '',
    category: '',
    warehouse: '',
  };

  Math = Math;

  summaryCards = [
    { label: 'Low Stock Items', value: '0', icon: 'bi-exclamation-triangle', bgColor: '#fff3e0' },
    { label: 'Critical Items', value: '0', icon: 'bi-exclamation-circle', bgColor: '#fce4ec' },
    { label: 'Items to Reorder', value: '0', icon: 'bi-cart-plus', bgColor: '#e8f5e9' },
    { label: 'Total Shortfall', value: '0', icon: 'bi-arrow-down', bgColor: '#e3f2fd' },
  ];

  constructor(
    private http: HttpClient,
    private api: ApiService,
  ) {}

  ngOnInit(): void {
    this.loadLowStock();
    this.loadWarehouses();
  }

  loadLowStock(): void {
    this.isLoading = true;
    this.error = null;
    this.api.get<any[]>('/InventoryStock').pipe(
      catchError((err) => {
        this.error = 'Failed to load low stock data';
        return of({ success: false, message: '', data: [] });
      }),
      finalize(() => (this.isLoading = false)),
    ).subscribe((response) => {
      if (response.success && response.data) {
        this.allItems = Array.isArray(response.data) ? response.data : [];
        this.lowStockItems = this.allItems.filter((item) => {
          const stock = item.currentStock || 0;
          const min = item.minStockLevel || item.minimumThreshold || 0;
          return stock <= min;
        });
        this.filteredItems = [...this.lowStockItems];
        this.categories = [...new Set(this.lowStockItems.map((i) => i.categoryName).filter(Boolean))];
        this.updateSummary();
        this.applyPagination();
      }
    });
  }

  loadWarehouses(): void {
    this.api.get<any[]>('/Warehouses').pipe(
      catchError(() => of({ success: false, message: '', data: [] })),
    ).subscribe((response) => {
      if (response.success && response.data) {
        this.warehouses = Array.isArray(response.data) ? response.data : [];
      }
    });
  }

  refreshLowStock(): void {
    this.loadLowStock();
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.filters.search = value.toLowerCase();
    this.applyFilters();
  }

  onFilterChange(type: string, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (type === 'category') this.filters.category = value;
    if (type === 'warehouse') this.filters.warehouse = value;
    this.applyFilters();
  }

  clearFilters(): void {
    this.filters = { search: '', category: '', warehouse: '' };
    this.applyFilters();
  }

  applyFilters(): void {
    let items = [...this.lowStockItems];
    if (this.filters.search) {
      const term = this.filters.search;
      items = items.filter((i) =>
        (i.itemName || i.name || '').toLowerCase().includes(term) ||
        (i.sku || i.code || '').toLowerCase().includes(term)
      );
    }
    if (this.filters.category) {
      items = items.filter((i) => i.categoryName === this.filters.category);
    }
    if (this.filters.warehouse) {
      items = items.filter((i) => String(i.warehouseId) === this.filters.warehouse || i.warehouseName === this.filters.warehouse);
    }
    this.filteredItems = items;
    this.currentPage = 1;
    this.updateSummary();
    this.applyPagination();
  }

  applyPagination(): void {
    this.totalCount = this.filteredItems.length;
    this.totalPages = Math.ceil(this.totalCount / this.pageSize) || 1;
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedItems = this.filteredItems.slice(start, start + this.pageSize);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.applyPagination();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    return pages;
  }

  getShortfall(item: LowStockItem): number {
    const stock = item.currentStock || 0;
    const min = item.minStockLevel || item.minimumThreshold || 0;
    return Math.max(0, min - stock);
  }

  viewDetails(item: LowStockItem): void {
    console.log('View details:', item);
  }

  reorderStock(item: LowStockItem): void {
    console.log('Reorder stock:', item);
  }

  private updateSummary(): void {
    this.summaryCards[0].value = this.filteredItems.length.toString();
    const critical = this.filteredItems.filter((i) => (i.currentStock || 0) === 0).length;
    this.summaryCards[1].value = critical.toString();
    const totalShortfall = this.filteredItems.reduce((sum, i) => sum + this.getShortfall(i), 0);
    this.summaryCards[3].value = totalShortfall.toString();
  }
}
