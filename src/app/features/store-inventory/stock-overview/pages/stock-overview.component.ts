import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { InventoryService, StockMovementDto } from '../../../../core/services/inventory.service';

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

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

@Component({
  selector: 'app-stock-overview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-overview.component.html',
  styleUrls: ['./stock-overview.component.scss'],
})
export class StockOverviewComponent implements OnInit {
  readonly router = inject(Router);
  private readonly inventory = inject(InventoryService);

  loading = signal(false);
  loadError = signal<string | null>(null);

  currentDate = signal(new Date().toLocaleDateString());
  lastUpdated = signal('—');

  totalItems = signal(0);
  totalStockValue = signal(0);
  avgTurnoverRate = signal(0);
  stockTurnoverDays = signal(0);
  lowStockItems = signal(0);

  valueChange = signal('—');
  turnoverChange = signal('—');
  daysChange = signal('—');

  todayIn = signal(0);
  todayOut = signal(0);
  todayXfer = signal(0);
  weekIn = signal(0);
  weekOut = signal(0);
  weekXfer = signal(0);
  monthIn = signal(0);
  monthOut = signal(0);
  monthXfer = signal(0);

  warehouseStock = signal<WarehouseStock[]>([]);
  categoryStock = signal<CategoryStock[]>([]);
  topItems = signal<StockItem[]>([]);

  barHeightsTotal = signal<number[]>([]);
  barHeightsInflow = signal<number[]>([]);
  barHeightsOutflow = signal<number[]>([]);

  ngOnInit(): void {
    const totalHeights: number[] = [];
    const inflowHeights: number[] = [];
    const outflowHeights: number[] = [];
    for (let i = 0; i < 8; i++) {
      totalHeights.push(this.getRandomHeight(80, 40));
      inflowHeights.push(this.getRandomHeight(30, 20));
      outflowHeights.push(this.getRandomHeight(20, 15));
    }
    this.barHeightsTotal.set(totalHeights);
    this.barHeightsInflow.set(inflowHeights);
    this.barHeightsOutflow.set(outflowHeights);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    const today = new Date();
    const startMonth = toYmd(addDays(today, -30));
    const end = toYmd(today);
    forkJoin({
      overview: this.inventory.getStockOverview({ pageSize: 10000 }),
      movements: this.inventory.getStockMovements({ dateFrom: startMonth, dateTo: end, pageSize: 2000 }),
    }).subscribe({
      next: ({ overview, movements }) => {
        this.loading.set(false);
        if (overview.success === false || !Array.isArray(overview.data)) {
          this.loadError.set(overview.message || 'Could not load stock overview.');
          return;
        }
        const rows = overview.data;
        const totalUnits = rows.reduce((a, r) => a + (Number(r.currentStock) || 0), 0);
        this.totalItems.set(totalUnits);
        this.totalStockValue.set(0);

        const low = rows.filter((r) => {
          const min = Number(r.minimumThreshold) || 0;
          const q = Number(r.currentStock) || 0;
          return min > 0 && q <= min;
        }).length;
        this.lowStockItems.set(low);

        const wmap = new Map<string, number>();
        for (const r of rows) {
          const n = r.warehouseName || '—';
          wmap.set(n, (wmap.get(n) || 0) + (Number(r.currentStock) || 0));
        }
        this.warehouseStock.set(
          [...wmap.entries()]
            .map(([name, items]) => ({ name, items }))
            .sort((a, b) => b.items - a.items),
        );

        const cmap = new Map<string, number>();
        for (const r of rows) {
          const c = r.unitOfMeasure || 'Units';
          cmap.set(c, (cmap.get(c) || 0) + (Number(r.currentStock) || 0));
        }
        const maxC = Math.max(...[...cmap.values()], 1);
        this.categoryStock.set(
          [...cmap.entries()]
            .map(([name, items]) => ({ name, items, percentage: Math.round((items / maxC) * 100) }))
            .sort((a, b) => b.items - a.items)
            .slice(0, 8),
        );

        const top = [...rows]
          .sort((a, b) => (Number(b.currentStock) || 0) - (Number(a.currentStock) || 0))
          .slice(0, 10)
          .map((r, i) => ({
            rank: i + 1,
            name: r.itemName || '—',
            stockQty: Number(r.currentStock) || 0,
            unitPrice: 0,
            value: 0,
          }));
        this.topItems.set(top);

        if (movements.success !== false && Array.isArray(movements.data)) {
          this.applyMovementRollups(movements.data);
        }

        this.lastUpdated.set('Just now');
      },
      error: (err) => {
        this.loading.set(false);
        this.loadError.set('Failed to load overview.');
        console.error(err);
      },
    });
  }

  private applyMovementRollups(movs: StockMovementDto[]): void {
    const startOfDay = (d: Date) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x;
    };
    const t0 = startOfDay(new Date());
    const w0 = addDays(t0, -7);
    const m0 = addDays(t0, -30);

    let tin = 0;
    let tout = 0;
    let txf = 0;
    let win = 0;
    let wout = 0;
    let wxf = 0;
    let min = 0;
    let mout = 0;
    let mxf = 0;

    for (const raw of movs) {
      const dt = raw.movementDate ? new Date(raw.movementDate) : null;
      if (!dt || Number.isNaN(dt.getTime())) continue;
      const q = Number(raw.quantity) || 0;
      const kind = this.classifyMovement(raw);
      const abs = Math.abs(q);

      const add = (isT: boolean, isW: boolean, isM: boolean) => {
        if (isT) {
          if (kind === 'in') tin += abs;
          else if (kind === 'out') tout += abs;
          else txf += abs;
        }
        if (isW) {
          if (kind === 'in') win += abs;
          else if (kind === 'out') wout += abs;
          else wxf += abs;
        }
        if (isM) {
          if (kind === 'in') min += abs;
          else if (kind === 'out') mout += abs;
          else mxf += abs;
        }
      };

      const isT = dt >= t0;
      const isW = dt >= w0;
      const isM = dt >= m0;
      if (isT || isW || isM) add(isT, isW, isM);
    }

    this.todayIn.set(tin);
    this.todayOut.set(tout);
    this.todayXfer.set(txf);
    this.weekIn.set(win);
    this.weekOut.set(wout);
    this.weekXfer.set(wxf);
    this.monthIn.set(min);
    this.monthOut.set(mout);
    this.monthXfer.set(mxf);
  }

  private classifyMovement(d: StockMovementDto): 'in' | 'out' | 'other' {
    const u = `${d.movementType || ''} ${d.referenceType || ''}`.toUpperCase();
    if (u.includes('TRANSFER')) return 'other';
    if (u.includes('IN') || u.includes('RECEIV') || u.includes('GRN')) return 'in';
    if (u.includes('OUT') || u.includes('ISSUE') || u.includes('SIV')) return 'out';
    const q = Number(d.quantity) || 0;
    if (q > 0) return 'in';
    if (q < 0) return 'out';
    return 'other';
  }

  refreshData(): void {
    this.load();
  }

  formatValue(value: number): string {
    if (value >= 1000000) {
      return '$' + (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return '$' + (value / 1000).toFixed(0) + 'K';
    }
    return '$' + value.toString();
  }

  formatNumber(value: number): string {
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
  }

  getRandomHeight(base: number, variance: number): number {
    return base + Math.random() * variance;
  }

  viewWarehouseDetails(): void {
    this.router.navigate(['/admin/warehouses']);
  }

  viewCategoryDetails(): void {
    this.router.navigate(['/admin/inventory/current-stock']);
  }

  viewAllItems(): void {
    this.router.navigate(['/admin/inventory/current-stock']);
  }
}
