import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { InventoryService, WarehouseDto } from '../../../../core/services/inventory.service';
import {
  InventoryValuationItemDto,
  MovementTrendDto,
  ReportsService,
  StockMovementReportDto,
} from '../../../../core/services/reports.service';

type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';

interface StockItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  warehouse: string;
  warehouseNames: string[];
  quantity: number;
  unitPrice: number;
  total: number;
  status: StockStatus;
}

interface CategoryBreakdownItem {
  name: string;
  percentage: number;
  units: number;
  value: number;
}

interface TopValueItem {
  name: string;
  value: number;
  percentage: number;
}

interface TurnoverCategoryItem {
  name: string;
  rate: string;
  percentage: number;
}

interface TrendBar {
  label: string;
  height: number;
  value: number;
}

@Component({
  selector: 'app-stock-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-report.component.html',
  styleUrls: ['./stock-report.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockReportComponent implements OnInit {
  private readonly reportsService = inject(ReportsService);
  private readonly inventoryService = inject(InventoryService);

  readonly startDate = signal(this.daysAgoIsoDate(30));
  readonly endDate = signal(this.todayIsoDate());
  readonly warehouseFilter = signal('All Warehouses');
  readonly categoryFilter = signal('All Categories');
  readonly statusFilter = signal('All Status');
  readonly reportType = signal('Valuation');
  readonly format = signal('CSV');
  readonly includeZeroStock = signal('No');
  readonly isLoading = signal(false);
  readonly reportGenerated = signal(false);
  readonly lastRunTime = signal<Date | null>(null);
  readonly loadError = signal('');

  readonly reportTypes = ['Summary', 'Detailed', 'Valuation', 'Movement'];
  readonly formats = ['PDF', 'Excel', 'CSV'];
  readonly statuses = ['All Status', 'In Stock', 'Low Stock', 'Out of Stock'];

  private readonly valuationItems = signal<StockItem[]>([]);
  private readonly movementReport = signal<StockMovementReportDto | null>(null);
  private readonly warehouses = signal<WarehouseDto[]>([]);

  readonly warehouseOptions = computed(() => [
    'All Warehouses',
    ...this.uniqueSorted([
      ...this.warehouses().map((warehouse) => warehouse.name),
      ...this.valuationItems().flatMap((item) => item.warehouseNames),
    ]),
  ]);

  readonly categoryOptions = computed(() => [
    'All Categories',
    ...this.uniqueSorted(this.valuationItems().map((item) => item.category)),
  ]);

  readonly filteredItems = computed(() => {
    const warehouse = this.warehouseFilter();
    const category = this.categoryFilter();
    const status = this.statusFilter();
    const includeZero = this.includeZeroStock() === 'Yes';

    return this.valuationItems().filter((item) => {
      const matchesWarehouse =
        warehouse === 'All Warehouses' || item.warehouseNames.includes(warehouse);
      const matchesCategory = category === 'All Categories' || item.category === category;
      const matchesStatus = status === 'All Status' || item.status === status;
      const matchesZeroStock = includeZero || item.quantity > 0;

      return matchesWarehouse && matchesCategory && matchesStatus && matchesZeroStock;
    });
  });

  readonly totalItems = computed(() => this.filteredItems().length);
  readonly totalValue = computed(() =>
    this.filteredItems().reduce((sum, item) => sum + item.total, 0),
  );
  readonly totalUnits = computed(() =>
    this.filteredItems().reduce((sum, item) => sum + item.quantity, 0),
  );

  readonly turnoverRate = computed(() => {
    const totalUnits = Math.max(this.totalUnits(), 1);
    const outbound = this.movementReport()?.summary?.totalQuantityOut ?? 0;
    return `${(outbound / totalUnits).toFixed(1)}x`;
  });

  readonly avgStockLevel = computed(() => {
    const itemCount = Math.max(this.totalItems(), 1);
    return `${Math.round(this.totalUnits() / itemCount)} units/item`;
  });

  readonly categoryBreakdown = computed<CategoryBreakdownItem[]>(() => {
    const items = this.filteredItems();
    const totals = new Map<string, { units: number; value: number }>();

    for (const item of items) {
      const entry = totals.get(item.category) ?? { units: 0, value: 0 };
      entry.units += item.quantity;
      entry.value += item.total;
      totals.set(item.category, entry);
    }

    const maxValue = Math.max(...[...totals.values()].map((entry) => entry.value), 1);

    return [...totals.entries()]
      .map(([name, entry]) => ({
        name,
        units: entry.units,
        value: entry.value,
        percentage: Math.round((entry.value / maxValue) * 100),
      }))
      .sort((left, right) => right.value - left.value);
  });

  readonly topItemsByValue = computed<TopValueItem[]>(() => {
    const items = [...this.filteredItems()]
      .sort((left, right) => right.total - left.total)
      .slice(0, 10);
    const maxValue = Math.max(...items.map((item) => item.total), 1);

    return items.map((item) => ({
      name: item.name,
      value: item.total,
      percentage: Math.round((item.total / maxValue) * 100),
    }));
  });

  readonly turnoverByCategory = computed<TurnoverCategoryItem[]>(() => {
    const valuationById = new Map(this.valuationItems().map((item) => [item.id, item] as const));
    const movementItems = this.movementReport()?.topMovingItems ?? [];
    const totals = new Map<string, { moved: number; onHand: number }>();

    for (const movementItem of movementItems) {
      const valuationItem = valuationById.get(movementItem.itemId);
      const category = valuationItem?.category ?? 'Uncategorized';
      const entry = totals.get(category) ?? { moved: 0, onHand: 0 };
      entry.moved += Math.abs(movementItem.totalQuantity ?? 0);
      entry.onHand += valuationItem?.quantity ?? 0;
      totals.set(category, entry);
    }

    const maxMoved = Math.max(...[...totals.values()].map((entry) => entry.moved), 1);

    return [...totals.entries()]
      .map(([name, entry]) => ({
        name,
        rate: `${(entry.moved / Math.max(entry.onHand, 1)).toFixed(1)}x`,
        percentage: Math.round((entry.moved / maxMoved) * 100),
      }))
      .sort((left, right) => right.percentage - left.percentage)
      .slice(0, 10);
  });

  readonly trendBars = computed(() => this.toTrendBars(this.movementReport()?.dailyTrend ?? []));

  ngOnInit(): void {
    this.loadData();
  }

  generateReport(): void {
    this.loadData();
  }

  exportToExcel(): void {
    const items = this.filteredItems();
    const headers = [
      'SKU',
      'Name',
      'Category',
      'Warehouse',
      'Quantity',
      'Unit Price',
      'Total',
      'Status',
    ];
    const content = [
      headers.join(','),
      ...items.map((item) =>
        [
          this.escapeCsv(item.sku),
          this.escapeCsv(item.name),
          this.escapeCsv(item.category),
          this.escapeCsv(item.warehouse),
          String(item.quantity),
          String(item.unitPrice),
          String(item.total),
          this.escapeCsv(item.status),
        ].join(','),
      ),
    ].join('\n');

    this.downloadFile(content, 'stock-report.csv', 'text/csv;charset=utf-8;');
  }

  exportToPDF(): void {
    window.print();
  }

  emailReport(): void {
    const subject = encodeURIComponent('Stock Report');
    const body = encodeURIComponent(
      `Stock Report Summary:\n\nTotal Items: ${this.totalItems()}\nTotal Value: ${this.formatValue(
        this.totalValue(),
      )}\nTotal Units: ${this.totalUnits()}\nTurnover Rate: ${this.turnoverRate()}`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  printReport(): void {
    window.print();
  }

  readonly showScheduleModal = signal(false);
  readonly scheduleFrequency = signal('weekly');
  readonly scheduleEmail = signal('');
  readonly scheduleDate = signal(this.todayIsoDate());

  scheduleReport(): void {
    this.showScheduleModal.set(true);
  }

  closeScheduleModal(): void {
    this.showScheduleModal.set(false);
  }

  saveSchedule(): void {
    this.closeScheduleModal();
  }

  formatValue(value: number): string {
    if (value >= 1000000) {
      return '$' + (value / 1000000).toFixed(2) + 'M';
    }
    if (value >= 1000) {
      return '$' + (value / 1000).toFixed(0) + 'K';
    }
    return '$' + value.toLocaleString();
  }

  getStatusIcon(status: StockStatus): string {
    const icons: Record<StockStatus, string> = {
      'In Stock': '🟢',
      'Low Stock': '🟡',
      'Out of Stock': '🔴',
    };

    return icons[status];
  }

  getMonthName(month: number): string {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return months[month - 1] || '';
  }

  private loadData(): void {
    this.isLoading.set(true);
    this.reportGenerated.set(false);
    this.loadError.set('');

    forkJoin({
      valuation: this.reportsService.getInventoryValuation({ asOfDate: this.endDate() }).pipe(
        map((response) => response.data ?? null),
        catchError(() => of(null)),
      ),
      movement: this.reportsService
        .getStockMovement({
          fromDate: this.startDate(),
          toDate: this.endDate(),
        })
        .pipe(
          map((response) => response.data ?? null),
          catchError(() => of(null)),
        ),
      warehouses: this.inventoryService.getAllWarehouses().pipe(
        map((response) => response.data ?? []),
        catchError(() => of([] as WarehouseDto[])),
      ),
    }).subscribe({
      next: ({ valuation, movement, warehouses }) => {
        this.valuationItems.set((valuation?.items ?? []).map((item) => this.toStockItem(item)));
        this.movementReport.set(movement);
        this.warehouses.set(warehouses);
        this.reportGenerated.set(true);
        this.lastRunTime.set(new Date());
        this.isLoading.set(false);

        if (!valuation) {
          this.loadError.set('Unable to load stock report data from the backend.');
        }
      },
      error: () => {
        this.valuationItems.set([]);
        this.movementReport.set(null);
        this.warehouses.set([]);
        this.reportGenerated.set(false);
        this.isLoading.set(false);
        this.loadError.set('Unable to load stock report data from the backend.');
      },
    });
  }

  private toStockItem(item: InventoryValuationItemDto): StockItem {
    const warehouseNames = this.uniqueSorted(
      (item.locations ?? [])
        .map((location) => location.warehouseName?.trim() || '')
        .filter((name) => name.length > 0),
    );

    const quantity = item.currentQuantity ?? 0;
    const minStock = item.minStockLevel ?? 0;

    return {
      id: item.itemId,
      sku: item.sku?.trim() || 'N/A',
      name: item.itemName?.trim() || 'Unknown Item',
      category: item.categoryName?.trim() || 'Uncategorized',
      warehouse:
        warehouseNames.length > 1
          ? `${warehouseNames[0]} +${warehouseNames.length - 1}`
          : warehouseNames[0] || 'N/A',
      warehouseNames: warehouseNames.length > 0 ? warehouseNames : ['N/A'],
      quantity,
      unitPrice: item.averageCost ?? 0,
      total: item.totalValue ?? 0,
      status: quantity <= 0 ? 'Out of Stock' : quantity <= minStock ? 'Low Stock' : 'In Stock',
    };
  }

  private toTrendBars(dailyTrend: MovementTrendDto[]): TrendBar[] {
    if (dailyTrend.length === 0) {
      return [];
    }

    const trend = dailyTrend.slice(-8);
    const maxValue = Math.max(
      ...trend.map((entry) => Math.max(entry.inbound + entry.outbound, Math.abs(entry.net), 1)),
      1,
    );

    return trend.map((entry, index) => ({
      label: this.formatTrendLabel(entry.date) || this.getMonthName(index + 1),
      height: this.scaleHeight(entry.inbound + entry.outbound, maxValue),
      value: entry.inbound + entry.outbound,
    }));
  }

  private formatTrendLabel(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  private scaleHeight(value: number, maxValue: number): number {
    if (value <= 0 || maxValue <= 0) {
      return 8;
    }

    return Math.max(8, Math.round((value / maxValue) * 120));
  }

  private todayIsoDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private daysAgoIsoDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  private uniqueSorted(values: string[]): string[] {
    return [...new Set(values.filter((value) => value.trim().length > 0))].sort((a, b) =>
      a.localeCompare(b),
    );
  }

  private escapeCsv(value: string): string {
    const normalized = value.replaceAll('"', '""');
    return `"${normalized}"`;
  }

  private downloadFile(content: string, fileName: string, contentType: string): void {
    const blob = new Blob([content], { type: contentType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}
