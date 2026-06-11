import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockTransferService, TransferHistory, TransferItem } from '../services/stock-transfer.service';

import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, PieChart, LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([BarChart, PieChart, LineChart, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer]);

@Component({
  selector: 'app-stock-transfer',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './stock-transfer.component.html',
  styleUrls: ['./stock-transfer.component.scss']
})
export class StockTransferComponent implements OnInit {
  private readonly transferService = inject(StockTransferService);
  readonly Math = Math;

  // Data state
  transferHistory = signal<TransferHistory[]>([]);

  // UI state
  loading = signal(false);

  // Form state
  fromWarehouse = signal('');
  toWarehouse = signal('');
  transferReason = signal('');
  notes = signal('');
  transferItems = signal<TransferItem[]>([]);
  showHistoryModal = signal(false);

  submitting = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  loadingItems = signal(false);

  toast = signal<{ message: string; type: 'success' | 'error' | 'info'; visible: boolean }>({ message: '', type: 'info', visible: false });
  private toastTimer: any = null;

  // Computed
  selectedItems = computed(() => this.transferItems().filter(item => item.toTransfer > 0));

  totalQuantity = computed(() => this.selectedItems().reduce((sum, item) => sum + item.toTransfer, 0));

  totalValue = computed(() => this.selectedItems().reduce((sum, item) => sum + (item.toTransfer * (item.price || 0)), 0));

  isFormValid = computed(() =>
    this.fromWarehouse() && this.toWarehouse() &&
    this.fromWarehouse() !== this.toWarehouse() &&
    this.transferReason().trim().length > 0 &&
    this.selectedItems().length > 0
  );


  // KPI data
  totalTransfers = computed(() => this.transferHistory().length);
  completedTransfers = computed(() => this.transferHistory().filter(h => h.status === 'completed').length);
  pendingTransfers = computed(() => this.transferHistory().filter(h => h.status === 'pending').length);
  inProgressTransfers = computed(() => this.transferHistory().filter(h => h.status === 'in-progress').length);
  totalItemsTransferred = computed(() => this.transferHistory().reduce((s, h) => s + h.qty, 0));
  totalTransferValue = signal(128500);

  // Charts
  transferTrend = signal([
    { month: 'Jul', transfers: 4 },
    { month: 'Aug', transfers: 7 },
    { month: 'Sep', transfers: 5 },
    { month: 'Oct', transfers: 9 },
    { month: 'Nov', transfers: 6 },
    { month: 'Dec', transfers: 8 },
  ]);

  get trendChartOpts(): Record<string, unknown> {
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '5%', right: '5%', bottom: '8%', top: '10%', containLabel: true },
      xAxis: { type: 'category', data: this.transferTrend().map(w => w.month), axisLabel: { color: '#94a3b8', fontWeight: 600 }, axisLine: { show: false }, axisTick: { show: false } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)' } } },
      series: [{
        type: 'bar', data: this.transferTrend().map(w => ({
          value: w.transfers,
          itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#f59e0b' }, { offset: 1, color: '#d97706' }]) as any, borderRadius: [6, 6, 0, 0] }
        })),
        barWidth: '55%', animationDuration: 800, animationEasing: 'elasticOut'
      }]
    };
  }

  get statusChartOpts(): Record<string, unknown> {
    const total = this.totalTransfers() || 1;
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      graphic: [{
        type: 'text', left: 'center', top: 'center',
        style: { text: `${this.totalTransfers()}`, fill: '#1e293b', fontSize: 28, fontWeight: 800, fontFamily: 'Inter, sans-serif' }
      }],
      series: [{
        type: 'pie', radius: ['55%', '78%'], center: ['50%', '50%'],
        avoidLabelOverlap: false,
        label: { show: true, position: 'outside', formatter: '{b}\n{d}%', color: '#94a3b8', fontSize: 11, lineHeight: 16, fontWeight: 600 },
        emphasis: { itemStyle: { shadowBlur: 15, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.2)' } },
        animationDuration: 1000, animationEasing: 'cubicOut',
        data: [
          { value: this.completedTransfers(), name: 'Completed', itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [{ offset: 0, color: '#10b981' }, { offset: 1, color: '#059669' }]) as any } },
          { value: this.inProgressTransfers(), name: 'In Progress', itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#2563eb' }]) as any } },
          { value: this.pendingTransfers(), name: 'Pending', itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [{ offset: 0, color: '#f59e0b' }, { offset: 1, color: '#d97706' }]) as any } },
        ]
      }]
    };
  }

  filteredHistory = computed(() => {
    return this.transferHistory();
  });

  ngOnInit(): void {
    this.loadTransferHistory();
  }

  loadTransferHistory(): void {
    this.loading.set(true);
    this.transferService.getTransferHistory().subscribe({
      next: (res) => {
        if (res.success !== false && Array.isArray(res.data)) {
          this.transferHistory.set(res.data);
        }
        this.loading.set(false);
      },

      error: () => { this.loading.set(false); }
    });
  }

  updateTransferQuantity(sku: string, value: any): void {
    const quantity = Math.max(0, parseInt(value) || 0);
    this.transferItems.update(items =>
      items.map(item =>
        item.sku === sku ? { ...item, toTransfer: Math.min(quantity, item.available) } : item
      )
    );
  }

  onFromWarehouseChange(): void {
    this.loadItemsForWarehouse();
    this.transferItems.set([]);
  }

  openHistoryModal(): void { this.showHistoryModal.set(true); }
  closeHistoryModal(): void { this.showHistoryModal.set(false); }

  createTransferOrder(): void {
    if (!this.isFormValid()) {
      this.error.set('Please fill in all required fields and select items to transfer.');
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    this.success.set(null);

    const items = this.selectedItems().map(item => ({ itemId: item.itemId, quantity: item.toTransfer }));

    this.transferService.createTransfer(
      this.fromWarehouse(),
      this.toWarehouse(),
      items,
      this.transferReason(),
      this.notes() || undefined
    ).subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (res.success) {
          const created = res.data?.created ?? 0;
          const msg = created > 1
            ? `${created} transfer records created successfully`
            : 'Transfer record created successfully';
          this.showToast(msg);
          setTimeout(() => {
            this.resetForm();
            this.loadTransferHistory();
          }, 2000);
        } else {
          this.error.set(res.message || 'Failed to create transfer');
        }
      },
      error: () => {
        this.submitting.set(false);
        this.error.set('Failed to create transfer. Please try again.');
      }

    });
  }

  private showToast(msg: string): void {
    this.toast.set({ message: msg, type: 'success', visible: true });
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set({ message: '', type: 'info', visible: false }), 4000);
  }

  loadItemsForWarehouse(): void {
    const whId = this.fromWarehouse();
    if (!whId) { this.transferItems.set([]); return; }
    this.loadingItems.set(true);
    this.transferService.getItemsInWarehouse(whId).subscribe({
      next: (res) => {
        this.loadingItems.set(false);
        if (res.success !== false && Array.isArray(res.data)) {
          this.transferItems.set(res.data);
        } else {
          this.transferItems.set([]);
        }
      },
      error: () => {
        this.loadingItems.set(false);
        this.transferItems.set([]);
      }
    });
  }

  resetForm(): void {
    this.fromWarehouse.set('');
    this.toWarehouse.set('');
    this.transferReason.set('');
    this.notes.set('');
    this.transferItems.set([]);
    this.error.set(null);
    this.success.set(null);
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return 'bi-check-circle-fill';
      case 'in-progress': return 'bi-arrow-repeat';
      case 'pending': return 'bi-clock-fill';
      default: return 'bi-info-circle-fill';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in-progress': return '#3b82f6';
      case 'pending': return '#f59e0b';
      case 'cancelled': return '#6b7280';
      default: return '#94a3b8';
    }
  }

  formatValue(value: number): string {
    if (value >= 1000000) return '$' + (value / 1000000).toFixed(2) + 'M';
    if (value >= 1000) return '$' + (value / 1000).toFixed(0) + 'K';
    return '$' + value.toString();
  }
}
