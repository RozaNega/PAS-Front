import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { ChartWidgetComponent } from '../../../shared/components/chart-widget/chart-widget.component';
import { KpiCard } from '../../../shared/models/pas.models';
import { DashboardStatistics, PasApiService } from '../../../shared/services/pas-api.service';

@Component({
  selector: 'app-pas-dashboard',
  standalone: true,
  imports: [CommonModule, ChartWidgetComponent],
  template: `
    <section class="rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 p-6 text-white shadow-lg">
      <h2 class="text-2xl font-bold">Welcome, {{ role() }}</h2>
      <p class="text-sm text-indigo-100">Real-time enterprise insights for your property portfolio.</p>
    </section>
    <section class="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
      @if (roleLabel() === 'Super Admin') {
        <p><strong>Super Admin View:</strong> Full system analytics, users, roles, approvals, and cross-module operational insight.</p>
      } @else if (roleLabel() === 'Admin') {
        <p><strong>Admin View:</strong> Daily operations, property/user maintenance, and workflow health monitoring.</p>
      } @else if (roleLabel() === 'Property Manager') {
        <p><strong>Property Manager View:</strong> Property updates, service requests, and location-based execution tasks.</p>
      } @else if (roleLabel() === 'Tenant') {
        <p><strong>Tenant View:</strong> Your requests, statuses, and activity history in a simplified workspace.</p>
      } @else {
        <p><strong>Guest View:</strong> Read-only snapshot of platform information and limited actions.</p>
      }
    </section>

    <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      @for (kpi of kpis(); track kpi.label) {
        <article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs uppercase text-slate-500">{{ kpi.label }}</p>
          <h3 class="mt-1 text-2xl font-bold text-slate-900">{{ kpi.value }}</h3>
          <p class="mt-1 text-xs text-emerald-600">{{ kpi.delta }}</p>
        </article>
      }
    </section>

    <section class="grid gap-4 xl:grid-cols-2">
      <app-chart-widget title="Stock Movements (Line)" [options]="lineChart()" />
      <app-chart-widget title="Requisitions (Bar)" [options]="barChart()" />
      <app-chart-widget title="Properties by Location (Pie)" [options]="pieChart()" />
      <app-chart-widget title="Daily Created Properties (Area)" [options]="areaChart()" />
    </section>

    <section class="grid gap-4 xl:grid-cols-2">
      <article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 class="mb-3 font-semibold text-slate-700">Notifications</h3>
        <ul class="space-y-2 text-sm">
          @for (task of stats()?.pendingTasks?.slice(0, 3) ?? []; track task.id) {
            <li class="rounded-lg bg-slate-50 p-2">{{ task.description }} ({{ task.priority }})</li>
          }
        </ul>
      </article>
      <article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 class="mb-3 font-semibold text-slate-700">Activity Timeline</h3>
        <ol class="space-y-2 text-sm">
          @for (activity of stats()?.recentActivities?.slice(0, 3) ?? []; track activity.id) {
            <li>{{ activity.timeAgo }} - {{ activity.action }} {{ activity.entityName }} by {{ activity.userName }}</li>
          }
        </ol>
      </article>
    </section>
  `,
})
export class PasDashboardComponent {
  private readonly auth = inject(AuthService);
  private readonly api = inject(PasApiService);
  protected readonly stats = signal<DashboardStatistics | null>(null);
  protected readonly role = computed(() => this.auth.getCurrentUser()?.roles?.[0] ?? 'Guest');
  protected readonly roleLabel = computed(() => {
    const role = this.role().toLowerCase();
    if (role.includes('super')) return 'Super Admin';
    if (role.includes('admin')) return 'Admin';
    if (role.includes('manager')) return 'Property Manager';
    if (role.includes('tenant') || role.includes('employee') || role.includes('user')) return 'Tenant';
    return 'Guest';
  });
  protected readonly kpis = computed<KpiCard[]>(() => this.baseKpis(this.stats()));

  protected readonly lineChart = computed(() => this.toLineChart(this.stats()?.stockMovementsByMonth ?? []));
  protected readonly barChart = computed(() => this.toBarChart(this.stats()?.requisitionsByStatus ?? []));
  protected readonly pieChart = computed(() => this.toPieChart(this.stats()?.propertiesByLocationChart ?? []));
  protected readonly areaChart = computed(() => this.toAreaChart(this.stats()?.dailyCreatedProperties ?? []));

  constructor() {
    this.api.dashboardStatistics().subscribe({
      next: (data) => this.stats.set(data),
      error: () => this.stats.set(null),
    });
  }

  private baseKpis(stats: DashboardStatistics | null): KpiCard[] {
    return [
      { label: 'Total Employees', value: String(stats?.totalEmployees ?? 0), delta: 'Live backend metrics' },
      { label: 'Total Stock Value', value: `$${Number(stats?.totalStockValue ?? 0).toLocaleString()}`, delta: 'Inventory valuation' },
      { label: 'Properties', value: String(stats?.totalProperties ?? 0), delta: 'Total registered properties' },
      { label: 'Low Stock Alerts', value: String(stats?.lowStockItemsCount ?? 0), delta: 'Requires attention' },
    ];
  }

  private toLineChart(data: Array<{ label: string; value: number }>): Record<string, unknown> {
    return {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: data.map((d) => d.label) },
      yAxis: { type: 'value' },
      series: [{ type: 'line', smooth: true, areaStyle: {}, data: data.map((d) => d.value) }],
    };
  }

  private toBarChart(data: Array<{ label: string; value: number }>): Record<string, unknown> {
    return {
      xAxis: { type: 'category', data: data.map((d) => d.label) },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: data.map((d) => d.value), itemStyle: { borderRadius: [6, 6, 0, 0] } }],
    };
  }

  private toPieChart(data: Array<{ label: string; value: number }>): Record<string, unknown> {
    return {
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [{ type: 'pie', radius: ['48%', '72%'], data: data.map((d) => ({ name: d.label, value: d.value })) }],
    };
  }

  private toAreaChart(data: Array<{ label: string; value: number }>): Record<string, unknown> {
    return {
      xAxis: { type: 'category', data: data.map((d) => d.label) },
      yAxis: { type: 'value' },
      series: [{ type: 'line', areaStyle: {}, data: data.map((d) => d.value) }],
    };
  }
}
