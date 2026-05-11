import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceRequestService } from '../../../../features/requisition/service-requests/services/service-request.service';
import { ServiceRequestDetail, ServiceRequestTimeline, ServiceRequestActivity, CancelServiceRequestRequest } from '../../../../features/requisition/service-requests/models/service-request.model';

interface Request {
  id: string;
  srNumber: string;
  title?: string;
  description?: string;
  priority?: string;
  status: string;
  approvedDate?: string;
  canCancel: boolean;
  currentStep: number;
  totalSteps: number;
  estimatedCompletion?: string;
  currentApprover?: string;
  items: RequestItem[];
  activityLog: ActivityLogEntry[];
}

interface RequestItem {
  name: string;
  quantity: number;
  status: string;
  expectedDate: string;
}

interface ActivityLogEntry {
  timestamp: string;
  action: string;
  performedBy: string;
}

@Component({
  selector: 'app-approved-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './approved-requests.component.html',
  styleUrls: ['./approved-requests.component.scss']
})
export class ApprovedRequestsComponent implements OnInit {
  private serviceRequestService = inject(ServiceRequestService);
  
  protected readonly requests = signal<Request[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  
  // Track request data
  protected readonly trackingData = signal<{[key: string]: { timeline?: ServiceRequestTimeline, activity?: ServiceRequestActivity[] }}>({});
  protected readonly isLoadingTracking = signal<string | null>(null);
  protected readonly trackingError = signal<string | null>(null);

  protected readonly expandedRequest = signal<string | null>(null);
  protected readonly showCancelConfirm = signal<string | null>(null);
  protected readonly showCancelSuccess = signal<string | null>(null);
  protected readonly cancelReason = signal('');
  protected readonly notifyApprover = signal(true);
  protected readonly sendEmailConfirmation = signal(true);
  protected readonly newComment = signal('');

  protected showCancelConfirmation(requestId: string): void {
    console.log('Show cancel confirmation clicked for request:', requestId);
    this.showCancelConfirm.set(requestId);
    this.cancelReason.set('');
    this.notifyApprover.set(true);
    this.sendEmailConfirmation.set(true);
    console.log('Cancel confirmation shown for:', requestId);
  }

  protected hideCancelConfirmation(): void {
    this.showCancelConfirm.set(null);
  }

  protected isCancelConfirmShown(requestId: string): boolean {
    return this.showCancelConfirm() === requestId;
  }

  protected cancelRequest(requestId: string): void {
    const request: CancelServiceRequestRequest = {
      id: requestId,
      reason: this.cancelReason() || undefined,
      notifyApprover: this.notifyApprover(),
      sendEmailConfirmation: this.sendEmailConfirmation()
    };

    this.serviceRequestService.cancelServiceRequest(request).subscribe({
      next: () => {
        // Remove the request from the list
        const requests = this.requests();
        const index = requests.findIndex(r => r.id === requestId);
        if (index !== -1) {
          const updatedRequests = [...requests];
          updatedRequests.splice(index, 1);
          this.requests.set(updatedRequests);
        }
        this.showCancelConfirm.set(null);
        this.showCancelSuccess.set(requestId);
      },
      error: (err) => {
        console.error('Error cancelling request:', err);
        alert('Failed to cancel request. Please try again.');
      }
    });
  }

  protected hideCancelSuccess(): void {
    this.showCancelSuccess.set(null);
  }

  protected isCancelSuccessShown(requestId: string): boolean {
    return this.showCancelSuccess() === requestId;
  }

  protected canCancelRequest(status: string): boolean {
    return status === 'Draft' || status === 'Pending';
  }

  protected getStepStatusClass(step: number, currentStep: number, totalSteps: number): string {
    if (step < currentStep) return 'step-completed';
    if (step === currentStep) return 'step-current';
    return 'step-pending';
  }

  protected getStepWidth(totalSteps: number): number {
    return 100 / totalSteps;
  }

  ngOnInit(): void {
    this.loadRequests();
  }

  private loadRequests(): void {
    this.isLoading.set(true);
    this.error.set(null);
    
    this.serviceRequestService.getServiceRequests().subscribe({
      next: (response) => {
        const mappedRequests: Request[] = response.data.items.map(sr => ({
          id: sr.id,
          srNumber: sr.srNumber,
          status: sr.status,
          canCancel: sr.status === 'Draft' || sr.status === 'Pending',
          currentStep: this.getCurrentStepFromStatus(sr.status),
          totalSteps: 5,
          items: [],
          activityLog: []
        }));
        this.requests.set(mappedRequests);
        this.isLoading.set(false);
        console.log('Loaded requests:', mappedRequests);
      },
      error: (err) => {
        this.error.set('Failed to load requests');
        this.isLoading.set(false);
        console.error('Error loading requests:', err);
      }
    });
  }

  private getCurrentStepFromStatus(status: string): number {
    const statusMap: { [key: string]: number } = {
      'Draft': 1,
      'Pending': 2,
      'Approved': 3,
      'Issued': 4,
      'Completed': 5,
      'Rejected': 2
    };
    return statusMap[status] || 1;
  }

  protected toggleTracking(requestId: string): void {
    if (this.expandedRequest() === requestId) {
      this.expandedRequest.set(null);
    } else {
      this.expandedRequest.set(requestId);
      this.loadTrackingData(requestId);
    }
  }

  private loadTrackingData(requestId: string): void {
    this.isLoadingTracking.set(requestId);
    this.trackingError.set(null);
    
    // Load timeline and activity in parallel
    this.serviceRequestService.getServiceRequestTimeline(requestId).subscribe({
      next: (response) => {
        const current = this.trackingData();
        this.trackingData.set({
          ...current,
          [requestId]: { ...current[requestId], timeline: response.data }
        });
        this.isLoadingTracking.set(null);
      },
      error: (err) => {
        console.error('Error loading timeline:', err);
        this.trackingError.set('Failed to load timeline');
        this.isLoadingTracking.set(null);
      }
    });

    this.serviceRequestService.getServiceRequestActivity(requestId).subscribe({
      next: (response) => {
        const current = this.trackingData();
        this.trackingData.set({
          ...current,
          [requestId]: { ...current[requestId], activity: response.data }
        });
      },
      error: (err) => {
        console.error('Error loading activity:', err);
      }
    });
  }

  protected isTrackingExpanded(requestId: string): boolean {
    return this.expandedRequest() === requestId;
  }

  protected getTrackingData(requestId: string) {
    return this.trackingData()[requestId];
  }

  protected addComment(requestId: string): void {
    if (this.newComment().trim()) {
      this.serviceRequestService.addServiceRequestComment(requestId, this.newComment()).subscribe({
        next: () => {
          this.newComment.set('');
          // Reload activity log to show new comment
          this.loadTrackingData(requestId);
        },
        error: (err) => {
          console.error('Error adding comment:', err);
          alert('Failed to add comment');
        }
      });
    }
  }
}
