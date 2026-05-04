import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { RequestDetails } from '../../../../types/dashboard.types';

@Component({
  selector: 'app-request-details-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './request-details-modal.component.html',
  styleUrl: './request-details-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestDetailsModalComponent {
  readonly modal = inject(NgbActiveModal);
  readonly request = input.required<RequestDetails>();

  getStatusColor(status: string): string {
    switch (status) {
      case 'Approved':
        return 'green';
      case 'Rejected':
        return 'red';
      case 'Completed':
        return 'blue';
      case 'Pending':
      default:
        return 'yellow';
    }
  }
}
