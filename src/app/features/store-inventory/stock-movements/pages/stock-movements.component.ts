import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService, StockMovementDto } from '../../../../core/services/inventory.service';

type MovementType = 'Inflow' | 'Outflow' | 'Transfer' | 'Adjustment';

interface Movement {
  id: string;
  dateTime: string;
  type: MovementType;
  item: string;
  sku: string;
  quantity: number;
  refNumber: string;
  performedBy: string;
  notes: string;
}

interface NotificationState {
  message: string;
  type: 'success' | 'error' | 'info';
}

type SortField = 'dateTime' | 'type' | 'item' | 'quantity' | 'refNumber' | 'performedBy';

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function createMockMovements(): Movement[] {
  const now = new Date();
  const items: Array<{ item: string; sku: string }> = [
    { item: 'Office Laptop', sku: 'LAP-HP-001' },
    { item: 'Office Chair', sku: 'CHR-STD-001' },
    { item: 'Desk Printer', sku: 'PRT-JET-001' },
    { item: 'Printer Paper', sku: 'PAP-A4-001' },
    { item: 'Wireless Mouse', sku: 'MOU-WL-001' },
    { item: 'Mechanical Keyboard', sku: 'KEY-MC-001' },
    { item: 'Monitor 24"', sku: 'MON-24-001' },
    { item: 'Desk Lamp', sku: 'LMP-DK-001' },
    { item: 'USB-C Hub', sku: 'USB-HB-001' },
    { item: 'Headset', sku: 'HDS-BT-001' },
  ];
  const users = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson', 'David Chen'];

  const records: Array<{
    type: MovementType;
    itemIdx: number;
    qty: number;
    refNum: string;
    userIdx: number;
    note: string;
    daysAgo: number;
  }> = [
    { type: 'Inflow', itemIdx: 0, qty: 10, refNum: 'GRN-2026-0401', userIdx: 0, note: 'Supplier delivery - HP ProBook', daysAgo: 84 },
    { type: 'Outflow', itemIdx: 1, qty: 5, refNum: 'SIV-2026-0301', userIdx: 1, note: 'Issued to Admin department', daysAgo: 80 },
    { type: 'Inflow', itemIdx: 3, qty: 50, refNum: 'GRN-2026-0402', userIdx: 2, note: 'Bulk paper order from supplier', daysAgo: 75 },
    { type: 'Transfer', itemIdx: 0, qty: 3, refNum: 'TRF-2026-0201', userIdx: 3, note: 'Transferred to Branch A', daysAgo: 70 },
    { type: 'Outflow', itemIdx: 2, qty: 2, refNum: 'SIV-2026-0302', userIdx: 0, note: 'IT department replacement', daysAgo: 65 },
    { type: 'Adjustment', itemIdx: 1, qty: -1, refNum: 'ADJ-2026-0101', userIdx: 4, note: 'Count correction - damaged unit', daysAgo: 60 },
    { type: 'Inflow', itemIdx: 4, qty: 20, refNum: 'GRN-2026-0403', userIdx: 1, note: 'New peripheral stock', daysAgo: 55 },
    { type: 'Outflow', itemIdx: 5, qty: 8, refNum: 'SIV-2026-0303', userIdx: 2, note: 'Equipment for new hires', daysAgo: 50 },
    { type: 'Inflow', itemIdx: 6, qty: 5, refNum: 'GRN-2026-0404', userIdx: 3, note: 'Monitor shipment arrived', daysAgo: 45 },
    { type: 'Outflow', itemIdx: 3, qty: 20, refNum: 'SIV-2026-0304', userIdx: 0, note: 'Office consumables', daysAgo: 40 },
    { type: 'Transfer', itemIdx: 2, qty: 1, refNum: 'TRF-2026-0202', userIdx: 4, note: 'Cross-warehouse transfer', daysAgo: 35 },
    { type: 'Adjustment', itemIdx: 4, qty: 2, refNum: 'ADJ-2026-0102', userIdx: 1, note: 'Physical count adjustment', daysAgo: 30 },
    { type: 'Inflow', itemIdx: 7, qty: 15, refNum: 'GRN-2026-0405', userIdx: 2, note: 'Lighting equipment stock', daysAgo: 28 },
    { type: 'Outflow', itemIdx: 8, qty: 10, refNum: 'SIV-2026-0305', userIdx: 3, note: 'Accessories issued', daysAgo: 25 },
    { type: 'Inflow', itemIdx: 9, qty: 8, refNum: 'GRN-2026-0406', userIdx: 0, note: 'Headset restock', daysAgo: 20 },
    { type: 'Outflow', itemIdx: 6, qty: 2, refNum: 'SIV-2026-0306', userIdx: 1, note: 'Executive office setup', daysAgo: 15 },
    { type: 'Adjustment', itemIdx: 5, qty: -3, refNum: 'ADJ-2026-0103', userIdx: 4, note: 'Inventory variance correction', daysAgo: 12 },
    { type: 'Transfer', itemIdx: 9, qty: 4, refNum: 'TRF-2026-0203', userIdx: 2, note: 'Transfer to satellite office', daysAgo: 8 },
    { type: 'Inflow', itemIdx: 1, qty: 10, refNum: 'GRN-2026-0407', userIdx: 3, note: 'Chair order fulfillment', daysAgo: 5 },
    { type: 'Outflow', itemIdx: 0, qty: 1, refNum: 'SIV-2026-0307', userIdx: 0, note: 'New employee laptop', daysAgo: 1 },
  ];

  return records.map((r, i) => ({
    id: `mov-${String(i + 1).padStart(3, '0')}`,
    dateTime: addDays(now, -r.daysAgo).toISOString(),
    type: r.type,
    item: items[r.itemIdx].item,
    sku: items[r.itemIdx].sku,
    quantity: r.type === 'Outflow' ? -Math.abs(r.qty) : Math.abs(r.qty),
    refNumber: r.refNum,
    performedBy: users[r.userIdx],
    notes: r.note,
  }));
}

@Component({
  selector: 'app-stock-movements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-movements.component.html',
  styleUrls: ['./stock-movements.component.scss'],
})
export class StockMovementsComponent implements OnInit, OnDestroy {
  private inventory = inject(InventoryService);

  searchTerm = signal('');
  typeFilter = signal<string>('All');
  dateFrom = signal(toYmd(addDays(new Date(), -84)));
  dateTo = signal(toYmd(new Date()));

  loading = signal(false);
  loadError = signal<string | null>(null);
  isUsingMock = signal(false);
  allMovements = signal<Movement[]>([]);

  sortField = signal<SortField>('dateTime');
  sortDir = signal<'asc' | 'desc'>('desc');

  currentPage = signal(1);
  pageSize = signal(10);

  selectedMovement = signal<Movement | null>(null);

  notification = signal<NotificationState | null>(null);
  private notifTimer: ReturnType<typeof setTimeout> | null = null;

  readonly typeOptions: string[] = ['All', 'Inflow', 'Outflow', 'Transfer', 'Adjustment'];
  readonly pageSizeOptions = [10, 20, 50];

  filteredMovements = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const typeFilter = this.typeFilter();
    const dateFrom = this.dateFrom();
    const dateTo = this.dateTo();

    return this.allMovements().filter((m) => {
      if (typeFilter !== 'All' && m.type !== typeFilter) return false;
      if (dateFrom && m.dateTime < dateFrom) return false;
      if (dateTo) {
        const movDate = m.dateTime.slice(0, 10);
        if (movDate > dateTo) return false;
      }
      if (search) {
        const haystack = `${m.item} ${m.sku} ${m.refNumber} ${m.performedBy} ${m.notes}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  });

  sortedMovements = computed(() => {
    const field = this.sortField();
    const dir = this.sortDir();
    const rows = [...this.filteredMovements()];

    rows.sort((a, b) => {
      let cmp = 0;
      switch (field) {
        case 'dateTime':
          cmp = a.dateTime.localeCompare(b.dateTime);
          break;
        case 'type':
          cmp = a.type.localeCompare(b.type);
          break;
        case 'item':
          cmp = a.item.localeCompare(b.item);
          break;
        case 'quantity':
          cmp = a.quantity - b.quantity;
          break;
        case 'refNumber':
          cmp = a.refNumber.localeCompare(b.refNumber);
          break;
        case 'performedBy':
          cmp = a.performedBy.localeCompare(b.performedBy);
          break;
      }
      return dir === 'asc' ? cmp : -cmp;
    });

    return rows;
  });

  paginatedMovements = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.sortedMovements().slice(start, start + this.pageSize());
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredMovements().length / this.pageSize())));

  displayRange = computed(() => {
    const total = this.filteredMovements().length;
    const page = this.currentPage();
    const size = this.pageSize();
    const start = total === 0 ? 0 : (page - 1) * size + 1;
    const end = Math.min(page * size, total);
    return { start, end, total };
  });

  summaryStats = computed(() => {
    const rows = this.filteredMovements();
    let inflow = 0;
    let outflow = 0;
    let transfer = 0;
    let adjustment = 0;
    for (const m of rows) {
      const q = Math.abs(m.quantity);
      switch (m.type) {
        case 'Inflow':
          inflow += q;
          break;
        case 'Outflow':
          outflow += q;
          break;
        case 'Transfer':
          transfer += q;
          break;
        case 'Adjustment':
          adjustment += q;
          break;
      }
    }
    return {
      totalMovements: rows.length,
      inflow,
      outflow,
      transfer,
      adjustment,
      netChange: inflow - outflow,
    };
  });

  weeklyTrends = computed(() => {
    const rows = this.allMovements();
    const now = new Date();
    const currentMonday = getMonday(now);
    const weeks: Array<{ weekLabel: string; inflow: number; outflow: number }> = [];

    for (let i = 11; i >= 0; i--) {
      const weekStart = addDays(currentMonday, -i * 7);
      const weekEnd = addDays(weekStart, 7);
      const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;

      let inflow = 0;
      let outflow = 0;
      for (const m of rows) {
        const d = new Date(m.dateTime);
        if (d >= weekStart && d < weekEnd) {
          if (m.type === 'Inflow') inflow += Math.abs(m.quantity);
          else if (m.type === 'Outflow') outflow += Math.abs(m.quantity);
        }
      }
      weeks.push({ weekLabel: label, inflow, outflow });
    }

    return weeks;
  });

  typeDistribution = computed(() => {
    const counts: Record<string, number> = { Inflow: 0, Outflow: 0, Transfer: 0, Adjustment: 0 };
    for (const m of this.allMovements()) {
      counts[m.type]++;
    }
    const maxCount = Math.max(...Object.values(counts), 1);
    return Object.entries(counts).map(([type, count]) => ({
      type,
      count,
      percentage: maxCount > 0 ? (count / maxCount) * 100 : 0,
    }));
  });

  ngOnInit(): void {
    this.loadMovements();
  }

  ngOnDestroy(): void {
    if (this.notifTimer) clearTimeout(this.notifTimer);
  }

  loadMovements(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.isUsingMock.set(false);

    this.inventory
      .getStockMovements({
        dateFrom: this.dateFrom(),
        dateTo: this.dateTo(),
        pageSize: 500,
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.success !== false && Array.isArray(res.data) && res.data.length > 0) {
            this.allMovements.set(res.data.map((d) => this.mapDto(d)));
          } else {
            this.allMovements.set(createMockMovements());
            this.isUsingMock.set(true);
            this.showNotification('Using sample data - API unavailable', 'info');
          }
        },
        error: () => {
          this.loading.set(false);
          this.allMovements.set(createMockMovements());
          this.isUsingMock.set(true);
          this.showNotification('Using sample data - API unavailable', 'info');
        },
      });
  }

  private mapDto(d: StockMovementDto): Movement {
    return {
      id: d.id,
      dateTime: d.movementDate || new Date().toISOString(),
      type: this.mapMovementType(d.movementType, d.referenceType),
      item: d.itemName || '\u2014',
      sku: d.sku || '\u2014',
      quantity: Number(d.quantity) || 0,
      refNumber: d.referenceNumber || '\u2014',
      performedBy: d.performedBy || '\u2014',
      notes: d.notes || '',
    };
  }

  private mapMovementType(movementType: string, referenceType?: string): MovementType {
    const u = `${movementType || ''} ${referenceType || ''}`.toUpperCase();
    if (u.includes('TRANSFER')) return 'Transfer';
    if (u.includes('ADJUST')) return 'Adjustment';
    if (u.includes('IN') || u.includes('RECEIV') || u.includes('GRN')) return 'Inflow';
    if (u.includes('OUT') || u.includes('ISSUE') || u.includes('SIV')) return 'Outflow';
    if ((Number(movementType) || 0) > 0) return 'Inflow';
    return 'Adjustment';
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

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  onTypeChange(event: Event): void {
    this.typeFilter.set((event.target as HTMLSelectElement).value);
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
    this.searchTerm.set('');
    this.typeFilter.set('All');
    this.dateFrom.set(toYmd(addDays(new Date(), -84)));
    this.dateTo.set(toYmd(new Date()));
    this.currentPage.set(1);
  }

  openDetail(m: Movement): void {
    this.selectedMovement.set(m);
  }

  closeDetail(): void {
    this.selectedMovement.set(null);
  }

  exportToCsv(): void {
    const rows = this.sortedMovements();
    if (rows.length === 0) {
      this.showNotification('No data to export', 'error');
      return;
    }

    const header = 'Date/Time,Type,Item,SKU,Quantity,Reference #,Performed By,Notes';
    const csvRows = rows.map(
      (m) =>
        `"${this.formatDateTime(m.dateTime)}","${m.type}","${m.item}","${m.sku}",${m.quantity},"${m.refNumber}","${m.performedBy}","${m.notes}"`,
    );
    const csv = [header, ...csvRows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-movements-${toYmd(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.showNotification(`Exported ${rows.length} movement(s)`, 'success');
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

  getTypeBadgeClass(type: string): string {
    const map: Record<string, string> = {
      Inflow: 'badge-inflow',
      Outflow: 'badge-outflow',
      Transfer: 'badge-transfer',
      Adjustment: 'badge-adjustment',
    };
    return map[type] || '';
  }

  getTypeIconClass(type: string): string {
    const map: Record<string, string> = {
      Inflow: 'bi bi-arrow-down-circle',
      Outflow: 'bi bi-arrow-up-circle',
      Transfer: 'bi bi-arrow-left-right-circle',
      Adjustment: 'bi bi-pencil-square',
    };
    return map[type] || 'bi bi-info-circle';
  }

  getTypeFillIconClass(type: string): string {
    const map: Record<string, string> = {
      Inflow: 'bi bi-arrow-down-circle-fill',
      Outflow: 'bi bi-arrow-up-circle-fill',
      Transfer: 'bi bi-arrow-left-right-circle-fill',
      Adjustment: 'bi bi-pencil-square-fill',
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

  formatQuantity(qty: number): string {
    return qty > 0 ? `+${qty}` : `${qty}`;
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
      ...this.weeklyTrends().flatMap((w) => [w.inflow, w.outflow]),
      1,
    );
    return max;
  }

  getBarPercent(value: number, maxVal: number): number {
    return maxVal > 0 ? (value / maxVal) * 100 : 0;
  }
}
