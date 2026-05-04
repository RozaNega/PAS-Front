import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-change-password-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './change-password-modal.component.html',
  styleUrl: './change-password-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePasswordModalComponent {
  readonly modal = inject(NgbActiveModal);

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  save(): void {
    if (this.newPassword !== this.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    console.log('Changing password');
    this.modal.close({ currentPassword: this.currentPassword, newPassword: this.newPassword });
  }

  cancel(): void {
    this.modal.dismiss();
  }
}
