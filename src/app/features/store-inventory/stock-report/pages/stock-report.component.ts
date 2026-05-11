import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
export class StockReportComponent {
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

  stockItems = signal<StockItem[]>([
    { sku: 'LAP-001', name: 'Dell XPS Laptop', category: 'Electronics', warehouse: 'WH A', quantity: 45, unitPrice: 2499, total: 112455, status: 'In Stock' },
    { sku: 'MON-002', name: 'HP Monitor', category: 'Electronics', warehouse: 'WH A', quantity: 67, unitPrice: 350, total: 23450, status: 'In Stock' },
    { sku: 'CHR-003', name: 'Office Chair', category: 'Furniture', warehouse: 'WH B', quantity: 23, unitPrice: 450, total: 10350, status: 'Low Stock' },
    { sku: 'CAB-004', name: 'USB Cables', category: 'Accessories', warehouse: 'WH A', quantity: 5, unitPrice: 5, total: 25, status: 'Out of Stock' },
    { sku: 'PAP-005', name: 'A4 Paper', category: 'Stationery', warehouse: 'WH B', quantity: 120, unitPrice: 25, total: 3000, status: 'In Stock' },
    { sku: 'TON-006', name: 'Toner Cartridge', category: 'Supplies', warehouse: 'WH A', quantity: 8, unitPrice: 75, total: 600, status: 'Low Stock' }
  ]);

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

  constructor() {
    // Calculate bar heights once to avoid ExpressionChangedAfterItHasBeenCheckedError
    const heights: number[] = [];
    for (let i = 0; i < 8; i++) {
      heights.push(this.getRandomHeight(100, 60));
    }
    this.barHeights.set(heights);
    this.filterItems();
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
      'In Stock': '🟢',
      'Low Stock': '🟡',
      'Out of Stock': '🔴'
    };
    return icons[status] || '⚪';
  }

  getRandomHeight(base: number, variance: number): number {
    return base + Math.random() * variance;
  }

  getMonthName(month: number): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1] || '';
  }
}
