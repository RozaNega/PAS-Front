import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StockTransferService, TransferItem, TransferHistory } from '../services/stock-transfer.service';

import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, PieChart, LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([BarChart, PieChart, LineChart, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer]);

interface WarehouseOption {
  id: string;
  name: string;
}

@Component({
  selector: 'app-stock-transfer',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './stock-transfer.component.html',
  styleUrls: ['./stock-transfer.component.scss']
})
export class StockTransferComponent implements OnInit {
  private readonly transferService = inject(StockTransferService);
  readonly Math = Math;

  todayDate = new Date().toLocaleDateString();
  activeTab = signal<'create' | 'history'>('create');

  // Form state
  fromWarehouse = signal('');
  toWarehouse = signal('');
  transferReason = signal('');
  requiredByDate = signal('');
  notes = signal('');
  itemSearch = signal('');

  // Data state
  warehouses = signal<WarehouseOption[]>([]);
  transferItems = signal<TransferItem[]>([]);
  transferHistory = signal<TransferHistory[]>([]);

  // UI state
  showHistoryModal = signal(false);
  loading = signal(false);
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
    this.requiredByDate().length > 0 &&
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

  filteredTransferItems = computed(() => {
    const query = this.itemSearch().toLowerCase();
    if (!query) return this.transferItems();
    return this.transferItems().filter(i =>
      i.name.toLowerCase().includes(query) || i.sku.toLowerCase().includes(query)
    );
  });

  filteredHistory = computed(() => {
    return this.transferHistory();
  });

  ngOnInit(): void {
    this.loadWarehouses();
    this.loadTransferHistory();
  }

  loadWarehouses(): void {
    this.loading.set(true);
    this.error.set(null);
    this.transferService.getWarehouses().subscribe({
      next: (res) => {
        if (res.success !== false && Array.isArray(res.data)) {
          const warehouseList = (res.data as any[]).map(wh => ({ id: wh.id, name: wh.warehouseName }));
          this.warehouses.set(warehouseList);
          if (warehouseList.length >= 2) {
            this.fromWarehouse.set(warehouseList[0].id);
            this.toWarehouse.set(warehouseList[1].id);
            this.loadItemsForWarehouse();
          }
        } else {
          this.error.set(res.message || 'Failed to load warehouses');
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load warehouses.');
        this.loading.set(false);
      }
    });
  }

  loadItemsForWarehouse(): void {
    const warehouseId = this.fromWarehouse();
    if (!warehouseId) return;
    this.loadingItems.set(true);
    this.error.set(null);
    this.transferService.getItemsInWarehouse(warehouseId).subscribe({
      next: (res) => {
        if (res.success !== false && Array.isArray(res.data)) {
          this.transferItems.set(res.data);
        } else {
          this.error.set(res.message || 'Failed to load items');
        }
        this.loadingItems.set(false);
      },
      error: () => {
        this.error.set('Failed to load items.');
        this.loadingItems.set(false);
      }
    });
  }

  loadTransferHistory(): void {
    this.transferService.getTransferHistory().subscribe({
      next: (res) => {
        if (res.success !== false && Array.isArray(res.data)) {
          this.transferHistory.set(res.data);
        }
      },
      error: () => {}
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

    const request = {
      fromWarehouseId: this.fromWarehouse(),
      toWarehouseId: this.toWarehouse(),
      items: this.selectedItems().map(item => ({ itemId: item.itemId, quantity: item.toTransfer })),
      reason: this.transferReason(),
      requiredByDate: this.requiredByDate(),
      notes: this.notes()
    };

    this.transferService.createTransfer(request).subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (res.success) {
          this.showToast('Transfer order created successfully');
          setTimeout(() => {
            this.resetForm();
            this.loadTransferHistory();
          }, 2000);
        } else {
          this.error.set(res.message || 'Failed to create transfer order');
        }
      },
      error: () => {
        this.submitting.set(false);
        this.error.set('Failed to create transfer order. Please try again.');
      }
    });
  }

  cancelForm(): void {
    this.resetForm();
  }

  private resetForm(): void {
    this.transferReason.set('');
    this.requiredByDate.set('');
    this.notes.set('');
    this.itemSearch.set('');
    this.error.set(null);
    this.success.set(null);
    this.transferItems.update(items => items.map(item => ({ ...item, toTransfer: 0 })));
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set({ message, type, visible: true });
    this.toastTimer = setTimeout(() => this.toast.set({ message: '', type: 'info', visible: false }), 3000);
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

  getWarehouseName(id: string): string {
    return this.warehouses().find(w => w.id === id)?.name || id;
  }
}
