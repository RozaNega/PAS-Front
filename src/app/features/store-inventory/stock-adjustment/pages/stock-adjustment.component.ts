import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { InventoryService, InventoryStockDto, StockMovementDto } from '../../../../core/services/inventory.service';
import { ItemMasterService, ItemMaster } from '../../../../core/services/item-master.service';
import { ApiService } from '../../../../core/services/api.service';

interface PickRow {
  inventoryId: string;
  itemId: string;
  shelfId: string;
  name: string;
  sku: string;
  current: number;
  low?: boolean;
  warehouse: string;
  shelf: string;
}

interface AdjustmentRecord {
  id: string;
  dateTime: string;
  item: string;
  sku: string;
  type: 'Increase' | 'Decrease' | 'Set';
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  reason: string;
  performedBy: string;
  status: 'Approved' | 'Pending' | 'Rejected';
  notes?: string;
}

interface NotificationState {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface MonthlyTrend {
  monthLabel: string;
  increases: number;
  decreases: number;
}

interface ReasonBreakdown {
  reason: string;
  count: number;
  percentage: number;
}

interface SummaryStats {
  totalAdjustments: number;
  totalItemsAdjusted: number;
  netQuantityChange: number;
  pendingApprovals: number;
  increases: number;
  decreases: number;
}

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

type SortField = 'dateTime' | 'item' | 'type' | 'quantity' | 'reason' | 'performedBy' | 'status';

@Component({
  selector: 'app-stock-adjustment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-adjustment.component.html',
  styleUrls: ['./stock-adjustment.component.scss'],
})
export class StockAdjustmentComponent implements OnInit, OnDestroy {
  private readonly inventory = inject(InventoryService);
  private readonly itemMasterService = inject(ItemMasterService);
  private readonly apiService = inject(ApiService);
  private readonly itemMasterCache = new Map<string, ItemMaster>();

  searchTerm = signal('');
  selectedRow = signal<PickRow | null>(null);
  adjustmentType = signal<'Increase' | 'Decrease' | 'Set'>('Decrease');
  quantityToAdjust = signal(1);
  reason = signal('');
  notes = signal('');

  loading = signal(false);
  loadError = signal<string | null>(null);
  submitMessage = signal<string | null>(null);

  allItemsRaw = signal<PickRow[]>([]);
  allAdjustments = signal<AdjustmentRecord[]>([]);

  historySearchTerm = signal('');
  dateFrom = signal(toYmd(addDays(new Date(), -90)));
  dateTo = signal(toYmd(new Date()));

  sortField = signal<SortField>('dateTime');
  sortDir = signal<'asc' | 'desc'>('desc');

  currentPage = signal(1);
  pageSize = signal(10);

  selectedDetail = signal<AdjustmentRecord | null>(null);

  notification = signal<NotificationState | null>(null);
  private notifTimer: ReturnType<typeof setTimeout> | null = null;

  readonly pageSizeOptions = [10, 20, 50];
  readonly reasonOptions = ['Damaged Goods', 'Lost/Missing', 'Inventory Count Correction', 'Quality Issue', 'Expired', 'Return to Supplier', 'Other'];

  currentQuantity = computed(() => this.selectedRow()?.current ?? 0);
  newQuantity = signal(0);

  filteredItems = computed(() => {
    const t = this.searchTerm().toLowerCase();
    return this.allItemsRaw().filter(
      (x) => !t || x.name.toLowerCase().includes(t) || x.sku.toLowerCase().includes(t),
    );
  });

  locationLabel = computed(() => {
    const r = this.selectedRow();
    if (!r) return '\u2014';
    return `${r.warehouse} \u2014 ${r.shelf}`;
  });

  selectedItemLabel = computed(() => this.selectedRow()?.name ?? '');

  filteredHistory = computed(() => {
    const search = this.historySearchTerm().toLowerCase();
    const dateFrom = this.dateFrom();
    const dateTo = this.dateTo();

    return this.allAdjustments().filter((r) => {
      if (dateFrom && r.dateTime.slice(0, 10) < dateFrom) return false;
      if (dateTo && r.dateTime.slice(0, 10) > dateTo) return false;
      if (search) {
        const haystack = `${r.item} ${r.sku} ${r.reason} ${r.performedBy}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  });

  sortedHistory = computed(() => {
    const field = this.sortField();
    const dir = this.sortDir();
    const rows = [...this.filteredHistory()];

    rows.sort((a, b) => {
      let cmp = 0;
      switch (field) {
        case 'dateTime':
          cmp = a.dateTime.localeCompare(b.dateTime);
          break;
        case 'item':
          cmp = a.item.localeCompare(b.item);
          break;
        case 'type':
          cmp = a.type.localeCompare(b.type);
          break;
        case 'quantity':
          cmp = a.quantity - b.quantity;
          break;
        case 'reason':
          cmp = a.reason.localeCompare(b.reason);
          break;
        case 'performedBy':
          cmp = a.performedBy.localeCompare(b.performedBy);
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
      }
      return dir === 'asc' ? cmp : -cmp;
    });

    return rows;
  });

  paginatedHistory = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.sortedHistory().slice(start, start + this.pageSize());
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredHistory().length / this.pageSize())));

  displayRange = computed(() => {
    const total = this.filteredHistory().length;
    const page = this.currentPage();
    const size = this.pageSize();
    const start = total === 0 ? 0 : (page - 1) * size + 1;
    const end = Math.min(page * size, total);
    return { start, end, total };
  });

  summaryStats = computed<SummaryStats>(() => {
    const rows = this.allAdjustments();
    const thisMonth = toYmd(new Date()).slice(0, 7);
    const thisMonthAdjustments = rows.filter((r) => r.dateTime.slice(0, 7) === thisMonth);

    let increases = 0;
    let decreases = 0;
    let pending = 0;

    for (const r of rows) {
      if (r.type === 'Increase') {
        increases += r.quantity;
      } else if (r.type === 'Decrease') {
        decreases += r.quantity;
      } else {
        const diff = r.stockAfter - r.stockBefore;
        if (diff > 0) increases += diff;
        else decreases += Math.abs(diff);
      }
      if (r.status === 'Pending') pending++;
    }

    const uniqueSku = new Set(rows.map((r) => r.sku));

    return {
      totalAdjustments: thisMonthAdjustments.length || rows.length,
      totalItemsAdjusted: uniqueSku.size,
      netQuantityChange: increases - decreases,
      pendingApprovals: pending,
      increases,
      decreases,
    };
  });

  monthlyTrends = computed<MonthlyTrend[]>(() => {
    const rows = this.allAdjustments();
    const now = new Date();
    const months: MonthlyTrend[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      let increases = 0;
      let decreases = 0;
      for (const r of rows) {
        if (r.dateTime.slice(0, 7) === monthKey) {
          if (r.type === 'Increase') {
            increases += r.quantity;
          } else if (r.type === 'Decrease') {
            decreases += r.quantity;
          } else {
            const diff = r.stockAfter - r.stockBefore;
            if (diff > 0) increases += diff;
            else decreases += Math.abs(diff);
          }
        }
      }
      months.push({ monthLabel: label, increases, decreases });
    }
    return months;
  });

  reasonBreakdown = computed<ReasonBreakdown[]>(() => {
    const counts: Record<string, number> = {};
    for (const r of this.allAdjustments()) {
      counts[r.reason] = (counts[r.reason] || 0) + 1;
    }
    const maxCount = Math.max(...Object.values(counts), 1);
    return Object.entries(counts).map(([reason, count]) => ({
      reason,
      count,
      percentage: (count / maxCount) * 100,
    }));
  });

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    if (this.notifTimer) clearTimeout(this.notifTimer);
  }

  loadData(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.inventory.getStockOverview({ pageSize: 500 }).subscribe({
      next: (res) => {
        if (res.success !== false && Array.isArray(res.data) && res.data.length > 0) {
          this.allItemsRaw.set(res.data.map((r) => this.mapPick(r)));
          this.loading.set(false);
        } else {
          this.loadFromItemMasters();
        }
        this.loadHistory();
      },
      error: () => {
        this.loadFromItemMasters();
        this.loadHistory();
      },
    });
  }

  private loadFromItemMasters(): void {
    this.itemMasterService.getItemMasters(1, 500).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data && typeof res.data === 'object' && 'items' in res.data) {
          const items = (res.data as { items: ItemMaster[] }).items;
          this.itemMasterCache.clear();
          items.forEach(m => this.itemMasterCache.set(String(m.id), m));
          this.allItemsRaw.set(items.map(this.mapItemMasterToPick));
        } else {
          this.allItemsRaw.set([]);
          this.showNotification('No stock data available from any source', 'info');
        }
      },
      error: () => {
        this.loading.set(false);
        this.allItemsRaw.set([]);
        this.showNotification('Failed to load stock data from any source', 'error');
      },
    });
  }

  private mapItemMasterToPick(m: ItemMaster): PickRow {
    const cur = Number(m.availableStock ?? m.currentStock ?? m.stockQuantity ?? 0);
    return {
      inventoryId: '',
      itemId: String(m.id),
      shelfId: '',
      name: m.itemName || '\u2014',
      sku: m.sku || '\u2014',
      current: cur,
      low: false,
      warehouse: '',
      shelf: '',
    };
  }

  private loadHistory(): void {
    this.inventory
      .getStockMovements({
        dateFrom: this.dateFrom(),
        dateTo: this.dateTo(),
        pageSize: 500,
      })
      .subscribe({
        next: (res) => {
          if (res.success !== false && Array.isArray(res.data) && res.data.length > 0) {
            const adj = res.data
              .filter((m) => this.isAdjustmentLike(m))
              .map((m) => this.mapAdjustment(m));
            this.allAdjustments.set(adj);
          } else {
            this.allAdjustments.set([]);
          }
        },
        error: () => {
          this.allAdjustments.set([]);
          this.showNotification('Failed to load adjustment history', 'error');
        },
      });
  }

  private mapPick(r: InventoryStockDto): PickRow {
    const min = Number(r.minimumThreshold) || 0;
    const cur = Number(r.currentQuantity ?? r.currentStock) || 0;
    const low = min > 0 && cur <= min;
    return {
      inventoryId: r.id,
      itemId: r.itemId,
      shelfId: r.shelfId,
      name: r.itemName || '\u2014',
      sku: r.sku || '\u2014',
      current: cur,
      low,
      warehouse: r.warehouseName || '\u2014',
      shelf: r.shelfLocation || '\u2014',
    };
  }

  private mapAdjustment(m: StockMovementDto): AdjustmentRecord {
    const qty = Number(m.quantity) || 0;
    const prev = Number(m.previousStock) || 0;
    const next = Number(m.newStock) || 0;
    const type: 'Increase' | 'Decrease' | 'Set' = qty > 0 ? 'Increase' : qty < 0 ? 'Decrease' : 'Set';
    return {
      id: m.id || crypto.randomUUID(),
      dateTime: m.movementDate || new Date().toISOString(),
      item: m.itemName || '\u2014',
      sku: m.sku || '\u2014',
      type,
      quantity: Math.abs(qty),
      stockBefore: prev,
      stockAfter: next,
      reason: m.notes || m.referenceType || 'Other',
      performedBy: m.performedBy || '\u2014',
      status: 'Approved',
      notes: m.notes || '',
    };
  }

  private isAdjustmentLike(m: StockMovementDto): boolean {
    const u = `${m.movementType || ''} ${m.referenceType || ''}`.toUpperCase();
    return u.includes('ADJUST') || u.includes('ADJ') || u.includes('COUNT');
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  selectItem(item: PickRow): void {
    this.selectedRow.set(item);
    this.submitMessage.set(null);
    this.calculateNewQuantity();
  }

  onAdjustmentTypeChange(value: string): void {
    this.adjustmentType.set(value as 'Increase' | 'Decrease' | 'Set');
    this.calculateNewQuantity();
  }

  onQuantityChange(value: number): void {
    this.quantityToAdjust.set(Number(value) || 0);
    this.calculateNewQuantity();
  }

  calculateNewQuantity(): void {
    const qty = this.quantityToAdjust();
    const type = this.adjustmentType();
    const current = this.currentQuantity();
    if (type === 'Increase') {
      this.newQuantity.set(current + qty);
    } else if (type === 'Decrease') {
      this.newQuantity.set(Math.max(0, current - qty));
    } else {
      this.newQuantity.set(qty);
    }
  }

  requiresApproval(): boolean {
    const qty = Math.abs(this.quantityToAdjust());
    const current = this.currentQuantity();
    if (current <= 0) return qty > 0;
    return qty > current * 0.1;
  }

  submitAdjustment(): void {
    const row = this.selectedRow();
    if (!row) {
      this.showNotification('Please select an item from the list.', 'error');
      return;
    }
    const r = this.reason();
    if (!r) {
      this.showNotification('Please select a reason.', 'error');
      return;
    }

    let adjustmentType: 'increase' | 'decrease' | 'set' = 'decrease';
    if (this.adjustmentType() === 'Increase') adjustmentType = 'increase';
    if (this.adjustmentType() === 'Set') adjustmentType = 'set';

    const quantity = this.quantityToAdjust();
    this.submitMessage.set(null);

    this.tryAdjust(row, adjustmentType, quantity, r);
  }

  private adjustCall(
    inventoryId: string,
    currentQuantity: number,
    newQuantity: number,
    reason: string,
  ): Observable<unknown> {
    const delta = currentQuantity - newQuantity;
    return this.apiService.post<unknown>('InventoryStock/adjust', {
      inventoryId,
      quantity: delta,
      reason,
      remarks: this.notes() || undefined,
    });
  }

  private handleAdjustSuccess(res: unknown): void {
    if ((res as any)?.success !== false) {
      this.showNotification('Adjustment submitted successfully.', 'success');
      this.loadData();
      this.resetForm();
    } else {
      this.showNotification((res as any)?.message || 'Adjustment failed.', 'error');
    }
  }

  private handleAdjustError(err: unknown): void {
    const status = (err as any)?.status || '?';
    const raw = typeof (err as any)?.error === 'string'
      ? (err as any).error.substring(0, 200)
      : ((err as any)?.error?.message || (err as any)?.error || 'No details');
    this.showNotification(`Adjustment failed (${status}): ${raw}`, 'error');
  }

  private tryAdjust(
    row: PickRow,
    adjustmentType: 'increase' | 'decrease' | 'set',
    quantity: number,
    reason: string,
  ): void {
    if (row.inventoryId) {
      let newQuantity: number;
      if (adjustmentType === 'increase') newQuantity = row.current + quantity;
      else if (adjustmentType === 'decrease') newQuantity = Math.max(0, row.current - quantity);
      else newQuantity = quantity;

      this.adjustCall(row.inventoryId, row.current, newQuantity, reason).subscribe({
        next: (res) => this.handleAdjustSuccess(res),
        error: (err) => this.handleAdjustError(err),
      });
      return;
    }

    this.inventory.getStockOverview({ itemId: row.itemId } as any).subscribe({
      next: (res) => {
        if (res.success !== false && Array.isArray(res.data) && res.data.length > 0) {
          const inv = res.data[0];
          const actualCurrent = inv.currentQuantity ?? inv.currentStock ?? row.current;
          let newQuantity: number;
          if (adjustmentType === 'increase') newQuantity = actualCurrent + quantity;
          else if (adjustmentType === 'decrease') newQuantity = Math.max(0, actualCurrent - quantity);
          else newQuantity = quantity;
          this.adjustCall(inv.id, actualCurrent, newQuantity, reason).subscribe({
            next: (r) => this.handleAdjustSuccess(r),
            error: (err) => this.handleAdjustError(err),
          });
        } else {
          this.tryReserveFallback(row, quantity, reason);
        }
      },
      error: () => {
        this.tryReserveFallback(row, quantity, reason);
      },
    });
  }

  private tryReserveFallback(
    row: PickRow,
    newQuantity: number,
    reason: string,
  ): void {
    const refId = crypto.randomUUID();
    this.apiService.post<unknown>('InventoryStock/reserve', {
      itemId: row.itemId,
      quantity: Math.max(1, newQuantity),
      referenceId: refId,
      referenceType: 'StockAdjustment',
    }).subscribe({
      next: (res) => this.handleAdjustSuccess(res),
      error: (err) => {
        const status = (err as any)?.status || '?';
        const raw = typeof (err as any)?.error === 'string'
          ? (err as any).error.substring(0, 200)
          : ((err as any)?.error?.message || (err as any)?.error || 'No details');
        this.showNotification(`Adjustment failed (${status}): ${raw}`, 'error');
      },
    });
  }

  resetForm(): void {
    this.searchTerm.set('');
    this.selectedRow.set(null);
    this.adjustmentType.set('Decrease');
    this.quantityToAdjust.set(1);
    this.reason.set('');
    this.notes.set('');
    this.newQuantity.set(0);
    this.submitMessage.set(null);
  }

  setSort(field: SortField): void {
    if (this.sortField() === field) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set('desc');
    }
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  onRowsPerPageChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.pageSize.set(value);
    this.currentPage.set(1);
  }

  onHistorySearch(event: Event): void {
    this.historySearchTerm.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  onDateFromChange(event: Event): void {
    this.dateFrom.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  onDateToChange(event: Event): void {
    this.dateTo.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  clearFilters(): void {
    this.historySearchTerm.set('');
    this.dateFrom.set(toYmd(addDays(new Date(), -90)));
    this.dateTo.set(toYmd(new Date()));
    this.currentPage.set(1);
  }

  openDetail(record: AdjustmentRecord): void {
    this.selectedDetail.set(record);
  }

  closeDetail(): void {
    this.selectedDetail.set(null);
  }

  exportToCsv(): void {
    const rows = this.sortedHistory();
    if (rows.length === 0) {
      this.showNotification('No data to export', 'error');
      return;
    }

    const header = 'Date/Time,Item,SKU,Type,Quantity,Stock Before,Stock After,Reason,Performed By,Status,Notes';
    const csvRows = rows.map(
      (r) =>
        `"${this.formatDateTime(r.dateTime)}","${r.item}","${r.sku}","${r.type}",${r.quantity},${r.stockBefore},${r.stockAfter},"${r.reason}","${r.performedBy}","${r.status}","${(r.notes || '').replace(/"/g, '""')}"`,
    );
    const csv = [header, ...csvRows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-adjustments-${toYmd(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.showNotification(`Exported ${rows.length} adjustment(s)`, 'success');
  }

  showNotification(message: string, type: NotificationState['type'] = 'success'): void {
    if (this.notifTimer) clearTimeout(this.notifTimer);
    this.notification.set({ message, type });
    this.notifTimer = setTimeout(() => this.notification.set(null), 3000);
  }

  dismissNotification(): void {
    if (this.notifTimer) clearTimeout(this.notifTimer);
    this.notification.set(null);
  }

  getStatusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      Approved: 'badge-approved',
      Pending: 'badge-pending',
      Rejected: 'badge-rejected',
    };
    return map[status] || '';
  }

  getStatusIcon(status: string): string {
    const map: Record<string, string> = {
      Approved: 'bi bi-check-circle-fill',
      Pending: 'bi bi-clock-fill',
      Rejected: 'bi bi-x-circle-fill',
    };
    return map[status] || 'bi bi-info-circle-fill';
  }

  getTypeBadgeClass(type: string): string {
    const map: Record<string, string> = {
      Increase: 'badge-increase',
      Decrease: 'badge-decrease',
      Set: 'badge-set',
    };
    return map[type] || '';
  }

  getTypeIconClass(type: string): string {
    const map: Record<string, string> = {
      Increase: 'bi bi-arrow-up-circle',
      Decrease: 'bi bi-arrow-down-circle',
      Set: 'bi bi-pin-angle',
    };
    return map[type] || 'bi bi-info-circle';
  }

  getTypeFillIconClass(type: string): string {
    const map: Record<string, string> = {
      Increase: 'bi bi-arrow-up-circle-fill',
      Decrease: 'bi bi-arrow-down-circle-fill',
      Set: 'bi bi-pin-angle-fill',
    };
    return map[type] || 'bi bi-info-circle-fill';
  }

  formatDateTime(iso: string): string {
    if (!iso || iso === '\u2014') return '\u2014';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatDate(iso: string): string {
    if (!iso || iso === '\u2014') return '\u2014';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatQuantity(qty: number, type: string): string {
    if (type === 'Increase') return `+${qty}`;
    if (type === 'Decrease') return `-${qty}`;
    return `=${qty}`;
  }

  isPositive(qty: number): boolean {
    return qty > 0;
  }

  formatNumber(n: number): string {
    return n.toLocaleString('en-US');
  }

  getSortIndicator(field: SortField): string {
    if (this.sortField() !== field) return 'bi bi-arrow-down-up';
    return this.sortDir() === 'asc' ? 'bi bi-sort-up' : 'bi bi-sort-down';
  }

  getPageArray(): number[] {
    const total = this.totalPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  getMaxTrendValue(): number {
    const max = Math.max(
      ...this.monthlyTrends().flatMap((w) => [w.increases, w.decreases]),
      1,
    );
    return max;
  }

  getBarPercent(value: number, maxVal: number): number {
    return maxVal > 0 ? (value / maxVal) * 100 : 0;
  }

  stockBeforeAfter(record: AdjustmentRecord): string {
    return `${record.stockBefore} \u2192 ${record.stockAfter}`;
  }
}
