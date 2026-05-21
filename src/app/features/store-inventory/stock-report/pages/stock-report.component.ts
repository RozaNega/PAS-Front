import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StockReportService, StockReportItem } from '../services/stock-report.service';

interface StockItem {
  sku: string;
  name: string;
  category: string;
  warehouse: string;
  quantity: number;
  unitPrice: number;
  total: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

@Component({
  selector: 'app-stock-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-report.component.html',
  styleUrls: ['./stock-report.component.scss']
})
export class StockReportComponent implements OnInit {
  private readonly reportService = inject(StockReportService);

  dateRange = { start: '2024-12-01', end: '2024-12-15' };
  warehouseFilter = signal('All Warehouses');
  categoryFilter = signal('All Categories');
  statusFilter = signal('All Status');
  reportType = signal('Summary');
  format = signal('PDF');
  includeZeroStock = signal('Yes');

  warehouses = ['All Warehouses', 'Warehouse A', 'Warehouse B', 'Warehouse C', 'Storage'];
  categories = ['All Categories', 'Electronics', 'Furniture', 'Office Supplies', 'IT Equipment', 'Stationery'];
  statuses = ['All Status', 'In Stock', 'Low Stock', 'Out of Stock'];
  reportTypes = ['Summary', 'Detailed', 'Valuation', 'Movement'];
  formats = ['PDF', 'Excel', 'CSV'];

  stockItems = signal<StockItem[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Computed summary statistics
  totalItems = computed(() => this.stockItems().length);
  totalValue = computed(() => this.stockItems().reduce((sum, item) => sum + item.total, 0));
  totalUnits = computed(() => this.stockItems().reduce((sum, item) => sum + item.quantity, 0));
  turnoverRate = computed(() => '4.2x per year');
  avgStockLevel = computed(() => '45 days');

  // Category breakdown
  categoryBreakdown = computed(() => [
    { name: 'Electronics', percentage: 45, units: 4320, value: 1145000 },
    { name: 'Furniture', percentage: 25, units: 2345, value: 623000 },
    { name: 'Office Supplies', percentage: 15, units: 1234, value: 234000 },
    { name: 'IT Equipment', percentage: 10, units: 890, value: 456000 },
    { name: 'Stationery', percentage: 8, units: 456, value: 45890 },
    { name: 'Other', percentage: 5, units: 100, value: 40000 }
  ]);

  // Top items by value
  topItemsByValue = computed(() => [
    { name: 'Dell XPS Laptop', value: 112455, percentage: 100 },
    { name: 'HP Monitor', value: 23450, percentage: 21 },
    { name: 'Server Rack', value: 22400, percentage: 20 },
    { name: 'Office Chair', value: 10350, percentage: 9 },
    { name: 'Cisco Switch', value: 9600, percentage: 9 }
  ]);

  // Turnover by category
  turnoverByCategory = computed(() => [
    { name: 'Stationery', rate: '8.5x', percentage: 100 },
    { name: 'Office Supplies', rate: '6.2x', percentage: 73 },
    { name: 'Electronics', rate: '3.8x', percentage: 45 },
    { name: 'Furniture', rate: '2.1x', percentage: 25 },
    { name: 'IT Equipment', rate: '1.5x', percentage: 18 }
  ]);

  // Bar heights for the chart - calculated once to avoid ExpressionChangedAfterItHasBeenCheckedError
  barHeights = signal<number[]>([]);

  filteredItems = signal<StockItem[]>([]);

  ngOnInit(): void {
    const heights: number[] = [];
    for (let i = 0; i < 8; i++) {
      heights.push(this.getRandomHeight(100, 60));
    }
    this.barHeights.set(heights);
    this.loadStockReport();
  }

  loadStockReport(): void {
    this.loading.set(true);
    this.error.set(null);

    this.reportService.getStockReport({
      dateFrom: this.dateRange.start,
      dateTo: this.dateRange.end
    }).subscribe({
      next: (res) => {
        if (res.success !== false && Array.isArray(res.data)) {
          this.stockItems.set(res.data);
        } else {
          this.error.set(res.message || 'Failed to load stock report');
        }
        this.loading.set(false);
        this.filterItems();
      },
      error: (err) => {
        console.error('Error loading stock report:', err);
        this.error.set('Failed to load stock report. Please try again.');
        this.loading.set(false);
      }
    });
  }

  filterItems(): void {
    const warehouse = this.warehouseFilter();
    const category = this.categoryFilter();
    const status = this.statusFilter();

    this.filteredItems.set(
      this.stockItems().filter(item => {
        const matchesWarehouse = warehouse === 'All Warehouses' || item.warehouse === warehouse;
        const matchesCategory = category === 'All Categories' || item.category === category;
        const matchesStatus = status === 'All Status' || item.status === status;
        return matchesWarehouse && matchesCategory && matchesStatus;
      })
    );
  }

  onWarehouseChange(value: string): void {
    this.warehouseFilter.set(value);
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

  isLoading = signal(false);
  reportGenerated = signal(false);
  lastRunTime = signal<Date | null>(null);

  generateReport(): void {
    this.isLoading.set(true);
    this.reportGenerated.set(false);

    setTimeout(() => {
      this.filterItems();
      this.reportGenerated.set(true);
      this.lastRunTime.set(new Date());
      this.isLoading.set(false);
      console.log('Stock report generated successfully');
    }, 1500);
  }

  exportToExcel(): void {
    const items = this.filteredItems();
    const headers = ['SKU', 'Name', 'Category', 'Warehouse', 'Quantity', 'Unit Price', 'Total', 'Status'];
    const csvContent = [
      headers.join(','),
      ...items.map(i => [
        i.sku,
        i.name,
        i.category,
        i.warehouse,
        i.quantity,
        i.unitPrice,
        i.total,
        i.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'stock_report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportToPDF(): void {
    window.print();
  }

  emailReport(): void {
    const subject = encodeURIComponent('Stock Report');
    const body = encodeURIComponent(`Stock Report Summary:\n\nTotal Items: ${this.totalItems()}\nTotal Value: $${this.totalValue().toLocaleString()}\nTotal Units: ${this.totalUnits()}\nTurnover Rate: ${this.turnoverRate()}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  printReport(): void {
    window.print();
  }

  showScheduleModal = signal(false);
  scheduleFrequency = signal('weekly');
  scheduleEmail = signal('');
  scheduleDate = signal('');

  scheduleReport(): void {
    this.showScheduleModal.set(true);
  }

  closeScheduleModal(): void {
    this.showScheduleModal.set(false);
  }

  saveSchedule(): void {
    console.log('Saving schedule:', {
      frequency: this.scheduleFrequency(),
      email: this.scheduleEmail(),
      date: this.scheduleDate()
    });
    alert('Report scheduled successfully!');
    this.closeScheduleModal();
  }

  formatValue(value: number): string {
    if (value >= 1000000) {
      return '$' + (value / 1000000).toFixed(2) + 'M';
    } else if (value >= 1000) {
      return '$' + (value / 1000).toFixed(0) + 'K';
    }
    return '$' + value.toString();
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'In Stock': 'bi bi-check-circle-fill',
      'Low Stock': 'bi bi-exclamation-circle-fill',
      'Out of Stock': 'bi bi-x-circle-fill'
    };
    return icons[status] || 'bi bi-info-circle-fill';
  }

  getRandomHeight(base: number, variance: number): number {
    return base + Math.random() * variance;
  }

  getMonthName(month: number): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1] || '';
  }
}
