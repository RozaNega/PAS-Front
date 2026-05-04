import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ItemDetails } from '../../../../types/dashboard.types';

@Component({
  selector: 'app-item-details-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './item-details-modal.component.html',
  styleUrl: './item-details-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemDetailsModalComponent {
  readonly modal = inject(NgbActiveModal);
  readonly item = input.required<ItemDetails>();

  getStatusColor(status: string): string {
    switch (status) {
      case 'Good':
        return 'green';
      case 'Low':
        return 'yellow';
      case 'Out of Stock':
        return 'red';
      default:
        return 'gray';
    }
  }
}
