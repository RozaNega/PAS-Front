import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  protected readonly submitted = signal(false);
  protected readonly loading = signal(false);
  protected readonly statusMessage = signal('');
  protected readonly statusTone = signal<'neutral' | 'success' | 'error'>('neutral');
  protected readonly requestSuccessful = signal(false);
  protected readonly generatedToken = signal('');

  protected readonly forgotForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    username: [''],
  });

  protected submit(): void {
    this.submitted.set(true);

    if (this.forgotForm.invalid) {
      this.statusTone.set('error');
      this.statusMessage.set('Add a valid email address before requesting a reset token.');
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const raw = this.forgotForm.getRawValue();

    this.authService
      .forgotPassword({ email: raw.email, username: raw.username || undefined })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => {
          this.statusTone.set(result.succeeded ? 'success' : 'error');
          if (result.succeeded) {
            this.statusMessage.set('Reset request successful! Please check your email inbox.');
            this.requestSuccessful.set(true);
            if (result.token) {
              this.generatedToken.set(result.token);
            }
            this.forgotForm.disable();
          } else {
            this.statusMessage.set(result.message || 'Request failed.');
          }
        },
        error: () => {
          this.statusTone.set('error');
          this.statusMessage.set('Unable to process request. Please try again later.');
        },
      });
  }

  protected showEmailError(): boolean {
    const control = this.forgotForm.controls.email;
    return control.invalid && (control.touched || this.submitted());
  }
}
