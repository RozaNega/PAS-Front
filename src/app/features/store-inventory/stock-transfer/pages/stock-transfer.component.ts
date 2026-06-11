import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockTransferService, TransferHistory } from '../services/stock-transfer.service';

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
