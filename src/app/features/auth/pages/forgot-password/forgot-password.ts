import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthApi } from '../../services/auth-api';
import { AuthThemeService } from '../../services/auth-theme.service';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authApi = inject(AuthApi);
  protected readonly theme = inject(AuthThemeService);

  protected readonly submitted = signal(false);
  protected readonly loading = signal(false);
  protected readonly statusMessage = signal('');
  protected readonly statusTone = signal<'neutral' | 'success' | 'error'>('neutral');
  protected readonly generatedToken = signal('');
  protected readonly themePanelOpen = signal(false);
  protected readonly forgotForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
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
    const result = this.authApi.requestPasswordReset(this.forgotForm.getRawValue());
    this.loading.set(false);
    this.statusTone.set(result.success ? 'success' : 'error');
    this.statusMessage.set(result.message);

    if (result.success && result.resetToken) {
      this.generatedToken.set(result.resetToken);
    }
  }

  protected showEmailError(): boolean {
    const control = this.forgotForm.controls.email;
    return control.invalid && (control.touched || this.submitted());
  }

  protected resetQueryParams(): Record<string, string> | null {
    const token = this.generatedToken();

    if (!token) {
      return null;
    }

    return {
      token,
      email: this.forgotForm.controls.email.value,
    };
  }

  protected toggleDarkMode(): void {
    this.theme.toggleDarkMode();
  }

  protected toggleThemePanel(): void {
    this.themePanelOpen.update((value) => !value);
  }

  protected closeThemePanel(): void {
    this.themePanelOpen.set(false);
  }

  protected setPrimary(optionId: string): void {
    this.theme.setPrimary(optionId);
    this.themePanelOpen.set(false);
  }
}
