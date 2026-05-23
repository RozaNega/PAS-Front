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
  ItemMasterDetailDto,
  ItemMasterService,
} from '../../../../core/services/item-master.service';
import {
  InventoryValuationItemDto,
  ReportsService,
} from '../../../../core/services/reports.service';

type StockStatus = 'good' | 'low' | 'critical';

interface StockItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  warehouse: string;
  warehouseNames: string[];
  shelf: string;
  quantity: number;
  available: number;
  reserved: number;
  minStock: number;
  unitPrice: number;
  totalValue: number;
  status: StockStatus;
  unitOfMeasure: string;
}

interface StockSummary {
  totalItems: number;
  totalValue: number;
  totalUnits: number;
  lowStock: number;
  inStock: number;
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
  imports: [CommonModule, FormsModule],
  templateUrl: './current-stock.component.html',
  styleUrls: ['./current-stock.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrentStockComponent implements OnInit {
  private readonly reportsService = inject(ReportsService);
  private readonly inventoryService = inject(InventoryService);
  private readonly itemMasterService = inject(ItemMasterService);

  readonly searchTerm = signal('');
  readonly warehouseFilter = signal('All Warehouses');
  readonly categoryFilter = signal('All Categories');
  readonly statusFilter = signal('All Status');
  readonly isLoading = signal(false);
  readonly loadError = signal('');
  readonly lastUpdated = signal('Loading...');

  readonly showDetailsModal = signal(false);
  readonly selectedStock = signal<StockItem | null>(null);
  readonly selectedStockDetail = signal<ItemMasterDetailDto | null>(null);
  readonly isLoadingDetail = signal(false);

  private readonly stockItems = signal<StockItem[]>([]);
  private readonly warehouses = signal<WarehouseDto[]>([]);

  readonly warehouseOptions = computed(() => [
    'All Warehouses',
    ...this.uniqueSorted([
      ...this.warehouses().map((warehouse) => warehouse.name),
      ...this.stockItems().flatMap((item) => item.warehouseNames),
    ]),
  ]);

  readonly categoryOptions = computed(() => [
    'All Categories',
    ...this.uniqueSorted(this.stockItems().map((item) => item.category)),
  ]);

  readonly statuses = ['All Status', 'Good', 'Low', 'Critical'];

  readonly filteredStock = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const warehouse = this.warehouseFilter();
    const category = this.categoryFilter();
    const status = this.statusFilter();

    return this.stockItems().filter((item) => {
      const matchesTerm =
        term.length === 0 ||
        item.name.toLowerCase().includes(term) ||
        item.sku.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        item.warehouse.toLowerCase().includes(term);

      const matchesWarehouse =
        warehouse === 'All Warehouses' || item.warehouseNames.includes(warehouse);
      const matchesCategory = category === 'All Categories' || item.category === category;
      const matchesStatus =
        status === 'All Status' ||
        this.statusLabel(item.status).toLowerCase() === status.toLowerCase();

      return matchesTerm && matchesWarehouse && matchesCategory && matchesStatus;
    });
  });

  readonly summary = computed<StockSummary>(() => {
    const items = this.stockItems();

    return {
      totalItems: items.length,
      totalValue: items.reduce((sum, item) => sum + item.totalValue, 0),
      totalUnits: items.reduce((sum, item) => sum + item.quantity, 0),
      lowStock: items.filter((item) => item.status !== 'good').length,
      inStock: items.filter((item) => item.quantity > 0).length,
    };
  });

  readonly stockLocations = computed<StockLocation[]>(() => {
    const detail = this.selectedStockDetail();
    if (!detail) {
      return [];
    }

    return detail.stockLocations.map((location) => ({
      warehouse: location.warehouseName?.trim() || 'N/A',
      shelfLocation: location.shelfLocation?.trim() || 'N/A',
      quantity: location.currentQuantity ?? 0,
      reserved: location.reservedQuantity ?? 0,
      available: location.availableQuantity ?? 0,
    }));
  });

  readonly stockMovements = computed<StockMovement[]>(() => {
    const detail = this.selectedStockDetail();
    if (!detail) {
      return [];
    }

    return detail.recentMovements.map((movement) => ({
      date: this.formatDateTime(movement.date),
      type: movement.transactionType?.trim() || 'Movement',
      quantity: movement.quantityChange ?? 0,
      reference: movement.reference?.trim() || 'N/A',
      location: movement.shelfLocation?.trim() || 'N/A',
    }));
  });

  ngOnInit(): void {
    this.loadData();
  }

  getStatusColor(status: StockStatus): string {
    switch (status) {
      case 'good':
        return 'green';
      case 'low':
        return 'yellow';
      case 'critical':
        return 'red';
      default:
        return 'gray';
    }
  }

  getStatusEmoji(status: StockStatus): string {
    switch (status) {
      case 'good':
        return '🟢';
      case 'low':
        return '🟡';
      case 'critical':
        return '🔴';
      default:
        return '⚪';
    }
  }

  formatNumber(num: number): string {
    return num.toLocaleString();
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
    this.selectedStockDetail.set(null);
    this.showDetailsModal.set(true);
    this.isLoadingDetail.set(true);

    this.itemMasterService.getById(item.id).subscribe({
      next: (response) => {
        this.selectedStockDetail.set(response.data ?? null);
        this.isLoadingDetail.set(false);
      },
      error: () => {
        this.selectedStockDetail.set(null);
        this.isLoadingDetail.set(false);
      },
    });
  }

  closeModal(): void {
    this.showDetailsModal.set(false);
    this.selectedStock.set(null);
    this.selectedStockDetail.set(null);
    this.isLoadingDetail.set(false);
  }

  exportData(): void {
    const rows = this.filteredStock();
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
      'Unit Price',
      'Total Value',
    ];
    const content = [
      headers.join(','),
      ...rows.map((item) =>
        [
          this.escapeCsv(item.sku),
          this.escapeCsv(item.name),
          this.escapeCsv(item.category),
          this.escapeCsv(item.warehouse),
          this.escapeCsv(item.shelf),
          String(item.quantity),
          String(item.available),
          String(item.reserved),
          this.escapeCsv(this.statusLabel(item.status)),
          String(item.unitPrice),
          String(item.totalValue),
        ].join(','),
      ),
    ].join('\n');

    this.downloadFile(content, 'current-stock.csv', 'text/csv;charset=utf-8;');
  }

  refreshData(): void {
    this.loadData();
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.warehouseFilter.set('All Warehouses');
    this.categoryFilter.set('All Categories');
    this.statusFilter.set('All Status');
  }

  protected statusLabel(status: StockStatus): string {
    switch (status) {
      case 'good':
        return 'Good';
      case 'low':
        return 'Low';
      case 'critical':
        return 'Critical';
      default:
        return 'Unknown';
    }
  }

  private loadData(): void {
    this.isLoading.set(true);
    this.loadError.set('');

    forkJoin({
      valuation: this.reportsService.getInventoryValuation({ asOfDate: this.todayIsoDate() }).pipe(
        map((response) => response.data ?? null),
        catchError(() => of(null)),
      ),
      warehouses: this.inventoryService.getAllWarehouses().pipe(
        map((response) => response.data ?? []),
        catchError(() => of([] as WarehouseDto[])),
      ),
    }).subscribe({
      next: ({ valuation, warehouses }) => {
        const items = (valuation?.items ?? [])
          .map((item) => this.toStockItem(item))
          .sort((left, right) => right.quantity - left.quantity);

        this.stockItems.set(items);
        this.warehouses.set(warehouses);
        this.lastUpdated.set(
          this.formatDateTime(valuation?.generatedAt ?? new Date().toISOString()),
        );
        this.isLoading.set(false);

        if (!valuation) {
          this.loadError.set('Unable to load current stock data from the backend.');
        }
      },
      error: () => {
        this.stockItems.set([]);
        this.warehouses.set([]);
        this.lastUpdated.set('Unavailable');
        this.loadError.set('Unable to load current stock data from the backend.');
        this.isLoading.set(false);
      },
    });
  }

  private toStockItem(item: InventoryValuationItemDto): StockItem {
    const warehouseNames = this.uniqueSorted(
      (item.locations ?? [])
        .map((location) => location.warehouseName?.trim() || '')
        .filter((name) => name.length > 0),
    );
    const firstLocation = item.locations?.[0];
    const shelfLocation = firstLocation?.shelfLocation?.trim() || 'N/A';

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
      shelf:
        item.locations && item.locations.length > 1
          ? `${shelfLocation} +${item.locations.length - 1}`
          : shelfLocation,
      quantity: item.currentQuantity ?? 0,
      available: item.availableQuantity ?? 0,
      reserved: item.reservedQuantity ?? 0,
      minStock: item.minStockLevel ?? 0,
      unitPrice: item.averageCost ?? 0,
      totalValue: item.totalValue ?? 0,
      status: this.toStockStatus(item.currentQuantity ?? 0, item.minStockLevel ?? 0),
      unitOfMeasure: item.unitOfMeasure?.trim() || 'Units',
    };
  }

  private toStockStatus(quantity: number, minStock: number): StockStatus {
    if (quantity <= 0) {
      return 'critical';
    }

    if (quantity <= Math.max(1, Math.floor(minStock * 0.6)) || quantity <= minStock) {
      return 'low';
    }

    return 'good';
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

  private todayIsoDate(): string {
    return new Date().toISOString().split('T')[0];
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
