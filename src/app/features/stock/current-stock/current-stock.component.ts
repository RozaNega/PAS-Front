import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

interface StockItem {
  id: number;
  itemName: string;
  name: string;
  sku: string;
  code: string;
  warehouseName: string;
  warehouse: string;
  warehouseId: number;
  shelfLocation: string;
  shelf: string;
  shelfId: number;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  minStockLevel: number;
  minimumThreshold: number;
  unitOfMeasure: string;
  lastUpdated: string;
  isLowStock: boolean;
  categoryName: string;
}

@Component({
  selector: 'app-current-stock',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './current-stock.component.html',
  styleUrls: ['./current-stock.component.scss'],
})
export class CurrentStockComponent implements OnInit {
  allItems: StockItem[] = [];
  filteredItems: StockItem[] = [];
  paginatedItems: StockItem[] = [];
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
    warehouse: '',
    category: '',
  };

  Math = Math;

  summaryCards = [
    { label: 'Total Items', value: '0', icon: 'bi-box', bgColor: '#e8eaf6' },
    { label: 'Low Stock Items', value: '0', icon: 'bi-exclamation-triangle', bgColor: '#fff3e0' },
    { label: 'Out of Stock', value: '0', icon: 'bi-x-circle', bgColor: '#fce4ec' },
    { label: 'Total Value', value: '$0', icon: 'bi-currency-dollar', bgColor: '#e8f5e9' },
  ];

  constructor(
    private http: HttpClient,
    private api: ApiService,
  ) {}

  ngOnInit(): void {
    this.loadStock();
    this.loadWarehouses();
  }

  loadStock(): void {
    this.isLoading = true;
    this.error = null;
    this.api.get<StockItem[]>('/InventoryStock').pipe(
      catchError((err) => {
        this.error = 'Failed to load stock data';
        return of({ success: false, message: '', data: [] });
      }),
      finalize(() => (this.isLoading = false)),
    ).subscribe((response) => {
      if (response.success && response.data) {
        this.allItems = Array.isArray(response.data) ? response.data : [];
        this.filteredItems = [...this.allItems];
        this.categories = [...new Set(this.allItems.map((i) => i.categoryName).filter(Boolean))];
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

  refreshStock(): void {
    this.loadStock();
  }

  exportStock(): void {
    console.log('Exporting stock...');
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.filters.search = value.toLowerCase();
    this.applyFilters();
  }

  onFilterChange(type: string, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (type === 'warehouse') this.filters.warehouse = value;
    if (type === 'category') this.filters.category = value;
    this.applyFilters();
  }

  clearFilters(): void {
    this.filters = { search: '', warehouse: '', category: '' };
    this.applyFilters();
  }

  applyFilters(): void {
    let items = [...this.allItems];
    if (this.filters.search) {
      const term = this.filters.search;
      items = items.filter((i) =>
        (i.itemName || i.name || '').toLowerCase().includes(term) ||
        (i.sku || i.code || '').toLowerCase().includes(term)
      );
    }
    if (this.filters.warehouse) {
      items = items.filter((i) => i.warehouseId === Number(this.filters.warehouse) || i.warehouseName === this.filters.warehouse);
    }
    if (this.filters.category) {
      items = items.filter((i) => i.categoryName === this.filters.category);
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

  getStockStatus(item: StockItem): string {
    const stock = item.currentStock || 0;
    const min = item.minStockLevel || item.minimumThreshold || 0;
    if (stock <= 0) return 'Out of Stock';
    if (stock <= min) return 'Low Stock';
    return 'In Stock';
  }

  getStockStatusClass(item: StockItem): string {
    const stock = item.currentStock || 0;
    const min = item.minStockLevel || item.minimumThreshold || 0;
    if (stock <= 0) return 'bg-danger';
    if (stock <= min) return 'bg-warning text-dark';
    return 'bg-success';
  }

  viewDetails(item: StockItem): void {
    console.log('View details:', item);
  }

  adjustStock(item: StockItem): void {
    console.log('Adjust stock:', item);
  }

  private updateSummary(): void {
    const total = this.filteredItems.length;
    const lowStock = this.filteredItems.filter((i) => {
      const stock = i.currentStock || 0;
      const min = i.minStockLevel || i.minimumThreshold || 0;
      return stock > 0 && stock <= min;
    }).length;
    const outOfStock = this.filteredItems.filter((i) => (i.currentStock || 0) <= 0).length;
    this.summaryCards[0].value = total.toString();
    this.summaryCards[1].value = lowStock.toString();
    this.summaryCards[2].value = outOfStock.toString();
  }
}
