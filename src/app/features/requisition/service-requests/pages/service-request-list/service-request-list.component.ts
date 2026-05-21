import { Component, OnInit, signal, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ServiceRequestService, ServiceRequestDto } from '../../services/service-request.service';

@Component({
  selector: 'app-service-request-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './service-request-list.component.html',
  styleUrls: ['./service-request-list.component.scss']
})
export class ServiceRequestListComponent implements OnInit {
  private readonly serviceRequestService = inject(ServiceRequestService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly currentYear = new Date().getFullYear();

  private rowMatchesStatus(row: ServiceRequestDto, expected: string): boolean {
    return (row.status ?? '').toLowerCase() === expected.toLowerCase();
  }

  statusEquals(sr: ServiceRequestDto, expected: string): boolean {
    return this.rowMatchesStatus(sr, expected);
  }

  readonly statusCounts = computed(() => {
    const rows = this.serviceRequests();
    return {
      all: rows.length,
      pending: rows.filter((r) => this.rowMatchesStatus(r, 'Pending')).length,
      approved: rows.filter((r) => this.rowMatchesStatus(r, 'Approved')).length,
      rejected: rows.filter((r) => this.rowMatchesStatus(r, 'Rejected')).length,
      completed: rows.filter((r) => this.rowMatchesStatus(r, 'Completed')).length,
    };
  });
  
  searchTerm = signal('');
  statusFilter = signal('All');
  departmentFilter = signal('All');
  currentPage = signal(1);
  rowsPerPage = signal(10);
  loading = signal(false);
  error = signal<string | null>(null);
  
  serviceRequests = signal<ServiceRequestDto[]>([]);
  totalRequests = signal(0);
  
  statuses = ['All', 'Pending', 'Approved', 'Rejected', 'Completed', 'Issued'];
  departments = ['All', 'IT', 'HR', 'Finance', 'Operations', 'Warehouse', 'Sales', 'Marketing', 'Procurement'];

  constructor() {
    effect(() => {
      this.searchTerm();
      this.departmentFilter();
      this.loadServiceRequests();
    });
  }

  ngOnInit(): void {
    const apply = (): void => {
      const initial = this.route.snapshot.data['initialStatus'] as string | undefined;
      if (initial && initial !== 'All') {
        this.statusFilter.set(initial);
      } else {
        this.statusFilter.set('All');
      }
    };
    apply();
    this.route.data.subscribe(() => {
      apply();
      this.currentPage.set(1);
    });
  }

  filteredRequests = computed(() => {
    let result = [...this.serviceRequests()];

    if (this.searchTerm()) {
      const q = this.searchTerm().toLowerCase();
      result = result.filter(sr =>
        sr.srNumber?.toLowerCase().includes(q) ||
        sr.requesterName?.toLowerCase().includes(q) ||
        sr.department?.toLowerCase().includes(q) ||
        sr.purpose?.toLowerCase().includes(q)
      );
    }

    if (this.statusFilter() !== 'All') {
      result = result.filter((sr) => this.rowMatchesStatus(sr, this.statusFilter()));
    }

    if (this.departmentFilter() !== 'All') {
      result = result.filter(sr => sr.department === this.departmentFilter());
    }

    return result;
  });

  pagedRequests = computed(() => {
    const start = (this.currentPage() - 1) * this.rowsPerPage();
    const end = start + this.rowsPerPage();
    return this.filteredRequests().slice(start, end);
  });

  totalPages = computed(() => Math.ceil(this.filteredRequests().length / this.rowsPerPage()));

  displayRange = computed(() => {
    const start = (this.currentPage() - 1) * this.rowsPerPage() + 1;
    const end = Math.min(this.currentPage() * this.rowsPerPage(), this.filteredRequests().length);
    return { start, end };
  });
  
  loadServiceRequests(): void {
    this.loading.set(true);
    this.error.set(null);

    const params: any = {};

    if (this.searchTerm()) {
      params.searchTerm = this.searchTerm();
    }

    if (this.departmentFilter() !== 'All') {
      params.department = this.departmentFilter();
    }

    this.serviceRequestService.getAll(params).subscribe({
      next: (response) => {
        if (response.success !== false && Array.isArray(response.data)) {
          this.serviceRequests.set(response.data);
          this.totalRequests.set(response.data.length);
        } else {
          this.error.set(response.message || 'No service request data received from server');
        }
        this.loading.set(false);
      },
      error: (err: unknown) => {
        console.error('Error loading service requests', err);
        let errorMessage = 'Failed to load service requests. Please try again.';

        if (err && typeof err === 'object' && 'error' in err) {
          const httpErr = err as { error?: { message?: string; title?: string } | string; status?: number; statusText?: string };
          const body = httpErr.error;
          if (body && typeof body === 'object') {
            if (body.message) errorMessage = body.message;
            else if (body.title) errorMessage = body.title;
          } else if (typeof body === 'string') {
            errorMessage = body;
          }
          if (httpErr.status) {
            errorMessage = `[${httpErr.status} ${httpErr.statusText ?? ''}] ${errorMessage}`;
          }
        }

        this.error.set(errorMessage);
        this.loading.set(false);
      },
    });
  }

  onSearch(e: Event): void {
    this.searchTerm.set((e.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  onStatusFilter(e: Event): void {
    this.statusFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onDepartmentFilter(e: Event): void {
    this.departmentFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onRowsPerPageChange(e: Event): void {
    this.rowsPerPage.set(+(e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.departmentFilter.set('All');
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  /** Close native <details> overflow menus (Bootstrap dropdown CSS is not bundled). */
  closeSheet(sheet: HTMLDetailsElement): void {
    sheet.removeAttribute('open');
  }

  displayValue(value: string | number | undefined | null): string {
    if (value === undefined || value === null) return '—';
    if (typeof value === 'number' && !Number.isNaN(value)) return String(value);
    const s = String(value).trim();
    return s.length ? s : '—';
  }

  hasText(displayed: string): boolean {
    return displayed !== '—';
  }

  requesterDisplay(sr: ServiceRequestDto): string {
    const o = sr as unknown as Record<string, unknown>;
    const raw =
      sr.requesterName ??
      (o['requester'] as string | undefined) ??
      (o['employeeName'] as string | undefined) ??
      (o['userName'] as string | undefined) ??
      (o['createdByName'] as string | undefined);
    return this.displayValue(raw);
  }

  departmentDisplay(sr: ServiceRequestDto): string {
    const o = sr as unknown as Record<string, unknown>;
    const raw =
      sr.department ??
      (o['requestDepartment'] as string | undefined) ??
      (o['dept'] as string | undefined);
    return this.displayValue(raw);
  }

  purposeFull(sr: ServiceRequestDto): string {
    const o = sr as unknown as Record<string, unknown>;
    const raw = sr.purpose ?? (o['reason'] as string | undefined) ?? (o['title'] as string | undefined);
    return typeof raw === 'string' && raw.trim() ? raw.trim() : '';
  }

  purposePreview(sr: ServiceRequestDto): string {
    const full = this.purposeFull(sr);
    if (!full) return '—';
    return full.length > 72 ? full.slice(0, 72) + '…' : full;
  }

  formatUrgencyLabel(urgency: string | undefined): string {
    const u = (urgency || 'normal').toLowerCase();
    return u.charAt(0).toUpperCase() + u.slice(1);
  }

  viewServiceRequest(id: string): void {
    this.router.navigate(['/admin/requisitions', id]);
  }

  editServiceRequest(id: string): void {
    this.router.navigate(['/admin/requisitions', id, 'edit']);
  }
  
  createNewRequest(): void {
    this.router.navigate(['/admin/requisitions/create']);
  }

  approveRequest(id: string): void {
    if (confirm('Are you sure you want to approve this service request?')) {
      this.serviceRequestService.approve({ id, remarks: 'Approved via admin panel' }).subscribe({
        next: (response) => {
          if (response.success) {
            alert('Service request approved successfully');
            this.loadServiceRequests();
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
  }

  rejectRequest(id: string): void {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason && reason.trim()) {
      this.serviceRequestService.reject({ id, reason: reason.trim() }).subscribe({
        next: (response) => {
          if (response.success) {
            alert('Service request rejected successfully');
            this.loadServiceRequests();
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
  }

  deleteRequest(id: string): void {
    if (confirm('Are you sure you want to delete this service request? This action cannot be undone.')) {
      this.serviceRequestService.delete(id).subscribe({
        next: (response) => {
          if (response.success) {
            alert('Service request deleted successfully');
            this.loadServiceRequests();
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

  addComment(id: string): void {
    const comment = prompt('Add a comment to this service request:');
    if (comment && comment.trim()) {
      this.serviceRequestService.addComment(id, comment.trim()).subscribe({
        next: (response) => {
          if (response.success) {
            alert('Comment added successfully');
            this.loadServiceRequests();
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
  }

  exportRequests(format: string, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    const rows = this.filteredRequests();
    if (!rows.length) {
      alert('No rows to export for the current filters.');
      return;
    }
    const headers = [
      'SR Number',
      'Requester',
      'Department',
      'Purpose',
      'Status',
      'Urgency',
      'Items',
      'Quantity',
      'Request Date',
    ];
    const escape = (v: string | number | undefined | null) => {
      const s = String(v ?? '');
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [
      headers.join(','),
      ...rows.map((r) =>
        [
          escape(r.srNumber),
          escape(this.requesterDisplay(r)),
          escape(this.departmentDisplay(r)),
          escape(this.purposeFull(r) || '—'),
          escape(r.status),
          escape(r.urgency),
          escape(r.totalItems),
          escape(r.totalQuantity),
          escape(this.formatDate(r.requestDate)),
        ].join(','),
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ext = format === 'excel' ? 'xls' : 'csv';
    a.download = `service-requests.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    if (format === 'pdf') {
      window.print();
    }
  }
  
  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'req-badge--warning';
      case 'approved':
        return 'req-badge--success';
      case 'rejected':
        return 'req-badge--danger';
      case 'completed':
        return 'req-badge--info';
      case 'issued':
        return 'req-badge--primary';
      default:
        return 'req-badge--neutral';
    }
  }

  getUrgencyClass(urgency: string): string {
    switch (urgency?.toLowerCase()) {
      case 'critical':
        return 'req-badge--danger';
      case 'urgent':
        return 'req-badge--warning';
      case 'high':
        return 'req-badge--warning';
      case 'normal':
        return 'req-badge--success';
      case 'low':
        return 'req-badge--neutral';
      default:
        return 'req-badge--neutral';
    }
  }

  formatDate(date: string | Date): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }

  trackByRequestId(index: number, item: ServiceRequestDto): string {
    return item.id;
  }
}
