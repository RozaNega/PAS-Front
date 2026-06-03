import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { InventoryService } from '../../../core/services/inventory.service';
import {
  InventoryValuationItemDto,
  MovementTrendDto,
  ReportsService,
  StockMovementReportDto,
} from '../../../core/services/reports.service';
import { WarehousesService, WarehouseDto } from '../../../core/services/warehouses.service';

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  CanvasRenderer,
]);

type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';
type ReportTab = 'stock' | 'issuance' | 'receiving';

interface StockItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  warehouse: string;
  warehouseNames: string[];
  quantity: number;
  unitPrice: number;
  total: number;
  status: StockStatus;
}

interface TrendBar {
  label: string;
  height: number;
  value: number;
}

interface IssuanceRecord {
  date: string;
  sivNumber: string;
  requester: string;
  department: string;
  item: string;
  quantity: number;
  value: number;
}

interface ReceivingRecord {
  date: string;
  grnNumber: string;
  supplier: string;
  items: number;
  quantity: number;
  value: number;
  status: 'Pending' | 'Passed' | 'Failed';
}

interface DeptBreakdown {
  name: string;
  percentage: number;
  units: number;
  value: number;
}

interface CategoryBreakdownItem {
  name: string;
  percentage: number;
  units: number;
  value: number;
}

interface TopValueItem {
  name: string;
  value: number;
  percentage: number;
}

interface SupplierPerf {
  name: string;
  percentage: number;
  value: number;
  grns: number;
}

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './reports-page.component.html',
  styleUrls: ['./reports-page.component.scss'],
})
export class ReportsPageComponent implements OnInit {
  private readonly reportsService = inject(ReportsService);
  private readonly inventoryService = inject(InventoryService);
  private readonly warehousesService = inject(WarehousesService);

  activeTab: ReportTab = 'stock';

  readonly startDate = signal(this.daysAgoIsoDate(30));
  readonly endDate = signal(this.todayIsoDate());
  readonly warehouseFilter = signal('All Warehouses');
  readonly categoryFilter = signal('All Categories');
  readonly statusFilter = signal('All Status');
  readonly departmentFilter = signal('All Departments');
  readonly supplierFilter = signal('All Suppliers');
  readonly requesterFilter = signal('All Requesters');
  readonly isLoading = signal(false);
  readonly reportGenerated = signal(false);
  readonly lastRunTime = signal<Date | null>(null);
  readonly loadError = signal('');

  readonly statuses: StockStatus[] = ['In Stock', 'Low Stock', 'Out of Stock'];
  readonly departments = ['All Departments', 'IT', 'HR', 'Operations', 'Finance', 'Marketing', 'Sales'];
  readonly suppliers = ['All Suppliers', 'Tech Supplies Ltd', 'Office Depot', 'Global Suppliers', 'Paper Co', 'Tech Solutions'];
  readonly requesters = ['All Requesters', 'John Doe', 'Sarah Smith', 'Mike Wilson', 'Lisa Wong', 'Peter Chen'];

  // ── Stock Data ──
  private readonly valuationItems = signal<StockItem[]>([]);
  private readonly movementReport = signal<StockMovementReportDto | null>(null);
  private readonly warehouses = signal<WarehouseDto[]>([]);

  readonly warehouseOptions = computed(() => [
    'All Warehouses',
    ...this.uniqueSorted([
      ...this.warehouses().map((w) => w.warehouseName),
      ...this.valuationItems().flatMap((i) => i.warehouseNames),
    ]),
  ]);

  readonly categoryOptions = computed(() => [
    'All Categories',
    ...this.uniqueSorted(this.valuationItems().map((i) => i.category)),
  ]);

  readonly filteredItems = computed(() => {
    const warehouse = this.warehouseFilter();
    const category = this.categoryFilter();
    const status = this.statusFilter();
    return this.valuationItems().filter((item) => {
      const mw = warehouse === 'All Warehouses' || item.warehouseNames.includes(warehouse);
      const mc = category === 'All Categories' || item.category === category;
      const ms = status === 'All Status' || item.status === status;
      return mw && mc && ms;
    });
  });

  readonly totalItems = computed(() => this.filteredItems().length);
  readonly totalValue = computed(() => this.filteredItems().reduce((s, i) => s + i.total, 0));
  readonly totalUnits = computed(() => this.filteredItems().reduce((s, i) => s + i.quantity, 0));
  readonly turnoverRate = computed(() => {
    const u = Math.max(this.totalUnits(), 1);
    const o = this.movementReport()?.summary?.totalQuantityOut ?? 0;
    return `${(o / u).toFixed(1)}x`;
  });
  readonly avgStockLevel = computed(() => `${Math.round(this.totalUnits() / Math.max(this.totalItems(), 1))} units/item`);

  readonly avgPerDeptValue = computed(() => this.formatValue(this.totalIssuedValue() / Math.max(this.issuanceByDept().length, 1)));
  readonly avgPerGRNValue = computed(() => this.formatValue(this.totalReceivedValue() / Math.max(this.totalGRNs(), 1)));

  readonly categoryBreakdown = computed<CategoryBreakdownItem[]>(() => {
    const items = this.filteredItems();
    const map = new Map<string, { units: number; value: number }>();
    for (const item of items) {
      const e = map.get(item.category) ?? { units: 0, value: 0 };
      e.units += item.quantity;
      e.value += item.total;
      map.set(item.category, e);
    }
    const max = Math.max(...[...map.values()].map((e) => e.value), 1);
    return [...map.entries()]
      .map(([name, e]) => ({ name, units: e.units, value: e.value, percentage: Math.round((e.value / max) * 100) }))
      .sort((a, b) => b.value - a.value);
  });

  readonly topItemsByValue = computed<TopValueItem[]>(() => {
    const items = [...this.filteredItems()].sort((a, b) => b.total - a.total).slice(0, 10);
    const max = Math.max(...items.map((i) => i.total), 1);
    return items.map((i) => ({ name: i.name, value: i.total, percentage: Math.round((i.total / max) * 100) }));
  });

  readonly trendBars = computed(() => this.toTrendBars(this.movementReport()?.dailyTrend ?? []));

  // ── Issuance Data ──
  readonly issuances = signal<IssuanceRecord[]>([]);
  readonly issuanceFiltered = computed(() => {
    const dept = this.departmentFilter();
    const req = this.requesterFilter();
    return this.issuances().filter((i) => {
      const md = dept === 'All Departments' || i.department === dept;
      const mr = req === 'All Requesters' || i.requester === req;
      return md && mr;
    });
  });

  readonly issuanceByDept = computed<DeptBreakdown[]>(() => {
    const items = this.issuanceFiltered();
    const map = new Map<string, { units: number; value: number }>();
    for (const i of items) {
      const e = map.get(i.department) ?? { units: 0, value: 0 };
      e.units += i.quantity;
      e.value += i.value;
      map.set(i.department, e);
    }
    const max = Math.max(...[...map.values()].map((e) => e.value), 1);
    return [...map.entries()]
      .map(([name, e]) => ({ name, units: e.units, value: e.value, percentage: Math.round((e.value / max) * 100) }))
      .sort((a, b) => b.value - a.value);
  });

  readonly totalSIVs = computed(() => this.issuanceFiltered().length);
  readonly totalIssuedValue = computed(() => this.issuanceFiltered().reduce((s, i) => s + i.value, 0));
  readonly totalIssuedQty = computed(() => this.issuanceFiltered().reduce((s, i) => s + i.quantity, 0));

  // ── Receiving Data ──
  readonly receivings = signal<ReceivingRecord[]>([]);
  readonly receivingFiltered = computed(() => {
    const sup = this.supplierFilter();
    const st = this.statusFilter();
    return this.receivings().filter((r) => {
      const ms = sup === 'All Suppliers' || r.supplier === sup;
      const mst = st === 'All Status' || r.status === st;
      return ms && mst;
    });
  });

  readonly receivingBySupplier = computed<SupplierPerf[]>(() => {
    const items = this.receivingFiltered();
    const map = new Map<string, { value: number; grns: number }>();
    for (const r of items) {
      const e = map.get(r.supplier) ?? { value: 0, grns: 0 };
      e.value += r.value;
      e.grns += 1;
      map.set(r.supplier, e);
    }
    const max = Math.max(...[...map.values()].map((e) => e.value), 1);
    return [...map.entries()]
      .map(([name, e]) => ({ name, value: e.value, grns: e.grns, percentage: Math.round((e.value / max) * 100) }))
      .sort((a, b) => b.value - a.value);
  });

  readonly totalGRNs = computed(() => this.receivingFiltered().length);
  readonly totalReceivedValue = computed(() => this.receivingFiltered().reduce((s, r) => s + r.value, 0));
  readonly totalReceivedQty = computed(() => this.receivingFiltered().reduce((s, r) => s + r.quantity, 0));

  // ── ECharts options ──
  get stockChartOpts(): Record<string, unknown> {
    const cats = this.categoryBreakdown();
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: { type: 'category', data: cats.map((c) => c.name), axisLabel: { color: '#94a3b8' } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8', formatter: '${v}' } },
      series: [{
        type: 'bar',
        data: cats.map((c) => c.value),
        itemStyle: { color: '#3b82f6', borderRadius: [6, 6, 0, 0] },
        barWidth: '45%',
      }],
    };
  }

  get stockPieOpts(): Record<string, unknown> {
    const items = this.filteredItems();
    const inStock = items.filter((i) => i.status === 'In Stock').length;
    const lowStock = items.filter((i) => i.status === 'Low Stock').length;
    const outStock = items.filter((i) => i.status === 'Out of Stock').length;
    return {
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['50%', '75%'],
        avoidLabelOverlap: false,
        label: { show: true, position: 'outside', formatter: '{b}: {d}%', color: '#94a3b8', fontSize: 11 },
        data: [
          { value: inStock, name: 'In Stock', itemStyle: { color: '#10b981' } },
          { value: lowStock, name: 'Low Stock', itemStyle: { color: '#f59e0b' } },
          { value: outStock, name: 'Out of Stock', itemStyle: { color: '#ef4444' } },
        ],
      }],
    };
  }

  get issuanceChartOpts(): Record<string, unknown> {
    const depts = this.issuanceByDept();
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: { type: 'category', data: depts.map((d) => d.name), axisLabel: { color: '#94a3b8', rotate: 15 } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8', formatter: '${v}' } },
      series: [{
        type: 'bar',
        data: depts.map((d) => d.value),
        itemStyle: { color: '#f59e0b', borderRadius: [6, 6, 0, 0] },
        barWidth: '45%',
      }],
    };
  }

  get issuanceLineOpts(): Record<string, unknown> {
    const items = this.issuanceFiltered();
    const byDate = new Map<string, number>();
    for (const i of items) {
      byDate.set(i.date, (byDate.get(i.date) ?? 0) + i.value);
    }
    const sorted = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: { type: 'category', data: sorted.map(([d]) => d), axisLabel: { color: '#94a3b8', rotate: 15 } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8', formatter: '${v}' } },
      series: [{
        type: 'line',
        data: sorted.map(([, v]) => v),
        smooth: true,
        lineStyle: { color: '#8b5cf6', width: 3 },
        itemStyle: { color: '#8b5cf6' },
        areaStyle: { color: 'rgba(139, 92, 246, 0.1)' },
      }],
    };
  }

  get receivingChartOpts(): Record<string, unknown> {
    const suppliers = this.receivingBySupplier();
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: { type: 'category', data: suppliers.map((s) => s.name), axisLabel: { color: '#94a3b8', rotate: 15 } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8', formatter: '${v}' } },
      series: [{
        type: 'bar',
        data: suppliers.map((s) => s.value),
        itemStyle: { color: '#10b981', borderRadius: [6, 6, 0, 0] },
        barWidth: '45%',
      }],
    };
  }

  get receivingPieOpts(): Record<string, unknown> {
    const items = this.receivingFiltered();
    const passed = items.filter((r) => r.status === 'Passed').length;
    const pending = items.filter((r) => r.status === 'Pending').length;
    const failed = items.filter((r) => r.status === 'Failed').length;
    return {
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['50%', '75%'],
        avoidLabelOverlap: false,
        label: { show: true, position: 'outside', formatter: '{b}: {d}%', color: '#94a3b8', fontSize: 11 },
        data: [
          { value: passed, name: 'Passed', itemStyle: { color: '#10b981' } },
          { value: pending, name: 'Pending', itemStyle: { color: '#f59e0b' } },
          { value: failed, name: 'Failed', itemStyle: { color: '#ef4444' } },
        ],
      }],
    };
  }

  ngOnInit(): void {
    this.loadAllData();
  }

  generateReport(): void {
    this.loadAllData();
  }

  setActiveTab(tab: ReportTab): void {
    this.activeTab = tab;
  }

  formatValue(value: number): string {
    if (value >= 1_000_000) return '$' + (value / 1_000_000).toFixed(2) + 'M';
    if (value >= 1_000) return '$' + (value / 1_000).toFixed(0) + 'K';
    return '$' + value.toLocaleString();
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'In Stock': '\u2705',
      'Low Stock': '\u26A0\uFE0F',
      'Out of Stock': '\u274C',
      'Pending': '\u23F3',
      'Passed': '\u2705',
      'Failed': '\u274C',
    };
    return icons[status] || '\u2139\uFE0F';
  }

  getMonthName(month: number): string {
    return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month - 1] || '';
  }

  exportToExcel(): void {
    let headers: string[] = [];
    let rows: string[][] = [];
    if (this.activeTab === 'stock') {
      headers = ['SKU', 'Name', 'Category', 'Warehouse', 'Quantity', 'Unit Price', 'Total', 'Status'];
      rows = this.filteredItems().map((i) => [i.sku, i.name, i.category, i.warehouse, String(i.quantity), String(i.unitPrice), String(i.total), i.status]);
    } else if (this.activeTab === 'issuance') {
      headers = ['Date', 'SIV #', 'Requester', 'Department', 'Item', 'Quantity', 'Value'];
      rows = this.issuanceFiltered().map((i) => [i.date, i.sivNumber, i.requester, i.department, i.item, String(i.quantity), String(i.value)]);
    } else {
      headers = ['Date', 'GRN #', 'Supplier', 'Items', 'Quantity', 'Value', 'Status'];
      rows = this.receivingFiltered().map((r) => [r.date, r.grnNumber, r.supplier, String(r.items), String(r.quantity), String(r.value), r.status]);
    }
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${this.activeTab}-report.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  exportToPDF(): void {
    window.print();
  }

  emailReport(): void {
    const subject = encodeURIComponent(`${this.activeTab.charAt(0).toUpperCase() + this.activeTab.slice(1)} Report`);
    window.location.href = `mailto:?subject=${subject}`;
  }

  printReport(): void {
    window.print();
  }

  showScheduleModal = signal(false);
  scheduleFrequency = signal('weekly');
  scheduleEmail = signal('');
  scheduleDate = signal(this.todayIsoDate());

  scheduleReport(): void {
    this.showScheduleModal.set(true);
  }

  closeScheduleModal(): void {
    this.showScheduleModal.set(false);
  }

  saveSchedule(): void {
    this.closeScheduleModal();
  }

  // ── Private ──
  private loadAllData(): void {
    this.isLoading.set(true);
    this.reportGenerated.set(false);
    this.loadError.set('');

    forkJoin({
      valuation: this.reportsService.getInventoryValuation({ asOfDate: this.endDate() }).pipe(
        map((r) => r.data ?? null),
        catchError(() => of(null)),
      ),
      movement: this.reportsService.getStockMovement({ fromDate: this.startDate(), toDate: this.endDate() }).pipe(
        map((r) => r.data ?? null),
        catchError(() => of(null)),
      ),
      warehouses: this.warehousesService.getAll().pipe(
        map((r) => r.data ?? []),
        catchError(() => of([] as WarehouseDto[])),
      ),
    }).subscribe({
      next: ({ valuation, movement, warehouses }) => {
        this.valuationItems.set((valuation?.items ?? []).map((item) => this.toStockItem(item)));
        this.movementReport.set(movement);
        this.warehouses.set(warehouses);
        this.buildMockIssuances();
        this.buildMockReceivings();
        this.reportGenerated.set(true);
        this.lastRunTime.set(new Date());
        this.isLoading.set(false);
        if (!valuation) this.loadError.set('Some backend data unavailable. Showing mock data.');
      },
      error: () => {
        this.valuationItems.set([]);
        this.movementReport.set(null);
        this.warehouses.set([]);
        this.buildMockIssuances();
        this.buildMockReceivings();
        this.reportGenerated.set(true);
        this.lastRunTime.set(new Date());
        this.isLoading.set(false);
        this.loadError.set('Backend unavailable. Showing mock data.');
      },
    });
  }

  private buildMockIssuances(): void {
    this.issuances.set([
      { date: '2026-05-15', sivNumber: 'SIV-045', requester: 'John Doe', department: 'IT', item: 'Dell Laptop', quantity: 2, value: 4998 },
      { date: '2026-05-15', sivNumber: 'SIV-044', requester: 'Sarah Smith', department: 'HR', item: 'Office Chair', quantity: 3, value: 1350 },
      { date: '2026-05-14', sivNumber: 'SIV-043', requester: 'Mike Wilson', department: 'Operations', item: 'USB Cables', quantity: 50, value: 250 },
      { date: '2026-05-14', sivNumber: 'SIV-042', requester: 'Lisa Wong', department: 'Finance', item: 'Monitor', quantity: 2, value: 700 },
      { date: '2026-05-13', sivNumber: 'SIV-041', requester: 'Peter Chen', department: 'Marketing', item: 'A4 Paper', quantity: 10, value: 250 },
      { date: '2026-05-12', sivNumber: 'SIV-040', requester: 'John Doe', department: 'IT', item: 'Keyboard', quantity: 5, value: 375 },
      { date: '2026-05-11', sivNumber: 'SIV-039', requester: 'Sarah Smith', department: 'HR', item: 'Desk Lamp', quantity: 2, value: 160 },
    ]);
  }

  private buildMockReceivings(): void {
    this.receivings.set([
      { date: '2026-05-15', grnNumber: 'GRN-045', supplier: 'Tech Supplies Ltd', items: 3, quantity: 125, value: 30740, status: 'Pending' },
      { date: '2026-05-14', grnNumber: 'GRN-044', supplier: 'Office Depot', items: 2, quantity: 50, value: 12500, status: 'Passed' },
      { date: '2026-05-14', grnNumber: 'GRN-043', supplier: 'Global Suppliers', items: 1, quantity: 100, value: 500, status: 'Failed' },
      { date: '2026-05-13', grnNumber: 'GRN-042', supplier: 'Paper Co', items: 2, quantity: 200, value: 5000, status: 'Passed' },
      { date: '2026-05-12', grnNumber: 'GRN-041', supplier: 'Tech Supplies Ltd', items: 3, quantity: 75, value: 18750, status: 'Passed' },
      { date: '2026-05-11', grnNumber: 'GRN-040', supplier: 'Office Depot', items: 1, quantity: 30, value: 9000, status: 'Pending' },
    ]);
  }

  private toStockItem(item: InventoryValuationItemDto): StockItem {
    const warehouseNames = this.uniqueSorted(
      (item.locations ?? []).map((l) => l.warehouseName?.trim() || '').filter((n) => n.length > 0),
    );
    const qty = item.currentQuantity ?? 0;
    const min = item.minStockLevel ?? 0;
    return {
      id: item.itemId,
      sku: item.sku?.trim() || 'N/A',
      name: item.itemName?.trim() || 'Unknown Item',
      category: item.categoryName?.trim() || 'Uncategorized',
      warehouse: warehouseNames.length > 1 ? `${warehouseNames[0]} +${warehouseNames.length - 1}` : warehouseNames[0] || 'N/A',
      warehouseNames: warehouseNames.length > 0 ? warehouseNames : ['N/A'],
      quantity: qty,
      unitPrice: item.averageCost ?? 0,
      total: item.totalValue ?? 0,
      status: qty <= 0 ? 'Out of Stock' : qty <= min ? 'Low Stock' : 'In Stock',
    };
  }

  private toTrendBars(dailyTrend: MovementTrendDto[]): TrendBar[] {
    if (dailyTrend.length === 0) return [];
    const trend = dailyTrend.slice(-8);
    const max = Math.max(...trend.map((e) => Math.max(e.inbound + e.outbound, Math.abs(e.net), 1)), 1);
    return trend.map((e, i) => ({
      label: this.formatTrendLabel(e.date) || this.getMonthName(i + 1),
      height: this.scaleHeight(e.inbound + e.outbound, max),
      value: e.inbound + e.outbound,
    }));
  }

  private formatTrendLabel(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private scaleHeight(value: number, maxValue: number): number {
    if (value <= 0 || maxValue <= 0) return 8;
    return Math.max(8, Math.round((value / maxValue) * 120));
  }

  private todayIsoDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private daysAgoIsoDate(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  }

  private uniqueSorted(values: string[]): string[] {
    return [...new Set(values.filter((v) => v.trim().length > 0))].sort((a, b) => a.localeCompare(b));
  }
}
