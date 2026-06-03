import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ServiceRequestService } from '../../../core/services/service-request.service';

interface ApprovalStage {
  label: string;
  status: 'completed' | 'pending' | 'rejected';
  date?: string;
  approver?: string;
  comment?: string;
}

interface ApprovedRequest {
  id: number;
  requestNumber: string;
  title: string;
  requester: string;
  department: string;
  category: string;
  priority: string;
  submittedDate: string;
  approvedDate: string;
  approvedBy: string;
  amount: number;
  status: string;
  approvalStages: ApprovalStage[];
}

@Component({
  selector: 'app-approved-requests',
  templateUrl: './approved-requests.component.html',
  styleUrls: ['./approved-requests.component.scss'],
})
export class ApprovedRequestsComponent implements OnInit {
  searchForm: FormGroup;
  requests: ApprovedRequest[] = [];
  filteredRequests: ApprovedRequest[] = [];
  isLoading = false;
  selectedRequest: ApprovedRequest | null = null;

  filters = {
    department: '',
    category: '',
    priority: '',
    dateFrom: '',
    dateTo: '',
  };

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
    this.loadApprovedRequests();
    this.searchForm.get('searchTerm')?.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((term) => {
        this.filterRequests(term);
      });
  }

  loadApprovedRequests(): void {
    this.isLoading = true;
    this.requestService.getApprovedRequests().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const data = response.data as ApprovedRequest[];
          this.requests = data;
          this.filteredRequests = data;
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

  applyFilters(): void {
    let filtered = [...this.requests];
    if (this.filters.department) {
      filtered = filtered.filter((r) => r.department === this.filters.department);
    }
    if (this.filters.category) {
      filtered = filtered.filter((r) => r.category === this.filters.category);
    }
    if (this.filters.priority) {
      filtered = filtered.filter((r) => r.priority === this.filters.priority);
    }
    this.filteredRequests = filtered;
  }

  clearFilters(): void {
    this.filters = { department: '', category: '', priority: '', dateFrom: '', dateTo: '' };
    this.filteredRequests = this.requests;
  }

  viewRequestDetails(request: ApprovedRequest): void {
    this.selectedRequest = request;
  }

  closeDetails(): void {
    this.selectedRequest = null;
  }

  exportToExcel(): void {
    console.log('Exporting to Excel...');
  }

  printReport(): void {
    window.print();
  }
}
