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
import { ItemMasterService, LowStockItemDto } from '../../../../core/services/item-master.service';
import {
  InventoryValuationItemDto,
  ReportsService,
} from '../../../../core/services/reports.service';

type AlertSeverity = 'Critical' | 'Warning' | 'Info';
type AlertThreshold = 'Critical Only' | 'Critical & Warning' | 'All Low Stock';

interface LowStockItem {
  id: string;
  severity: AlertSeverity;
  name: string;
  sku: string;
  current: number;
  minStock: number;
  deficit: number;
  location: string;
  locations: string[];
  warehouses: string[];
  category: string;
  available: number;
  reserved: number;
  unitOfMeasure: string;
}

interface AnalysisItem {
  name: string;
  items: number;
  percentage: number;
}

@Component({
  selector: 'app-low-stock',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './low-stock.component.html',
  styleUrls: ['./low-stock.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LowStockComponent implements OnInit {
  private readonly itemMasterService = inject(ItemMasterService);
  private readonly reportsService = inject(ReportsService);

  readonly alertThreshold = signal<AlertThreshold>('Critical & Warning');
  readonly warehouseFilter = signal('All Warehouses');
  readonly categoryFilter = signal('All Categories');
  readonly isLoading = signal(false);
  readonly loadError = signal('');

  private readonly items = signal<LowStockItem[]>([]);

  readonly warehouses = computed(() => [
    'All Warehouses',
    ...this.uniqueSorted(this.items().flatMap((item) => item.warehouses)),
  ]);

  readonly categories = computed(() => [
    'All Categories',
    ...this.uniqueSorted(this.items().map((item) => item.category)),
  ]);

  readonly allLowStock = computed(() => {
    const threshold = this.alertThreshold();
    const warehouse = this.warehouseFilter();
    const category = this.categoryFilter();

    return this.items().filter((item) => {
      const matchesThreshold =
        threshold === 'All Low Stock'
          ? true
          : threshold === 'Critical Only'
            ? item.severity === 'Critical'
            : item.severity === 'Critical' || item.severity === 'Warning';

      const matchesWarehouse =
        warehouse === 'All Warehouses' || item.warehouses.includes(warehouse);
      const matchesCategory = category === 'All Categories' || item.category === category;

      return matchesThreshold && matchesWarehouse && matchesCategory;
    });
  });

  readonly criticalAlerts = computed(() =>
    this.allLowStock().filter((item) => item.severity === 'Critical'),
  );

  readonly warningAlerts = computed(() =>
    this.allLowStock().filter((item) => item.severity === 'Warning'),
  );

  readonly categoryAnalysis = computed(() =>
    this.buildAnalysis(this.allLowStock(), (item) => item.category),
  );

  readonly warehouseAnalysis = computed(() =>
    this.buildAnalysis(this.allLowStock(), (item) => item.warehouses[0] ?? 'Unassigned'),
  );

  readonly showModal = signal(false);
  readonly selectedItem = signal<LowStockItem | null>(null);

  ngOnInit(): void {
    this.loadData();
  }

  refreshData(): void {
    this.loadData();
  }

  openOrderModal(item: LowStockItem): void {
    this.selectedItem.set(item);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedItem.set(null);
  }

  getSeverityIcon(severity: AlertSeverity): string {
    const icons: Record<AlertSeverity, string> = {
      Critical: '🔴',
      Warning: '🟡',
      Info: '🔵',
    };

    return icons[severity];
  }

  getSeverityClass(severity: AlertSeverity): string {
    const classes: Record<AlertSeverity, string> = {
      Critical: 'critical',
      Warning: 'warning',
      Info: 'info',
    };

    return classes[severity];
  }

  trackByAnalysisName(_: number, item: AnalysisItem): string {
    return item.name;
  }

  private loadData(): void {
    this.isLoading.set(true);
    this.loadError.set('');

    forkJoin({
      lowStock: this.itemMasterService.getLowStockItems().pipe(
        map((response) => response.data ?? []),
        catchError(() => of([] as LowStockItemDto[])),
      ),
      valuation: this.reportsService.getInventoryValuation({ asOfDate: this.todayIsoDate() }).pipe(
        map((response) => response.data ?? null),
        catchError(() => of(null)),
      ),
    }).subscribe({
      next: ({ lowStock, valuation }) => {
        const valuationById = new Map(
          (valuation?.items ?? []).map((item) => [item.itemId, item] as const),
        );

        const mappedItems = lowStock
          .map((item) => this.toLowStockItem(item, valuationById.get(item.itemId)))
          .sort((left, right) => {
            const severityDiff =
              this.severityRank(left.severity) - this.severityRank(right.severity);
            if (severityDiff !== 0) {
              return severityDiff;
            }

            return right.deficit - left.deficit;
          });

        this.items.set(mappedItems);
        this.isLoading.set(false);

        if (mappedItems.length === 0) {
          this.loadError.set('No low-stock items were returned by the backend.');
        }
      },
      error: () => {
        this.items.set([]);
        this.loadError.set('Unable to load low-stock data from the backend.');
        this.isLoading.set(false);
      },
    });
  }

  private toLowStockItem(
    item: LowStockItemDto,
    valuationItem: InventoryValuationItemDto | undefined,
  ): LowStockItem {
    const current = item.currentStock ?? valuationItem?.currentQuantity ?? 0;
    const minStock = item.minStockLevel ?? valuationItem?.minStockLevel ?? 0;
    const deficit = Math.max(item.deficit ?? minStock - current, minStock - current, 0);
    const locations = this.resolveLocations(item, valuationItem);
    const warehouses = this.resolveWarehouses(locations, valuationItem);
    const severity = this.toSeverity(current, minStock, deficit);

    return {
      id: item.itemId,
      severity,
      name: item.itemName?.trim() || valuationItem?.itemName?.trim() || 'Unknown Item',
      sku: item.sku?.trim() || valuationItem?.sku?.trim() || 'N/A',
      current,
      minStock,
      deficit,
      location: locations.join(', '),
      locations,
      warehouses,
      category:
        valuationItem?.categoryName?.trim() ||
        this.categoryFromStatus(valuationItem?.status) ||
        'Uncategorized',
      available: valuationItem?.availableQuantity ?? current,
      reserved: valuationItem?.reservedQuantity ?? 0,
      unitOfMeasure: valuationItem?.unitOfMeasure?.trim() || 'Units',
    };
  }

  private resolveLocations(
    item: LowStockItemDto,
    valuationItem: InventoryValuationItemDto | undefined,
  ): string[] {
    const valuationLocations = (valuationItem?.locations ?? [])
      .map((location) => {
        const warehouse = location.warehouseName?.trim();
        const shelf = location.shelfLocation?.trim();

        if (warehouse && shelf) {
          return `${warehouse} - ${shelf}`;
        }

        return warehouse || shelf || '';
      })
      .filter((location) => location.length > 0);

    if (valuationLocations.length > 0) {
      return valuationLocations;
    }

    const directLocations = (item.locations ?? [])
      .map((location) => location.trim())
      .filter((location) => location.length > 0);

    return directLocations.length > 0 ? directLocations : ['Location not provided'];
  }

  private resolveWarehouses(
    locations: string[],
    valuationItem: InventoryValuationItemDto | undefined,
  ): string[] {
    const fromValuation = (valuationItem?.locations ?? [])
      .map((location) => location.warehouseName?.trim() || '')
      .filter((warehouse) => warehouse.length > 0);

    if (fromValuation.length > 0) {
      return this.uniqueSorted(fromValuation);
    }

    return this.uniqueSorted(
      locations.map((location) => location.split(' - ')[0]?.trim() || 'Unassigned'),
    );
  }

  private toSeverity(current: number, minStock: number, deficit: number): AlertSeverity {
    if (
      current <= 0 ||
      current <= Math.max(1, Math.floor(minStock * 0.25)) ||
      deficit >= Math.max(1, Math.floor(minStock * 0.75))
    ) {
      return 'Critical';
    }

    if (current <= Math.max(1, Math.floor(minStock * 0.6))) {
      return 'Warning';
    }

    return 'Info';
  }

  private buildAnalysis(
    items: LowStockItem[],
    getKey: (item: LowStockItem) => string,
  ): AnalysisItem[] {
    const counts = new Map<string, number>();

    for (const item of items) {
      const key = getKey(item) || 'Unassigned';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const maxCount = Math.max(...counts.values(), 1);

    return [...counts.entries()]
      .map(([name, count]) => ({
        name,
        items: count,
        percentage: Math.round((count / maxCount) * 100),
      }))
      .sort((left, right) => right.items - left.items);
  }

  private severityRank(severity: AlertSeverity): number {
    if (severity === 'Critical') return 0;
    if (severity === 'Warning') return 1;
    return 2;
  }

  private uniqueSorted(values: string[]): string[] {
    return [...new Set(values.filter((value) => value.trim().length > 0))].sort((a, b) =>
      a.localeCompare(b),
    );
  }

  private todayIsoDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private categoryFromStatus(status: string | undefined): string {
    return status?.trim() || '';
  }
}
