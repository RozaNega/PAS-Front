import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom, Subject, takeUntil } from 'rxjs';
import { InventoryService, InventoryStockDto, StockMovementDto } from '../../../../core/services/inventory.service';
import { WarehousesService } from '../../../../core/services/warehouses.service';

import { ToastService } from '../../../../core/services/toast.service';

import { CategoriesService, Category } from '../../../../core/services/categories.service';


import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([BarChart, PieChart, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer]);

interface StockItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  warehouse: string;
  shelf: string;
  quantity: number;
  reserved: number;
  available: number;
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
  location: string;
}

@Component({
  selector: 'app-current-stock',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './current-stock.component.html',
  styleUrls: ['./current-stock.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrentStockComponent implements OnInit, OnDestroy {
  private readonly inventory = inject(InventoryService);
  private readonly warehousesService = inject(WarehousesService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly warehouseNameToId = new Map<string, string>();
  private readonly categoryNameToId = new Map<string, string>();
  private readonly destroy$ = new Subject<void>();

  searchTerm = signal('');
  warehouseFilter = signal('All Warehouses');
  categoryFilter = signal('All Categories');
  statusFilter = signal('All Status');

  showDetailsModal = signal(false);
  selectedStock = signal<StockItem | null>(null);
  selected = signal(new Set<string>());

  bulkAdjustQty = signal<number | null>(1);
  bulkAdjustType = signal<'increase' | 'decrease' | 'set'>('decrease');
  bulkAdjustReason = signal('');

  showItemAdjustModal = signal(false);
  activeItemForAdjust = signal<StockItem | null>(null);

  loading = signal(false);
  loadError = signal<string | null>(null);

  summary = signal({ totalItems: 0, totalValue: 0, totalUnits: 0, lowStock: 0, inStock: 0 });

  stockItems = signal<StockItem[]>([]);
  stockLocations = signal<StockLocation[]>([]);
  stockMovements = signal<StockMovementDto[]>([]);

  warehouses = signal<string[]>(['All Warehouses']);
  categories = signal<string[]>(['All Categories']);
  statuses = ['All Status', 'Good', 'Low', 'Critical'];

  filteredStock = computed(() => {
    let filtered = this.stockItems();
    const term = this.searchTerm().trim().toLowerCase();
    if (term) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          item.sku.toLowerCase().includes(term) ||
          item.category.toLowerCase().includes(term),
      );
    }
    if (this.warehouseFilter() !== 'All Warehouses') {
      filtered = filtered.filter((item) => item.warehouse === this.warehouseFilter());
    }
    if (this.categoryFilter() !== 'All Categories') {
      filtered = filtered.filter((item) => item.category === this.categoryFilter());
    }
    if (this.statusFilter() !== 'All Status') {
      filtered = filtered.filter((item) => item.status === this.statusFilter().toLowerCase());
    }
    return filtered;
  });

  statusDistribution = computed(() => {
    const items = this.stockItems();
    return [
      { name: 'Good', value: items.filter(i => i.status === 'good').length },
      { name: 'Low', value: items.filter(i => i.status === 'low').length },
      { name: 'Critical', value: items.filter(i => i.status === 'critical').length },
    ];
  });

  categoryDistribution = computed(() => {
    const map = new Map<string, number>();
    for (const item of this.stockItems()) {
      map.set(item.category, (map.get(item.category) || 0) + item.quantity);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  });

  get statusChartOpts(): Record<string, unknown> {
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      graphic: [{
        type: 'text', left: 'center', top: 'center',
        style: { text: `${this.stockItems().length}`, fill: '#1e293b', fontSize: 26, fontWeight: 800, fontFamily: 'Inter, sans-serif' }
      }],
      series: [{
        type: 'pie', radius: ['55%', '78%'], center: ['50%', '50%'],
        avoidLabelOverlap: false,
        label: { show: true, position: 'outside', formatter: '{b}\n{d}%', color: '#94a3b8', fontSize: 11, lineHeight: 16, fontWeight: 600 },
        emphasis: { itemStyle: { shadowBlur: 15, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.2)' } },
        animationDuration: 1000, animationEasing: 'cubicOut',
        data: [
          { name: 'Good', value: this.statusDistribution()[0].value, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [{ offset: 0, color: '#10b981' }, { offset: 1, color: '#059669' }]) as any } },
          { name: 'Low', value: this.statusDistribution()[1].value, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [{ offset: 0, color: '#f59e0b' }, { offset: 1, color: '#d97706' }]) as any } },
          { name: 'Critical', value: this.statusDistribution()[2].value, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [{ offset: 0, color: '#ef4444' }, { offset: 1, color: '#dc2626' }]) as any } },
        ]
      }]
    };
  }

  get categoryChartOpts(): Record<string, unknown> {
    const data = this.categoryDistribution().slice(0, 8);
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '5%', bottom: '12%', top: '8%', containLabel: true },
      xAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)' } } },
      yAxis: { type: 'category', data: data.map(d => d.name).reverse(), axisLabel: { color: '#64748b', fontWeight: 600 }, axisLine: { show: false }, axisTick: { show: false } },
      series: [{
        type: 'bar', data: data.map(d => ({
          value: d.value,
          itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#8b5cf6' }]) as any, borderRadius: [0, 6, 6, 0] }
        })).reverse(),
        barWidth: '60%', animationDuration: 800, animationEasing: 'elasticOut'
      }]
    };
  }

  ngOnInit(): void {
    this.loadWarehouses();
    this.loadCategories();
  }

  private loadWarehouses(): void {
    this.warehousesService.getAll({ isActive: true }).subscribe({
      next: (res) => {
        this.warehouseNameToId.clear();
        if (res.success !== false && Array.isArray(res.data)) {
          for (const w of res.data as Array<{ id: string; warehouseName: string }>) {
            this.warehouseNameToId.set(w.warehouseName, w.id);
          }
          this.warehouses.set(['All Warehouses', ...(res.data as Array<{ warehouseName: string }>).map((w) => w.warehouseName)]);
        }
      },
      error: () => undefined,
      complete: () => this.loadStock(),
    });
  }

  private loadCategories(): void {
    this.categoriesService.getAll(1, 100).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.categoryNameToId.clear();
        if (res.success !== false && res.data?.items) {
          for (const c of res.data.items) {
            this.categoryNameToId.set(c.categoryName, String(c.id));
          }
          this.categories.set(['All Categories', ...res.data.items.map((c) => c.categoryName)]);
        }
      },
      error: () => undefined,
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSelect(id: string): void {
    const next = new Set(this.selected());
    next.has(id) ? next.delete(id) : next.add(id);
    this.selected.set(next);
  }

  isSelected(id: string): boolean {
    return this.selected().has(id);
  }

  selectAll(): void {
    this.selected.set(new Set(this.filteredStock().map((item) => item.id)));
  }

  selectLowStock(): void {
    this.selected.set(new Set(this.stockItems().filter((item) => item.status !== 'good').map((item) => item.id)));
  }

  selectOutOfStock(): void {
    this.selected.set(new Set(this.stockItems().filter((item) => item.quantity === 0).map((item) => item.id)));
  }

  clearSelection(): void {
    this.selected.set(new Set());
  }

  bulkExport(): void {
    const rows = this.selected().size
      ? this.stockItems().filter((item) => this.selected().has(item.id))
      : this.filteredStock();
    if (!rows.length) {
      this.toast.info('No stock data to export. Adjust your filters or load inventory first.');
      return;
    }

    const headers = [
      'SKU',
      'Item Name',
      'Category',
      'Warehouse',
      'Shelf',
      'Quantity',
      'Available',
      'Reserved',
      'Status',
    ];

    const escape = (value: string): string =>
      `"${value.replace(/"/g, '""')}"`;

    const csvRows = rows.map((row) =>
      [
        row.sku,
        row.name,
        row.category,
        row.warehouse,
        row.shelf,
        String(row.quantity),
        String(row.available),
        String(row.reserved),
        this.statusLabel(row.status),
      ]
        .map(escape)
        .join(','),
    );

    const csv = [headers.join(','), ...csvRows].join('\r\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const pad = (n: number): string => String(n).padStart(2, '0');
    const filename = `current-stock-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.csv`;

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);

    this.toast.success(`Exported ${rows.length} item(s) to CSV successfully.`);
  }

  bulkGenerateQRCodes(): void {
    const rows = this.selected().size ? this.stockItems().filter((item) => this.selected().has(item.id)) : this.filteredStock();
    if (!rows.length) return;
    const url = this.router.url;
    if (url.startsWith('/admin')) {
      const payload = rows.map((row) => ({ id: row.id, itemId: row.id, itemName: row.name, sku: row.sku, warehouseId: row.warehouse, shelfId: row.shelf }));
      this.router.navigate(['/admin/inventory/qr-codes'], { state: { items: payload } });
    } else {
      this.router.navigate(['/storekeeper/warehouse/scanner']);
    }
  }

  openItemAdjustModal(item: StockItem): void {
    this.activeItemForAdjust.set(item);
    this.bulkAdjustQty.set(1);
    this.bulkAdjustType.set('decrease');
    this.bulkAdjustReason.set('Adjustment from item modal');
    this.showItemAdjustModal.set(true);
  }

  closeItemAdjustModal(): void {
    this.activeItemForAdjust.set(null);
    this.showItemAdjustModal.set(false);
  }

  async performItemAdjust(): Promise<void> {
    const item = this.activeItemForAdjust();
    if (!item) return;
    const qty = Number(this.bulkAdjustQty());
    if (Number.isNaN(qty)) return;
    try {
      await firstValueFrom(
        this.inventory.adjustStock({
          itemId: item.id,
          shelfId: '',
          adjustmentType: this.bulkAdjustType(),
          quantity: qty,
          reason: this.bulkAdjustReason() || 'Item adjustment',
        }),
      );
    } catch (error) {
      console.error('Item adjust error', error);
    }
    this.showItemAdjustModal.set(false);
    this.loadStock();
  }

  issueItem(item: StockItem): void {
    this.inventory.adjustStock({ itemId: item.id, shelfId: '', adjustmentType: 'decrease', quantity: 1, reason: 'Issue' }).subscribe({
      next: () => this.loadStock(),
      error: (error: unknown) => console.error(error),
    });
  }

  transferStock(item: StockItem): void {
    this.inventory.adjustStock({ itemId: item.id, shelfId: '', adjustmentType: 'decrease', quantity: 1, reason: 'Transfer out' }).subscribe({
      next: () => this.loadStock(),
      error: (error: unknown) => console.error(error),
    });
  }

  printLabel(item: StockItem): void {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<div style="font-family: Arial; padding: 16px;"><h2>${item.name}</h2><p>SKU: ${item.sku}</p><p>Warehouse: ${item.warehouse}</p><p>Shelf: ${item.shelf}</p></div>`);
    win.document.close();
    win.print();
  }

  viewQR(item: StockItem): void {
    const payload = [{ id: item.id, itemId: item.id, itemName: item.name, sku: item.sku, warehouseId: item.warehouse, shelfId: item.shelf }];
    this.router.navigate(['/admin/inventory/qr-codes'], { state: { items: payload } });
  }

  loadStock(): void {
    this.loading.set(true);
    this.loadError.set(null);
    const params: { warehouseId?: string; categoryId?: string } = {};
    const wname = this.warehouseFilter();
    if (wname !== 'All Warehouses') {
      const id = this.warehouseNameToId.get(wname);
      if (id) params.warehouseId = id;
    }
    const cname = this.categoryFilter();
    if (cname !== 'All Categories') {
      const id = this.categoryNameToId.get(cname);
      if (id) params.categoryId = id;
    }

    this.inventory.getStockOverview(params).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success === false || !Array.isArray(res.data)) {
          this.loadError.set(res.message || 'No stock data returned.');
          return;
        }

        const rows = res.data.map((row) => this.mapRow(row));
        this.stockItems.set(rows);
        const low = rows.filter((item) => item.status !== 'good').length;
        const units = rows.reduce((sum, item) => sum + item.quantity, 0);
        this.summary.set({ totalItems: rows.length, totalValue: 0, totalUnits: units, lowStock: low, inStock: rows.length - low });
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.loadError.set('Failed to load inventory.');
        console.error(error);
      },
    });
  }

  private mapRow(row: InventoryStockDto): StockItem {
    const min = Number(row.minimumThreshold) || 10;
    const qty = Number(row.currentQuantity) || 0;
    let status: 'good' | 'low' | 'critical' = 'good';
    if (min > 0) {
      if (qty <= min * 0.25) status = 'critical';
      else if (qty <= min) status = 'low';
    }

    return {
      id: row.id,
      sku: row.sku || '\u2014',
      name: row.itemName || '\u2014',
      category: 'General',
      warehouse: row.warehouseName || '\u2014',
      shelf: row.shelfLocation || '\u2014',
      quantity: qty,
      reserved: Number(row.reservedQuantity) || 0,
      available: row.availableQuantity != null ? Number(row.availableQuantity) : qty,
      status,
    };
  }

  getStatusColor(status: string): string {
    if (status === 'good') return 'green';
    if (status === 'low') return 'yellow';
    if (status === 'critical') return 'red';
    return 'gray';
  }

  getStatusEmoji(status: string): string {
    if (status === 'good') return '\uD83D\uDFE2';
    if (status === 'low') return '\uD83D\uDFE1';
    if (status === 'critical') return '\uD83D\uDD34';
    return '\u26AA';
  }

  formatNumber(value: number): string {
    return value.toLocaleString();
  }

  formatValue(value: number): string {
    if (value >= 1000000) {
      return '$' + (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
      return '$' + (value / 1000).toFixed(0) + 'K';
    }
    return '$' + value.toLocaleString();
  }

  openDetailsModal(item: StockItem): void {
    this.selectedStock.set(item);
    this.stockLocations.set([
      {
        warehouse: item.warehouse,
        shelfLocation: item.shelf,
        quantity: item.quantity,
        reserved: item.reserved,
        available: item.available,
      },
    ]);
    
    // Load stock movements for this item
    this.inventory.getStockMovementsByItem(item.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success !== false && Array.isArray(res.data)) {
          this.stockMovements.set(res.data);
        } else {
          this.stockMovements.set([]);
        }
      },
      error: () => {
        this.stockMovements.set([]);
      },
    });

    this.showDetailsModal.set(true);
  }

  closeModal(): void {
    this.showDetailsModal.set(false);
    this.selectedStock.set(null);
    this.stockMovements.set([]);
  }

  exportData(): void {
    this.bulkExport();
  }

  refreshData(): void {
    this.loadStock();
  }

  onWarehouseFilterChange(): void {
    this.loadStock();
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.warehouseFilter.set('All Warehouses');
    this.categoryFilter.set('All Categories');
    this.statusFilter.set('All Status');
    this.loadStock();
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'good': return 'Good';
      case 'low': return 'Low';
      case 'critical': return 'Critical';
      default: return 'Unknown';
    }
  }
}
