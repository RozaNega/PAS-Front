import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { InventoryService, InventoryStockDto, StockMovementDto } from '../../../../core/services/inventory.service';

interface StockHistoryEntry {
  date: string;
  type: string;
  quantity: number;
  reference: string;
  performedBy: string;
  notes?: string;
}

interface StockDisplayRow {
  id: string;
  itemName: string;
  sku: string;
  warehouse: string;
  currentStock: number;
  reserved: number;
  available: number;
  minThreshold: number;
  maxThreshold: number;
  unit: string;
  status: string;
  statusClass: string;
  lastUpdated: string;
  itemId: string;
}

interface MonthlyTrendPoint {
  month: string;
  total: number;
  inflow: number;
  outflow: number;
  barHeight: number;
}

interface CategoryDistItem {
  name: string;
  count: number;
  percentage: number;
}

interface TopStockItem {
  rank: number;
  name: string;
  sku: string;
  stock: number;
  barWidth: number;
}

interface SummaryStats {
  totalItems: number;
  totalStockValue: number;
  lowStockItems: number;
  inflowToday: number;
  outflowToday: number;
  netChange: number;
}

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function getItemStatus(currentStock: number, minThreshold: number, maxThreshold: number): { status: string; statusClass: string } {
  if (minThreshold > 0 && currentStock <= minThreshold) return { status: 'Low Stock', statusClass: 'low-stock' };
  if (currentStock === 0) return { status: 'Out of Stock', statusClass: 'out-of-stock' };
  if (maxThreshold > 0 && currentStock >= maxThreshold) return { status: 'Overstocked', statusClass: 'overstocked' };
  return { status: 'In Stock', statusClass: 'in-stock' };
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
  private readonly inventory = inject(InventoryService);

  loading = signal(false);
  loadError = signal<string | null>(null);
  notification = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  searchQuery = signal('');
  currentPage = signal(1);
  rowsPerPage = signal(10);
  showDetailModal = signal(false);
  selectedItem = signal<StockDisplayRow | null>(null);
  showExportDropdown = signal(false);

  private allItems = signal<InventoryStockDto[]>([]);
  private movements = signal<StockMovementDto[]>([]);

  selectedHistory = signal<StockHistoryEntry[]>([]);

  displayRows = computed<StockDisplayRow[]>(() => {
    return this.allItems().map(item => this.toDisplayRow(item));
  });

  summaryStats = computed<SummaryStats>(() => {
    const items = this.allItems();
    const movs = this.movements();
    const totalItems = items.reduce((s, i) => s + (Number(i.currentStock) || 0), 0);
    const totalStockValue = items.reduce((s, i) => s + (Number(i.currentStock) || 0) * 15, 0);
    const lowStockItems = items.filter(i => {
      const min = Number(i.minimumThreshold) || 0;
      const q = Number(i.currentStock) || 0;
      return min > 0 && q <= min;
    }).length;

    const today = toYmd(new Date());
    let inflowToday = 0;
    let outflowToday = 0;

    for (const m of movs) {
      if (m.movementDate && m.movementDate.startsWith(today)) {
        const q = Number(m.quantity) || 0;
        const type = this.classifyMovement(m);
        if (type === 'in') inflowToday += Math.abs(q);
        else if (type === 'out') outflowToday += Math.abs(q);
      }
    }

    return { totalItems, totalStockValue, lowStockItems, inflowToday, outflowToday, netChange: inflowToday - outflowToday };
  });

  monthlyTrend = computed<MonthlyTrendPoint[]>(() => {
    const movs = this.movements();
    if (movs.length === 0) {
      return [];
    }
    const monthlyMap = new Map<string, { total: number; inflow: number; outflow: number }>();
    for (const m of movs) {
      if (!m.movementDate) continue;
      const monthKey = m.movementDate.slice(0, 7);
      if (!monthlyMap.has(monthKey)) monthlyMap.set(monthKey, { total: 0, inflow: 0, outflow: 0 });
      const entry = monthlyMap.get(monthKey)!;
      const q = Number(m.quantity) || 0;
      entry.total += Math.abs(q);
      const type = this.classifyMovement(m);
      if (type === 'in') entry.inflow += Math.abs(q);
      else if (type === 'out') entry.outflow += Math.abs(q);
    }
    const sortedKeys = [...monthlyMap.keys()].sort();
    const maxVal = Math.max(...sortedKeys.map(k => monthlyMap.get(k)!.total), 1);
    return sortedKeys.map(key => {
      const entry = monthlyMap.get(key)!;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = parseInt(key.slice(5, 7), 10) - 1;
      return {
        month: months[monthIndex] || key,
        total: entry.total,
        inflow: entry.inflow,
        outflow: entry.outflow,
        barHeight: (entry.total / maxVal) * 100,
      };
    });
  });

  categoryDistribution = computed<CategoryDistItem[]>(() => {
    const cmap = new Map<string, number>();
    for (const r of this.allItems()) {
      const cat = r.unitOfMeasure || 'Units';
      cmap.set(cat, (cmap.get(cat) || 0) + (Number(r.currentStock) || 0));
    }
    const maxC = Math.max(...[...cmap.values()], 1);
    return [...cmap.entries()]
      .map(([name, count]) => ({ name, count, percentage: Math.round((count / maxC) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  });

  topItems = computed<TopStockItem[]>(() => {
    const items = this.allItems();
    const maxStock = Math.max(...items.map(i => Number(i.currentStock) || 0), 1);
    return [...items]
      .sort((a, b) => (Number(b.currentStock) || 0) - (Number(a.currentStock) || 0))
      .slice(0, 10)
      .map((item, i) => ({
        rank: i + 1,
        name: item.itemName || '\u2014',
        sku: item.sku || '\u2014',
        stock: Number(item.currentStock) || 0,
        barWidth: Math.round(((Number(item.currentStock) || 0) / maxStock) * 100),
      }));
  });

  filteredItems = computed<StockDisplayRow[]>(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.displayRows();
    return this.displayRows().filter(item =>
      item.itemName.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.warehouse.toLowerCase().includes(q)
    );
  });

  pagedItems = computed(() => {
    const start = (this.currentPage() - 1) * this.rowsPerPage();
    return this.filteredItems().slice(start, start + this.rowsPerPage());
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredItems().length / this.rowsPerPage())));

  displayRange = computed(() => {
    const count = this.filteredItems().length;
    if (count === 0) return { start: 0, end: 0, total: 0 };
    const start = (this.currentPage() - 1) * this.rowsPerPage() + 1;
    return { start, end: Math.min(this.currentPage() * this.rowsPerPage(), count), total: count };
  });



  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.loadError.set(null);
    const today = new Date();
    const startMonth = toYmd(addDays(today, -60));
    const end = toYmd(today);

    forkJoin({
      overview: this.inventory.getStockOverview({}),
      movements: this.inventory.getStockMovements({ dateFrom: startMonth, dateTo: end, pageSize: 2000 }),
    }).subscribe({
      next: ({ overview, movements }) => {
        this.loading.set(false);
        if (overview.success !== false && Array.isArray(overview.data) && overview.data.length > 0) {
          this.allItems.set(overview.data);
          this.loadError.set(null);
        } else {
          this.allItems.set([]);
          this.loadError.set(overview.message || 'No stock data available');
        }
        if (movements.success !== false && Array.isArray(movements.data)) {
          this.movements.set(movements.data);
        } else {
          this.movements.set([]);
        }
        this.autoDismiss();
      },
      error: (err) => {
        this.loading.set(false);
        this.allItems.set([]);
        this.movements.set([]);
        this.loadError.set(err.message || 'Failed to load stock data');
      },
    });
  }

  private autoDismiss(): void {
    setTimeout(() => this.notification.set(null), 4000);
  }

  dismissNotification(): void {
    this.notification.set(null);
  }

  private toDisplayRow(item: InventoryStockDto): StockDisplayRow {
    const currentStock = Number(item.currentStock) || 0;
    const reserved = Number(item.reservedStock) || 0;
    const available = Number(item.availableStock) || 0;
    const minThreshold = Number(item.minimumThreshold) || 0;
    const maxThreshold = Number(item.maximumThreshold) || 0;
    const { status, statusClass } = getItemStatus(currentStock, minThreshold, maxThreshold);
    return {
      id: item.id,
      itemName: item.itemName || '\u2014',
      sku: item.sku || '\u2014',
      warehouse: item.warehouseName || '\u2014',
      currentStock, reserved, available, minThreshold, maxThreshold,
      unit: item.unitOfMeasure || 'Units',
      status, statusClass,
      lastUpdated: item.lastUpdated,
      itemId: item.itemId,
    };
  }

  selId(): string { return this.selectedItem()?.id ?? ''; }
  selName(): string { return this.selectedItem()?.itemName ?? ''; }
  selSku(): string { return this.selectedItem()?.sku ?? ''; }
  selWarehouse(): string { return this.selectedItem()?.warehouse ?? ''; }
  selCurrentStock(): number { return this.selectedItem()?.currentStock ?? 0; }
  selReserved(): number { return this.selectedItem()?.reserved ?? 0; }
  selAvailable(): number { return this.selectedItem()?.available ?? 0; }
  selMinThreshold(): number { return this.selectedItem()?.minThreshold ?? 0; }
  selMaxThreshold(): number { return this.selectedItem()?.maxThreshold ?? 0; }
  selUnit(): string { return this.selectedItem()?.unit ?? ''; }
  selStatus(): string { return this.selectedItem()?.status ?? ''; }
  selStatusClass(): string { return this.selectedItem()?.statusClass ?? ''; }
  selLastUpdated(): string { return this.selectedItem()?.lastUpdated ?? ''; }

  openDetailModal(row: StockDisplayRow): void {
    this.selectedItem.set(row);
    this.selectedHistory.set([]);
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedItem.set(null);
    this.selectedHistory.set([]);
  }

  onSearch(e: Event): void {
    this.searchQuery.set((e.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  getPageArray(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  onRowsPerPageChange(e: Event): void {
    this.rowsPerPage.set(+(e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  formatNumber(value: number): string {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    return String(value);
  }

  formatValue(value: number): string {
    if (value >= 1000000) return '$' + (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return '$' + (value / 1000).toFixed(1) + 'K';
    return '$' + String(value);
  }

  formatDate(iso: string): string {
    if (!iso) return '\u2014';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getStatusIcon(): string {
    const status = this.selectedItem()?.status;
    if (status === 'In Stock') return 'bi-check-circle-fill';
    if (status === 'Low Stock') return 'bi-exclamation-triangle-fill';
    if (status === 'Out of Stock') return 'bi-x-circle-fill';
    if (status === 'Overstocked') return 'bi-exclamation-diamond-fill';
    return 'bi-question-circle';
  }

  getHistoryIcon(type: string): string {
    if (type === 'In') return 'bi-arrow-down-circle text-green';
    if (type === 'Out') return 'bi-arrow-up-circle text-orange';
    return 'bi-arrow-left-right text-blue';
  }

  getHistoryColor(type: string): string {
    if (type === 'In') return '#10b981';
    if (type === 'Out') return '#f59e0b';
    return '#3b82f6';
  }

  getHistoryQuantity(type: string, qty: number): string {
    if (type === 'In') return '+' + String(qty);
    if (type === 'Out') return '-' + String(qty);
    return String(qty);
  }

  private classifyMovement(d: StockMovementDto): 'in' | 'out' | 'other' {
    const u = (d.movementType + ' ' + d.referenceType).toUpperCase();
    if (u.includes('TRANSFER')) return 'other';
    if (u.includes('IN') || u.includes('RECEIV') || u.includes('GRN')) return 'in';
    if (u.includes('OUT') || u.includes('ISSUE') || u.includes('SIV')) return 'out';
    const q = Number(d.quantity) || 0;
    if (q > 0) return 'in';
    if (q < 0) return 'out';
    return 'other';
  }

  exportCSV(): void {
    this.showExportDropdown.set(false);
    const rows = this.filteredItems();
    if (!rows.length) return;

    const header = ['Item Name', 'SKU', 'Warehouse', 'Current Stock', 'Reserved', 'Available', 'Min Threshold', 'Max Threshold', 'Status', 'Last Updated'];
    const lines = rows.map(r => [
      '"' + r.itemName + '"',
      r.sku,
      '"' + r.warehouse + '"',
      String(r.currentStock),
      String(r.reserved),
      String(r.available),
      String(r.minThreshold),
      String(r.maxThreshold),
      r.status,
      this.formatDate(r.lastUpdated),
    ].join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stock-overview-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}
