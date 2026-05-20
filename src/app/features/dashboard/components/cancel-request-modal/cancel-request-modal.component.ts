import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-cancel-request-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cancel-request-modal.component.html',
  styleUrl: './cancel-request-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CancelRequestModalComponent {
  readonly modal = inject(NgbActiveModal);

  @Input() srNumber = '';
  @Input() items: string[] = [];
  
  cancelReason = '';

  confirm(): void {
    this.modal.close({
      srNumber: this.srNumber,
      reason: this.cancelReason
    });
  }

  dismiss(): void {
    this.modal.dismiss();
  }
}
