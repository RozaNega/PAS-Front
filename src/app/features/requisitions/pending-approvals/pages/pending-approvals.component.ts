import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface PendingRequisition {
  id: string;
  srNumber: string;
  requester: string;
  department: string;
  requestedDate: string;
  requiredBy: string;
  items: number;
  itemsDetail: string;
  justification: string;
  priority: 'Urgent' | 'Medium' | 'Normal';
}

@Component({
  selector: 'app-pending-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pending-approvals.component.html',
  styleUrls: ['./pending-approvals.component.scss']
})
export class PendingApprovalsComponent {
  searchTerm = signal('');
  showModal = signal(false);
  modalType = signal<'approve' | 'reject'>('approve');
  selectedRequisition = signal<PendingRequisition | null>(null);

  urgentReqs = signal<PendingRequisition[]>([
    {
      id: '1',
      srNumber: 'SR-2024-123',
      requester: 'John Doe',
      department: 'IT Department',
      requestedDate: 'Dec 15, 2024',
      requiredBy: 'Dec 18, 2024',
      items: 3,
      itemsDetail: '2 Laptops, 1 Monitor',
      justification: 'New team members starting next week',
      priority: 'Urgent'
    },
    {
      id: '2',
      srNumber: 'SR-2024-119',
      requester: 'Peter Chen',
      department: 'Finance',
      requestedDate: 'Dec 13, 2024',
      requiredBy: 'Dec 19, 2024',
      items: 4,
      itemsDetail: 'Printers, Paper, Toner',
      justification: 'Quarterly supplies replenishment',
      priority: 'Urgent'
    }
  ]);

  mediumReqs = signal<PendingRequisition[]>([
    {
      id: '3',
      srNumber: 'SR-2024-118',
      requester: 'Sarah Smith',
      department: 'HR',
      requestedDate: 'Dec 12, 2024',
      requiredBy: 'Dec 25, 2024',
      items: 2,
      itemsDetail: 'Office Chairs',
      justification: 'New hires seating',
      priority: 'Medium'
    },
    {
      id: '4',
      srNumber: 'SR-2024-117',
      requester: 'Mike Wilson',
      department: 'Operations',
      requestedDate: 'Dec 12, 2024',
      requiredBy: 'Dec 28, 2024',
      items: 3,
      itemsDetail: 'Safety equipment',
      justification: 'Safety compliance update',
      priority: 'Medium'
    }
  ]);

  normalReqs = signal<PendingRequisition[]>([
    {
      id: '5',
      srNumber: 'SR-2024-116',
      requester: 'Lisa Wong',
      department: 'Marketing',
      requestedDate: 'Dec 11, 2024',
      requiredBy: 'Jan 05, 2025',
      items: 2,
      itemsDetail: 'Presentation materials',
      justification: 'Upcoming campaign',
      priority: 'Normal'
    }
  ]);

  approveFormData = signal({
    approveAll: true,
    approveWithModifications: false,
    reject: false,
    comments: ''
  });

  rejectFormData = signal({
    reason: 'Other',
    detailedReason: '',
    notifyRequester: true,
    allowResubmission: true
  });

  refreshData(): void {
    console.log('Refreshing pending approvals...');
  }

  openApproveModal(req: PendingRequisition): void {
    this.selectedRequisition.set(req);
    this.modalType.set('approve');
    this.approveFormData.set({
      approveAll: true,
      approveWithModifications: false,
      reject: false,
      comments: ''
    });
    this.showModal.set(true);
  }

  openRejectModal(req: PendingRequisition): void {
    this.selectedRequisition.set(req);
    this.modalType.set('reject');
    this.rejectFormData.set({
      reason: 'Other',
      detailedReason: '',
      notifyRequester: true,
      allowResubmission: true
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedRequisition.set(null);
  }

  submitApproval(): void {
    console.log('Submitting approval for:', this.selectedRequisition()?.srNumber);
    this.closeModal();
  }

  submitRejection(): void {
    console.log('Submitting rejection for:', this.selectedRequisition()?.srNumber);
    this.closeModal();
  }

  getPriorityColor(priority: string): string {
    const colors: { [key: string]: string } = {
      Urgent: 'red',
      Medium: 'yellow',
      Normal: 'green'
    };
    return colors[priority] || 'gray';
  }

  getPriorityIcon(priority: string): string {
    const icons: { [key: string]: string } = {
      Urgent: '🔴',
      Medium: '🟡',
      Normal: '🟢'
    };
    return icons[priority] || '⚪';
  }
}
