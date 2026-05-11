import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-two-factor-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './two-factor-modal.component.html',
  styleUrl: './two-factor-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TwoFactorModalComponent {
  readonly modal = inject(NgbActiveModal);

  step = signal<1 | 2>(1);
  method = signal<'sms' | 'email' | 'app'>('sms');
  contactInfo = signal('');
  verificationCode = signal('');
  loading = signal(false);

  nextStep(): void {
    if (this.method() === 'sms' && !this.contactInfo()) {
      alert('Please enter your phone number');
      return;
    }
    if (this.method() === 'email' && !this.contactInfo()) {
      alert('Please enter your email');
      return;
    }
    this.step.set(2);
  }

  submit(): void {
    if (!this.verificationCode()) {
      alert('Please enter the verification code');
      return;
    }
    this.loading.set(true);
    // Simulate API call
    setTimeout(() => {
      this.loading.set(false);
      this.modal.close({ 
        method: this.method(), 
        contactInfo: this.contactInfo() 
      });
    }, 1500);
  }

  cancel(): void {
    this.modal.dismiss();
  }
}
