import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, PieChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';
import { downloadReportPdf, ReportDetailRow } from '../compliance-reports/report-actions.util';
import { ManagerDataService, ManagerRequestRow, ManagerSivRow } from '../../../../core/services/manager-data.service';

try { echarts.use([BarChart, PieChart, LineChart, TooltipComponent, GridComponent, LegendComponent, TitleComponent, CanvasRenderer]); } catch {};

type ReportTab = 'approval' | 'requests' | 'issuance';

@Component({
  selector: 'app-reports-dashboard',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './reports-dashboard.component.html',
  styleUrls: ['./reports-dashboard.component.scss'],
})
export class ReportsDashboardComponent implements OnInit {
  private readonly managerData = inject(ManagerDataService);
  private readonly router = inject(Router);

  readonly activeTab = signal<ReportTab>('approval');
  readonly isLoading = signal(true);

  // Approval data
  readonly approvedRows = signal<ManagerRequestRow[]>([]);
  readonly rejectedRows = signal<ManagerRequestRow[]>([]);

  // Request data
  readonly allRequestRows = signal<ManagerRequestRow[]>([]);

  // SIV data
  readonly sivRows = signal<ManagerSivRow[]>([]);

  // Detail modal
  protected showModal = signal(false);
  protected modalTitle = signal('');
  protected modalType = signal<ReportTab>('approval');

  approvalStats() {
    const approved = this.approvedRows();
    const rejected = this.rejectedRows();
    const total = approved.length + rejected.length;
    return { total, approved: approved.length, rejected: rejected.length, rate: total > 0 ? Math.round((approved.length / total) * 100) : 0 };
  }

  requestStats() {
    const rows = this.allRequestRows();
    return { total: rows.length, pending: rows.filter(r => r.status === 'Pending').length, approved: rows.filter(r => r.status === 'Approved').length, value: rows.reduce((s, r) => s + r.estimatedValue, 0) };
  }

  issuanceStats() {
    const sivs = this.sivRows();
    return { total: sivs.length, items: sivs.reduce((s, v) => s + v.totalItems, 0), value: sivs.reduce((s, v) => s + v.totalValue, 0) };
  }

  // ─── Chart Options ──────────────────────────────────────

  readonly approvalPieOptions = computed<EChartsOption>(() => {
    const approved = this.approvedRows().length;
    const rejected = this.rejectedRows().length;
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0, textStyle: { fontSize: 11, color: '#64748b' } },
      series: [{
        type: 'pie', radius: ['50%', '72%'], avoidLabelOverlap: true,
        label: { show: false }, emphasis: { label: { show: true, fontWeight: 'bold' } },
        data: [
          { value: approved, name: 'Approved', itemStyle: { color: '#22c55e' } },
          { value: rejected, name: 'Rejected', itemStyle: { color: '#ef4444' } },
        ],
      }],
    };
  });

  readonly approvalBarOptions = computed<EChartsOption>(() => {
    const all = [...this.approvedRows(), ...this.rejectedRows()].sort(
      (a, b) => new Date(a.requestedDate).getTime() - new Date(b.requestedDate).getTime()
    );
    const months = new Map<string, { approved: number; rejected: number }>();
    for (const r of all) {
      const key = r.requestedDate?.slice(0, 7) || 'Unknown';
      if (!months.has(key)) months.set(key, { approved: 0, rejected: 0 });
      const m = months.get(key)!;
      if (r.status === 'Approved') m.approved += r.estimatedValue;
      else m.rejected += r.estimatedValue;
    }
    const labels = Array.from(months.keys());
    return {
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, textStyle: { fontSize: 11, color: '#64748b' } },
      grid: { left: 50, right: 16, top: 16, bottom: 44 },
      xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 10, color: '#94a3b8' } },
      yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => `$${(v / 1000).toFixed(0)}k` } },
      series: [
        { name: 'Approved', type: 'bar', stack: 'value', barWidth: '60%', data: labels.map(l => months.get(l)!.approved), itemStyle: { color: '#22c55e', borderRadius: [0, 0, 0, 0] } },
        { name: 'Rejected', type: 'bar', stack: 'value', barWidth: '60%', data: labels.map(l => months.get(l)!.rejected), itemStyle: { color: '#ef4444', borderRadius: [0, 0, 0, 0] } },
      ],
    };
  });

  readonly requestPieOptions = computed<EChartsOption>(() => {
    const rows = this.allRequestRows();
    const pending = rows.filter(r => r.status === 'Pending').length;
    const approved = rows.filter(r => r.status === 'Approved').length;
    const rejected = rows.filter(r => r.status === 'Rejected').length;
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0, textStyle: { fontSize: 11, color: '#64748b' } },
      series: [{
        type: 'pie', radius: ['50%', '72%'], avoidLabelOverlap: true,
        label: { show: false }, emphasis: { label: { show: true, fontWeight: 'bold' } },
        data: [
          { value: approved, name: 'Approved', itemStyle: { color: '#22c55e' } },
          { value: pending, name: 'Pending', itemStyle: { color: '#f59e0b' } },
          { value: rejected, name: 'Rejected', itemStyle: { color: '#ef4444' } },
        ],
      }],
    };
  });

  readonly requestBarOptions = computed<EChartsOption>(() => {
    const rows = this.allRequestRows();
    const deptMap = new Map<string, number>();
    for (const r of rows) {
      const dept = r.department || 'Unknown';
      deptMap.set(dept, (deptMap.get(dept) || 0) + r.estimatedValue);
    }
    const sorted = Array.from(deptMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
    return {
      tooltip: { trigger: 'axis', formatter: (p: unknown) => {
        const arr = p as Array<{ name: string; value: number }>;
        return `${arr[0].name}<br/>$${arr[0].value.toLocaleString()}`;
      } },
      grid: { left: 16, right: 50, top: 16, bottom: 36 },
      xAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => `$${(v / 1000).toFixed(0)}k` } },
      yAxis: { type: 'category', data: sorted.map(([d]) => d), axisLabel: { fontSize: 10, color: '#475569' } },
      series: [{
        type: 'bar', data: sorted.map(([, v]) => v), barWidth: '60%',
        itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#6366f1' }, { offset: 1, color: '#8b5cf6' },
        ]) as unknown as string, borderRadius: [0, 6, 6, 0] },
      }],
    };
  });

  readonly issuancePieOptions = computed<EChartsOption>(() => {
    const sivs = this.sivRows();
    const issued = sivs.filter(v => v.status === 'Issued').length;
    const pending = sivs.filter(v => v.status === 'Pending').length;
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0, textStyle: { fontSize: 11, color: '#64748b' } },
      series: [{
        type: 'pie', radius: ['50%', '72%'], avoidLabelOverlap: true,
        label: { show: false }, emphasis: { label: { show: true, fontWeight: 'bold' } },
        data: [
          { value: issued, name: 'Issued', itemStyle: { color: '#22c55e' } },
          { value: pending, name: 'Pending', itemStyle: { color: '#f59e0b' } },
        ],
      }],
    };
  });

  readonly issuanceBarOptions = computed<EChartsOption>(() => {
    const sivs = [...this.sivRows()].sort(
      (a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime()
    );
    const months = new Map<string, { value: number; items: number }>();
    for (const v of sivs) {
      const key = v.issueDate?.slice(0, 7) || 'Unknown';
      if (!months.has(key)) months.set(key, { value: 0, items: 0 });
      const m = months.get(key)!;
      m.value += v.totalValue;
      m.items += v.totalItems;
    }
    const labels = Array.from(months.keys());
    return {
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, textStyle: { fontSize: 11, color: '#64748b' } },
      grid: { left: 50, right: 16, top: 16, bottom: 44 },
      xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 10, color: '#94a3b8' } },
      yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => `$${(v / 1000).toFixed(0)}k` } },
      series: [
        { name: 'Total Value', type: 'bar', barWidth: '60%', data: labels.map(l => months.get(l)!.value), itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#6366f1' }, { offset: 1, color: '#818cf8' }]) as unknown as string, borderRadius: [6, 6, 0, 0] } },
      ],
    };
  });

  ngOnInit(): void {
    this.loadAllData();
  }

  private loadAllData(): void {
    this.isLoading.set(true);
    this.managerData.syncServiceRequests().subscribe(() => {
      this.approvedRows.set(this.managerData.requestRows('approved'));
      this.rejectedRows.set(this.managerData.requestRows('rejected'));
      this.allRequestRows.set(this.managerData.requestRows());
    });
    this.managerData.getSivs().subscribe((sivs) => {
      this.sivRows.set(sivs);
      this.isLoading.set(false);
    });
  }

  setActiveTab(tab: ReportTab): void { this.activeTab.set(tab); }

  navigateTo(path: string): void { void this.router.navigate([path]); }

  viewDetails(type: ReportTab, title: string): void {
    this.modalType.set(type);
    this.modalTitle.set(title);
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); }

  getStatusClass(status: string): string {
    if (status === 'Approved') return 'badge badge--success';
    if (status === 'Pending' || status === 'pending') return 'badge badge--warn';
    if (status === 'Rejected' || status === 'rejected') return 'badge badge--danger';
    return 'badge badge--default';
  }

  getStatusIcon(status: string): string {
    if (status === 'Approved' || status === 'Issued') return 'pi pi-check-circle';
    if (status === 'Pending' || status === 'pending') return 'pi pi-clock';
    if (status === 'Rejected' || status === 'rejected') return 'pi pi-times-circle';
    return 'pi pi-minus';
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  getAvatarColor(name: string): string {
    const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
    return `hsl(${hue}, 55%, 50%)`;
  }

  async downloadCurrentView(): Promise<void> {
    const tab = this.activeTab();
    const titles: Record<ReportTab, string> = { approval: 'Approval Report', requests: 'Department Request Report', issuance: 'Issuance Report' };
    const name = titles[tab];

    let details: ReportDetailRow[] = [{ label: 'Report', value: name }, { label: 'Generated', value: new Date().toLocaleString() }];

    if (tab === 'approval') {
      details.push({ label: 'Total Approvals', value: this.approvalStats().approved }, { label: 'Total Rejections', value: this.approvalStats().rejected }, { label: 'Approval Rate', value: `${this.approvalStats().rate}%` }, { label: 'Approved Value', value: `$${this.approvedRows().reduce((s, r) => s + r.estimatedValue, 0).toLocaleString()}` }, { label: 'Rejected Value', value: `$${this.rejectedRows().reduce((s, r) => s + r.estimatedValue, 0).toLocaleString()}` }, { label: 'Approved Requests', value: this.approvedRows().map(r => `${r.requestNumber} | ${r.requesterName} | $${r.estimatedValue.toLocaleString()}`).join('\n') || 'None' }, { label: 'Rejected Requests', value: this.rejectedRows().map(r => `${r.requestNumber} | ${r.requesterName} | $${r.estimatedValue.toLocaleString()}`).join('\n') || 'None' });
    } else if (tab === 'requests') {
      details.push({ label: 'Total Requests', value: this.requestStats().total }, { label: 'Pending', value: this.requestStats().pending }, { label: 'Approved', value: this.requestStats().approved }, { label: 'Total Value', value: `$${this.requestStats().value.toLocaleString()}` }, { label: 'Request Details', value: this.allRequestRows().map(r => `${r.requestNumber} | ${r.requesterName} | ${r.department} | ${r.status} | $${r.estimatedValue.toLocaleString()}`).join('\n') || 'None' });
    } else {
      details.push({ label: 'Total SIVs', value: this.issuanceStats().total }, { label: 'Total Items', value: this.issuanceStats().items }, { label: 'Total Value', value: `$${this.issuanceStats().value.toLocaleString()}` }, { label: 'SIV Details', value: this.sivRows().map(v => `${v.sivNumber} | ${v.requesterName} | ${v.department} | ${v.totalItems} items | $${v.totalValue.toLocaleString()}`).join('\n') || 'None' });
    }

    await downloadReportPdf(name, `${name} - ${new Date().toLocaleDateString()}`, details);
  }
}
