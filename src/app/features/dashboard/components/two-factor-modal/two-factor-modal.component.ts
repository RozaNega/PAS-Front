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
  codeSent = signal(false);

  nextStep(): void {
    if (this.method() === 'sms' && !this.contactInfo()) {
      alert('Please enter your phone number');
      return;
    }
    if (this.method() === 'email' && !this.contactInfo()) {
      alert('Please enter your email');
      return;
    }

    if (this.method() === 'app') {
      this.step.set(2);
      return;
    }

    this.sendVerificationCode();
  }

  sendVerificationCode(): void {
    this.loading.set(true);
    // Simulate sending code
    setTimeout(() => {
      this.loading.set(false);
      this.codeSent.set(true);
      this.step.set(2);
      console.log(`Code sent to ${this.contactInfo()} via ${this.method()}`);
    }, 1500);
  }

  resendCode(): void {
    if (this.loading()) return;
    this.sendVerificationCode();
    alert('A new verification code has been sent.');
  }

  submit(): void {
    if (!this.verificationCode() || this.verificationCode().length < 6) {
      alert('Please enter a valid 6-digit verification code');
      return;
    }
    this.loading.set(true);
    // Simulate API call
    setTimeout(() => {
      this.loading.set(false);
      // Demo code
      if (this.verificationCode() === '123456') {
        this.modal.close({ 
          method: this.method(), 
          contactInfo: this.contactInfo(),
          enabled: true
        });
        alert('Two-Factor Authentication enabled successfully!');
      } else {
        alert('Invalid verification code. Please try 123456 for demo purposes.');
      }
    }, 1500);
  }

  cancel(): void {
    this.modal.dismiss();
  }
}
