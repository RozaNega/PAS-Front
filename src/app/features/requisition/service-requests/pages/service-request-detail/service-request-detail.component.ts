import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ServiceRequestService, ServiceRequestDetailDto } from '../../services/service-request.service';
import { StoreIssueVoucherService } from '../../../sivs/services/siv.service';

@Component({
  selector: 'app-service-request-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './service-request-detail.component.html',
  styleUrls: ['./service-request-detail.component.scss']
})
export class ServiceRequestDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly serviceRequestService = inject(ServiceRequestService);
  private readonly sivService = inject(StoreIssueVoucherService);

  serviceRequest = signal<ServiceRequestDetailDto | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  
  // Action states
  showApprovalModal = signal(false);
  showRejectionModal = signal(false);
  showCommentModal = signal(false);
  showIssueModal = signal(false);
  
  // Form data
  approvalRemarks = signal('');
  rejectionReason = signal('');
  newComment = signal('');
  
  requestId = '';

  ngOnInit(): void {
    this.requestId = this.route.snapshot.paramMap.get('id') || '';
    if (this.requestId) {
      this.loadServiceRequest();
    } else {
      this.router.navigate(['/admin/requisitions']);
    }
  }

  loadServiceRequest(): void {
    this.loading.set(true);
    this.error.set(null);

    console.log('=== SERVICE REQUEST DETAIL DEBUG ===');
    console.log('Loading service request ID:', this.requestId);
    console.log('===================================');

    this.serviceRequestService.getById(this.requestId).subscribe({
      next: (response) => {
        console.log('=== SERVICE REQUEST DETAIL RESPONSE ===');
        console.log('Response:', JSON.stringify(response, null, 2));
        console.log('======================================');
        
        if (response.success && response.data) {
          this.serviceRequest.set(response.data);
        } else {
          this.error.set(response.message || 'Failed to load service request details');
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('=== SERVICE REQUEST DETAIL ERROR ===');
        console.error('Full error object:', err);
        console.error('====================================');
        
        let errorMessage = 'Failed to load service request details. Please try again.';
        
        if (err.error) {
          if (err.error.message) {
            errorMessage = err.error.message;
          } else if (err.error.title) {
            errorMessage = err.error.title;
          } else if (typeof err.error === 'string') {
            errorMessage = err.error;
          }
        }
        
        if (err.status) {
          errorMessage = `[${err.status} ${err.statusText}] ${errorMessage}`;
        }
        
        this.error.set(errorMessage);
        this.loading.set(false);
      }
    });
  }

  // Navigation
  goBack(): void {
    this.router.navigate(['/admin/requisitions']);
  }

  editRequest(): void {
    this.router.navigate(['/admin/requisitions', this.requestId, 'edit']);
  }

  // Approval Actions
  openApprovalModal(): void {
    this.approvalRemarks.set('');
    this.showApprovalModal.set(true);
  }

  closeApprovalModal(): void {
    this.showApprovalModal.set(false);
    this.approvalRemarks.set('');
  }

  approveRequest(): void {
    const remarks = this.approvalRemarks().trim();
    
    this.serviceRequestService.approve({
      id: this.requestId,
      remarks: remarks || 'Approved via admin panel'
    }).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Service request approved successfully');
          this.closeApprovalModal();
          this.loadServiceRequest();
        } else {
          alert('Failed to approve request: ' + response.message);
        }
      },
      error: (err) => {
        console.error('Error approving request:', err);
        alert('Failed to approve request. Please try again.');
      }
    });
  }

  // Rejection Actions
  openRejectionModal(): void {
    this.rejectionReason.set('');
    this.showRejectionModal.set(true);
  }

  closeRejectionModal(): void {
    this.showRejectionModal.set(false);
    this.rejectionReason.set('');
  }

  rejectRequest(): void {
    const reason = this.rejectionReason().trim();
    
    if (!reason) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    this.serviceRequestService.reject({
      id: this.requestId,
      reason: reason
    }).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Service request rejected successfully');
          this.closeRejectionModal();
          this.loadServiceRequest();
        } else {
          alert('Failed to reject request: ' + response.message);
        }
      },
      error: (err) => {
        console.error('Error rejecting request:', err);
        alert('Failed to reject request. Please try again.');
      }
    });
  }

  // Comment Actions
  openCommentModal(): void {
    this.newComment.set('');
    this.showCommentModal.set(true);
  }

  closeCommentModal(): void {
    this.showCommentModal.set(false);
    this.newComment.set('');
  }

  addComment(): void {
    const comment = this.newComment().trim();
    
    if (!comment) {
      alert('Please enter a comment');
      return;
    }
    
    this.serviceRequestService.addComment(this.requestId, comment).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Comment added successfully');
          this.closeCommentModal();
          this.loadServiceRequest();
        } else {
          alert('Failed to add comment: ' + response.message);
        }
      },
      error: (err) => {
        console.error('Error adding comment:', err);
        alert('Failed to add comment. Please try again.');
      }
    });
  }

  // Issue Actions
  openIssueModal(): void {
    this.showIssueModal.set(true);
  }

  closeIssueModal(): void {
    this.showIssueModal.set(false);
  }

  issueRequest(): void {
    const request = this.serviceRequest();
    if (!request) return;

    // Create issue request with all items at requested quantities
    const issueData = {
      id: this.requestId,
      items: request.items.map(item => ({
        srDetailId: item.id,
        issuedQty: item.requestedQty,
        shelfId: item.shelfId
      }))
    };

    this.serviceRequestService.issue(issueData).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Service request issued successfully. SIV created.');
          this.closeIssueModal();
          this.loadServiceRequest();
          
          // Navigate to SIV if ID is returned
          if (response.data) {
            this.router.navigate(['/admin/sivs', response.data]);
          }
        } else {
          alert('Failed to issue request: ' + response.message);
        }
      },
      error: (err) => {
        console.error('Error issuing request:', err);
        alert('Failed to issue request. Please try again.');
      }
    });
  }

  // Delete Action
  deleteRequest(): void {
    if (confirm('Are you sure you want to delete this service request? This action cannot be undone.')) {
      this.serviceRequestService.delete(this.requestId).subscribe({
        next: (response) => {
          if (response.success) {
            alert('Service request deleted successfully');
            this.router.navigate(['/admin/requisitions']);
          } else {
            alert('Failed to delete request: ' + response.message);
          }
        },
        error: (err) => {
          console.error('Error deleting request:', err);
          alert('Failed to delete request. Please try again.');
        }
      });
    }
  }

  // Print/Export Actions
  printRequest(): void {
    window.print();
  }

  exportRequest(format: string): void {
    console.log(`Exporting service request as ${format}...`);
    alert(`Export as ${format} - Feature coming soon!`);
  }

  // Timeline and Activity
  viewTimeline(): void {
    this.serviceRequestService.getTimeline(this.requestId).subscribe({
      next: (response) => {
        console.log('Timeline:', response);
        // TODO: Show timeline in modal or navigate to timeline page
        alert('Timeline feature - Coming soon!');
      },
      error: (err) => {
        console.error('Error loading timeline:', err);
        alert('Failed to load timeline');
      }
    });
  }

  viewActivity(): void {
    this.serviceRequestService.getActivity(this.requestId).subscribe({
      next: (response) => {
        console.log('Activity:', response);
        // TODO: Show activity in modal or navigate to activity page
        alert('Activity log feature - Coming soon!');
      },
      error: (err) => {
        console.error('Error loading activity:', err);
        alert('Failed to load activity log');
      }
    });
  }

  // Utility Methods
  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'badge-warning';
      case 'approved':
        return 'badge-success';
      case 'rejected':
        return 'badge-danger';
      case 'completed':
        return 'badge-info';
      case 'issued':
        return 'badge-primary';
      default:
        return 'badge-secondary';
    }
  }

  getUrgencyClass(urgency: string): string {
    switch (urgency?.toLowerCase()) {
      case 'critical':
        return 'badge-danger';
      case 'urgent':
        return 'badge-warning';
      case 'high':
        return 'badge-warning';
      case 'normal':
        return 'badge-success';
      case 'low':
        return 'badge-secondary';
      default:
        return 'badge-secondary';
    }
  }

  formatDate(date: string | Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  canApprove(): boolean {
    const request = this.serviceRequest();
    return request?.status?.toLowerCase() === 'pending';
  }

  canReject(): boolean {
    const request = this.serviceRequest();
    return request?.status?.toLowerCase() === 'pending';
  }

  canIssue(): boolean {
    const request = this.serviceRequest();
    return request?.status?.toLowerCase() === 'approved';
  }

  canEdit(): boolean {
    const request = this.serviceRequest();
    return request?.status?.toLowerCase() === 'pending';
  }

  canDelete(): boolean {
    const request = this.serviceRequest();
    const status = request?.status?.toLowerCase();
    return status === 'pending' || status === 'rejected';
  }
}