import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ServiceRequestService } from '../../../core/services/service-request.service';

interface PendingRequest {
  id: number;
  requestNumber: string;
  title: string;
  requester: string;
  department: string;
  submittedDate: string;
  priority: string;
  status: string;
  description?: string;
  category?: string;
}

@Component({
  selector: 'app-manager-approval-dashboard',
  templateUrl: './manager-approval-dashboard.component.html',
  styleUrls: ['./manager-approval-dashboard.component.scss'],
})
export class ManagerApprovalDashboardComponent implements OnInit, OnDestroy {
  searchForm: FormGroup;
  requests: PendingRequest[] = [];
  filteredRequests: PendingRequest[] = [];
  selectedRequest: PendingRequest | null = null;
  isLoading = false;
  isProcessing = false;

  private destroy$ = new Subject<void>();

  Math = Math;

  constructor(
    private fb: FormBuilder,
    private requestService: ServiceRequestService,
  ) {
    this.searchForm = this.fb.group({
      searchTerm: [''],
    });
  }

  ngOnInit(): void {
    this.loadPendingRequests();
    this.searchForm.get('searchTerm')?.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term) => this.filterRequests(term));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPendingRequests(): void {
    this.isLoading = true;
    this.requestService.getPendingRequests().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.requests = response.data as PendingRequest[];
          this.filteredRequests = this.requests;
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  filterRequests(searchTerm: string): void {
    if (!searchTerm) {
      this.filteredRequests = this.requests;
      return;
    }
    const term = searchTerm.toLowerCase();
    this.filteredRequests = this.requests.filter(
      (r) =>
        r.requestNumber.toLowerCase().includes(term) ||
        r.title.toLowerCase().includes(term) ||
        r.requester.toLowerCase().includes(term)
    );
  }

  viewRequestDetails(request: PendingRequest): void {
    this.selectedRequest = request;
  }

  closeDetails(): void {
    this.selectedRequest = null;
  }

  approveRequest(request: PendingRequest): void {
    this.isProcessing = true;
    this.requestService.approveRequest(request.id).subscribe({
      next: (response) => {
        this.isProcessing = false;
        if (response.success) {
          this.requests = this.requests.filter((r) => r.id !== request.id);
          this.filteredRequests = this.filteredRequests.filter((r) => r.id !== request.id);
          this.selectedRequest = null;
        }
      },
      error: () => {
        this.isProcessing = false;
      },
    });
  }

  rejectRequest(request: PendingRequest): void {
    this.isProcessing = true;
    this.requestService.rejectRequest(request.id).subscribe({
      next: (response) => {
        this.isProcessing = false;
        if (response.success) {
          this.requests = this.requests.filter((r) => r.id !== request.id);
          this.filteredRequests = this.filteredRequests.filter((r) => r.id !== request.id);
          this.selectedRequest = null;
        }
      },
      error: () => {
        this.isProcessing = false;
      },
    });
  }

  refresh(): void {
    this.loadPendingRequests();
    this.selectedRequest = null;
  }
}
