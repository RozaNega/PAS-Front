import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

export interface TrackingStep {
  label: string;
  description: string;
  date: string;
  status: 'completed' | 'active' | 'pending';
  icon: string;
}

@Component({
  selector: 'app-track-request-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './track-request-modal.component.html',
  styleUrl: './track-request-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrackRequestModalComponent {
  readonly modal = inject(NgbActiveModal);

  @Input() srNumber = '';
  @Input() priority = 'Medium';
  @Input() items: string[] = [];
  @Input() requestedDate = '';
  @Input() requiredDate = '';
  @Input() waitingTime = '';
  @Input() status: 'Pending' | 'Approved' | 'Completed' | 'Rejected' | 'Issued' = 'Pending';

  get priorityClass(): string {
    switch (this.priority) {
      case 'Urgent': return 'priority-urgent';
      case 'Medium': return 'priority-medium';
      default: return 'priority-normal';
    }
  }

  get priorityIcon(): string {
    switch (this.priority) {
      case 'Urgent': return '🔴';
      case 'Medium': return '🟡';
      default: return '🟢';
    }
  }

  get trackingSteps(): TrackingStep[] {
    const steps: TrackingStep[] = [
      {
        label: 'Request Submitted',
        description: `Request ${this.srNumber} was submitted by you`,
        date: this.requestedDate,
        status: 'completed',
        icon: '📝',
      },
      {
        label: 'Manager Review',
        description: this.status === 'Pending' ? 'Currently being reviewed by your manager' : 'Review completed by manager',
        date: this.requestedDate,
        status: this.status === 'Pending' ? 'active' : 'completed',
        icon: '👤',
      },
      {
        label: 'Manager Approval',
        description: this.status === 'Pending' ? 'Awaiting final approval' : 
                     this.status === 'Rejected' ? 'Request was rejected' : 'Request has been approved',
        date: this.status !== 'Pending' ? 'Today' : '',
        status: this.status === 'Pending' ? 'pending' : 
                this.status === 'Rejected' ? 'active' : 'completed',
        icon: this.status === 'Rejected' ? '❌' : '✅',
      },
      {
        label: 'Store Processing',
        description: this.status === 'Approved' ? 'Storekeeper is preparing your items' : 
                     this.status === 'Completed' ? 'Items have been processed' : 'Pending manager approval',
        date: this.status === 'Completed' ? 'Today' : '',
        status: this.status === 'Approved' ? 'active' : 
                this.status === 'Completed' ? 'completed' : 'pending',
        icon: '📦',
      },
      {
        label: 'Ready for Pickup',
        description: this.status === 'Completed' ? 'Items are ready for collection at the store' : 'Awaiting processing',
        date: this.status === 'Completed' ? 'Today' : this.requiredDate,
        status: this.status === 'Completed' ? 'active' : 'pending',
        icon: '🏪',
      },
    ];

    return steps;
  }

  get getStatusDisplay(): string {
    return this.status === 'Pending' ? '⏳ Pending Approval' :
           this.status === 'Approved' ? '✅ Approved' :
           this.status === 'Completed' ? '✅ Completed' : '❌ Rejected';
  }

  get parsedItems(): { name: string; quantity: number }[] {
    return this.items.map(item => {
      // Very basic parsing assuming format "ItemName (Qty)" or just "ItemName"
      const match = item.match(/(.+?)(?:\s*\((\d+)\))?$/);
      if (match) {
        return { name: match[1].trim(), quantity: match[2] ? parseInt(match[2]) : 1 };
      }
      return { name: item, quantity: 1 };
    });
  }

  refreshStatus(): void {
    console.log('Refreshing status for', this.srNumber);
    // In a real app, this would make an API call.
    // For now, we just close it or mock a refresh.
    this.close();
  }

  cancelRequest(): void {
    this.modal.close({ action: 'cancel', srNumber: this.srNumber });
  }

  editRequest(): void {
    this.modal.close({ action: 'edit', srNumber: this.srNumber });
  }

  close(): void {
    this.modal.dismiss();
  }
}
