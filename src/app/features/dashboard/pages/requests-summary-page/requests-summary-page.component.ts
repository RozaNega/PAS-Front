import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ServiceRequest,
  WorkflowService,
  WORKFLOW_APPROVED_ACTIVE_STATUSES,
  WORKFLOW_APPROVED_STATUSES,
  WORKFLOW_PENDING_STATUSES,
  WORKFLOW_REJECTED_STATUSES,
} from '../../../../core/services/workflow.service';
import { CurrentUserService } from '../../../../core/services/current-user.service';
import { Subscription, take } from 'rxjs';
import { ServiceRequestService } from '../../../requisition/service-requests/services/service-request.service';

export interface RequestStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  completed: number;
  urgent: number;
}

export interface MonthlyData {
  month: string;
  count: number;
}

export interface ValueSummary {
  totalValue: string;
  averageValue: string;
  highestValue: string;
  highestValueRequest: string;
}

@Component({
  selector: 'app-requests-summary-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './requests-summary-page.component.html',
  styleUrls: ['./requests-summary-page.component.scss'],
})
export class RequestsSummaryPageComponent implements OnInit, OnDestroy {
  private readonly workflowService = inject(WorkflowService);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly serviceRequestService = inject(ServiceRequestService);
  private requestSub?: Subscription;
  readonly summaryYear = new Date().getFullYear();
  private readonly valueFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  stats: RequestStats = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    completed: 0,
    urgent: 0,
  };

  monthlyData: MonthlyData[] = [
    { month: 'Jan', count: 0 },
    { month: 'Feb', count: 0 },
    { month: 'Mar', count: 0 },
    { month: 'Apr', count: 0 },
    { month: 'May', count: 0 },
    { month: 'Jun', count: 0 },
    { month: 'Jul', count: 0 },
    { month: 'Aug', count: 0 },
    { month: 'Sep', count: 0 },
    { month: 'Oct', count: 0 },
    { month: 'Nov', count: 0 },
    { month: 'Dec', count: 0 },
  ];

  valueSummary: ValueSummary = {
    totalValue: '$0',
    averageValue: '$0',
    highestValue: '$0',
    highestValueRequest: 'N/A',
  };

  get approvedPercentage(): number {
    return this.stats.total === 0 ? 0 : Math.round((this.stats.approved / this.stats.total) * 100);
  }

  get pendingPercentage(): number {
    return this.stats.total === 0 ? 0 : Math.round((this.stats.pending / this.stats.total) * 100);
  }

  get rejectedPercentage(): number {
    return this.stats.total === 0 ? 0 : Math.round((this.stats.rejected / this.stats.total) * 100);
  }

  ngOnInit(): void {
    this.syncFromApi();
    this.recomputeStats();

    this.requestSub = this.workflowService.getRequestUpdates().subscribe(() => {
      this.recomputeStats();
    });
  }

  get completedPercentage(): number {
    return this.stats.total === 0 ? 0 : Math.round((this.stats.completed / this.stats.total) * 100);
  }

  ngOnDestroy(): void {
    this.requestSub?.unsubscribe();
  }

  private syncFromApi(): void {
    this.serviceRequestService
      .getServiceRequests()
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          const items = this.workflowService.extractApiServiceRequestRows(res);
          const user = this.currentUserService.getCurrentUserValue();
          const employeeId = this.currentUserService.getUserId() || '';
          const identity = {
            email: user?.email,
            fullName: user?.fullName,
            username: user?.username,
            employeeCode: user?.employeeCode,
          };

          this.workflowService.mergeApiServiceRequests(items, {
            managerQueueId: this.workflowService.getAssignedManagerQueueId(),
            employeeIdFilter: employeeId,
            employeeIdentity: identity,
          });

          this.recomputeStats();
        },
        error: () => {},
      });
  }

  private recomputeStats(): void {
    const employeeId = this.currentUserService.getUserId() || '';
    const user = this.currentUserService.getCurrentUserValue();

    const requests = this.workflowService.getRequestsForEmployee(employeeId, {
      email: user?.email,
      fullName: user?.fullName,
      username: user?.username,
      employeeCode: user?.employeeCode,
    });
    const countedRequests = requests.filter((request) => this.isCountedRequest(request));
    const valueRequests = requests.filter((request) => this.isValuedRequest(request));

    this.stats.total = countedRequests.length;
    this.stats.pending = countedRequests.filter((request) =>
      WORKFLOW_PENDING_STATUSES.includes(request.status),
    ).length;
    this.stats.approved = countedRequests.filter((request) =>
      WORKFLOW_APPROVED_ACTIVE_STATUSES.includes(request.status),
    ).length;
    this.stats.rejected = countedRequests.filter((request) =>
      WORKFLOW_REJECTED_STATUSES.includes(request.status),
    ).length;
    this.stats.completed = countedRequests.filter(
      (request) => request.status === 'Completed',
    ).length;
    this.stats.urgent = countedRequests.filter((request) => request.priority === 'Urgent').length;

    const valueTotal = valueRequests.reduce(
      (sum, request) => sum + this.getRequestValue(request),
      0,
    );
    const highestValueRequest = valueRequests.reduce<ServiceRequest | null>(
      (currentHighest, request) => {
        if (!currentHighest) {
          return request;
        }

        return this.getRequestValue(request) > this.getRequestValue(currentHighest)
          ? request
          : currentHighest;
      },
      null,
    );

    this.valueSummary = {
      totalValue: this.formatCurrency(valueTotal),
      averageValue: this.formatCurrency(
        valueRequests.length ? valueTotal / valueRequests.length : 0,
      ),
      highestValue: this.formatCurrency(
        highestValueRequest ? this.getRequestValue(highestValueRequest) : 0,
      ),
      highestValueRequest: highestValueRequest?.srNumber || 'N/A',
    };

    const monthMap = new Map<string, number>();
    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
    countedRequests.forEach((request) => {
      const d = new Date(request.submittedDate);
      if (d.getFullYear() !== this.summaryYear) return;
      const m = monthFormatter.format(d);
      monthMap.set(m, (monthMap.get(m) || 0) + 1);
    });

    this.monthlyData = this.monthlyData.map((m) => ({
      month: m.month,
      count: monthMap.get(m.month) || 0,
    }));
  }

  private isCountedRequest(request: ServiceRequest): boolean {
    return request.status !== 'Draft' && request.status !== 'Cancelled';
  }

  private isValuedRequest(request: ServiceRequest): boolean {
    return WORKFLOW_APPROVED_STATUSES.includes(request.status);
  }

  private getRequestValue(request: ServiceRequest): number {
    const directValue = request.actualCost ?? request.estimatedCost;
    if (typeof directValue === 'number' && Number.isFinite(directValue)) {
      return directValue;
    }

    return request.items.reduce((sum, item) => {
      const lineTotal = item.totalCost ?? (item.unitCost ?? 0) * item.quantity;
      return sum + lineTotal;
    }, 0);
  }

  private formatCurrency(value: number): string {
    return this.valueFormatter.format(value);
  }
}
