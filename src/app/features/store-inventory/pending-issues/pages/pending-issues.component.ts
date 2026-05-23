import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CrossRoleService, FlowRequest } from '../../../../core/services/cross-role.service';
import { ServiceRequestDetail } from '../../../requisition/service-requests/models/service-request.model';

interface IssueItem {
  name: string;
  requested: number;
  available: number;
  location: string;
  status: string;
}

interface PendingIssue {
  id: string;
  srNumber: string;
  requester: string;
  department: string;
  requestedDate: string;
  waitingTime: string;
  /** Numeric days for average calculation — not accessed by the template. */
  waitingDays: number;
  priority: 'Urgent' | 'Medium' | 'Normal';
  requiredBy: string;
  items: IssueItem[];
}

@Component({
  selector: 'app-pending-issues',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './pending-issues.component.html',
  styleUrls: ['./pending-issues.component.scss'],
})
export class PendingIssuesComponent {
  private readonly crossRoleService = inject(CrossRoleService);

  // ── Filter state ──────────────────────────────────────────────────────
  // Plain string properties so [(ngModel)] two-way binding works without issues.
  priorityFilter = 'All';
  departmentFilter = 'All Departments';
  dateRange = { start: '', end: '' };

  readonly searchTerm = signal('');

  readonly priorities = ['All', 'Urgent', 'Medium', 'Normal'];
  readonly departments = ['All Departments', 'IT', 'HR', 'Finance', 'Operations', 'Marketing'];

  // ── Data state ────────────────────────────────────────────────────────
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  private readonly allIssues = signal<PendingIssue[]>([]);
  readonly filteredIssues = signal<PendingIssue[]>([]);

  // ── Modal state ───────────────────────────────────────────────────────
  readonly showProcessModal = signal(false);
  readonly selectedIssue = signal<PendingIssue | null>(null);
  readonly selectedIssueDetail = signal<ServiceRequestDetail | null>(null);
  readonly isProcessing = signal(false);
  readonly currentStep = signal(1);

  // ── Computed statistics ───────────────────────────────────────────────
  readonly pendingCount = computed(() => this.filteredIssues().length);
  readonly urgentCount = computed(
    () => this.filteredIssues().filter((i) => i.priority === 'Urgent').length,
  );
  readonly readyToIssue = computed(() => this.filteredIssues().length);
  readonly awaitingStock = computed(() => 0);
  readonly avgWaitTime = computed(() => {
    const issues = this.filteredIssues();
    if (issues.length === 0) return 'N/A';
    const total = issues.reduce((sum, i) => sum + i.waitingDays, 0);
    return `${(total / issues.length).toFixed(1)} days`;
  });

  readonly urgentIssues = computed(() =>
    this.filteredIssues().filter((i) => i.priority === 'Urgent'),
  );
  readonly mediumIssues = computed(() =>
    this.filteredIssues().filter((i) => i.priority === 'Medium'),
  );
  readonly normalIssues = computed(() =>
    this.filteredIssues().filter((i) => i.priority === 'Normal'),
  );

  constructor() {
    this.loadData();
  }

  // ── Data loading ──────────────────────────────────────────────────────

  private loadData(): void {
    this.isLoading.set(true);
    this.crossRoleService.getApprovedRequests().subscribe({
      next: (requests) => {
        this.allIssues.set(requests.map((r) => this.mapToPendingIssue(r)));
        this.applyFilter();
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load pending issues. Please refresh.');
        this.isLoading.set(false);
      },
    });
  }

  private mapToPendingIssue(r: FlowRequest): PendingIssue {
    const priority: 'Urgent' | 'Medium' | 'Normal' =
      r.urgency === 'Urgent' || r.urgency === 'High'
        ? 'Urgent'
        : r.urgency === 'Medium'
          ? 'Medium'
          : 'Normal';

    const waitingDays = r.waitingDays;
    const waitingTime =
      waitingDays === 0 ? 'Today' : waitingDays === 1 ? '1 day' : `${waitingDays} days`;

    return {
      id: r.id,
      srNumber: r.srNumber,
      requester: r.requesterName,
      department: r.department,
      requestedDate: r.requestDate,
      waitingTime,
      waitingDays,
      priority,
      requiredBy: 'N/A',
      items: [
        {
          name: `${r.totalItems} item(s) — ${r.purpose}`,
          requested: r.totalQuantity,
          available: 0,
          location: '—',
          status: '📋 Approved',
        },
      ],
    };
  }

  // ── Filtering ─────────────────────────────────────────────────────────

  private applyFilter(): void {
    const search = this.searchTerm().toLowerCase();
    const priority = this.priorityFilter;
    const department = this.departmentFilter;

    this.filteredIssues.set(
      this.allIssues().filter((issue) => {
        const matchesSearch =
          !search ||
          issue.srNumber.toLowerCase().includes(search) ||
          issue.requester.toLowerCase().includes(search) ||
          issue.department.toLowerCase().includes(search);
        const matchesPriority = priority === 'All' || issue.priority === priority;
        const matchesDepartment =
          department === 'All Departments' ||
          issue.department.toLowerCase().includes(department.toLowerCase());
        return matchesSearch && matchesPriority && matchesDepartment;
      }),
    );
  }

  /** Kept for template compatibility; delegates to applyFilter. */
  filterIssues(): void {
    this.applyFilter();
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.applyFilter();
  }

  onPriorityChange(value: string): void {
    this.priorityFilter = value;
    this.applyFilter();
  }

  onDepartmentChange(value: string): void {
    this.departmentFilter = value;
    this.applyFilter();
  }

  // ── Modal ─────────────────────────────────────────────────────────────

  openProcessModal(issue: PendingIssue): void {
    this.selectedIssue.set({ ...issue });
    this.selectedIssueDetail.set(null);
    this.currentStep.set(1);
    this.showProcessModal.set(true);

    this.crossRoleService.getRequestDetail(issue.id).subscribe((detail) => {
      this.selectedIssueDetail.set(detail);
      if (detail) {
        const items: IssueItem[] = detail.items.map((item) => ({
          name: item.itemName,
          requested: item.requestedQty,
          available: 0,
          location: item.shelfLocation || '—',
          status: item.pendingQty > 0 ? '✅ Available' : '📋 Pending',
        }));
        const current = this.selectedIssue();
        if (current) {
          this.selectedIssue.set({ ...current, items });
        }
      }
    });
  }

  closeProcessModal(): void {
    this.showProcessModal.set(false);
    this.selectedIssue.set(null);
    this.selectedIssueDetail.set(null);
    this.isProcessing.set(false);
    this.currentStep.set(1);
  }

  nextStep(): void {
    if (this.currentStep() < 3) {
      this.currentStep.update((s) => s + 1);
    }
  }

  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update((s) => s - 1);
    }
  }

  processIssue(): void {
    const issue = this.selectedIssue();
    const detail = this.selectedIssueDetail();
    if (!issue) return;

    const items = (detail?.items ?? []).map((item) => ({
      srDetailId: item.id,
      issuedQty: item.pendingQty || item.requestedQty,
    }));

    this.isProcessing.set(true);
    this.crossRoleService.issueRequest(issue.id, items).subscribe((success) => {
      this.isProcessing.set(false);
      if (success) {
        this.allIssues.update((list) => list.filter((i) => i.id !== issue.id));
        this.applyFilter();
        this.closeProcessModal();
      }
    });
  }

  // ── Card actions ──────────────────────────────────────────────────────

  viewDetails(issue: PendingIssue): void {
    this.openProcessModal(issue);
  }

  addNote(_issue: PendingIssue): void {
    // Placeholder — note functionality can be wired to a notes API later.
  }

  snooze(_issue: PendingIssue): void {
    // Placeholder — snooze/reminder functionality can be wired later.
  }

  bulkProcess(): void {
    // Placeholder — bulk issue can be wired later.
  }

  printPickingList(): void {
    // Placeholder — picking list print can be wired later.
  }

  exportList(): void {
    // Placeholder — CSV/PDF export can be wired later.
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'Urgent':
        return '🔴';
      case 'Medium':
        return '🟡';
      case 'Normal':
        return '🟢';
      default:
        return '⚪';
    }
  }

  getStepTitle(): string {
    switch (this.currentStep()) {
      case 1:
        return 'Review Requisition';
      case 2:
        return 'Select Items & Quantities';
      case 3:
        return 'SIV Details & Signature';
      default:
        return '';
    }
  }
}
