import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService, InventoryStockDto } from '../../../../core/services/inventory.service';
import { WarehousesService } from '../../../../core/services/warehouses.service';

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
  warehouse: string;
  location: string;
  locations: string[];
  warehouses: string[];
  category: string;
  available: number;
  reserved: number;
  unitOfMeasure: string;
  lastOrder: string;
  daysUntilEmpty: number;
  itemId: string;
  suggestedOrder: number;
  unit: string;
}

interface StockHistoryEntry {
  date: string;
  type: string;
  quantity: number;
  reference: string;
  performedBy: string;
}

interface CategoryBreakdown {
  name: string;
  count: number;
  percentage: number;
}

interface SummaryStats {
  totalAlerts: number;
  critical: number;
  warning: number;
  info: number;
  itemsAtRisk: number;
  categoriesAffected: number;
}

interface AnalysisItem {
  name: string;
  items: number;
  percentage: number;
}

function computeSeverity(current: number, minStock: number): LowStockItem['severity'] {
  if (minStock <= 0) return 'Info';
  const ratio = current / minStock;
  if (ratio <= 0.25) return 'Critical';
  if (ratio <= 0.50) return 'Warning';
  return 'Info';
}

function estimateDaysUntilEmpty(current: number, minStock: number): number {
  if (current <= 0) return 0;
  const consumptionRate = minStock / 30;
  if (consumptionRate <= 0) return 999;
  return Math.round(current / consumptionRate);
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
  private readonly inventory = inject(InventoryService);
  private readonly warehousesService = inject(WarehousesService);
  private readonly warehouseNameToId = new Map<string, string>();

  loading = signal(false);
  loadError = signal<string | null>(null);
  notification = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  searchQuery = signal('');
  severityFilter = signal<'All' | 'Critical' | 'Warning' | 'Info'>('All');
  warehouseFilter = signal('All Warehouses');
  warehouses = signal<string[]>(['All Warehouses']);
  currentPage = signal(1);
  rowsPerPage = signal(10);
  showDetailModal = signal(false);
  showReorderModal = signal(false);
  selectedItem = signal<LowStockItem | null>(null);
  selectedHistory = signal<StockHistoryEntry[]>([]);
  orderQuantity = signal(0);
  orderNotes = signal('');

  allLowStock = signal<LowStockItem[]>([]);

  criticalAlerts = computed(() => this.filteredItems().filter(x => x.severity === 'Critical'));
  warningAlerts = computed(() => this.filteredItems().filter(x => x.severity === 'Warning'));
  infoAlerts = computed(() => this.filteredItems().filter(x => x.severity === 'Info'));

  summaryStats = computed<SummaryStats>(() => {
    const items = this.filteredItems();
    const categories = new Set(items.map(i => i.category));
    return {
      totalAlerts: items.length,
      critical: items.filter(i => i.severity === 'Critical').length,
      warning: items.filter(i => i.severity === 'Warning').length,
      info: items.filter(i => i.severity === 'Info').length,
      itemsAtRisk: items.filter(i => i.severity === 'Critical' || i.severity === 'Warning').length,
      categoriesAffected: categories.size,
    };
  });

  categoryBreakdown = computed<CategoryBreakdown[]>(() => {
    const map = new Map<string, number>();
    for (const item of this.filteredItems()) {
      map.set(item.category, (map.get(item.category) || 0) + 1);
    }
    const maxCount = Math.max(...map.values(), 1);
    return [...map.entries()]
      .map(([name, count]) => ({ name, count, percentage: Math.round((count / maxCount) * 100) }))
      .sort((a, b) => b.count - a.count);
  });

  donutStyle = computed(() => {
    const c = this.criticalAlerts().length;
    const w = this.warningAlerts().length;
    const i = this.infoAlerts().length;
    const total = c + w + i;
    if (total === 0) return {};
    const angles: string[] = [];
    let start = 0;
    if (c > 0) {
      const deg = (c / total) * 360;
      angles.push(`#ef4444 ${start}deg ${start + deg}deg`);
      start += deg;
    }
    if (w > 0) {
      const deg = (w / total) * 360;
      angles.push(`#f59e0b ${start}deg ${start + deg}deg`);
      start += deg;
    }
    if (i > 0) {
      const deg = (i / total) * 360;
      angles.push(`#3b82f6 ${start}deg ${start + deg}deg`);
    }
    return { background: `conic-gradient(${angles.join(', ')})` };
  });

  filteredItems = computed(() => {
    let items = this.allLowStock();
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      items = items.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q)
      );
    }
    const sv = this.severityFilter();
    if (sv !== 'All') {
      items = items.filter(item => item.severity === sv);
    }
    const wf = this.warehouseFilter();
    if (wf !== 'All Warehouses') {
      items = items.filter(item => item.warehouse === wf);
    }
    return items;
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
    this.warehousesService.getAll({ isActive: true }).subscribe({
      next: (res) => {
        this.warehouseNameToId.clear();
        if (res.success !== false && Array.isArray(res.data)) {
          for (const w of res.data) {
            this.warehouseNameToId.set(w.warehouseName, w.id);
          }
          this.warehouses.set(['All Warehouses', ...res.data.map(w => w.warehouseName)]);
        }
      },
      complete: () => this.loadLowStock(),
    });
  }

  loadLowStock(): void {
    this.loading.set(true);
    this.loadError.set(null);
    const params: { warehouseId?: string; pageSize?: number } = {
      pageSize: 500,
    };
    const wname = this.warehouseFilter();
    if (wname !== 'All Warehouses') {
      const id = this.warehouseNameToId.get(wname);
      if (id) params.warehouseId = id;
    }
    this.inventory.getStockOverview(params).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success === false) {
          this.allLowStock.set([]);
          this.loadError.set(res.message || 'Failed to load low stock data');
          return;
        }
        const items = Array.isArray(res.data) ? res.data : [];
        const lowStock = items.filter(i => (i.currentStock ?? 0) <= (i.minimumThreshold ?? 0));
        if (lowStock.length > 0) {
          this.allLowStock.set(lowStock.map(r => this.mapRow(r)));
          this.loadError.set(null);
          this.autoDismiss();
          return;
        }
        this.allLowStock.set([]);
        this.loadError.set('No low stock items found');
        this.autoDismiss();
      },
      error: (err) => {
        this.loading.set(false);
        this.allLowStock.set([]);
        this.loadError.set(err.message || 'Failed to load low stock data');
      },
    });
  }

  private autoDismiss(): void {
    setTimeout(() => this.notification.set(null), 4000);
  }

  dismissNotification(): void {
    this.notification.set(null);
  }

  private mapRow(r: InventoryStockDto): LowStockItem {
    const cur = Number(r.currentStock) || 0;
    const min = Number(r.minimumThreshold) || 0;
    const warehouseName = r.warehouseName || '\u2014';
    return {
      id: r.id,
      severity: computeSeverity(cur, min),
      name: r.itemName || '\u2014',
      sku: r.sku || '\u2014',
      current: cur,
      minStock: min,
      deficit: Math.max(0, min - cur),
      warehouse: warehouseName,
      location: [r.warehouseName, r.shelfLocation].filter(Boolean).join(' \u2014 ') || '\u2014',
      locations: [warehouseName, r.shelfLocation].filter(Boolean).join(' - ') ? [[warehouseName, r.shelfLocation].filter(Boolean).join(' - ')] : [],
      warehouses: warehouseName !== '\u2014' ? [warehouseName] : [],
      category: r.unitOfMeasure || 'General',
      available: cur,
      reserved: 0,
      unitOfMeasure: r.unitOfMeasure || 'Units',
      lastOrder: r.lastUpdated || new Date().toISOString(),
      daysUntilEmpty: estimateDaysUntilEmpty(cur, min),
      itemId: r.itemId,
      suggestedOrder: Math.max(0, min - cur),
      unit: r.unitOfMeasure || 'Units',
    };
  }

  selName(): string { return this.selectedItem()?.name ?? ''; }
  selSku(): string { return this.selectedItem()?.sku ?? ''; }
  selCurrent(): number { return this.selectedItem()?.current ?? 0; }
  selMinStock(): number { return this.selectedItem()?.minStock ?? 0; }
  selDeficit(): number { return this.selectedItem()?.deficit ?? 0; }
  selWarehouse(): string { return this.selectedItem()?.warehouse ?? ''; }
  selLocation(): string { return this.selectedItem()?.location ?? ''; }
  selLastOrder(): string { return this.selectedItem()?.lastOrder ?? ''; }
  selDaysUntilEmpty(): number { return this.selectedItem()?.daysUntilEmpty ?? 0; }
  selUnit(): string { return this.selectedItem()?.unit ?? ''; }
  selSuggestedOrder(): number { return this.selectedItem()?.suggestedOrder ?? 0; }
  selSeverity(): string { return this.selectedItem()?.severity ?? ''; }

  openDetailModal(item: LowStockItem): void {
    this.selectedItem.set(item);
    this.selectedHistory.set([]);
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedItem.set(null);
    this.selectedHistory.set([]);
  }

  openReorderModal(): void {
    const item = this.selectedItem();
    if (!item) return;
    this.showDetailModal.set(false);
    this.orderQuantity.set(item.suggestedOrder);
    this.orderNotes.set(`Urgent restock needed - ${item.name} is below minimum stock threshold of ${item.minStock} ${item.unit}.`);
    this.showReorderModal.set(true);
  }

  closeReorderModal(): void {
    this.showReorderModal.set(false);
    this.selectedItem.set(null);
    this.selectedHistory.set([]);
  }

  createOrder(): void {
    const item = this.selectedItem();
    if (!item) return;
    this.notification.set({ type: 'success', message: `Purchase order created for ${item.name} (Qty: ${this.orderQuantity()})` });
    this.autoDismiss();
    this.closeReorderModal();
  }

  onSearch(e: Event): void {
    this.searchQuery.set((e.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.severityFilter.set('All');
    this.warehouseFilter.set('All Warehouses');
    this.currentPage.set(1);
  }

  onWarehouseFilterChange(e: Event): void {
    const val = (e.target as HTMLSelectElement).value;
    this.warehouseFilter.set(val);
    this.currentPage.set(1);
  }

  onSeverityFilterChange(e: Event): void {
    const val = (e.target as HTMLSelectElement).value as 'All' | 'Critical' | 'Warning' | 'Info';
    this.severityFilter.set(val);
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

  exportCSV(): void {
    const rows = this.filteredItems();
    if (!rows.length) return;
    const header = ['Item Name', 'SKU', 'Current Stock', 'Min Threshold', 'Deficit', 'Severity', 'Warehouse', 'Category', 'Days Until Empty'];
    const lines = rows.map(r => [
      `"${r.name}"`,
      r.sku,
      String(r.current),
      String(r.minStock),
      String(r.deficit),
      r.severity,
      `"${r.warehouse}"`,
      `"${r.category}"`,
      String(r.daysUntilEmpty),
    ].join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'low-stock-alerts-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  formatDate(iso: string): string {
    if (!iso) return '\u2014';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatNumber(value: number): string {
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    return String(value);
  }

  getSeverityClass(severity: string): string {
    switch (severity) {
      case 'Critical': return 'severity-critical';
      case 'Warning': return 'severity-warning';
      default: return 'severity-info';
    }
  }

  getDaysClass(days: number): string {
    if (days <= 7) return 'days-critical';
    if (days <= 14) return 'days-warning';
    return 'days-ok';
  }

  getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'Critical': return 'bi-exclamation-triangle-fill';
      case 'Warning': return 'bi-exclamation-triangle';
      default: return 'bi-info-circle';
    }
  }

  refreshData(): void {
    this.loadLowStock();
  }

  trackByAnalysisName(_: number, item: AnalysisItem): string {
    return item.name;
  }

  openOrderModal(item: LowStockItem): void {
    this.selectedItem.set(item);
    this.showDetailModal.set(true);
  }

  closeModal(): void {
    this.showDetailModal.set(false);
    this.selectedItem.set(null);
  }
}
