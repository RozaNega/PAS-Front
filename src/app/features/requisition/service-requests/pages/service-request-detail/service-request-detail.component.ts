import { Component, OnInit, signal, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ServiceRequestService, ServiceRequestDetailDto } from '../../services/service-request.service';
import { WorkflowService } from '../../../../../core/services/workflow.service';

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
  private readonly workflowService = inject(WorkflowService);

  serviceRequest = signal<ServiceRequestDetailDto | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  notification = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  showApprovalModal = signal(false);
  showRejectionModal = signal(false);
  showCommentModal = signal(false);
  showIssueModal = signal(false);
  showTimelineModal = signal(false);
  showActivityModal = signal(false);
  showMoreMenu = signal(false);

  approvalRemarks = signal('');
  rejectionReason = signal('');
  newComment = signal('');
  timelineData = signal<any[]>([]);
  activityData = signal<any[]>([]);

  requestId = '';

  ngOnInit(): void {
    this.requestId = this.route.snapshot.paramMap.get('id') || '';
    if (this.requestId) {
      this.loadServiceRequest();
    } else {
      this.router.navigate(['/admin/requisitions']);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (!target.closest('.dropdown-wrapper')) {
      this.showMoreMenu.set(false);
    }
  }

  toggleMoreMenu(): void {
    this.showMoreMenu.update(v => !v);
  }

  loadServiceRequest(): void {
    this.loading.set(true);
    this.error.set(null);

    this.serviceRequestService.getById(this.requestId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const sr = response.data;
          const customSr = this.workflowService.getCustomSrNumber(this.requestId);
          if (customSr) {
            (sr as any).srNumber = customSr;
          }
          this.serviceRequest.set(sr);
        } else {
          this.error.set(response.message || 'Failed to load service request details');
        }
        this.loading.set(false);
      },
      error: (err) => {
        let errorMessage = 'Failed to load service request details.';
        if (err.error?.message) errorMessage = err.error.message;
        else if (err.error?.title) errorMessage = err.error.title;
        if (err.status) errorMessage = `[${err.status}] ${errorMessage}`;
        this.error.set(errorMessage);
        this.loading.set(false);
      }
    });
  }

  goBack(): void {
    window.history.back();
  }

  editRequest(): void {
    this.router.navigate(['/admin/requisitions', this.requestId, 'edit']);
  }

  // ─── Approval ───
  openApprovalModal(): void {
    this.approvalRemarks.set('');
    this.showApprovalModal.set(true);
  }

  closeApprovalModal(): void {
    this.showApprovalModal.set(false);
    this.approvalRemarks.set('');
  }

  approveRequest(): void {
    this.serviceRequestService.approve({
      id: this.requestId,
      remarks: this.approvalRemarks().trim() || 'Approved via admin panel'
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.notify('success', 'Service request approved successfully');
          this.closeApprovalModal();
          this.loadServiceRequest();
        } else {
          this.notify('error', 'Failed to approve: ' + (res.message || 'Server returned failure'));
        }
      },
      error: (err) => {
        let msg = 'Failed to approve request.';
        if (err?.error?.message) msg = err.error.message;
        else if (err?.error?.title) msg = err.error.title;
        if (err?.status) msg = `[${err.status}] ${msg}`;
        this.notify('error', msg);
      }
    });
  }

  // ─── Rejection ───
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
      this.notify('error', 'Please provide a reason for rejection');
      return;
    }

    this.serviceRequestService.reject({ id: this.requestId, reason }).subscribe({
      next: (res) => {
        if (res.success) {
          this.notify('success', 'Service request rejected');
          this.closeRejectionModal();
          this.loadServiceRequest();
        } else {
          this.notify('error', 'Failed to reject: ' + (res.message || 'Server returned failure'));
        }
      },
      error: (err) => {
        let msg = 'Failed to reject request.';
        if (err?.error?.message) msg = err.error.message;
        else if (err?.error?.title) msg = err.error.title;
        else if (err?.message) msg = err.message;
        if (err?.status) msg = `[${err.status}] ${msg}`;
        this.notify('error', msg);
      }
    });
  }

  // ─── Comment ───
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
      this.notify('error', 'Please enter a comment');
      return;
    }

    this.serviceRequestService.addComment(this.requestId, comment).subscribe({
      next: (res) => {
        if (res.success) {
          this.notify('success', 'Comment added successfully');
          this.closeCommentModal();
          this.loadServiceRequest();
        } else {
          this.notify('error', 'Failed: ' + res.message);
        }
      },
      error: () => this.notify('error', 'Failed to add comment')
    });
  }

  // ─── Issue ───
  openIssueModal(): void {
    this.showIssueModal.set(true);
  }

  closeIssueModal(): void {
    this.showIssueModal.set(false);
  }

  issueRequest(): void {
    const request = this.serviceRequest();
    if (!request) return;

    const issueData = {
      id: this.requestId,
      items: request.items.map(item => ({
        srDetailId: item.id,
        issuedQty: item.requestedQty,
        shelfId: item.shelfId
      }))
    };

    this.serviceRequestService.issue(issueData).subscribe({
      next: (res) => {
        if (res.success) {
          this.notify('success', 'Items issued successfully. SIV created.');
          this.closeIssueModal();
          this.loadServiceRequest();
          if (res.data) {
            this.router.navigate(['/admin/sivs', res.data]);
          }
        } else {
          this.notify('error', 'Failed: ' + res.message);
        }
      },
      error: () => this.notify('error', 'Failed to issue items')
    });
  }

  // ─── Delete ───
  deleteRequest(): void {
    this.showMoreMenu.set(false);
    if (!confirm('Are you sure you want to delete this service request? This cannot be undone.')) return;

    this.serviceRequestService.delete(this.requestId).subscribe({
      next: (res) => {
        if (res.success) {
          this.notify('success', 'Service request deleted');
          this.router.navigate(['/admin/requisitions']);
        } else {
          this.notify('error', 'Failed: ' + res.message);
        }
      },
      error: () => this.notify('error', 'Failed to delete request')
    });
  }

  // ─── Print ───
  printRequest(): void {
    this.showMoreMenu.set(false);
    window.print();
  }

  // ─── Export ───
  exportRequest(format: string): void {
    this.showMoreMenu.set(false);
    const sr = this.serviceRequest();
    if (!sr) return;

    const headers = ['Field', 'Value'];
    const rows = [
      ['SR Number', sr.srNumber],
      ['Status', sr.status],
      ['Urgency', sr.urgency || ''],
      ['Requester', sr.requesterName],
      ['Department', sr.department || ''],
      ['Date', sr.requestDate],
      ['Purpose', sr.purpose || ''],
      ['Notes', sr.notes || ''],
      ['Total Items', String(sr.totalItems)],
      ['Total Quantity', String(sr.totalQuantity)],
      ['Issued Quantity', String(sr.issuedQuantity || 0)],
    ];

    if (sr.items?.length) {
      rows.push(['', '']);
      rows.push(['--- Items ---', '']);
      rows.push(['Item', 'SKU | Unit | Requested | Issued | Pending']);
      sr.items.forEach(item => {
        rows.push([item.itemName, `${item.sku} | ${item.unitOfMeasure} | ${item.requestedQty} | ${item.issuedQty || 0} | ${item.pendingQty}`]);
      });
    }

    if (format === 'excel' || format === 'csv') {
      const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      this.download(csv, `SR-${sr.srNumber}.csv`, 'text/csv');
      this.notify('success', `Exported as CSV`);
    } else if (format === 'pdf') {
      const html = `<html><head><style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style></head><body>
        <h2>Service Request: ${sr.srNumber}</h2>
        <table>${rows.map(r => `<tr><td><strong>${r[0]}</strong></td><td>${r[1]}</td></tr>`).join('')}</table>
        </body></html>`;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (w) { w.onload = () => { w.print(); }; }
      URL.revokeObjectURL(url);
      this.notify('success', 'PDF ready for print');
    }
  }

  private download(content: string, filename: string, mime: string): void {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Timeline ───
  viewTimeline(): void {
    this.showMoreMenu.set(false);
    this.serviceRequestService.getTimeline(this.requestId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.timelineData.set(Array.isArray(res.data) ? res.data : []);
        } else {
          this.timelineData.set([]);
        }
        this.showTimelineModal.set(true);
      },
      error: () => {
        this.timelineData.set([]);
        this.showTimelineModal.set(true);
      }
    });
  }

  closeTimelineModal(): void {
    this.showTimelineModal.set(false);
  }

  // ─── Activity ───
  viewActivity(): void {
    this.showMoreMenu.set(false);
    this.serviceRequestService.getActivity(this.requestId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.activityData.set(Array.isArray(res.data) ? res.data : []);
        } else {
          this.activityData.set([]);
        }
        this.showActivityModal.set(true);
      },
      error: () => {
        this.activityData.set([]);
        this.showActivityModal.set(true);
      }
    });
  }

  closeActivityModal(): void {
    this.showActivityModal.set(false);
  }

  // ─── Utility ───
  getStatusClass(status: string): string {
    const s = status?.toLowerCase();
    if (s === 'pending') return 'badge-warning';
    if (s === 'approved') return 'badge-success';
    if (s === 'rejected') return 'badge-danger';
    if (s === 'completed') return 'badge-info';
    if (s === 'issued') return 'badge-primary';
    return 'badge-secondary';
  }

  getUrgencyClass(urgency: string): string {
    const u = urgency?.toLowerCase();
    if (u === 'critical') return 'badge-danger';
    if (u === 'urgent' || u === 'high') return 'badge-warning';
    if (u === 'normal') return 'badge-success';
    return 'badge-secondary';
  }

  getStockVerificationCssClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'verified': return 'approved';
      case 'insufficient': return 'rejected';
      case 'pending': return 'pending';
      default: return 'pending';
    }
  }

  formatDate(date: string | Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  canApprove(): boolean {
    const sr = this.serviceRequest();
    if (!sr || sr.status?.toLowerCase() !== 'pending') return false;
    return sr.stockVerificationStatus === 'Verified';
  }
  showStockPendingHint(): boolean {
    const sr = this.serviceRequest();
    return !!sr && sr.status?.toLowerCase() === 'pending' && sr.stockVerificationStatus !== 'Verified';
  }
  canReject(): boolean { return this.serviceRequest()?.status?.toLowerCase() === 'pending'; }
  canIssue(): boolean { return this.serviceRequest()?.status?.toLowerCase() === 'approved'; }
  canEdit(): boolean { return this.serviceRequest()?.status?.toLowerCase() === 'pending'; }
  canDelete(): boolean {
    const s = this.serviceRequest()?.status?.toLowerCase();
    return s === 'pending' || s === 'rejected';
  }

  private notify(type: 'success' | 'error', message: string): void {
    this.notification.set({ type, message });
    setTimeout(() => this.notification.set(null), 5000);
  }
}
