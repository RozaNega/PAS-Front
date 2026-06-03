import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

interface StockMovement {
  id: number;
  movementDate: string;
  date: string;
  itemName: string;
  item: string;
  sku: string;
  itemCode: string;
  movementType: string;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceNumber: string;
  reference: string;
  performedBy: string;
  createdBy: string;
  notes: string;
}

@Component({
  selector: 'app-stock-movements',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe],
  templateUrl: './stock-movements.component.html',
  styleUrls: ['./stock-movements.component.scss'],
})
export class StockMovementsComponent implements OnInit {
  allMovements: StockMovement[] = [];
  filteredMovements: StockMovement[] = [];
  paginatedItems: StockMovement[] = [];
  isLoading = false;
  error: string | null = null;

  currentPage = 1;
  pageSize = 20;
  totalCount = 0;
  totalPages = 0;

  filters = {
    search: '',
    type: '',
    dateFrom: '',
    dateTo: '',
  };

  Math = Math;

  summaryCards = [
    { label: 'Total Movements', value: '0', icon: 'bi-arrow-left-right', bgColor: '#e8eaf6' },
    { label: 'Increases', value: '0', icon: 'bi-arrow-up-circle', bgColor: '#e8f5e9' },
    { label: 'Decreases', value: '0', icon: 'bi-arrow-down-circle', bgColor: '#fce4ec' },
    { label: 'Adjustments', value: '0', icon: 'bi-sliders', bgColor: '#fff3e0' },
  ];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadMovements();
  }

  loadMovements(): void {
    this.isLoading = true;
    this.error = null;
    this.api.get<any[]>('/StockLedger').pipe(
      catchError((err) => {
        this.error = 'Failed to load stock movements';
        return of({ success: false, message: '', data: [] });
      }),
      finalize(() => (this.isLoading = false)),
    ).subscribe((response) => {
      if (response.success && response.data) {
        this.allMovements = Array.isArray(response.data) ? response.data : [];
        this.filteredMovements = [...this.allMovements];
        this.updateSummary();
        this.applyPagination();
      }
    });
  }

  refreshMovements(): void {
    this.loadMovements();
  }

  recordMovement(): void {
    console.log('Record new movement');
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.filters.search = value.toLowerCase();
    this.applyFilters();
  }

  onFilterChange(type: string, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (type === 'type') this.filters.type = value;
    this.applyFilters();
  }

  onDateFilterChange(type: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (type === 'from') this.filters.dateFrom = value;
    if (type === 'to') this.filters.dateTo = value;
    this.applyFilters();
  }

  clearFilters(): void {
    this.filters = { search: '', type: '', dateFrom: '', dateTo: '' };
    this.applyFilters();
  }

  applyFilters(): void {
    let items = [...this.allMovements];
    if (this.filters.search) {
      const term = this.filters.search;
      items = items.filter((m) =>
        (m.itemName || m.item || '').toLowerCase().includes(term) ||
        (m.sku || m.itemCode || '').toLowerCase().includes(term)
      );
    }
    if (this.filters.type) {
      items = items.filter((m) => (m.movementType || m.type || '').toLowerCase() === this.filters.type.toLowerCase());
    }
    if (this.filters.dateFrom) {
      items = items.filter((m) => (m.movementDate || m.date || '') >= this.filters.dateFrom);
    }
    if (this.filters.dateTo) {
      items = items.filter((m) => (m.movementDate || m.date || '') <= this.filters.dateTo + 'T23:59:59');
    }
    this.filteredMovements = items;
    this.currentPage = 1;
    this.updateSummary();
    this.applyPagination();
  }

  applyPagination(): void {
    this.totalCount = this.filteredMovements.length;
    this.totalPages = Math.ceil(this.totalCount / this.pageSize) || 1;
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedItems = this.filteredMovements.slice(start, start + this.pageSize);
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

  getMovementTypeClass(mov: StockMovement): string {
    const type = (mov.movementType || mov.type || '').toLowerCase();
    if (type === 'increase') return 'bg-success';
    if (type === 'decrease') return 'bg-danger';
    if (type === 'transfer') return 'bg-info text-dark';
    return 'bg-warning text-dark';
  }

  viewMovementNotes(mov: StockMovement): void {
    console.log('Movement notes:', mov.notes);
  }

  private updateSummary(): void {
    this.summaryCards[0].value = this.filteredMovements.length.toString();
    const increases = this.filteredMovements.filter((m) => (m.movementType || m.type || '').toLowerCase() === 'increase').length;
    const decreases = this.filteredMovements.filter((m) => (m.movementType || m.type || '').toLowerCase() === 'decrease').length;
    const adjustments = this.filteredMovements.filter((m) => (m.movementType || m.type || '').toLowerCase() === 'adjustment').length;
    this.summaryCards[1].value = increases.toString();
    this.summaryCards[2].value = decreases.toString();
    this.summaryCards[3].value = adjustments.toString();
  }
}
