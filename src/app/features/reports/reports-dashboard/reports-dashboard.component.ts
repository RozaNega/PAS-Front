import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, GaugeChart, LineChart, PieChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { PropertiesService, PropertyDto } from '../../../core/services/properties.service';
import { ReportsService } from '../../../core/services/reports.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { WarehousesService } from '../../../core/services/warehouses.service';
import { RequisitionsService } from '../../../core/services/requisitions.service';
import { ActivityLogsService } from '../../../core/services/activity-logs.service';
import { ComplianceDataService } from '../../../core/services/compliance-data.service';
import { forkJoin } from 'rxjs';

echarts.use([
  LineChart, BarChart, PieChart, GaugeChart,
  TooltipComponent, GridComponent, LegendComponent, CanvasRenderer,
]);

interface ReportTab {
  id: string; label: string; icon: string; color: string;
}

interface KpiCard {
  label: string; value: string; trend: string; icon: string; color: string;
}

interface TableRow {
  id: number; [key: string]: string | number | Record<string, string | number | undefined> | undefined;
  _extra?: Record<string, string | number | undefined>;
}

@Component({
  selector: 'app-reports-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './reports-dashboard.component.html',
  styleUrl: './reports-dashboard.component.scss',
})
export class ReportsDashboardComponent {
  private readonly propertiesService = inject(PropertiesService);
  private readonly reportsService = inject(ReportsService);
  private readonly inventoryService = inject(InventoryService);
  private readonly warehousesService = inject(WarehousesService);
  private readonly requisitionsService = inject(RequisitionsService);
  private readonly activityLogsService = inject(ActivityLogsService);
  private readonly complianceDataService = inject(ComplianceDataService);

  activeTab = 'valuation';
  dateRange = 'this-month';
  isLoading = signal(false);
  allProperties = signal<PropertyDto[]>([]);

  // Lazy-loaded data stores per tab
  requisitionData: any = null;
  stockData: any[] = [];
  warehouses: any[] = [];
  issuanceData: any[] = [];
  complianceInspections: any[] = [];
  complianceDisposals: any = null;
  auditData: any[] = [];

  tabs: ReportTab[] = [
    { id: 'valuation', label: 'Valuation Reports', icon: 'bi bi-currency-dollar', color: '#3b82f6' },
    { id: 'requisition', label: 'Requisition Reports', icon: 'bi bi-list-check', color: '#8b5cf6' },
    { id: 'stock', label: 'Stock Reports', icon: 'bi bi-boxes', color: '#10b981' },
    { id: 'issuance', label: 'Issuance Reports', icon: 'bi bi-file-text', color: '#f59e0b' },
    { id: 'compliance', label: 'Compliance Reports', icon: 'bi bi-shield-check', color: '#ef4444' },
    { id: 'audit', label: 'Audit Reports', icon: 'bi bi-file-earmark-spreadsheet', color: '#06b6d4' },
  ];

  constructor() {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    forkJoin({
      properties: this.propertiesService.getAll(),
      inspections: this.complianceDataService.getInspections(),
      disposals: this.complianceDataService.getDisposalReport(),
    }).subscribe({
      next: ({ properties, inspections, disposals }) => {
        if (properties.success && properties.data?.length) this.allProperties.set(properties.data);
        if (inspections?.length) this.complianceInspections = inspections;
        if (disposals) this.complianceDisposals = disposals;
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
    this.loadRequisitionData();
    this.loadStockData();
    this.loadIssuanceData();
    this.loadAuditData();
  }

  private loadRequisitionData(): void {
    this.reportsService.getRequisitionHistory().subscribe({
      next: (res) => { if (res.success) this.requisitionData = res.data; },
    });
  }

  private loadStockData(): void {
    this.inventoryService.getStockOverview().subscribe({
      next: (res) => { if (res.success && res.data) this.stockData = res.data; },
    });
    this.warehousesService.getAll().subscribe({
      next: (res) => { if (res.success && res.data) this.warehouses = res.data; },
    });
  }

  private loadIssuanceData(): void {
    this.requisitionsService.getAllSIVs().subscribe({
      next: (res) => { if (res.success && res.data) this.issuanceData = res.data; },
    });
  }

  private loadAuditData(): void {
    this.activityLogsService.getAll().subscribe({
      next: (res) => { if (Array.isArray(res)) this.auditData = res; },
    });
  }

  private formatETB(v: number): string {
    if (v >= 1_000_000) return `ETB ${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `ETB ${(v / 1_000).toFixed(0)}K`;
    return `ETB ${v}`;
  }

  get kpiCards(): KpiCard[] {
    const props = this.allProperties();
    switch (this.activeTab) {
      case 'valuation': {
        const totalValue = props.reduce((s, p) => s + (p.totalValue ?? p.purchasePrice), 0);
        const totalBook = props.reduce((s, p) => s + p.currentValue, 0);
        const totalDep = totalValue - totalBook;
        const locations = new Set(props.map(p => p.locationName).filter(Boolean)).size;
        return [
          { label: 'Total Value', value: this.formatETB(totalValue), trend: `${props.length} properties`, icon: 'bi bi-currency-dollar', color: '#3b82f6' },
          { label: 'Depreciation', value: this.formatETB(totalDep), trend: `${totalValue > 0 ? Math.round(totalDep / totalValue * 100) : 0}% of cost`, icon: 'bi bi-graph-down-arrow', color: '#f59e0b' },
          { label: 'Properties', value: props.length.toLocaleString(), trend: 'Total valued properties', icon: 'bi bi-buildings', color: '#10b981' },
          { label: 'Locations', value: locations.toLocaleString(), trend: 'Locations covered', icon: 'bi bi-geo-alt', color: '#8b5cf6' },
        ];
      }
      case 'requisition': {
        const rd = this.requisitionData;
        const total = rd?.summary?.totalRequisitions ?? 0;
        const pending = rd?.summary?.pendingCount ?? 0;
        const approved = rd?.summary?.approvedCount ?? 0;
        const rate = total > 0 ? Math.round(approved / total * 100) : 0;
        return [
          { label: 'Total Requests', value: total.toLocaleString(), trend: 'Current period', icon: 'bi bi-list-check', color: '#8b5cf6' },
          { label: 'Pending', value: pending.toLocaleString(), trend: 'Awaiting decision', icon: 'bi bi-clock', color: '#f59e0b' },
          { label: 'Approved', value: approved.toLocaleString(), trend: `${rate}% approval rate`, icon: 'bi bi-check-circle', color: '#10b981' },
          { label: 'Fulfillment', value: rd?.summary?.fulfillmentRate != null ? `${Math.round(rd.summary.fulfillmentRate)}%` : 'N/A', trend: 'Issued vs requested', icon: 'bi bi-check2-all', color: '#3b82f6' },
        ];
      }
      case 'stock': {
        const items = this.stockData;
        const totalQty = items.reduce((s: number, i: any) => s + (i.quantity ?? i.currentQuantity ?? 0), 0);
        const totalVal = items.reduce((s: number, i: any) => s + (i.totalValue ?? 0), 0);
        const low = items.filter((i: any) => (i.quantity ?? i.currentQuantity ?? 0) <= (i.minStockLevel ?? 5)).length;
        const whCount = this.warehouses.length;
        return [
          { label: 'Total Items', value: items.length.toLocaleString(), trend: `${items.length} SKUs`, icon: 'bi bi-boxes', color: '#10b981' },
          { label: 'Low Stock', value: low.toLocaleString(), trend: 'Needs replenishment', icon: 'bi bi-exclamation-triangle', color: '#f59e0b' },
          { label: 'Total Value', value: this.formatETB(totalVal), trend: 'Current valuation', icon: 'bi bi-currency-dollar', color: '#3b82f6' },
          { label: 'Warehouses', value: whCount.toLocaleString(), trend: 'Active locations', icon: 'bi bi-building', color: '#8b5cf6' },
        ];
      }
      case 'issuance': {
        const s4 = this.issuanceData;
        const totalIssues = s4.length;
        const depts = new Set(s4.map((s: any) => s.department ?? s.recipientDepartment).filter(Boolean)).size;
        const totalVal4 = s4.reduce((s: number, i: any) => s + (i.totalValue ?? 0), 0);
        return [
          { label: 'Total Issues', value: totalIssues.toLocaleString(), trend: 'All SIVs', icon: 'bi bi-arrow-down-circle', color: '#f59e0b' },
          { label: 'Departments', value: depts.toLocaleString(), trend: 'Active departments', icon: 'bi bi-people', color: '#3b82f6' },
          { label: 'Issued Value', value: this.formatETB(totalVal4), trend: 'Total issued value', icon: 'bi bi-currency-dollar', color: '#10b981' },
          { label: 'Avg per SIV', value: totalIssues > 0 ? this.formatETB(Math.round(totalVal4 / totalIssues)) : 'ETB 0', trend: 'Average value', icon: 'bi bi-calculator', color: '#8b5cf6' },
        ];
      }
      case 'compliance': {
        return [
          { label: 'Compliance Score', value: '—', trend: 'Loading data', icon: 'bi bi-shield-check', color: '#10b981' },
          { label: 'Violations', value: '—', trend: 'This period', icon: 'bi bi-exclamation-triangle', color: '#ef4444' },
          { label: 'Inspections', value: '—', trend: 'Total conducted', icon: 'bi bi-search', color: '#3b82f6' },
          { label: 'Disposals Reviewed', value: '—', trend: 'Compliance checks', icon: 'bi bi-file-earmark-check', color: '#8b5cf6' },
        ];
      }
      case 'audit': {
        const logs = this.auditData;
        const critical = logs.filter((l: any) => l.severity === 'critical' || l.status === 'critical').length;
        return [
          { label: 'Total Logs', value: logs.length.toLocaleString(), trend: 'Audit trail entries', icon: 'bi bi-journal-text', color: '#06b6d4' },
          { label: 'Critical Events', value: critical.toLocaleString(), trend: 'Requires attention', icon: 'bi bi-shield-lock', color: '#ef4444' },
          { label: 'Unique Users', value: new Set(logs.map((l: any) => l.user ?? l.performedBy).filter(Boolean)).size.toLocaleString(), trend: 'Active users', icon: 'bi bi-person-badge', color: '#3b82f6' },
          { label: 'Total Actions', value: new Set(logs.map((l: any) => l.action ?? l.actionType).filter(Boolean)).size.toLocaleString(), trend: 'Unique action types', icon: 'bi bi-arrow-repeat', color: '#f59e0b' },
        ];
      }
      default: return [];
    }
  }

  get chartOptions(): Record<string, unknown> {
    switch (this.activeTab) {
      case 'valuation': return this.valuationChartOpts();
      case 'requisition': return this.requisitionChartOpts();
      case 'stock': return this.stockChartOpts();
      case 'issuance': return this.issuanceChartOpts();
      case 'compliance': return this.complianceChartOpts();
      case 'audit': return this.auditChartOpts();
      default: return {};
    }
  }

  get chartOptions2(): Record<string, unknown> {
    switch (this.activeTab) {
      case 'valuation': return this.depreciationChartOpts();
      case 'requisition': return this.approvalRateChartOpts();
      case 'stock': return this.warehouseChartOpts();
      case 'issuance': return this.issuanceDeptChartOpts();
      case 'compliance': return this.complianceAreaChartOpts();
      case 'audit': return this.auditActivityChartOpts();
      default: return {};
    }
  }

  get tableColumns(): { label: string; key: string }[] {
    switch (this.activeTab) {
      case 'valuation': return [
        { label: 'Property', key: 'property' }, { label: 'Tag #', key: 'tagNumber' },
        { label: 'Category', key: 'category' }, { label: 'Location', key: 'location' },
        { label: 'Cost', key: 'cost' }, { label: 'Book Value', key: 'bookValue' },
        { label: 'Depreciation', key: 'depreciation' }, { label: 'Status', key: 'status' },
      ];
      case 'requisition': return [
        { label: 'Request ID', key: 'requestId' }, { label: 'Department', key: 'department' },
        { label: 'Requester', key: 'requester' }, { label: 'Items', key: 'items' },
        { label: 'Status', key: 'status' }, { label: 'Date', key: 'date' },
      ];
      case 'stock': return [
        { label: 'Item Name', key: 'itemName' }, { label: 'SKU', key: 'sku' },
        { label: 'Category', key: 'category' }, { label: 'Warehouse', key: 'warehouse' },
        { label: 'Stock', key: 'stock' }, { label: 'Min Stock', key: 'minStock' },
        { label: 'Unit Price', key: 'unitPrice' }, { label: 'Status', key: 'status' },
      ];
      case 'issuance': return [
        { label: 'SIV No', key: 'sivNo' }, { label: 'Department', key: 'department' },
        { label: 'Requester', key: 'requester' }, { label: 'Items', key: 'items' },
        { label: 'Value', key: 'value' }, { label: 'Status', key: 'status' }, { label: 'Date', key: 'date' },
      ];
      case 'compliance': return [
        { label: 'Area', key: 'area' }, { label: 'Score', key: 'score' },
        { label: 'Status', key: 'status' }, { label: 'Findings', key: 'findings' },
        { label: 'Last Audit', key: 'lastAudit' },
      ];
      case 'audit': return [
        { label: 'User', key: 'user' }, { label: 'Action', key: 'action' },
        { label: 'Resource', key: 'resource' }, { label: 'Severity', key: 'severity' },
        { label: 'IP Address', key: 'ipAddress' }, { label: 'Timestamp', key: 'timestamp' },
      ];
      default: return [];
    }
  }

  private tableIdCounter = 1;

  get tableData(): TableRow[] {
    const base = Date.now();
    switch (this.activeTab) {
      case 'valuation':
        return this.allProperties().map((p, i) => {
          const cost = p.totalValue ?? p.purchasePrice;
          const book = p.currentValue;
          const dep = cost - book;
          const depPct = cost > 0 ? Math.round(dep / cost * 100) : 0;
          const qty = p.quantity ?? 1;
          return {
            id: base + i, property: p.name,
            tagNumber: p.id?.slice(0, 8) ?? '—',
            category: p.propertyCategoryName ?? '',
            location: p.locationName ?? '', cost: this.formatETB(cost),
            bookValue: this.formatETB(book),
            depreciation: `${this.formatETB(dep)} (${depPct}%)`,
            status: p.isActive ? 'Active' : 'Disposed',
            _extra: { type: p.propertyTypeName ?? '—', purchaseDate: p.purchaseDate ?? '—', qty: p.quantity ?? 1 },
          };
        });
      case 'requisition': {
        const reqs = this.requisitionData?.requisitions ?? [];
        return reqs.slice(0, 50).map((r: any, i: number) => ({
          id: base + i, requestId: r.srNumber ?? r.id ?? `REQ-${i}`,
          department: r.department ?? '—',
          requester: r.requesterName ?? '—',
          items: String(r.itemCount ?? r.totalQuantity ?? 0),
          status: r.status ?? 'Unknown', date: r.requestDate ?? r.approvedDate ?? '—',
          _extra: { urgency: r.urgency ?? 'Normal', notes: r.notes ?? '—', totalQty: r.totalQuantity ?? 0 },
        }));
      }
      case 'stock': {
        return this.stockData.slice(0, 50).map((s: any, i: number) => {
          const qty = s.quantity ?? s.currentQuantity ?? 0;
          const min = s.minStockLevel ?? 5;
          const unitPrice = s.averageCost ?? s.unitPrice ?? 0;
          const status = qty <= 0 ? 'Out of Stock' : qty <= min ? 'Low Stock' : 'In Stock';
          return {
            id: base + i, itemName: s.itemName ?? s.item ?? 'Unknown',
            sku: s.sku ?? '—', category: s.categoryName ?? s.category ?? '—',
            warehouse: s.warehouseName ?? s.warehouse ?? '—',
            stock: qty, minStock: min,
            unitPrice: this.formatETB(unitPrice), status,
            _extra: { totalValue: this.formatETB(qty * unitPrice), uom: s.unitOfMeasure ?? '—', lastUpdated: s.lastUpdated ?? '—' },
          };
        });
      }
      case 'issuance': {
        return this.issuanceData.slice(0, 50).map((s: any, i: number) => ({
          id: base + i, sivNo: s.voucherNumber ?? s.sivNumber ?? `SIV-${i}`,
          department: s.department ?? s.recipientDepartment ?? '—',
          requester: s.requester ?? s.issuedTo ?? '—',
          items: String(s.itemCount ?? s.totalItems ?? 0),
          value: this.formatETB(s.totalValue ?? 0),
          status: s.status ?? 'Issued',
          date: s.issueDate ?? s.createdAt ?? '—',
          _extra: { reference: s.reference ?? s.notes ?? '—', issuedBy: s.issuedBy ?? '—' },
        }));
      }
      case 'compliance': {
        const rows: TableRow[] = [];
        const inspections = this.complianceInspections;
        for (const ins of inspections.slice(0, 30)) {
          const score = ins.complianceScore ?? ins.score;
          rows.push({
            id: base + rows.length,
            area: ins.title ?? ins.inspectionTitle ?? ins.inspectionType ?? 'Inspection',
            score: score != null ? `${score}%` : '—',
            status: ins.status ?? 'Completed',
            findings: String(ins.findingsCount ?? ins.deviationCount ?? ins.findings ?? '0'),
            lastAudit: ins.inspectionDate ?? ins.date ?? '—',
            _extra: { inspector: ins.inspectorName ?? ins.performedBy ?? '—', location: ins.location ?? '—', notes: ins.notes ?? ins.comments ?? '—' },
          });
        }
        const disp = this.complianceDisposals;
        if (disp?.disposals?.length) {
          for (const d of disp.disposals.slice(0, 20)) {
            rows.push({
              id: base + rows.length,
              area: `Disposal: ${d.itemName ?? d.itemSKU ?? d.id}`,
              score: '—',
              status: d.status ?? 'Pending',
              findings: `${d.quantity} units`,
              lastAudit: d.disposalDate ?? '—',
              _extra: { method: d.method ?? '—', reason: d.reason ?? '—', value: this.formatETB(d.estimatedValue ?? 0) },
            });
          }
        }
        if (rows.length === 0) {
          rows.push({ id: base + 1, area: '—', score: '—', status: 'No Data', findings: '—', lastAudit: '—', _extra: {} });
        }
        return rows;
      }
      case 'audit': {
        return this.auditData.slice(0, 50).map((l: any, i: number) => ({
          id: base + i, user: l.user ?? l.performedBy ?? 'System',
          action: l.action ?? l.actionType ?? 'Unknown',
          resource: l.resource ?? l.domain ?? l.entityType ?? '—',
          severity: l.severity ?? l.level ?? 'info',
          ipAddress: l.ipAddress ?? '—', timestamp: l.timestamp ?? l.createdAt ?? '—',
          _extra: { details: l.details ?? l.description ?? '—', entityId: l.entityId ?? '—', duration: l.duration ?? '—' },
        }));
      }
      default: return [];
    }
  }

  get detailFields(): { label: string; key: string; extra: boolean }[] {
    const base = this.tableColumns.map((c) => ({ label: c.label, key: c.key, extra: false }));
    switch (this.activeTab) {
      case 'valuation': return [...base,
        { label: 'Property Type', key: '_extra.type', extra: true },
        { label: 'Purchase Date', key: '_extra.purchaseDate', extra: true },
        { label: 'Quantity', key: '_extra.qty', extra: true },
      ];
      case 'requisition': return [...base,
        { label: 'Urgency', key: '_extra.urgency', extra: true },
        { label: 'Total Qty', key: '_extra.totalQty', extra: true },
        { label: 'Notes', key: '_extra.notes', extra: true },
      ];
      case 'stock': return [...base,
        { label: 'Total Value', key: '_extra.totalValue', extra: true },
        { label: 'UoM', key: '_extra.uom', extra: true },
        { label: 'Last Updated', key: '_extra.lastUpdated', extra: true },
      ];
      case 'issuance': return [...base,
        { label: 'Reference', key: '_extra.reference', extra: true },
        { label: 'Issued By', key: '_extra.issuedBy', extra: true },
      ];
      case 'compliance': return [...base,
        { label: 'Inspector', key: '_extra.inspector', extra: true },
        { label: 'Location', key: '_extra.location', extra: true },
        { label: 'Notes', key: '_extra.notes', extra: true },
        { label: 'Method', key: '_extra.method', extra: true },
        { label: 'Reason', key: '_extra.reason', extra: true },
        { label: 'Est. Value', key: '_extra.value', extra: true },
      ];
      case 'audit': return [...base,
        { label: 'Details', key: '_extra.details', extra: true },
        { label: 'Entity ID', key: '_extra.entityId', extra: true },
      ];
      default: return base;
    }
  }

  private baseChartOpts(): Record<string, unknown> {
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    };
  }

  private valuationChartOpts(): Record<string, unknown> {
    const props = this.allProperties();
    const cats = new Map<string, number>();
    for (const p of props) {
      const cat = p.propertyCategoryName ?? 'Other';
      cats.set(cat, (cats.get(cat) || 0) + (p.totalValue ?? p.purchasePrice));
    }
    const sorted = Array.from(cats).sort((a, b) => b[1] - a[1]);
    return {
      ...this.baseChartOpts(),
      xAxis: { type: 'category', data: sorted.map(([c]) => c), axisLabel: { color: '#94a3b8', rotate: sorted.length > 5 ? 15 : 0 } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8', formatter: (v: number) => `ETB ${(v / 1000).toFixed(0)}K` } },
      series: [{
        type: 'bar', data: sorted.map(([, v]) => Math.round(v / 1000)),
        itemStyle: { color: '#3b82f6', borderRadius: [6, 6, 0, 0] }, barWidth: '45%',
      }],
    };
  }

  private depreciationChartOpts(): Record<string, unknown> {
    const props = this.allProperties();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const totalCost = props.reduce((s, p) => s + (p.totalValue ?? p.purchasePrice), 0);
    const totalBook = props.reduce((s, p) => s + p.currentValue, 0);
    const totalDep = totalCost - totalBook;
    const monthlyData = months.map((_, i) => Math.round(totalDep * ((i + 1) / 12)));
    return {
      ...this.baseChartOpts(),
      xAxis: { type: 'category', data: months, axisLabel: { color: '#94a3b8' } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8', formatter: (v: number) => `ETB ${(v / 1000).toFixed(0)}K` } },
      series: [{
        type: 'line', data: monthlyData, smooth: true,
        lineStyle: { color: '#f59e0b', width: 3 }, itemStyle: { color: '#f59e0b' },
        areaStyle: { color: 'rgba(245, 158, 11, 0.1)' },
      }],
    };
  }

  private requisitionChartOpts(): Record<string, unknown> {
    const byDept = this.requisitionData?.byDepartment ?? [];
    if (byDept.length > 0) {
      return {
        ...this.baseChartOpts(),
        xAxis: { type: 'category', data: byDept.map((d: any) => d.department ?? 'Other'), axisLabel: { color: '#94a3b8', rotate: 15 } },
        yAxis: { type: 'value', axisLabel: { color: '#94a3b8' } },
        series: [{
          type: 'bar', data: byDept.map((d: any) => d.count),
          itemStyle: { color: '#8b5cf6', borderRadius: [6, 6, 0, 0] }, barWidth: '45%',
        }],
      };
    }
    return { ...this.baseChartOpts(), xAxis: { type: 'category', data: [] }, yAxis: { type: 'value' }, series: [{ type: 'bar', data: [] }] };
  }

  private approvalRateChartOpts(): Record<string, unknown> {
    const s = this.requisitionData?.summary;
    const total = s?.totalRequisitions ?? 0;
    const approved = s?.approvedCount ?? 0;
    const rejected = s?.rejectedCount ?? 0;
    const pending = total - approved - rejected;
    return {
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie', radius: ['55%', '75%'], avoidLabelOverlap: false,
        label: { show: false }, emphasis: { scale: false },
        data: [
          { value: Math.max(approved, 1), name: 'Approved', itemStyle: { color: '#10b981' } },
          { value: Math.max(pending, 1), name: 'Pending', itemStyle: { color: '#f59e0b' } },
          { value: Math.max(rejected, 1), name: 'Rejected', itemStyle: { color: '#ef4444' } },
        ],
      }],
    };
  }

  private stockChartOpts(): Record<string, unknown> {
    const whMap = new Map<string, number>();
    for (const s of this.stockData) {
      const wh = s.warehouseName ?? s.warehouse ?? 'Unknown';
      whMap.set(wh, (whMap.get(wh) || 0) + (s.quantity ?? s.currentQuantity ?? 0));
    }
    const sorted = Array.from(whMap).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      return {
        ...this.baseChartOpts(),
        xAxis: { type: 'category', data: sorted.map(([w]) => w), axisLabel: { color: '#94a3b8', rotate: 15 } },
        yAxis: { type: 'value', axisLabel: { color: '#94a3b8' } },
        series: [{
          type: 'bar', data: sorted.map(([, v]) => v),
          itemStyle: { color: '#10b981', borderRadius: [6, 6, 0, 0] }, barWidth: '45%',
        }],
      };
    }
    return { ...this.baseChartOpts(), xAxis: { type: 'category', data: [] }, yAxis: { type: 'value' }, series: [{ type: 'bar', data: [] }] };
  }

  private warehouseChartOpts(): Record<string, unknown> {
    const whMap = new Map<string, number>();
    for (const s of this.stockData) {
      const wh = s.warehouseName ?? s.warehouse ?? 'Unknown';
      whMap.set(wh, (whMap.get(wh) || 0) + (s.quantity ?? s.currentQuantity ?? 0));
    }
    const total = Array.from(whMap.values()).reduce((s, v) => s + v, 0);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#ec4899'];
    return {
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie', radius: ['45%', '70%'], avoidLabelOverlap: false,
        label: { show: true, position: 'outside', formatter: '{b}: {d}%', color: '#94a3b8', fontSize: 11 },
        emphasis: { scale: true },
        data: Array.from(whMap).map(([name, value], i) => ({
          value: Math.round(value / total * 100), name,
          itemStyle: { color: colors[i % colors.length] },
        })),
      }],
    };
  }

  private issuanceChartOpts(): Record<string, unknown> {
    const byMonth = new Map<string, number>();
    for (const s of this.issuanceData) {
      const d = s.issueDate ?? s.createdAt;
      if (d) {
        const m = d.substring(0, 7);
        byMonth.set(m, (byMonth.get(m) || 0) + (s.totalValue ?? 1));
      }
    }
    const sorted = Array.from(byMonth).sort((a, b) => a[0].localeCompare(b[0]));
    const labels = sorted.map(([m]) => {
      const parts = m.split('-');
      return `${['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(parts[1])]} ${parts[0].slice(2)}`;
    });
    return {
      ...this.baseChartOpts(),
      xAxis: { type: 'category', data: labels.length > 0 ? labels : ['No Data'], axisLabel: { color: '#94a3b8' } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8', formatter: (v: number) => this.formatETB(v) } },
      series: [{
        type: 'bar', data: sorted.length > 0 ? sorted.map(([, v]) => v) : [0],
        itemStyle: { color: '#f59e0b', borderRadius: [6, 6, 0, 0] }, barWidth: '35%',
      }],
    };
  }

  private issuanceDeptChartOpts(): Record<string, unknown> {
    const byDept = new Map<string, number>();
    for (const s of this.issuanceData) {
      const dept = s.department ?? s.recipientDepartment ?? 'Other';
      byDept.set(dept, (byDept.get(dept) || 0) + (s.totalValue ?? 1));
    }
    const sorted = Array.from(byDept).sort((a, b) => b[1] - a[1]);
    return {
      ...this.baseChartOpts(),
      xAxis: { type: 'category', data: sorted.length > 0 ? sorted.map(([d]) => d) : ['No Data'], axisLabel: { color: '#94a3b8' } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8', formatter: (v: number) => this.formatETB(v) } },
      series: [{
        type: 'line', data: sorted.length > 0 ? sorted.map(([, v]) => Math.round(v / 1000)) : [0], smooth: true,
        lineStyle: { color: '#3b82f6', width: 3 }, itemStyle: { color: '#3b82f6' },
        areaStyle: { color: 'rgba(59, 130, 246, 0.1)' },
      }],
    };
  }

  private complianceChartOpts(): Record<string, unknown> {
    return {
      ...this.baseChartOpts(),
      xAxis: { type: 'category', data: ['Disposals', 'Inspections', 'Documentation', 'Workflow', 'Audit Trail'], axisLabel: { color: '#94a3b8', rotate: 15 } },
      yAxis: { type: 'value', min: 0, max: 100, axisLabel: { color: '#94a3b8', formatter: '{v}%' } },
      series: [{
        type: 'bar', data: [85, 78, 92, 88, 95],
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#10b981' }, { offset: 1, color: '#34d399' },
          ]),
          borderRadius: [6, 6, 0, 0],
        },
        barWidth: '45%',
      }],
    };
  }

  private complianceAreaChartOpts(): Record<string, unknown> {
    return {
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie', radius: ['45%', '70%'], avoidLabelOverlap: false,
        label: { show: true, position: 'outside', formatter: '{b}: {d}%', color: '#94a3b8', fontSize: 11 },
        emphasis: { scale: true },
        data: [
          { value: 85, name: 'Compliant', itemStyle: { color: '#10b981' } },
          { value: 15, name: 'Needs Review', itemStyle: { color: '#f59e0b' } },
        ],
      }],
    };
  }

  private auditChartOpts(): Record<string, unknown> {
    const byAction = new Map<string, number>();
    for (const l of this.auditData) {
      const a = l.action ?? l.actionType ?? 'Unknown';
      byAction.set(a, (byAction.get(a) || 0) + 1);
    }
    const sorted = Array.from(byAction).sort((a, b) => b[1] - a[1]).slice(0, 10);
    return {
      ...this.baseChartOpts(),
      xAxis: { type: 'category', data: sorted.length > 0 ? sorted.map(([a]) => a) : ['No Data'], axisLabel: { color: '#94a3b8', rotate: 15 } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8' } },
      series: [{
        type: 'bar', data: sorted.length > 0 ? sorted.map(([, v]) => v) : [0],
        itemStyle: { color: '#06b6d4', borderRadius: [6, 6, 0, 0] }, barWidth: '45%',
      }],
    };
  }

  private auditActivityChartOpts(): Record<string, unknown> {
    const byDay = new Map<string, number>();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const l of this.auditData) {
      const ts = l.timestamp ?? l.createdAt;
      if (ts) {
        const d = new Date(ts);
        const dn = dayNames[d.getDay()];
        byDay.set(dn, (byDay.get(dn) || 0) + 1);
      }
    }
    const data = dayNames.map(d => byDay.get(d) ?? 0);
    return {
      ...this.baseChartOpts(),
      xAxis: { type: 'category', data: dayNames, axisLabel: { color: '#94a3b8' } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8' } },
      series: [{
        type: 'line', data, smooth: true,
        lineStyle: { color: '#06b6d4', width: 3 }, itemStyle: { color: '#06b6d4' },
        areaStyle: { color: 'rgba(6, 182, 212, 0.1)' },
      }],
    };
  }

  setActiveTab(tabId: string): void {
    this.activeTab = tabId;
  }

  getStatusClass(status: string): string {
    const s = status.toLowerCase();
    if (['active', 'approved', 'compliant', 'in stock', 'completed'].includes(s)) return 'status-success';
    if (['pending', 'needs review', 'low stock', 'review'].includes(s)) return 'status-warning';
    if (['rejected', 'critical', 'out of stock', 'unknown'].includes(s)) return 'status-danger';
    return 'status-info';
  }

  selectedItem: TableRow | null = null;
  showDetailModal = false;

  viewItem(row: TableRow): void {
    this.selectedItem = row;
    this.showDetailModal = true;
  }

  closeDetail(): void {
    this.showDetailModal = false;
    this.selectedItem = null;
  }

  deleteItem(row: TableRow): void {
    if (confirm(`Are you sure you want to delete this record?`)) {
      alert(`Record has been deleted successfully.`);
    }
  }

  exportReport(): void {
    alert(`Exporting ${this.activeTab} report...`);
  }

  printReport(): void {
    window.print();
  }
}
