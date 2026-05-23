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
  MovementTrendDto,
  ReportsService,
  StockMovementDetailDto,
} from '../../../../core/services/reports.service';

type MovementType = 'Inflow' | 'Outflow' | 'Transfer' | 'Adjustment' | 'Other';

interface MovementRow {
  id: string;
  dateTime: string;
  type: MovementType;
  item: string;
  sku: string;
  quantity: number;
  refNumber: string;
  user: string;
  warehouse: string;
  location: string;
}

interface SummaryBucket {
  units: number;
  transactions: number;
}

interface MovementSummaryView {
  inflow: SummaryBucket;
  outflow: SummaryBucket;
  transfer: SummaryBucket;
  adjustment: SummaryBucket;
  netUnits: number;
  uniqueItems: number;
}

interface TrendBar {
  label: string;
  inflowHeight: number;
  outflowHeight: number;
  netHeight: number;
}

@Component({
  selector: 'app-stock-movements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-movements.component.html',
  styleUrls: ['./stock-movements.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockMovementsComponent implements OnInit {
  private readonly reportsService = inject(ReportsService);
  private readonly inventoryService = inject(InventoryService);

  readonly searchTerm = signal('');
  readonly startDate = signal(this.daysAgoIsoDate(30));
  readonly endDate = signal(this.todayIsoDate());
  readonly typeFilter = signal('All Types');
  readonly warehouseFilter = signal('All Warehouses');
  readonly userFilter = signal('All Users');
  readonly isLoading = signal(false);
  readonly loadError = signal('');

  readonly movementTypes = ['All Types', 'Inflow', 'Outflow', 'Transfer', 'Adjustment'];

  private readonly movementRows = signal<MovementRow[]>([]);
  private readonly dailyTrend = signal<MovementTrendDto[]>([]);
  private readonly warehouses = signal<WarehouseDto[]>([]);

  readonly warehouseOptions = computed(() => [
    'All Warehouses',
    ...this.uniqueSorted([
      ...this.warehouses().map((warehouse) => warehouse.name),
      ...this.movementRows().map((movement) => movement.warehouse),
    ]),
  ]);

  readonly userOptions = computed(() => [
    'All Users',
    ...this.uniqueSorted(this.movementRows().map((movement) => movement.user)),
  ]);

  readonly filteredMovements = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();
    const type = this.typeFilter();
    const warehouse = this.warehouseFilter();
    const user = this.userFilter();

    return this.movementRows().filter((movement) => {
      const matchesSearch =
        search.length === 0 ||
        movement.item.toLowerCase().includes(search) ||
        movement.sku.toLowerCase().includes(search) ||
        movement.refNumber.toLowerCase().includes(search) ||
        movement.location.toLowerCase().includes(search);

      const matchesType = type === 'All Types' || movement.type === type;
      const matchesWarehouse = warehouse === 'All Warehouses' || movement.warehouse === warehouse;
      const matchesUser = user === 'All Users' || movement.user === user;

      return matchesSearch && matchesType && matchesWarehouse && matchesUser;
    });
  });

  readonly summary = computed<MovementSummaryView>(() => {
    const rows = this.filteredMovements();

    const createBucket = (targetType: MovementType): SummaryBucket => {
      const matchingRows = rows.filter((row) => row.type === targetType);
      return {
        units: matchingRows.reduce((sum, row) => sum + Math.abs(row.quantity), 0),
        transactions: matchingRows.length,
      };
    };

    return {
      inflow: createBucket('Inflow'),
      outflow: createBucket('Outflow'),
      transfer: createBucket('Transfer'),
      adjustment: createBucket('Adjustment'),
      netUnits: rows.reduce((sum, row) => sum + row.quantity, 0),
      uniqueItems: new Set(rows.map((row) => row.sku || row.item)).size,
    };
  });

  readonly trendBars = computed(() => this.toTrendBars(this.dailyTrend()));

  ngOnInit(): void {
    this.loadData();
  }

  applyFilters(): void {
    this.loadData();
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.startDate.set(this.daysAgoIsoDate(30));
    this.endDate.set(this.todayIsoDate());
    this.typeFilter.set('All Types');
    this.warehouseFilter.set('All Warehouses');
    this.userFilter.set('All Users');
    this.loadData();
  }

  exportData(): void {
    const rows = this.filteredMovements();
    const headers = [
      'Date/Time',
      'Type',
      'Item',
      'SKU',
      'Quantity',
      'Reference',
      'User',
      'Warehouse',
      'Location',
    ];
    const content = [
      headers.join(','),
      ...rows.map((row) =>
        [
          this.escapeCsv(row.dateTime),
          this.escapeCsv(row.type),
          this.escapeCsv(row.item),
          this.escapeCsv(row.sku),
          String(row.quantity),
          this.escapeCsv(row.refNumber),
          this.escapeCsv(row.user),
          this.escapeCsv(row.warehouse),
          this.escapeCsv(row.location),
        ].join(','),
      ),
    ].join('\n');

    this.downloadFile(content, 'stock-movements.csv', 'text/csv;charset=utf-8;');
  }

  getMovementIcon(type: MovementType): string {
    const icons: Record<MovementType, string> = {
      Inflow: '📥',
      Outflow: '📤',
      Transfer: '🔄',
      Adjustment: '📝',
      Other: '📋',
    };

    return icons[type];
  }

  private loadData(): void {
    this.isLoading.set(true);
    this.loadError.set('');

    forkJoin({
      report: this.reportsService
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
      next: ({ report, warehouses }) => {
        const movements = report?.movements ?? [];

        this.movementRows.set(
          movements.map((movement, index) => this.toMovementRow(movement, index)),
        );
        this.dailyTrend.set(report?.dailyTrend ?? []);
        this.warehouses.set(warehouses);
        this.isLoading.set(false);

        if (!report) {
          this.loadError.set('Unable to load stock movement data from the backend.');
        }
      },
      error: () => {
        this.movementRows.set([]);
        this.dailyTrend.set([]);
        this.warehouses.set([]);
        this.loadError.set('Unable to load stock movement data from the backend.');
        this.isLoading.set(false);
      },
    });
  }

  private toMovementRow(movement: StockMovementDetailDto, index: number): MovementRow {
    return {
      id: `${movement.date}-${movement.reference ?? 'ref'}-${index}`,
      dateTime: this.formatDateTime(movement.date),
      type: this.normalizeMovementType(movement.transactionType),
      item: movement.itemName?.trim() || 'Unknown Item',
      sku: movement.sku?.trim() || 'N/A',
      quantity: movement.quantityChange ?? 0,
      refNumber: movement.reference?.trim() || 'N/A',
      user: movement.performedBy?.trim() || 'System',
      warehouse: movement.warehouse?.trim() || 'N/A',
      location: movement.shelfLocation?.trim() || 'N/A',
    };
  }

  private normalizeMovementType(transactionType: string | undefined): MovementType {
    const value = (transactionType ?? '').trim().toLowerCase();

    if (
      value.includes('inflow') ||
      value.includes('receive') ||
      value.includes('receipt') ||
      value.includes('goods in') ||
      value.includes('grn')
    ) {
      return 'Inflow';
    }

    if (
      value.includes('outflow') ||
      value.includes('issue') ||
      value.includes('goods out') ||
      value.includes('dispatch') ||
      value.includes('siv') ||
      value.includes('release')
    ) {
      return 'Outflow';
    }

    if (value.includes('transfer')) {
      return 'Transfer';
    }

    if (value.includes('adjust')) {
      return 'Adjustment';
    }

    return 'Other';
  }

  private toTrendBars(dailyTrend: MovementTrendDto[]): TrendBar[] {
    if (dailyTrend.length === 0) {
      return [];
    }

    const trend = dailyTrend.slice(-8);
    const maxValue = Math.max(
      ...trend.map((entry) => Math.max(entry.inbound, entry.outbound, Math.abs(entry.net), 1)),
      1,
    );

    return trend.map((entry) => ({
      label: this.formatTrendLabel(entry.date),
      inflowHeight: this.scaleHeight(entry.inbound, maxValue),
      outflowHeight: this.scaleHeight(entry.outbound, maxValue),
      netHeight: this.scaleHeight(Math.abs(entry.net), maxValue),
    }));
  }

  private formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
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

  private scaleHeight(value: number, maxValue: number): number {
    if (value <= 0 || maxValue <= 0) {
      return 8;
    }

    return Math.max(8, Math.round((value / maxValue) * 110));
  }

  private uniqueSorted(values: string[]): string[] {
    return [...new Set(values.filter((value) => value.trim().length > 0))].sort((a, b) =>
      a.localeCompare(b),
    );
  }

  private todayIsoDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private daysAgoIsoDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
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
