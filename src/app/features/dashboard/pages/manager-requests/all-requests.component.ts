import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  ManagerDataService,
  ManagerRequestRow,
} from '../../../../core/services/manager-data.service';

@Component({
  selector: 'app-all-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './all-requests.component.html',
  styleUrls: ['./_requests-common.scss']
})
export class AllRequestsComponent implements OnInit {
  private readonly managerData = inject(ManagerDataService);
  private readonly router = inject(Router);

  protected readonly title = 'All Requests';
  protected readonly subtitle = 'View all service requests in the system';
  protected readonly requests = signal<ManagerRequestRow[]>([]);

  get totalCount(): number { return this.requests().length; }
  get pendingCount(): number { return this.requests().filter(r => r.status === 'Pending').length; }
  get approvedCount(): number { return this.requests().filter(r => r.status === 'Approved').length; }
  get rejectedCount(): number { return this.requests().filter(r => r.status === 'Rejected').length; }
  get issuedCount(): number { return this.requests().filter(r => r.status === 'Issued').length; }

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.managerData.syncServiceRequests().subscribe(() => {
      this.requests.set(this.managerData.requestRows());
    });
  }

  navigateTo(path: string): void {
    void this.router.navigate([path]);
  }

  getPriorityClass(p: string): string {
    if (p === 'Urgent') return 'td-priority td-priority--urgent';
    if (p === 'High') return 'td-priority td-priority--high';
    if (p === 'Medium') return 'td-priority td-priority--medium';
    return 'td-priority td-priority--low';
  }

  getStatusClass(s: string): string {
    if (s === 'Pending') return 'status-badge status-badge--pending';
    if (s === 'Approved') return 'status-badge status-badge--approved';
    if (s === 'Rejected') return 'status-badge status-badge--rejected';
    if (s === 'Issued') return 'status-badge status-badge--issued';
    return 'status-badge';
  }
}
