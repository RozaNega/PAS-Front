import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

interface StockItem {
  rank: number;
  name: string;
  stockQty: number;
  unitPrice: number;
  value: number;
}

interface WarehouseStock {
  name: string;
  items: number;
}

interface CategoryStock {
  name: string;
  items: number;
  percentage: number;
}

@Component({
  selector: 'app-stock-overview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-overview.component.html',
  styleUrls: ['./stock-overview.component.scss']
})
export class StockOverviewComponent {
  readonly router = inject(Router);
  currentDate = signal('Dec 15, 2024');
  lastUpdated = signal('2 minutes ago');

  totalItems = signal(12345);
  totalStockValue = signal(2543890);
  avgTurnoverRate = signal(4.2);
  stockTurnoverDays = signal(87);
  lowStockItems = signal(4);

  valueChange = signal('+12.5%');
  turnoverChange = signal('+0.3x');
  daysChange = signal('-5 days');

  warehouseStock = signal<WarehouseStock[]>([
    { name: 'Warehouse A', items: 5234 },
    { name: 'Warehouse B', items: 3876 },
    { name: 'Warehouse C', items: 2145 },
    { name: 'Storage', items: 1090 }
  ]);

  categoryStock = signal<CategoryStock[]>([
    { name: 'Electronics', items: 4320, percentage: 100 },
    { name: 'Furniture', items: 3086, percentage: 71 },
    { name: 'Office Supplies', items: 1852, percentage: 43 },
    { name: 'IT Equipment', items: 1234, percentage: 29 },
    { name: 'Stationery', items: 988, percentage: 23 },
    { name: 'Other', items: 865, percentage: 20 }
  ]);

  topItems = signal<StockItem[]>([
    { rank: 1, name: 'Dell XPS Laptop', stockQty: 45, unitPrice: 2499, value: 112455 },
    { rank: 2, name: 'HP LaserJet Printer', stockQty: 32, unitPrice: 899, value: 28768 },
    { rank: 3, name: 'Office Chair (Ergo)', stockQty: 120, unitPrice: 450, value: 54000 },
    { rank: 4, name: '27" Monitor', stockQty: 67, unitPrice: 350, value: 23450 },
    { rank: 5, name: 'Server Rack', stockQty: 8, unitPrice: 2800, value: 22400 }
  ]);

  // Bar heights for the chart - calculated once to avoid ExpressionChangedAfterItHasBeenCheckedError
  barHeightsTotal = signal<number[]>([]);
  barHeightsInflow = signal<number[]>([]);
  barHeightsOutflow = signal<number[]>([]);

  constructor() {
    // Calculate bar heights once to avoid ExpressionChangedAfterItHasBeenCheckedError
    const totalHeights: number[] = [];
    const inflowHeights: number[] = [];
    const outflowHeights: number[] = [];
    for (let i = 0; i < 8; i++) {
      totalHeights.push(this.getRandomHeight(80, 40));
      inflowHeights.push(this.getRandomHeight(30, 20));
      outflowHeights.push(this.getRandomHeight(20, 15));
    }
    this.barHeightsTotal.set(totalHeights);
    this.barHeightsInflow.set(inflowHeights);
    this.barHeightsOutflow.set(outflowHeights);
  }

  refreshData(): void {
    this.lastUpdated.set('Just now');
  }

  formatValue(value: number): string {
    if (value >= 1000000) {
      return '$' + (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return '$' + (value / 1000).toFixed(0) + 'K';
    }
    return '$' + value.toString();
  }

  formatNumber(value: number): string {
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
  }

  getRandomHeight(base: number, variance: number): number {
    return base + Math.random() * variance;
  }

  // Navigation methods
  viewWarehouseDetails(): void {
    const role = this.getCurrentRole();
    this.router.navigate([`/${role}/warehouses`]);
  }

  viewCategoryDetails(): void {
    const role = this.getCurrentRole();
    this.router.navigate([`/${role}/inventory/current-stock`]);
  }

  viewAllItems(): void {
    const role = this.getCurrentRole();
    this.router.navigate([`/${role}/inventory/current-stock`]);
  }

  private getCurrentRole(): string {
    const url = this.router.url;
    if (url.includes('/admin/')) return 'admin';
    if (url.includes('/manager/')) return 'manager';
    if (url.includes('/storekeeper/')) return 'storekeeper';
    return 'admin'; // default fallback
  }
}
