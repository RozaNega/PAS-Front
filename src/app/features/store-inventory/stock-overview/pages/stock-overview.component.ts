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
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DashboardService, DashboardStatistics } from '../../../../core/services/dashboard.service';
import {
  InventoryValuationItemDto,
  InventoryValuationReportDto,
  ReportsService,
  StockMovementReportDto,
  MovementTrendDto,
} from '../../../../core/services/reports.service';

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

interface ActivitySummary {
  inflow: number;
  outflow: number;
  net: number;
}

interface PendingActions {
  pendingIssues: number;
  pendingReceiving: number;
  lowStockAlerts: number;
}

interface TrendBar {
  label: string;
  totalHeight: number;
  inflowHeight: number;
  outflowHeight: number;
}

@Component({
  selector: 'app-stock-overview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-overview.component.html',
  styleUrls: ['./stock-overview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockOverviewComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly dashboardService = inject(DashboardService);
  private readonly reportsService = inject(ReportsService);

  readonly currentDate = signal(this.formatDateLabel(new Date()));
  readonly lastUpdated = signal('Loading...');
  readonly isLoading = signal(false);
  readonly loadError = signal('');

  readonly totalItems = signal(0);
  readonly totalStockValue = signal(0);
  readonly avgTurnoverRate = signal(0);
  readonly stockTurnoverDays = signal(0);
  readonly lowStockItems = signal(0);

  readonly warehouseStock = signal<WarehouseStock[]>([]);
  readonly categoryStock = signal<CategoryStock[]>([]);
  readonly topItems = signal<StockItem[]>([]);
  readonly trendBars = signal<TrendBar[]>([]);

  readonly todayActivity = signal<ActivitySummary>(this.emptyActivity());
  readonly weekActivity = signal<ActivitySummary>(this.emptyActivity());
  readonly monthActivity = signal<ActivitySummary>(this.emptyActivity());
  readonly pendingActions = signal<PendingActions>({
    pendingIssues: 0,
    pendingReceiving: 0,
    lowStockAlerts: 0,
  });

  readonly valueChangeLabel = computed(() =>
    this.isLoading() ? 'Loading live valuation...' : 'Live valuation from backend',
  );
  readonly turnoverChangeLabel = computed(() =>
    this.isLoading() ? 'Loading movement rate...' : 'Rolling 30-day movement rate',
  );
  readonly daysChangeLabel = computed(() =>
    this.isLoading() ? 'Loading turnover window...' : 'Estimated from live outbound movement',
  );

  readonly hasTrendData = computed(() => this.trendBars().length > 0);
  readonly hasWarehouseData = computed(() => this.warehouseStock().length > 0);
  readonly hasCategoryData = computed(() => this.categoryStock().length > 0);
  readonly hasTopItems = computed(() => this.topItems().length > 0);

  ngOnInit(): void {
    this.loadData();
  }

  refreshData(): void {
    this.loadData();
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

  formatNumber(value: number): string {
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toLocaleString();
  }

  viewWarehouseDetails(): void {
    const role = this.getCurrentRole();

    if (role === 'manager') {
      void this.router.navigate(['/manager/reports/inventory']);
      return;
    }

    if (role === 'storekeeper') {
      void this.router.navigate(['/storekeeper/warehouse']);
      return;
    }

    void this.router.navigate(['/admin/warehouses']);
  }

  viewCategoryDetails(): void {
    const role = this.getCurrentRole();

    if (role === 'manager') {
      void this.router.navigate(['/manager/reports/inventory']);
      return;
    }

    if (role === 'storekeeper') {
      void this.router.navigate(['/storekeeper/inventory']);
      return;
    }

    void this.router.navigate(['/admin/inventory/current-stock']);
  }

  viewAllItems(): void {
    const role = this.getCurrentRole();

    if (role === 'manager') {
      void this.router.navigate(['/manager/reports/inventory']);
      return;
    }

    if (role === 'storekeeper') {
      void this.router.navigate(['/storekeeper/inventory']);
      return;
    }

    void this.router.navigate(['/admin/inventory/current-stock']);
  }

  private loadData(): void {
    this.isLoading.set(true);
    this.loadError.set('');

    const today = new Date();
    const todayIso = this.toIsoDate(today);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    forkJoin({
      dashboard: this.dashboardService.getStatistics().pipe(
        map((response) => response.data ?? null),
        catchError(() => of(null)),
      ),
      valuation: this.reportsService.getInventoryValuation({ asOfDate: todayIso }).pipe(
        map((response) => response.data ?? null),
        catchError(() => of(null)),
      ),
      movement: this.reportsService
        .getStockMovement({
          fromDate: this.toIsoDate(monthStart),
          toDate: todayIso,
        })
        .pipe(
          map((response) => response.data ?? null),
          catchError(() => of(null)),
        ),
    }).subscribe({
      next: ({ dashboard, valuation, movement }) => {
        this.applyDashboardData(dashboard, valuation, movement);
        this.isLoading.set(false);
      },
      error: () => {
        this.loadError.set('Unable to load live inventory data from the backend.');
        this.lastUpdated.set('Unavailable');
        this.isLoading.set(false);
      },
    });
  }

  private applyDashboardData(
    dashboard: DashboardStatistics | null,
    valuation: InventoryValuationReportDto | null,
    movement: StockMovementReportDto | null,
  ): void {
    const summary = valuation?.summary;
    const totalQuantity = summary?.totalQuantity ?? dashboard?.totalItems ?? 0;
    const totalValue = summary?.totalValue ?? dashboard?.totalStockValue ?? 0;
    const lowStockCount = summary?.lowStockItems ?? dashboard?.lowStockItemsCount ?? 0;
    const totalQuantityOut = movement?.summary?.totalQuantityOut ?? 0;

    this.totalItems.set(totalQuantity);
    this.totalStockValue.set(totalValue);
    this.lowStockItems.set(lowStockCount);
    this.avgTurnoverRate.set(this.calculateTurnoverRate(totalQuantity, totalQuantityOut));
    this.stockTurnoverDays.set(this.calculateTurnoverDays(totalQuantity, totalQuantityOut));

    this.pendingActions.set({
      pendingIssues: dashboard?.pendingRequisitions ?? 0,
      pendingReceiving: dashboard?.pendingInspections ?? 0,
      lowStockAlerts: lowStockCount,
    });

    this.warehouseStock.set(
      (valuation?.byWarehouse ?? []).slice(0, 6).map((warehouse) => ({
        name: warehouse.warehouseName?.trim() || 'Unassigned Warehouse',
        items: warehouse.totalQuantity || warehouse.itemCount || 0,
      })),
    );

    this.categoryStock.set(
      (valuation?.byCategory ?? []).slice(0, 6).map((category) => ({
        name: category.categoryName?.trim() || 'Uncategorized',
        items: category.totalQuantity || category.itemCount || 0,
        percentage: this.normalizePercentage(category.percentageOfTotal),
      })),
    );

    this.topItems.set(this.toTopItems(valuation?.items ?? []));
    this.trendBars.set(this.toTrendBars(movement?.dailyTrend ?? []));

    const dailyTrend = movement?.dailyTrend ?? [];
    this.todayActivity.set(this.sumMovementWindow(dailyTrend, 0));
    this.weekActivity.set(this.sumMovementWindow(dailyTrend, 6));
    this.monthActivity.set(this.sumAllMovement(dailyTrend));

    this.lastUpdated.set(
      this.formatLastUpdated(
        movement?.generatedAt ?? valuation?.generatedAt ?? new Date().toISOString(),
      ),
    );

    if (!dashboard && !valuation && !movement) {
      this.loadError.set('Unable to load live inventory data from the backend.');
    } else {
      this.loadError.set('');
    }
  }

  private toTopItems(items: InventoryValuationItemDto[]): StockItem[] {
    return [...items]
      .sort((left, right) => (right.totalValue ?? 0) - (left.totalValue ?? 0))
      .slice(0, 10)
      .map((item, index) => ({
        rank: index + 1,
        name: item.itemName?.trim() || item.sku?.trim() || `Item ${index + 1}`,
        stockQty: item.currentQuantity ?? 0,
        unitPrice: item.averageCost ?? 0,
        value: item.totalValue ?? 0,
      }));
  }

  private toTrendBars(dailyTrend: MovementTrendDto[]): TrendBar[] {
    if (dailyTrend.length === 0) {
      return [];
    }

    const recentTrend = dailyTrend.slice(-8);
    const maxValue = Math.max(
      ...recentTrend.map((entry) =>
        Math.max(entry.inbound + entry.outbound, entry.inbound, entry.outbound, 1),
      ),
      1,
    );

    return recentTrend.map((entry) => ({
      label: this.formatTrendLabel(entry.date),
      totalHeight: this.scaleHeight(entry.inbound + entry.outbound, maxValue),
      inflowHeight: this.scaleHeight(entry.inbound, maxValue),
      outflowHeight: this.scaleHeight(entry.outbound, maxValue),
    }));
  }

  private sumMovementWindow(
    dailyTrend: MovementTrendDto[],
    daysBackInclusive: number,
  ): ActivitySummary {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - daysBackInclusive);

    return dailyTrend.reduce<ActivitySummary>((summary, entry) => {
      const entryDate = new Date(entry.date);
      if (Number.isNaN(entryDate.getTime()) || entryDate < cutoff) {
        return summary;
      }

      return {
        inflow: summary.inflow + (entry.inbound ?? 0),
        outflow: summary.outflow + (entry.outbound ?? 0),
        net: summary.net + (entry.net ?? (entry.inbound ?? 0) - (entry.outbound ?? 0)),
      };
    }, this.emptyActivity());
  }

  private sumAllMovement(dailyTrend: MovementTrendDto[]): ActivitySummary {
    return dailyTrend.reduce<ActivitySummary>(
      (summary, entry) => ({
        inflow: summary.inflow + (entry.inbound ?? 0),
        outflow: summary.outflow + (entry.outbound ?? 0),
        net: summary.net + (entry.net ?? (entry.inbound ?? 0) - (entry.outbound ?? 0)),
      }),
      this.emptyActivity(),
    );
  }

  private emptyActivity(): ActivitySummary {
    return { inflow: 0, outflow: 0, net: 0 };
  }

  private calculateTurnoverRate(totalQuantity: number, totalQuantityOut: number): number {
    if (totalQuantity <= 0 || totalQuantityOut <= 0) {
      return 0;
    }

    return Number((totalQuantityOut / totalQuantity).toFixed(1));
  }

  private calculateTurnoverDays(totalQuantity: number, totalQuantityOut: number): number {
    if (totalQuantity <= 0 || totalQuantityOut <= 0) {
      return 0;
    }

    return Math.round((totalQuantity / totalQuantityOut) * 30);
  }

  private normalizePercentage(value: number | undefined): number {
    if (!value || Number.isNaN(value)) {
      return 0;
    }

    if (value <= 1) {
      return Math.round(value * 100);
    }

    return Math.round(value);
  }

  private scaleHeight(value: number, maxValue: number): number {
    if (value <= 0 || maxValue <= 0) {
      return 8;
    }

    return Math.max(8, Math.round((value / maxValue) * 110));
  }

  private formatTrendLabel(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  private formatDateLabel(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private formatLastUpdated(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Updated from backend';
    }

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  private toIsoDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getCurrentRole(): 'admin' | 'manager' | 'storekeeper' {
    const url = this.router.url;
    if (url.includes('/manager/')) return 'manager';
    if (url.includes('/storekeeper/')) return 'storekeeper';
    return 'admin';
  }
}
