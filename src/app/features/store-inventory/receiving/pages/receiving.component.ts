import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CurrentUserService } from '../../../../core/services/current-user.service';
import { ReceivingNotesService, CreateReceivingNoteCommand, ReceivingNoteListDto } from '../../../../core/services/receiving-notes.service';
import { InspectionsService, InspectionDto } from '../../../../core/services/inspections.service';
import { SuppliersService } from '../../../../core/services/suppliers.service';
import { ItemMasterService, ItemMasterPaginatedResponse } from '../../../../core/services/item-master.service';

import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, PieChart, LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([BarChart, PieChart, LineChart, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer]);

interface GRNItem {
  itemId: string;
  itemName: string;
  sku: string;
  ordered: number;
  delivered: number;
  accepted: number;
  rejected: number;
  uom: string;
}

interface PendingGRN {
  id: string;
  grnNumber: string;
  supplier: string;
  poNumber: string;
  receivedDate: string;
  status: 'Pending Inspection' | 'Partially Inspected' | 'Awaiting Approval' | 'Completed';
  items: number;
  value: number;
  priority: string;
}

interface InspectionItem {
  itemName: string;
  sku: string;
  delivered: number;
  passed: number;
  failed: number;
  status: string;
}

interface InspectionRecord {
  id: string;
  grnNumber: string;
  supplier: string;
  receivedDate: string;
  inspector: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Failed';
  items: InspectionItem[];
  priority: 'High' | 'Medium' | 'Low';
}

interface GRNHistory {
  grnNumber: string;
  date: string;
  supplier: string;
  poNumber: string;
  items: number;
  value: number;
  status: string;
  inspectedBy: string;
}

interface TopSupplier {
  name: string;
  deliveries: number;
  value: number;
  percentage: number;
}

interface GRNSupplier {
  id: string;
  name: string;
}

@Component({
  selector: 'app-receiving',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './receiving.component.html',
  styleUrls: ['./receiving.component.scss'],
})
export class ReceivingComponent implements OnInit {
  todayDate = new Date().toLocaleDateString();
  activeTab = signal<'summary' | 'grn' | 'inspection' | 'history'>('summary');

  private readonly currentUserService = inject(CurrentUserService);
  private readonly receivingNotesService = inject(ReceivingNotesService);
  private readonly inspectionsService = inject(InspectionsService);
  private readonly suppliersService = inject(SuppliersService);
  private readonly itemMasterService = inject(ItemMasterService);

  private readonly rawHistoryItems = signal<ReceivingNoteListDto[]>([]);

  availableItems = signal<{ id: string; name: string; sku: string; uom: string }[]>([]);
  selectedItemId = signal('');

  isLoading = signal(false);
  errorMessage = signal('');
  notification = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  // ══════════════════════════════════════════════════════════════
  //  SUMMARY / OVERVIEW
  // ══════════════════════════════════════════════════════════════
  totalPendingGRNs = computed(() =>
    this.rawHistoryItems().filter(h => h.status === 'Pending' || h.status === 'Under Review' || h.status === 'Awaiting Approval').length
  );

  pendingInspections = computed(() =>
    this.allInspections().filter(i => i.status === 'Pending').length
  );

  receivedToday = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.rawHistoryItems().filter(h => h.receivedDate?.startsWith(today)).length;
  });

  totalItemsReceived = computed(() =>
    this.rawHistoryItems().reduce((s, h) => s + h.totalQuantity, 0)
  );

  totalGRNsThisMonth = computed(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const days = this.rawHistoryItems().filter(h => {
      const d = new Date(h.receivedDate);
      return !isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month;
    });
    return days.length;
  });

  avgInspectionTime = signal('—');

  receivingTrend = computed(() => {
    const items = this.rawHistoryItems();
    const weeks = new Map<string, number>();
    for (const h of items) {
      const d = new Date(h.receivedDate);
      if (isNaN(d.getTime())) continue;
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split('T')[0];
      weeks.set(key, (weeks.get(key) || 0) + 1);
    }
    return Array.from(weeks.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([_, count], i) => ({ week: `W${i + 1}`, grns: count }));
  });

  supplierDistribution = computed(() => {
    const groups = new Map<string, number>();
    for (const h of this.rawHistoryItems()) {
      const name = h.supplierName || 'Unknown';
      groups.set(name, (groups.get(name) || 0) + h.totalQuantity);
    }
    const entries = Array.from(groups.entries()).sort(([, a], [, b]) => b - a);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#94a3b8'];
    const top5 = entries.slice(0, 5);
    if (entries.length > 5) {
      const others = entries.slice(5).reduce((s, [, v]) => s + v, 0);
      top5.push(['Others', others]);
    }
    return top5.map(([name, value], i) => ({
      value, name,
      itemStyle: { color: colors[i % colors.length] }
    }));
  });

  get trendChartOpts(): Record<string, unknown> {
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '5%', right: '5%', bottom: '8%', top: '10%', containLabel: true },
      xAxis: { type: 'category', data: this.receivingTrend().map(w => w.week), axisLabel: { color: '#94a3b8', fontWeight: 600 }, axisLine: { show: false }, axisTick: { show: false } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)' } } },
      series: [{
        type: 'bar', data: this.receivingTrend().map(w => ({
          value: w.grns,
          itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#6366f1' }]) as any, borderRadius: [6, 6, 0, 0] }
        })),
        barWidth: '55%', animationDuration: 800, animationEasing: 'elasticOut'
      }]
    };
  }

  get supplierChartOpts(): Record<string, unknown> {
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      series: [{
        type: 'pie', radius: ['55%', '78%'], center: ['50%', '50%'],
        avoidLabelOverlap: false,
        label: { show: true, position: 'outside', formatter: '{b}\n{d}%', color: '#94a3b8', fontSize: 11, lineHeight: 16, fontWeight: 600 },
        emphasis: { itemStyle: { shadowBlur: 15, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.2)' } },
        animationDuration: 1000, animationEasing: 'cubicOut',
        data: this.supplierDistribution()
      }]
    };
  }

  // ══════════════════════════════════════════════════════════════
  //  CREATE GRN (Wizard)
  // ══════════════════════════════════════════════════════════════
  grnStep = signal(1);
  readonly totalGrnSteps = 4;

  suppliers = signal<GRNSupplier[]>([]);

  searchSupplier = signal('');
  selectedSupplier = signal<GRNSupplier | null>(null);
  poNumber = signal('');
  deliveryNote = signal('');
  receivedDate = signal(new Date().toISOString().split('T')[0]);
  grnNumber = signal('');

  grnItems = signal<GRNItem[]>([]);

  notes = signal('');
  generatePrint = signal(true);
  notifySupplier = signal(true);
  attachDocuments = signal(false);

  filteredSuppliers = computed(() => {
    const s = this.searchSupplier().toLowerCase();
    if (!s) return this.suppliers();
    return this.suppliers().filter(sup => sup.name.toLowerCase().includes(s));
  });

  selectSupplier(sup: GRNSupplier): void {
    this.selectedSupplier.set(sup);
    this.generateGrnNumber();
  }

  private generateGrnNumber(): void {
    const count = this.totalGRNsThisMonth() + 1;
    this.grnNumber.set(`GRN-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`);
  }

  grnNextStep(): void { this.grnStep.update(s => Math.min(s + 1, this.totalGrnSteps)); }
  grnPreviousStep(): void { this.grnStep.update(s => Math.max(s - 1, 1)); }

  submitGRN(): void {
    const supplier = this.selectedSupplier();
    if (!supplier) {
      this.showNotification('error', 'Please select a supplier');
      return;
    }

    if (this.grnItems().length === 0) {
      this.showNotification('error', 'Please add at least one item');
      return;
    }

    const command: CreateReceivingNoteCommand = {
      grnNumber: this.grnNumber() || undefined,
      supplierId: supplier.id,
      poNumber: this.poNumber() || undefined,
      deliveryNoteNumber: this.deliveryNote() || undefined,
      remarks: this.notes() || undefined,
      items: this.grnItems().map(item => ({
        itemId: item.itemId,
        quantity: item.accepted,
        unitPrice: 0,
      })),
    };

    this.isLoading.set(true);
    this.receivingNotesService.create(command).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) {
          this.showNotification('success', `GRN "${this.grnNumber()}" created successfully!`);
          this.resetGRNForm();
          this.loadHistoryFromApi();
          this.activeTab.set('history');
        } else {
          this.showNotification('error', 'Failed to create GRN: ' + (res.message || 'Unknown error'));
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err?.status === 0 ? 'Cannot connect to server.' : err?.error?.message || 'Error creating GRN.';
        this.showNotification('error', msg);
      }
    });
  }

  private showNotification(type: 'success' | 'error', message: string): void {
    this.notification.set({ type, message });
    setTimeout(() => this.notification.set(null), 5000);
  }

  cancelGRN(): void {
    this.resetGRNForm();
  }

  private resetGRNForm(): void {
    this.grnStep.set(1);
    this.selectedSupplier.set(null);
    this.poNumber.set('');
    this.deliveryNote.set('');
    this.notes.set('');
    this.grnItems.set([]);
  }

  getGrnStepTitle(): string {
    switch (this.grnStep()) {
      case 1: return 'Shipment Information';
      case 2: return 'Items & Quantities';
      case 3: return 'Batch / Lot Details';
      case 4: return 'Review & Submit';
      default: return '';
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  INSPECTION QUEUE
  // ══════════════════════════════════════════════════════════════
  inspectionSearch = signal('');
  inspectionFilter = signal('All');
  inspectionPriority = signal('All');

  readonly inspectionFilters = ['All', 'Pending', 'In Progress', 'Completed', 'Failed'];
  readonly priorities = ['All', 'High', 'Medium', 'Low'];

  private readonly allInspections = signal<InspectionRecord[]>([]);

  filteredInspections = computed(() => {
    const search = this.inspectionSearch().toLowerCase();
    const status = this.inspectionFilter();
    const priority = this.inspectionPriority();
    return this.allInspections().filter(insp => {
      const matchSearch = !search || insp.grnNumber.toLowerCase().includes(search) || insp.supplier.toLowerCase().includes(search);
      const matchStatus = status === 'All' || insp.status === status;
      const matchPriority = priority === 'All' || insp.priority === priority;
      return matchSearch && matchStatus && matchPriority;
    });
  });

  // Inspection Modal
  showInspectionModal = signal(false);
  selectedInspection = signal<InspectionRecord | null>(null);
  inspectionResult = signal<'Pass' | 'Fail' | 'Conditional Pass'>('Pass');
  inspectionNotes = signal('');
  inspectionItems = signal<InspectionItem[]>([]);

  ngOnInit(): void {
    this.loadSuppliersFromApi();
    this.loadItemsFromApi();
    this.loadHistoryFromApi();
    this.loadInspectionsFromApi();
  }

  private loadSuppliersFromApi(): void {
    this.suppliersService.getAll().subscribe({
      next: (res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data as any)?.items;
        if (list?.length) {
          this.suppliers.set(list.map((s: any) => ({ id: String(s.id), name: s.supplierName || s.name })));
        } else {
          console.warn('[GRN] No suppliers returned from API', res);
        }
      },
      error: (err) => console.error('[GRN] Failed to load suppliers', err)
    });
  }

  private loadItemsFromApi(): void {
    this.itemMasterService.getItemMasters(1, 500).subscribe({
      next: (res) => {
        if (res.success && res.data && typeof res.data === 'object' && 'items' in res.data) {
          const items = (res.data as ItemMasterPaginatedResponse).items;
          this.availableItems.set(items.map((i: any) => ({
            id: String(i.id),
            name: i.itemName || i.name,
            sku: i.sku,
            uom: i.unitOfMeasure || 'PCS',
          })));
        } else {
          console.warn('[GRN] No items returned from API', res);
        }
      },
      error: (err) => console.error('[GRN] Failed to load items', err)
    });
  }

  addGrnItem(item: { id: string; name: string; sku: string; uom: string }): void {
    this.grnItems.update(items => [
      ...items,
      { itemId: item.id, itemName: item.name, sku: item.sku, ordered: 0, delivered: 0, accepted: 0, rejected: 0, uom: item.uom }
    ]);
  }

  removeGrnItem(index: number): void {
    this.grnItems.update(items => items.filter((_, i) => i !== index));
  }

  addItemFromSelect(): void {
    const id = this.selectedItemId();
    if (!id) return;
    const item = this.availableItems().find(i => i.id === id);
    if (item && !this.grnItems().some(i => i.itemId === id)) {
      this.addGrnItem(item);
      this.selectedItemId.set('');
    }
  }

  updateGrnItem(index: number, field: string, event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.grnItems.update(items => items.map((item, i) => i === index ? { ...item, [field]: val } : item));
  }

  private loadHistoryFromApi(): void {
    this.receivingNotesService.getAll({ pageNumber: 1, pageSize: 50 }).subscribe({
      next: (res) => {
        if (res.success && res.data?.items) {
          const items = res.data.items;
          this.rawHistoryItems.set(items);
          this.allHistory.set(items.map((n: any) => ({
            grnNumber: n.grnNumber || '—',
            date: n.receivedDate ? new Date(n.receivedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
            supplier: n.supplierName || '—',
            poNumber: '—',
            items: n.itemCount || 0,
            value: n.totalQuantity || 0,
            status: n.status || 'Pending',
            inspectedBy: n.receivedBy || '—',
          })));
        }
      },
      error: () => {}
    });
  }

  private loadInspectionsFromApi(): void {
    this.inspectionsService.getAll({ pageNumber: 1, pageSize: 50 }).subscribe({
      next: (res) => {
        if (res.success && res.data?.items?.length) {
          this.allInspections.set(res.data.items.map((i: InspectionDto) => ({
            id: i.id,
            grnNumber: i.grnNumber || '—',
            supplier: '',
            receivedDate: i.inspectionDate ? new Date(i.inspectionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
            inspector: i.inspectorName || 'Unassigned',
            status: (i.status || (i.isPassed ? 'Completed' : 'Failed')) as InspectionRecord['status'],
            items: i.items.map((item) => ({
              itemName: item.itemName || 'Unknown',
              sku: item.sku || '—',
              delivered: item.receivedQuantity,
              passed: item.acceptedQuantity,
              failed: item.rejectedQuantity,
              status: item.isPassed ? 'Passed' : 'Failed',
            })),
            priority: 'Medium' as 'High' | 'Medium' | 'Low',
          })));
        }
      },
      error: () => {}
    });
  }

  openInspectionModal(inspection: InspectionRecord): void {
    this.selectedInspection.set(inspection);
    this.inspectionResult.set('Pass');
    this.inspectionNotes.set('');
    this.inspectionItems.set(inspection.items.map(i => ({ ...i })));
    this.showInspectionModal.set(true);
  }

  closeInspectionModal(): void {
    this.showInspectionModal.set(false);
    this.selectedInspection.set(null);
  }

  submitInspection(): void {
    this.isLoading.set(false);
    this.closeInspectionModal();
    this.loadInspectionsFromApi();
  }

  assignInspector(_inspection: InspectionRecord): void {}

  // ══════════════════════════════════════════════════════════════
  //  RECEIVING HISTORY
  // ══════════════════════════════════════════════════════════════
  historySearch = signal('');
  historyDateStart = signal('');
  historyDateEnd = signal('');
  historyStatus = signal('All');

  private readonly allHistory = signal<GRNHistory[]>([]);

  filteredHistory = computed(() => {
    const search = this.historySearch().toLowerCase();
    const status = this.historyStatus();
    return this.allHistory().filter(h => {
      const matchSearch = !search || h.grnNumber.toLowerCase().includes(search) || h.supplier.toLowerCase().includes(search) || h.poNumber.toLowerCase().includes(search);
      const matchStatus = status === 'All' || h.status === status;
      return matchSearch && matchStatus;
    });
  });

  // History Modal
  showHistoryModal = signal(false);
  selectedHistory = signal<GRNHistory | null>(null);

  totalGRNs = computed(() => this.allHistory().length);
  totalItemsReceivedHistory = computed(() => this.allHistory().reduce((s, h) => s + h.items, 0));
  totalValueReceived = computed(() => this.allHistory().reduce((s, h) => s + h.value, 0));

  topSuppliers = computed<TopSupplier[]>(() => {
    const groups = new Map<string, { deliveries: number; value: number }>();
    for (const h of this.rawHistoryItems()) {
      const name = h.supplierName || 'Unknown';
      const g = groups.get(name) || { deliveries: 0, value: 0 };
      g.deliveries++;
      g.value += h.totalQuantity;
      groups.set(name, g);
    }
    const entries = Array.from(groups.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    const maxVal = entries.reduce((s, e) => s + e.value, 0) || 1;
    return entries.map(e => ({ ...e, percentage: Math.round((e.value / maxVal) * 100) }));
  });

  openHistoryModal(record: GRNHistory): void {
    this.selectedHistory.set(record);
    this.showHistoryModal.set(true);
  }

  closeHistoryModal(): void {
    this.showHistoryModal.set(false);
    this.selectedHistory.set(null);
  }

  printGRN(_record: GRNHistory): void { window.print(); }
  emailGRN(_record: GRNHistory): void {}
  downloadGRN(_record: GRNHistory): void {}

  // ══════════════════════════════════════════════════════════════
  //  UTILITIES
  // ══════════════════════════════════════════════════════════════
  formatValue(value: number): string {
    if (value >= 1000000) return '$' + (value / 1000000).toFixed(2) + 'M';
    if (value >= 1000) return '$' + (value / 1000).toFixed(0) + 'K';
    return '$' + value.toString();
  }

  getInspectionStatusColor(status: string): string {
    switch (status) {
      case 'Pending': return '#f59e0b';
      case 'In Progress': return '#3b82f6';
      case 'Completed': return '#10b981';
      case 'Failed': return '#ef4444';
      default: return '#94a3b8';
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'High': return '#ef4444';
      case 'Medium': return '#f59e0b';
      default: return '#10b981';
    }
  }
}
