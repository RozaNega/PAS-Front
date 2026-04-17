import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirmation-modal',
  standalone: false,
  templateUrl: './confirmation-modal.component.html'
})
export class ConfirmationModalComponent {
  @Input() title = 'Confirm Action';
  @Input() message = 'Are you sure you want to proceed?';
  @Input() confirmText = 'Confirm';
  @Input() cancelText = 'Cancel';
  @Input() confirmClass = 'btn-primary';
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  confirm(): void {
    this.confirmed.emit();
  }

  dismiss(): void {
    this.cancelled.emit();
  }
}


