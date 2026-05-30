import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, take } from 'rxjs';
import { ServiceRequestService } from '../../../requisition/service-requests/services/service-request.service';
import {
  WorkflowService,
} from '../../../../core/services/workflow.service';
import { CurrentUserService } from '../../../../core/services/current-user.service';

interface Request {
  id: string;
  srNumber: string;
  status: string;
  submittedDate?: string;
  requester?: string;
  department?: string;
}

@Component({
  selector: 'app-pending-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pending-requests.component.html',
  styleUrls: ['./pending-requests.component.scss']
})
export class PendingRequestsComponent implements OnInit, OnDestroy {
  private readonly serviceRequestService = inject(ServiceRequestService);
  private readonly workflowService = inject(WorkflowService);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly subs: Subscription[] = [];

  protected readonly requests = signal<Request[]>([]);
  protected readonly searchTerm = signal('');
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.syncFromApi();
    this.subs.push(
      this.workflowService.getRequestUpdates().subscribe(() => this.loadRequests()),
      this.workflowService.getNotificationUpdates().subscribe(() => this.loadRequests()),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  private syncFromApi(): void {
    this.loading.set(true);
    this.error.set(null);
    this.serviceRequestService
      .getServiceRequests()
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          const items = this.workflowService.extractApiServiceRequestRows(res);
          const user = this.currentUserService.getCurrentUserValue();
          this.workflowService.mergeApiServiceRequests(items, {
            managerQueueId: this.workflowService.getManagerQueueIdForCurrentUser(),
            employeeIdFilter: this.currentUserService.getUserId() || undefined,
            employeeIdentity: {
              email: user?.email,
              fullName: user?.fullName,
              username: user?.username,
              employeeCode: user?.employeeCode,
            },
          });
          this.loadRequests();
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load requests.');
          this.loading.set(false);
        },
      });
  }

  private loadRequests(): void {
    const currentUser = this.currentUserService.getCurrentUserValue();
    const employeeKeys = [
      this.currentUserService.getUserId(),
      currentUser?.email,
      currentUser?.fullName,
      currentUser?.username,
      currentUser?.employeeCode,
    ].filter((v): v is string => !!v);

    const pending = this.workflowService.getAllRequests().filter((sr) => {
      if (sr.status !== 'Submitted' && sr.status !== 'Under Review') return false;
      return employeeKeys.includes(sr.employeeId) ||
        employeeKeys.includes(sr.employeeEmail) ||
        employeeKeys.includes(sr.employeeName);
    });

    this.requests.set(
      pending.map((sr) => ({
        id: sr.id,
        srNumber: sr.srNumber,
        status: sr.status,
        submittedDate: sr.submittedDate.toLocaleDateString(),
        requester: sr.employeeName || 'Unknown',
        department: sr.department || 'Unknown',
      })),
    );
  }

  protected get filteredRequests(): Request[] {
    const search = this.searchTerm().toLowerCase();
    return this.requests().filter(req =>
      req.srNumber.toLowerCase().includes(search) ||
      req.requester?.toLowerCase().includes(search) ||
      req.department?.toLowerCase().includes(search)
    );
  }

  protected cancelRequest(requestId: string): void {
    const confirmCancel = confirm('Are you sure you want to cancel this request? This action cannot be undone.');
    if (!confirmCancel) return;

    this.serviceRequestService.deleteServiceRequest(requestId).subscribe({
      next: () => {
        this.workflowService.getAllRequests().filter((r) => r.id !== requestId);
        this.loadRequests();
      },
      error: () => alert('Failed to cancel request. Please try again.'),
    });
  }
}
