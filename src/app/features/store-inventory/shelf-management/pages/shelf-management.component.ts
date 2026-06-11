import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, PieChart, LineChart, GaugeChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { ShelvesService, ShelfLocationDto, CreateShelfLocationRequest } from '../../../../core/services/shelves.service';
import { WarehousesService, WarehouseDto } from '../../../../core/services/warehouses.service';
import { InventoryService, InventoryStockDto } from '../../../../core/services/inventory.service';

echarts.use([PieChart, BarChart, LineChart, GaugeChart, TooltipComponent, GridComponent, LegendComponent, TitleComponent, CanvasRenderer]);

export interface ShelfRow {
  id: string;
  code: string;
  location: string;
  items: number;
  value: number;
  occupancy: number;
  category: string;
  isActive: boolean;
  raw: ShelfLocationDto;
}

@Component({
  selector: 'app-shelf-management',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './shelf-management.component.html',
  styleUrls: ['./shelf-management.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelfManagementComponent implements OnInit {
  private readonly shelvesService = inject(ShelvesService);
  private readonly warehousesService = inject(WarehousesService);
  private readonly inventoryService = inject(InventoryService);

  warehouses = signal<WarehouseDto[]>([]);
  selectedWarehouseId = signal<string>('');
  searchTerm = signal('');
  aisleFilter = signal('All Aisles');

  shelfRows = signal<ShelfRow[]>([]);
  qtyByShelfId = signal<Record<string, number>>({});

  loading = signal(false);
  loadingWarehouses = signal(false);
  error = signal<string | null>(null);

  showAddShelfModal = signal(false);
  showShelfDetailsModal = signal(false);
  showRearrangeModal = signal(false);
  showMoveItemsModal = signal(false);
  selectedShelf = signal<ShelfRow | null>(null);
  shelfItems = signal<InventoryStockDto[]>([]);
  loadingItems = signal(false);
  saving = signal(false);

  addForm = {
    aisle: '',
    rack: '',
    shelfNumber: '',
    zone: '',
    binType: '',
    length: 0,
    width: 0,
    height: 0,
    maxWeight: 0,
    capacity: 0,
  };

  aisles = ['All Aisles', 'A-01', 'A-02', 'B-01', 'B-02', 'C-01'];

  readonly selectedWarehouseLabel = computed(() => {
    const id = this.selectedWarehouseId();
    const w = this.warehouses().find((x) => x.id === id);
    return w?.warehouseName ?? 'Warehouse';
  });

  readonly totalShelves = computed(() => this.shelfRows().length);
  readonly occupiedShelves = computed(() =>
    this.shelfRows().filter((r) => r.items > 0 || (r.raw.currentUtilization ?? 0) > 0).length,
  );
  readonly emptyShelves = computed(() => this.totalShelves() - this.occupiedShelves());
  readonly utilizationPct = computed(() => {
    const rows = this.shelfRows();
    if (!rows.length) return 0;
    const sum = rows.reduce((a, r) => a + r.occupancy, 0);
    return Math.round(sum / rows.length);
  });

  readonly totalCapacity = computed(() =>
    this.shelfRows().reduce((a, r) => a + (r.raw.capacity ?? 0), 0),
  );

  readonly totalItemsOnHand = computed(() =>
    this.shelfRows().reduce((a, r) => a + r.items, 0),
  );

  readonly activeShelves = computed(() =>
    this.shelfRows().filter(r => r.isActive).length,
  );

  readonly categoryBreakdown = computed(() => {
    const map: Record<string, number> = {};
    for (const r of this.shelfRows()) {
      const cat = r.category && r.category !== '—' ? r.category : 'Uncategorized';
      map[cat] = (map[cat] || 0) + 1;
    }
    return map;
  });

  readonly occupancyDistribution = computed(() => {
    const rows = this.filteredRows();
    const buckets = [0, 0, 0, 0];
    for (const r of rows) {
      const pct = r.occupancy;
      if (pct <= 25) buckets[0]++;
      else if (pct <= 50) buckets[1]++;
      else if (pct <= 75) buckets[2]++;
      else buckets[3]++;
    }
    return buckets;
  });

  readonly aisleNames = computed(() => {
    const names = new Set<string>();
    for (const r of this.filteredRows()) {
      const a = r.raw.aisle;
      if (a) names.add(a);
    }
    return Array.from(names).sort();
  });

  readonly aisleOccupancy = computed(() => {
    const map = new Map<string, { sum: number; count: number }>();
    for (const r of this.filteredRows()) {
      const aisle = r.raw.aisle || 'Unknown';
      const cur = map.get(aisle) ?? { sum: 0, count: 0 };
      cur.sum += r.occupancy;
      cur.count++;
      map.set(aisle, cur);
    }
    return Array.from(map.entries()).map(([name, { sum, count }]) => ({
      name,
      avg: Math.round(sum / count),
    }));
  });

  readonly pieChartOpts = computed<Record<string, unknown>>(() => {
    const dist = this.occupancyDistribution();
    const total = dist.reduce((a, b) => a + b, 0);
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      graphic: [{
        type: 'text', left: 'center', top: 'center',
        style: { text: `${total}`, fill: '#1e293b', fontSize: 24, fontWeight: 800, fontFamily: 'Inter, sans-serif' },
      }],
      series: [{
        type: 'pie', radius: ['50%', '75%'], center: ['50%', '50%'],
        avoidLabelOverlap: false,
        label: { show: true, position: 'outside', formatter: '{b}\n{d}%', color: '#94a3b8', fontSize: 11, lineHeight: 16, fontWeight: 600 },
        emphasis: { itemStyle: { shadowBlur: 15, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.2)' } },
        animationDuration: 1000, animationEasing: 'cubicOut',
        data: [
          { name: '0-25%', value: dist[0], itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [{ offset: 0, color: '#ef4444' }, { offset: 1, color: '#dc2626' }]) } },
          { name: '25-50%', value: dist[1], itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [{ offset: 0, color: '#f59e0b' }, { offset: 1, color: '#d97706' }]) } },
          { name: '50-75%', value: dist[2], itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#2563eb' }]) } },
          { name: '75-100%', value: dist[3], itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [{ offset: 0, color: '#10b981' }, { offset: 1, color: '#059669' }]) } },
        ],
      }],
    };
  });

  readonly barChartOpts = computed<Record<string, unknown>>(() => {
    const data = this.aisleOccupancy();
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: '{b}: {c}%' },
      grid: { left: '3%', right: '5%', bottom: '15%', top: '8%', containLabel: true },
      xAxis: { type: 'category', data: data.map(d => d.name), axisLabel: { color: '#94a3b8', fontWeight: 600, rotate: data.length > 4 ? 25 : 0 }, axisLine: { show: false }, axisTick: { show: false } },
      yAxis: { type: 'value', max: 100, axisLabel: { color: '#94a3b8', formatter: '{value}%' }, splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)' } } },
      series: [{
        type: 'bar', data: data.map(d => ({
          value: d.avg,
          itemStyle: { color: d.avg >= 75 ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#10b981' }, { offset: 1, color: '#059669' }]) : d.avg >= 50 ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#2563eb' }]) : d.avg >= 25 ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#f59e0b' }, { offset: 1, color: '#d97706' }]) : new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#ef4444' }, { offset: 1, color: '#dc2626' }]), borderRadius: [6, 6, 0, 0] },
        })),
        barWidth: '55%', animationDuration: 800, animationEasing: 'elasticOut',
      }],
    };
  });

  readonly gaugeChartOpts = computed<Record<string, unknown>>(() => {
    const pct = this.utilizationPct();
    return {
      tooltip: { formatter: '{b}: {c}%' },
      series: [{
        type: 'gauge', startAngle: 210, endAngle: -30,
        center: ['50%', '55%'], radius: '85%',
        min: 0, max: 100,
        progress: { show: true, width: 10, itemStyle: { color: pct >= 75 ? '#10b981' : pct >= 50 ? '#3b82f6' : pct >= 25 ? '#f59e0b' : '#ef4444' } },
        axisLine: { lineStyle: { width: 10, color: [[0.25, '#ef4444'], [0.5, '#f59e0b'], [0.75, '#3b82f6'], [1, '#10b981']] } },
        axisTick: { show: false },
        splitLine: { length: 8, lineStyle: { width: 2, color: '#475569' } },
        axisLabel: { color: '#94a3b8', fontSize: 10, distance: 20 },
        pointer: { show: true, length: '60%', width: 4, itemStyle: { color: '#1e293b' } },
        detail: { formatter: '{value}%', fontSize: 18, fontWeight: 700, color: '#1e293b', offsetCenter: [0, '60%'] },
        data: [{ value: pct, name: 'Utilization' }],
        animationDuration: 1200, animationEasing: 'cubicOut',
      }],
    };
  });

  readonly lineChartOpts = computed<Record<string, unknown>>(() => {
    return {
      tooltip: { trigger: 'axis', formatter: '{b}: {c} shelves' },
      grid: { left: '3%', right: '4%', bottom: '12%', top: '8%', containLabel: true },
      xAxis: { type: 'category', data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], axisLabel: { color: '#94a3b8', fontWeight: 600 }, axisLine: { show: false }, axisTick: { show: false } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)' } } },
      series: [{
        type: 'line', data: [12, 19, 8, 15, 22, 18],
        smooth: true,
        lineStyle: { width: 3, color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#6366f1' }, { offset: 1, color: '#8b5cf6' }]) },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(99,102,241,0.3)' }, { offset: 1, color: 'rgba(99,102,241,0.02)' }]) },
        symbol: 'circle', symbolSize: 8,
        itemStyle: { color: '#6366f1' },
        animationDuration: 1000, animationEasing: 'cubicOut',
      }],
    };
  });

  readonly categoryPieOpts = computed<Record<string, unknown>>(() => {
    const map = this.categoryBreakdown();
    const entries = Object.entries(map);
    const palette = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      series: [{
        type: 'pie', radius: ['45%', '70%'],
        label: { show: true, position: 'outside', formatter: '{b}', color: '#94a3b8', fontSize: 11, fontWeight: 600 },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' } },
        data: entries.map(([name, count], i) => ({
          name, value: count,
          itemStyle: { color: palette[i % palette.length] },
        })),
        animationDuration: 800, animationEasing: 'cubicOut',
      }],
    };
  });

  filteredRows = computed(() => {
    const q = this.searchTerm().toLowerCase().trim();
    const aisle = this.aisleFilter();
    return this.shelfRows().filter((r) => {
      const hay = `${r.code} ${r.location} ${r.category}`.toLowerCase();
      const matchQ = !q || hay.includes(q);
      const matchAisle =
        aisle === 'All Aisles' ||
        (r.raw.aisle && r.raw.aisle.includes(aisle.replace('All Aisles', ''))) ||
        r.location.toUpperCase().includes(aisle.toUpperCase());
      return matchQ && matchAisle;
    });
  });

  ngOnInit(): void {
    this.loadWarehouses();
  }

  loadWarehouses(): void {
    this.loadingWarehouses.set(true);
    this.error.set(null);
    this.warehousesService.getAll().subscribe({
      next: (res) => {
        this.loadingWarehouses.set(false);
        const list = Array.isArray(res.data) ? res.data : [];
        if (list.length) {
          this.warehouses.set(list);
          if (!this.selectedWarehouseId()) {
            this.selectedWarehouseId.set(list[0].id);
          }
          this.reloadAll();
        } else {
          this.error.set(
            res.success === false ? res.message || 'Could not load warehouses.' : 'No warehouses found.',
          );
        }
      },
      error: (err) => {
        this.loadingWarehouses.set(false);
        this.error.set(this.errMsg(err, 'Failed to load warehouses.'));
      },
    });
  }

  onWarehouseChange(id: string): void {
    this.selectedWarehouseId.set(id || '');
    this.reloadAll();
  }

  onAisleChange(value: string): void {
    this.aisleFilter.set(value);
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  reloadAll(): void {
    const wid = this.selectedWarehouseId();
    if (!wid) {
      this.shelfRows.set([]);
      return;
    }
    this.loadShelvesAndStock(wid);
  }

  private loadShelvesAndStock(warehouseId: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.shelvesService.getAll({ warehouseId }).subscribe({
      next: (res) => {
        const dtoList = Array.isArray(res.data) ? res.data : [];
        if (res.success === false) {
          this.loading.set(false);
          this.shelfRows.set([]);
          this.error.set(res.message || 'Could not load shelves from the server.');
          return;
        }
        const rows = dtoList.map((d) => this.toRow(d));
        this.shelfRows.set(rows);
        this.inventoryService.getStockOverview({ warehouseId }).subscribe({
          next: (inv) => {
            const map: Record<string, number> = {};
            if (inv.success !== false && Array.isArray(inv.data)) {
              for (const line of inv.data) {
                const sid = line.shelfId;
                if (!sid) continue;
                map[sid] = (map[sid] ?? 0) + (Number(line.currentStock) || 0);
              }
            }
            this.qtyByShelfId.set(map);
            this.shelfRows.update((list) =>
              list.map((r) => {
                const items = map[r.id] ?? 0;
                const cap = r.raw.capacity && r.raw.capacity > 0 ? r.raw.capacity : 0;
                const util = r.raw.currentUtilization ?? 0;
                const occupancy =
                  cap > 0 ? Math.min(100, Math.round((items / cap) * 100)) : Math.min(100, util);
                return { ...r, items, occupancy };
              }),
            );
            this.loading.set(false);
          },
          error: (err) => {
            this.loading.set(false);
            this.error.set(this.errMsg(err, 'Shelves loaded; stock counts unavailable.'));
          },
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(this.errMsg(err, 'Failed to load shelves.'));
      },
    });
  }

  private toRow(d: ShelfLocationDto): ShelfRow {
    const parts = [d.aisle, d.rack, d.shelfNumber].filter(Boolean).join(' · ');
    const location = [d.warehouseName, parts || d.description || '—'].filter(Boolean).join(' — ');
    const cap = d.capacity && d.capacity > 0 ? d.capacity : 0;
    const util = d.currentUtilization ?? 0;
    const occupancy = cap ? Math.min(100, Math.round((util / cap) * 100)) : util;
    return {
      id: d.id,
      code: d.shelfNumber || d.id,
      location,
      items: 0,
      value: 0,
      occupancy,
      category: d.binType?.slice(0, 40) || '—',
      isActive: d.isActive,
      raw: d,
    };
  }

  openAddShelfModal(): void {
    if (!this.selectedWarehouseId()) {
      this.error.set('Select a warehouse first (load warehouses from the server).');
      return;
    }
    this.addForm = {
      aisle: '',
      rack: '',
      shelfNumber: '',
      zone: '',
      binType: '',
      length: 0,
      width: 0,
      height: 0,
      maxWeight: 0,
      capacity: 0,
    };
    this.error.set(null);
    this.showAddShelfModal.set(true);
  }

  closeAddShelfModal(): void {
    this.showAddShelfModal.set(false);
  }

  createShelf(): void {
    const wid = this.selectedWarehouseId();
    if (!wid) {
      this.error.set('Warehouse is required.');
      return;
    }
    const warehouse = this.warehouses().find(w => w.id === wid);
    const payload: CreateShelfLocationRequest = {
      warehouseId: wid,
      warehouseName: warehouse?.warehouseName || '',
      aisle: this.addForm.aisle.trim() || undefined,
      rack: this.addForm.rack.trim() || undefined,
      shelfNumber: this.addForm.shelfNumber.trim() || undefined,
      zone: this.addForm.zone.trim() || undefined,
      binType: this.addForm.binType.trim() || undefined,
      length: this.addForm.length > 0 ? this.addForm.length : undefined,
      width: this.addForm.width > 0 ? this.addForm.width : undefined,
      height: this.addForm.height > 0 ? this.addForm.height : undefined,
      maxWeight: this.addForm.maxWeight > 0 ? this.addForm.maxWeight : undefined,
      capacity: this.addForm.capacity > 0 ? this.addForm.capacity : undefined,
    };
    this.saving.set(true);
    this.error.set(null);
    console.log('[Shelf] CREATE payload:', JSON.stringify(payload));
    this.shelvesService.create(payload).subscribe({
      next: (res) => {
        console.log('[Shelf] CREATE response:', JSON.stringify(res));
        this.saving.set(false);
        if (res.success !== false) {
          this.closeAddShelfModal();
          this.reloadAll();
        } else {
          this.error.set(res.message || 'Create shelf failed.');
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(this.errMsg(err, 'Create shelf failed.'));
      },
    });
  }

  openShelfDetailsModal(shelf: ShelfRow): void {
    this.selectedShelf.set(shelf);
    this.shelfItems.set([]);
    this.showShelfDetailsModal.set(true);
    this.loadShelfItems(shelf.id);
  }

  private loadShelfItems(shelfId: string): void {
    this.loadingItems.set(true);
    this.inventoryService.getStockByShelf(shelfId).subscribe({
      next: (res) => {
        this.loadingItems.set(false);
        if (res.success !== false && Array.isArray(res.data)) {
          this.shelfItems.set(res.data);
        }
      },
      error: () => {
        this.loadingItems.set(false);
      },
    });
  }

  closeShelfDetailsModal(): void {
    this.showShelfDetailsModal.set(false);
    this.selectedShelf.set(null);
  }

  openRearrangeModal(): void {
    this.showRearrangeModal.set(true);
  }

  closeRearrangeModal(): void {
    this.showRearrangeModal.set(false);
  }

  openMoveItemsModal(): void {
    this.showMoveItemsModal.set(true);
  }

  closeMoveItemsModal(): void {
    this.showMoveItemsModal.set(false);
  }

  viewShelf(shelf: ShelfRow): void {
    this.openShelfDetailsModal(shelf);
  }

  editShelf(shelf: ShelfRow): void {
    this.openShelfDetailsModal(shelf);
  }

  viewItems(_shelf: ShelfRow): void {
    /* Navigate or open stock-by-shelf when route exists */
  }

  printShelf(_shelf: ShelfRow): void {
    window.print();
  }

  deleteShelf(shelf: ShelfRow): void {
    if (!confirm(`Delete shelf "${shelf.code}"? This cannot be undone.`)) return;
    this.shelvesService.delete(shelf.id).subscribe({
      next: (res) => {
        if (res.success !== false) {
          this.reloadAll();
        } else {
          this.error.set(res.message || 'Delete failed.');
        }
      },
      error: (err) => this.error.set(this.errMsg(err, 'Delete failed.')),
    });
  }

  rearrangeShelves(): void {
    this.closeRearrangeModal();
  }

  moveItems(): void {
    this.closeMoveItemsModal();
  }

  getOccupancyBar(occupancy: number): string {
    const n = Math.max(0, Math.min(100, Math.round(occupancy)));
    const filled = Math.max(0, Math.min(8, Math.round(n / 12.5)));
    return '█'.repeat(filled) + '░'.repeat(8 - filled);
  }

  getOccupancyColor(occupancy: number): string {
    if (occupancy >= 50) return 'green';
    if (occupancy >= 10) return 'yellow';
    return 'red';
  }

  private errMsg(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const e = err as { error?: { message?: string } | string; status?: number; statusText?: string };
      let m = fallback;
      const b = e.error;
      if (b && typeof b === 'object' && 'message' in b && typeof (b as { message: string }).message === 'string') {
        m = (b as { message: string }).message;
      } else if (typeof b === 'string') m = b;
      if (e.status) m = `[${e.status}] ${m}`;
      return m;
    }
    return fallback;
  }
}
