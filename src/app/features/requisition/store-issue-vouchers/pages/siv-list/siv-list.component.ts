import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { SIVService } from '../../services/siv.service';
import { ServiceRequestService } from '../../../service-requests/services/service-request.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { ConfirmationModalComponent } from '../../../../../shared/components/confirmation-modal/confirmation-modal.component';
import { StoreIssueVoucher, SIV_STATUSES } from '../../models/siv.model';

@Component({
  selector: 'app-siv-list',
  standalone: false,
  templateUrl: './siv-list.component.html',
  styleUrls: ['./siv-list.component.scss']
})
export class SIVListComponent implements OnInit, OnDestroy {
  sivs: StoreIssueVoucher[] = [];
  loading = false;
  page = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;

  filterForm: FormGroup;
  serviceRequests: any[] = [];
  statuses = SIV_STATUSES;

  showCreateModal = false;
  showFilterModal = false;
  submitting = false;
  createForm: FormGroup;
  selectedSR: any = null;

  statistics = {
    totalSIVs: 0,
    pendingSIVs: 0,
    approvedSIVs: 0,
    issuedSIVs: 0,
    totalItems: 0,
    totalQuantity: 0
  };

  private destroy$ = new Subject<void>();

  columns = [
    { key: 'sivNumber', label: 'SIV Number', type: 'text', sortable: true },
    { key: 'issueDate', label: 'Issue Date', type: 'date', sortable: true },
    { key: 'srNumber', label: 'SR Number', type: 'text', sortable: true },
    { key: 'issuedByName', label: 'Issued By', type: 'text', sortable: true },
    { key: 'totalItems', label: 'Items', type: 'text', sortable: true },
    { key: 'totalQuantity', label: 'Quantity', type: 'text', sortable: true },
    { key: 'status', label: 'Status', type: 'badge', sortable: true }
  ];

  constructor(
    private sivService: SIVService,
    private serviceRequestService: ServiceRequestService,
    private notificationService: NotificationService,
    private modalService: NgbModal,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      searchTerm: [''],
      status: [''],
      srId: [''],
      fromDate: [''],
      toDate: [''],
      sortBy: ['issueDate'],
      sortDirection: ['desc']
    });

    this.createForm = this.fb.group({
      srId: [''],
      recipientName: [''],
      recipientDepartment: [''],
      recipientSignature: [''],
      remarks: ['']
    });
  }

  ngOnInit(): void {
    this.loadSIVs();
    this.loadServiceRequests();
    this.loadStatistics();
    this.setupSearchDebounce();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setupSearchDebounce(): void {
    this.filterForm.get('searchTerm')?.valueChanges
      .pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page = 1;
        this.loadSIVs();
      });
  }

  loadSIVs(): void {
    this.loading = true;
    const params = {
      pageNumber: this.page,
      pageSize: this.pageSize,
      ...this.filterForm.value
    };

    this.sivService.getStoreIssueVouchers(params).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.sivs = response.data.items;
          this.totalItems = response.data.totalCount;
          this.totalPages = response.data.totalPages;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notificationService.error('Failed to load Store Issue Vouchers');
      }
    });
  }

  loadServiceRequests(): void {
    this.serviceRequestService.getServiceRequests({ status: 'Approved' }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.serviceRequests = response.data.items || response.data;
        }
      },
      error: () => {
        console.error('Failed to load service requests');
      }
    });
  }

  loadStatistics(): void {
    this.sivService.getSIVStatistics().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.statistics = response.data;
        }
      },
      error: () => {
        console.error('Failed to load statistics');
      }
    });
  }

  onSRSelect(): void {
    const srId = this.createForm.get('srId')?.value;
    if (srId) {
      this.serviceRequestService.getServiceRequestById(srId).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.selectedSR = response.data;
            this.createForm.patchValue({
              recipientName: response.data.requesterName,
              recipientDepartment: response.data.department || ''
            });
          }
        }
      });
    } else {
      this.selectedSR = null;
    }
  }

  onPageChange(page: number): void {
    this.page = page;
    this.loadSIVs();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.page = 1;
    this.loadSIVs();
  }

  onSort(column: string): void {
    const currentSort = this.filterForm.get('sortBy')?.value;
    const currentDirection = this.filterForm.get('sortDirection')?.value;

    if (currentSort === column) {
      this.filterForm.patchValue({
        sortDirection: currentDirection === 'asc' ? 'desc' : 'asc'
      });
    } else {
      this.filterForm.patchValue({
        sortBy: column,
        sortDirection: 'asc'
      });
    }
    this.loadSIVs();
  }

  onFilter(): void {
    this.page = 1;
    this.loadSIVs();
    this.closeFilterModal();
  }

  resetFilters(): void {
    this.filterForm.reset({
      searchTerm: '',
      status: '',
      srId: '',
      fromDate: '',
      toDate: '',
      sortBy: 'issueDate',
      sortDirection: 'desc'
    });
    this.onFilter();
  }

  openCreateModal(): void {
    this.createForm.reset({
      srId: '',
      recipientName: '',
      recipientDepartment: '',
      recipientSignature: '',
      remarks: ''
    });
    this.selectedSR = null;
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.createForm.reset();
    this.selectedSR = null;
  }

  openFilterModal(): void {
    this.showFilterModal = true;
  }

  closeFilterModal(): void {
    this.showFilterModal = false;
  }

  createSIV(): void {
    if (!this.createForm.get('srId')?.value) {
      this.notificationService.error('Please select a Service Request');
      return;
    }

    if (!this.createForm.get('recipientSignature')?.value) {
      this.notificationService.error('Recipient signature is required');
      return;
    }

    this.submitting = true;

    const items = this.selectedSR?.items
      ?.filter((item: any) => item.issuedQty < item.requestedQty)
      .map((item: any) => ({
        srDetailId: item.id,
        issuedQty: item.requestedQty - item.issuedQty,
        shelfId: item.shelfId
      })) || [];

    if (items.length === 0) {
      this.notificationService.error('No pending items to issue');
      this.submitting = false;
      return;
    }

    const requestData = {
      srId: this.createForm.get('srId')?.value,
      recipientSignature: this.createForm.get('recipientSignature')?.value,
      recipientName: this.createForm.get('recipientName')?.value,
      recipientDepartment: this.createForm.get('recipientDepartment')?.value,
      remarks: this.createForm.get('remarks')?.value,
      items: items
    };

    this.sivService.createStoreIssueVoucher(requestData).subscribe({
      next: () => {
        this.notificationService.success('Store Issue Voucher created successfully');
        this.closeCreateModal();
        this.loadSIVs();
        this.loadStatistics();
        this.submitting = false;
      },
      error: (error) => {
        this.notificationService.error(error.error?.message || 'Failed to create SIV');
        this.submitting = false;
      }
    });
  }

  onApprove(siv: StoreIssueVoucher): void {
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Approve SIV';
    modalRef.componentInstance.message = `Are you sure you want to approve SIV "${siv.sivNumber}"?`;
    modalRef.componentInstance.confirmText = 'Approve';
    modalRef.componentInstance.confirmClass = 'btn-success';

    modalRef.result.then((result) => {
      if (result) {
        this.sivService.approveSIV({ id: siv.id }).subscribe({
          next: () => {
            this.notificationService.success('SIV approved successfully');
            this.loadSIVs();
            this.loadStatistics();
          },
          error: () => {
            this.notificationService.error('Failed to approve SIV');
          }
        });
      }
    });
  }

  onEdit(siv: StoreIssueVoucher): void {
    this.router.navigate(['/requisition/store-issue-vouchers/edit', siv.id]);
  }

  onDelete(siv: StoreIssueVoucher): void {
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Delete SIV';
    modalRef.componentInstance.message = `Are you sure you want to delete SIV "${siv.sivNumber}"? This action cannot be undone.`;
    modalRef.componentInstance.confirmText = 'Delete';
    modalRef.componentInstance.confirmClass = 'btn-danger';

    modalRef.result.then((result) => {
      if (result) {
        this.sivService.deleteStoreIssueVoucher(siv.id).subscribe({
          next: () => {
            this.notificationService.success('SIV deleted successfully');
            this.loadSIVs();
            this.loadStatistics();
          },
          error: () => {
            this.notificationService.error('Failed to delete SIV');
          }
        });
      }
    });
  }

  onView(siv: StoreIssueVoucher): void {
    this.router.navigate(['/requisition/store-issue-vouchers', siv.id]);
  }

  onPrint(siv: StoreIssueVoucher): void {
    this.sivService.generateSIVPDF(siv.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SIV_${siv.sivNumber}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.notificationService.error('Failed to generate PDF');
      }
    });
  }

  getStatusColor(status: string): string {
    const statusObj = this.statuses.find(s => s.value === status);
    return statusObj?.color || 'secondary';
  }

  getStatusLabel(status: string): string {
    const statusObj = this.statuses.find(s => s.value === status);
    return statusObj?.label || status;
  }

  getStatusIcon(status: string): string {
    const statusObj = this.statuses.find(s => s.value === status);
    return statusObj?.icon || 'fa-question-circle';
  }

  get canApprove(): boolean {
    return true;
  }

  get createFormControls() {
    return this.createForm.controls;
  }

  Math = Math;
}
