import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

Chart.register(...registerables);

interface WarehouseSummary {
  name: string;
  totalItems: number;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  lowStockItems: number;
  utilization: number;
}

@Component({
  selector: 'app-stock-overview',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './stock-overview.component.html',
  styleUrls: ['./stock-overview.component.scss'],
})
export class StockOverviewComponent implements OnInit, AfterViewInit, OnDestroy {
  isLoading = false;
  error: string | null = null;

  allItems: any[] = [];
  warehouseSummaries: WarehouseSummary[] = [];

  kpiCards = [
    { label: 'Total Items', value: '0', icon: 'bi-box', bgColor: '#e8eaf6' },
    { label: 'Total Stock Value', value: '$0', icon: 'bi-currency-dollar', bgColor: '#e8f5e9' },
    { label: 'Active Warehouses', value: '0', icon: 'bi-building', bgColor: '#e3f2fd' },
    { label: 'Stock Health', value: '0%', icon: 'bi-heart-pulse', bgColor: '#fce4ec' },
  ];

  stockStatusSummary = {
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
  };

  private categoryChart?: Chart;
  private warehouseChart?: Chart;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initCharts(), 300);
  }

  ngOnDestroy(): void {
    this.categoryChart?.destroy();
    this.warehouseChart?.destroy();
  }

  loadData(): void {
    this.isLoading = true;
    this.api.get<any[]>('/InventoryStock').pipe(
      catchError((err) => {
        this.error = 'Failed to load stock data';
        return of({ success: false, message: '', data: [] });
      }),
      finalize(() => (this.isLoading = false)),
    ).subscribe((response) => {
      if (response.success && response.data) {
        this.allItems = Array.isArray(response.data) ? response.data : [];
        this.processData();
      }
    });
  }

  refreshOverview(): void {
    this.loadData();
  }

  exportOverview(): void {
    console.log('Exporting overview...');
  }

  getUtilizationColor(percentage: number): string {
    if (percentage >= 80) return '#4caf50';
    if (percentage >= 50) return '#ff9800';
    return '#f44336';
  }

  private processData(): void {
    const warehouseMap = new Map<string, any>();
    let inStock = 0, lowStock = 0, outOfStock = 0;

    this.allItems.forEach((item) => {
      const whName = item.warehouseName || item.warehouse || 'Unknown';
      const stock = item.currentStock || 0;
      const min = item.minStockLevel || item.minimumThreshold || 0;

      if (stock <= 0) outOfStock++;
      else if (stock <= min) lowStock++;
      else inStock++;

      if (!warehouseMap.has(whName)) {
        warehouseMap.set(whName, {
          name: whName,
          totalItems: 0,
          totalStock: 0,
          reservedStock: 0,
          availableStock: 0,
          lowStockItems: 0,
        });
      }
      const wh = warehouseMap.get(whName);
      wh.totalItems++;
      wh.totalStock += stock;
      wh.reservedStock += item.reservedStock || 0;
      wh.availableStock += item.availableStock || stock;
      if (stock > 0 && stock <= min) wh.lowStockItems++;
    });

    this.stockStatusSummary = { inStock, lowStock, outOfStock };

    this.warehouseSummaries = Array.from(warehouseMap.values()).map((wh) => ({
      ...wh,
      utilization: wh.totalStock > 0 ? Math.min(100, Math.round((wh.totalStock / (wh.totalStock + wh.reservedStock + 1000)) * 100)) : 0,
    }));

    this.kpiCards[0].value = this.allItems.length.toString();
    this.kpiCards[2].value = this.warehouseSummaries.length.toString();
    const health = this.allItems.length > 0 ? Math.round((inStock / this.allItems.length) * 100) : 0;
    this.kpiCards[3].value = health + '%';

    setTimeout(() => this.initCharts(), 100);
  }

  private initCharts(): void {
    this.initCategoryChart();
    this.initWarehouseChart();
  }

  private initCategoryChart(): void {
    const canvas = document.getElementById('stockByCategoryChart') as HTMLCanvasElement;
    if (!canvas) return;
    const categoryMap = new Map<string, number>();
    this.allItems.forEach((item) => {
      const cat = item.categoryName || 'Uncategorized';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + (item.currentStock || 0));
    });
    this.categoryChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: Array.from(categoryMap.keys()),
        datasets: [{ data: Array.from(categoryMap.values()), backgroundColor: ['#1a237e', '#283593', '#3949ab', '#5c6bc0', '#7986cb', '#9fa8da'] }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
    });
  }

  private initWarehouseChart(): void {
    const canvas = document.getElementById('stockByWarehouseChart') as HTMLCanvasElement;
    if (!canvas) return;
    this.warehouseChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: this.warehouseSummaries.map((w) => w.name),
        datasets: [
          { label: 'Available', data: this.warehouseSummaries.map((w) => w.availableStock), backgroundColor: '#4caf50', borderRadius: 4 },
          { label: 'Reserved', data: this.warehouseSummaries.map((w) => w.reservedStock), backgroundColor: '#ff9800', borderRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: { stacked: true }, y: { stacked: true } },
        plugins: { legend: { position: 'bottom' } },
      },
    });
  }
}
