import { CommonModule } from '@angular/common';
import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AdminDashboardService } from '../../../core/services/admin-dashboard.service';

Chart.register(...registerables);

interface KpiCard {
  icon: string;
  iconBg: string;
  label: string;
  value: string;
  trend?: number;
  trendUp?: boolean;
}

interface RecentActivity {
  action: string;
  module: string;
  timestamp: string;
  status: string;
  color: string;
}

interface QuickStat {
  label: string;
  value: string;
  percentage: number;
  color: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  userName = 'Admin';
  selectedChartPeriod: 'weekly' | 'monthly' | 'yearly' = 'monthly';

  kpiCards: KpiCard[] = [
    { icon: 'bi-people', iconBg: '#e8eaf6', label: 'Total Users', value: '1,234', trend: 12, trendUp: true },
    { icon: 'bi-file-earmark-text', iconBg: '#e0f2fe', label: 'Total Requests', value: '567', trend: 8, trendUp: true },
    { icon: 'bi-check-circle', iconBg: '#dcedc8', label: 'Approved', value: '423', trend: 5, trendUp: true },
    { icon: 'bi-x-circle', iconBg: '#fce4ec', label: 'Rejected', value: '89', trend: 3, trendUp: false },
  ];

  recentActivities: RecentActivity[] = [
    { action: 'New user registered', module: 'User Management', timestamp: '2 mins ago', status: 'Completed', color: '#4caf50' },
    { action: 'Request #1234 approved', module: 'Requests', timestamp: '15 mins ago', status: 'Approved', color: '#2196f3' },
    { action: 'Inventory updated', module: 'Inventory', timestamp: '1 hour ago', status: 'Updated', color: '#ff9800' },
  ];

  quickStats: QuickStat[] = [
    { label: 'System Uptime', value: '99.9%', percentage: 99, color: '#1a237e' },
    { label: 'Active Users', value: '892', percentage: 72, color: '#283593' },
    { label: 'Storage Used', value: '45%', percentage: 45, color: '#3949ab' },
    { label: 'Requests Today', value: '127', percentage: 63, color: '#5c6bc0' },
  ];

  private requestTrendsChart?: Chart;
  private categoryChart?: Chart;
  private userActivityChart?: Chart;
  private inventoryStatusChart?: Chart;
  private destroy$ = new Subject<void>();

  constructor(private adminDashboardService: AdminDashboardService) {}

  ngOnInit(): void {
    this.adminDashboardService.getDashboardData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.populateDashboardData(response.data);
          }
        },
      });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initializeCharts();
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.requestTrendsChart?.destroy();
    this.categoryChart?.destroy();
    this.userActivityChart?.destroy();
    this.inventoryStatusChart?.destroy();
  }

  private populateDashboardData(data: any): void {
    if (data.platform) {
      this.userName = data.platform.title || 'Admin';
    }
    if (data.highlights) {
      data.highlights.forEach((h: any, i: number) => {
        if (this.kpiCards[i]) {
          this.kpiCards[i].value = h.value;
          this.kpiCards[i].label = h.label;
        }
      });
    }
    if (data.recentActivities) {
      this.recentActivities = data.recentActivities;
    }
  }

  refreshDashboard(): void {
    this.adminDashboardService.getDashboardData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.populateDashboardData(response.data);
          }
        },
      });
  }

  exportReport(): void {
    console.log('Exporting report...');
  }

  viewAllActivities(): void {
    console.log('View all activities...');
  }

  private initializeCharts(): void {
    this.initRequestTrendsChart();
    this.initRequestsByCategoryChart();
    this.initUserActivityChart();
    this.initInventoryStatusChart();
  }

  private initRequestTrendsChart(): void {
    const canvas = document.getElementById('requestTrendsChart') as HTMLCanvasElement;
    if (!canvas) return;
    this.requestTrendsChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          { label: 'Requests', data: [65, 78, 52, 91, 84, 45, 33], backgroundColor: '#1a237e', borderRadius: 4 },
          { label: 'Approved', data: [45, 62, 38, 71, 65, 32, 25], backgroundColor: '#4caf50', borderRadius: 4 },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
    });
  }

  private initRequestsByCategoryChart(): void {
    const canvas = document.getElementById('requestsByCategoryChart') as HTMLCanvasElement;
    if (!canvas) return;
    this.categoryChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['IT', 'HR', 'Finance', 'Operations', 'Other'],
        datasets: [{ data: [35, 25, 20, 15, 5], backgroundColor: ['#1a237e', '#283593', '#3949ab', '#5c6bc0', '#7986cb'] }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
    });
  }

  private initUserActivityChart(): void {
    const canvas = document.getElementById('userActivityChart') as HTMLCanvasElement;
    if (!canvas) return;
    this.userActivityChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [
          { label: 'Active Users', data: [420, 480, 510, 560], borderColor: '#1a237e', fill: false, tension: 0.4 },
          { label: 'New Users', data: [45, 52, 48, 63], borderColor: '#4caf50', fill: false, tension: 0.4 },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
    });
  }

  private initInventoryStatusChart(): void {
    const canvas = document.getElementById('inventoryStatusChart') as HTMLCanvasElement;
    if (!canvas) return;
    this.inventoryStatusChart = new Chart(canvas, {
      type: 'polarArea',
      data: {
        labels: ['In Stock', 'Low Stock', 'Out of Stock', 'Reserved'],
        datasets: [{ data: [450, 75, 25, 120], backgroundColor: ['#4caf50', '#ff9800', '#f44336', '#2196f3'] }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
    });
  }
}
