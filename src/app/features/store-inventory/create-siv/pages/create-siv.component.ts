import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CrossRoleService, FlowRequest } from '../../../../core/services/cross-role.service';
import { ServiceRequestItem } from '../../../requisition/service-requests/models/service-request.model';
import { CurrentUserService } from '../../../../core/services/current-user.service';

interface Requisition {
  id: string;
  srNumber: string;
  requester: string;
  department: string;
  priority: string;
  requiredBy: string;
}

interface SIVItem {
  /** Maps to ServiceRequestItem.id — used when calling issueRequest. */
  srDetailId: string;
  name: string;
  sku: string;
  requested: number;
  approved: number;
  available: number;
  quantityToIssue: number;
  shelfLocation: string;
  shelfId?: string;
  notes: string;
}

@Component({
  selector: 'app-create-siv',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './create-siv.component.html',
  styleUrls: ['./create-siv.component.scss'],
})
export class CreateSIVComponent {
  private readonly crossRoleService = inject(CrossRoleService);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly router = inject(Router);

  readonly currentStep = signal(1);
  readonly totalSteps = 4;

  readonly selectedRequisition = signal<Requisition | null>(null);
  readonly requisitions = signal<Requisition[]>([]);
  readonly sivItems = signal<SIVItem[]>([]);

  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly isProcessing = signal(false);

  // ── Step 4 form fields — plain properties for [(ngModel)] two-way binding ──
  sivNumber = '';
  issueDate = '';
  issuedBy = '';
  printSIV = true;
  sendEmail = true;
  sendSMS = false;
  requireManagerSignature = false;

  constructor() {
    const user = this.currentUserService.getCurrentUserValue();
    this.issuedBy = user?.fullName ? `${user.fullName} (Store Officer)` : 'Storekeeper';
    this.sivNumber = this.generateSivNumber();
    this.issueDate = this.todayIsoDate();
    this.loadRequisitions();
  }

  private generateSivNumber(): string {
    const year = new Date().getFullYear();
    const seq = Math.floor(Math.random() * 900 + 100);
    return `SIV-${year}-${seq}`;
  }

  private todayIsoDate(): string {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  // ── Data loading ──────────────────────────────────────────────────────

  private loadRequisitions(): void {
    this.isLoading.set(true);
    this.crossRoleService.getApprovedRequests().subscribe({
      next: (requests) => {
        this.requisitions.set(requests.map((r) => this.mapToRequisition(r)));
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load approved requisitions. Please refresh.');
        this.isLoading.set(false);
      },
    });
  }

  private mapToRequisition(r: FlowRequest): Requisition {
    const priority =
      r.urgency === 'Urgent' || r.urgency === 'High'
        ? 'Urgent'
        : r.urgency === 'Medium'
          ? 'Medium'
          : 'Normal';
    return {
      id: r.id,
      srNumber: r.srNumber,
      requester: r.requesterName,
      department: r.department,
      priority,
      requiredBy: 'N/A',
    };
  }

  private mapToSIVItem(item: ServiceRequestItem): SIVItem {
    return {
      srDetailId: item.id,
      name: item.itemName,
      sku: item.sku,
      requested: item.requestedQty,
      approved: item.requestedQty,
      available: 0,
      quantityToIssue: item.pendingQty || item.requestedQty,
      shelfLocation: item.shelfLocation || '',
      shelfId: item.shelfId,
      notes: '',
    };
  }

  // ── Step navigation ───────────────────────────────────────────────────

  nextStep(): void {
    if (this.currentStep() === 1 && !this.selectedRequisition()) return;
    if (this.currentStep() < this.totalSteps) {
      this.currentStep.update((s) => s + 1);
    }
  }

  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update((s) => s - 1);
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────

  selectRequisition(req: Requisition): void {
    this.selectedRequisition.set(req);
    this.sivItems.set([]);

    this.crossRoleService.getRequestDetail(req.id).subscribe((detail) => {
      if (detail) {
        this.sivItems.set(detail.items.map((item) => this.mapToSIVItem(item)));
      }
    });
  }

  generateSIV(): void {
    const req = this.selectedRequisition();
    if (!req) return;

    const items = this.sivItems().map((item) => ({
      srDetailId: item.srDetailId,
      issuedQty: item.quantityToIssue,
      shelfId: item.shelfId,
    }));

    this.isProcessing.set(true);
    this.crossRoleService.issueRequest(req.id, items).subscribe((success) => {
      this.isProcessing.set(false);
      if (success) {
        this.router.navigate(['/storekeeper/issuing/history']);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/storekeeper/issuing/pending']);
  }

  getStepTitle(): string {
    switch (this.currentStep()) {
      case 1:
        return 'Select Approved Requisition';
      case 2:
        return 'Selected Requisition Details';
      case 3:
        return 'Items to Issue';
      case 4:
        return 'SIV Information';
      default:
        return '';
    }
  }
}
