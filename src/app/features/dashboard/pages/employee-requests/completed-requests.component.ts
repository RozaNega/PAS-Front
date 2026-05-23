import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrossRoleService, FlowRequest } from '../../../../core/services/cross-role.service';
import { CurrentUserService } from '../../../../core/services/current-user.service';

interface Request {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  completedDate: string;
  sivNumber: string;
}

@Component({
  selector: 'app-completed-requests',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './completed-requests.component.html',
  styleUrls: ['./completed-requests.component.scss'],
})
export class CompletedRequestsComponent implements OnInit {
  private readonly crossRoleService = inject(CrossRoleService);
  private readonly currentUserService = inject(CurrentUserService);

  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly requests = signal<Request[]>([]);

  ngOnInit(): void {
    this.loadRequests();
  }

  private loadRequests(): void {
    const user = this.currentUserService.getCurrentUserValue();
    const employeeId = user?.id ?? '';
    const identity = user
      ? { username: user.username, fullName: user.fullName, email: user.email }
      : undefined;

    this.isLoading.set(true);
    this.error.set(null);

    this.crossRoleService.getRequestsForEmployee(employeeId, identity, 'Issued').subscribe({
      next: (flowRequests: FlowRequest[]) => {
        const mapped: Request[] = flowRequests.map((r) => ({
          id: r.srNumber,
          title: r.purpose,
          description: `Issued: ${r.issuedQuantity} of ${r.totalQuantity} | Approved by: ${r.approvedByName ?? 'N/A'}`,
          priority: r.urgency,
          status: r.status,
          completedDate: r.requestDate,
          sivNumber: 'View SIVs',
        }));
        this.requests.set(mapped);
        this.crossRoleService.syncToWorkflow(flowRequests);
        this.isLoading.set(false);
      },
      error: (err: unknown) => {
        this.error.set('Failed to load completed requests. Please try again.');
        this.isLoading.set(false);
        console.error('[CompletedRequestsComponent] Error loading requests:', err);
      },
    });
  }
}
