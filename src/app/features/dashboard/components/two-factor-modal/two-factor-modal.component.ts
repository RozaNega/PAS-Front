import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from '../../../../core/services/api.service';

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
  private apiService = inject(ApiService);

  step = signal<1 | 2>(1);
  method = signal<'email'>('email');
  contactInfo = signal('');
  verificationCode = signal('');
  loading = signal(false);
  codeSent = signal(false);

  private currentCode = '';

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  nextStep(): void {
    if (!this.contactInfo()) {
      alert('Please enter your email');
      return;
    }

    this.sendVerificationCode();
  }

  sendVerificationCode(): void {
    this.loading.set(true);
    const code = this.generateCode();
    this.currentCode = code;

    const body = {
      to: this.contactInfo(),
      subject: 'Your 2FA Verification Code',
      body: `Your two-factor authentication verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you did not request this code, please ignore this email.`,
    };

    this.apiService.post('Notifications/send-email', body).subscribe({
      next: () => {
        this.loading.set(false);
        this.codeSent.set(true);
        this.step.set(2);
        console.log(`Code sent to ${this.contactInfo()} via ${this.method()}`);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        console.error('Error sending verification code:', err);
        alert('Failed to send verification code. Please check your contact info and try again.');
      },
    });
  }

  resendCode(): void {
    if (this.loading()) return;
    this.verificationCode.set('');
    this.sendVerificationCode();
  }

  submit(): void {
    if (!this.verificationCode() || this.verificationCode().length < 6) {
      alert('Please enter a valid 6-digit verification code');
      return;
    }
    this.loading.set(true);

    setTimeout(() => {
      this.loading.set(false);
      if (this.verificationCode() === this.currentCode) {
        this.modal.close({ 
          method: this.method(), 
          contactInfo: this.contactInfo(),
          enabled: true
        });
        alert('Two-Factor Authentication enabled successfully!');
      } else {
        alert('Invalid verification code. Please check the code sent to your email and try again.');
      }
    }, 500);
  }

  cancel(): void {
    this.modal.dismiss();
  }
}
