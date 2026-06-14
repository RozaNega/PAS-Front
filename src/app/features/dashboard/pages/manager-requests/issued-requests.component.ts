import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  ManagerDataService,
  ManagerRequestRow,
} from '../../../../core/services/manager-data.service';

@Component({
  selector: 'app-issued-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './issued-requests.component.html',
  styleUrls: ['./_requests-common.scss']
})
export class IssuedRequestsComponent implements OnInit, OnDestroy {
  private readonly managerData = inject(ManagerDataService);
  private readonly router = inject(Router);
  private readonly subs: Subscription[] = [];

  protected readonly title = 'Issued Requests';
  protected readonly subtitle = 'Requests that have been fulfilled and issued';
  protected readonly requests = signal<ManagerRequestRow[]>([]);

  get totalCount(): number { return this.requests().length; }
  get totalValue(): number { return this.requests().reduce((s, r) => s + (r.estimatedValue || 0), 0); }

  ngOnInit(): void {
    this.loadRequests();
  }

  ngOnDestroy(): void {
    this.subs.forEach((sub) => sub.unsubscribe());
  }

  loadRequests(): void {
    this.subs.push(
      this.managerData.syncServiceRequests().subscribe(() => {
        this.requests.set(this.managerData.requestRows('issued'));
      }),
    );
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
