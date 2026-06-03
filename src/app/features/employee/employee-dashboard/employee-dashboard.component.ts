import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { animate, style, transition, trigger } from '@angular/animations';
import { AuthService } from '../../../core/services/auth.service';
import { AdminDashboardService } from '../../../core/services/admin-dashboard.service';

interface DashboardData {
  platform?: any;
  liveAttendees?: any;
  highlights?: any[];
  summaryCards?: any[];
  recentActivities?: any[];
}

@Component({
  selector: 'app-employee-dashboard',
  templateUrl: './employee-dashboard.component.html',
  styleUrls: ['./employee-dashboard.component.scss'],
  standalone: false,
})
export class EmployeeDashboardComponent implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private dashboardService = inject(AdminDashboardService);

  isLoading = signal(true);
  error = signal<string | null>(null);
  currentUser: any = null;
  dashboardData: DashboardData | null = null;
  selectedChartPeriod: 'weekly' | 'monthly' | 'yearly' = 'monthly';

  summaryCards = [
    { label: 'Pending Requests', value: '12', icon: 'bi bi-clock', color: '#ff9800', bgColor: '#fff3e0', link: '/pending-requests' },
    { label: 'Approved Requests', value: '45', icon: 'bi bi-check-circle', color: '#4caf50', bgColor: '#e8f5e9', link: '/approved-requests' },
    { label: 'Rejected Requests', value: '3', icon: 'bi bi-x-circle', color: '#f44336', bgColor: '#fce4ec', link: '/rejected-requests' },
    { label: 'Total Requests', value: '60', icon: 'bi bi-file-earmark-text', color: '#2196f3', bgColor: '#e3f2fd', link: '/my-requests' },
  ];

  recentActivities: any[] = [
    { action: 'Request #5678 approved', module: 'Requests', timestamp: '30 mins ago', status: 'Approved', color: '#4caf50' },
    { action: 'New notification received', module: 'Notifications', timestamp: '1 hour ago', status: 'New', color: '#2196f3' },
  ];

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.dashboardService.getDashboardData()
      .pipe(
        catchError((err) => {
          this.error.set('Failed to load dashboard data. Please try again later.');
          return of(null);
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe((response) => {
        if (response?.success && response.data) {
          this.dashboardData = response.data;
          if (response.data.summaryCards) {
            this.summaryCards = response.data.summaryCards;
          }
          if (response.data.recentActivities) {
            this.recentActivities = response.data.recentActivities;
          }
        }
      });
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  createNewRequest(): void {
    this.router.navigate(['/create-request']);
  }

  viewAllActivities(): void {
    this.router.navigate(['/notifications']);
  }
}
