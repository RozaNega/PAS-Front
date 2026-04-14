import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthApi } from '../../services/auth-api';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly formBuilder = inject(FormBuilder);
  protected readonly authApi = inject(AuthApi);
  protected readonly isAuthenticated = this.authApi.isAuthenticated;
  protected readonly activeUser = this.authApi.activeUser;

  protected readonly submitted = signal(false);
  protected readonly loading = signal(false);
  protected readonly statusMessage = signal(
    'Use the seeded demo account or any local account you created.',
  );
  protected readonly statusTone = signal<'neutral' | 'success' | 'error'>('neutral');
  protected readonly showPassword = signal(false);
  protected readonly demoEmail = 'demo@pas.local';
  protected readonly demoPassword = 'Password123!';
  protected readonly featureHighlights = [
    {
      title: 'Local session',
      description:
        'The demo auth service stores the current session locally and restores it on refresh.',
    },
    {
      title: 'Seeded account',
      description:
        'A working admin-style account is preloaded so the workflow is usable immediately.',
    },
    {
      title: 'Password reset',
      description:
        'Request a reset token and move through the full local reset flow without a backend.',
    },
  ] as const;
  protected readonly loginForm = this.formBuilder.nonNullable.group({
    email: [this.demoEmail, [Validators.required, Validators.email]],
    password: [this.demoPassword, [Validators.required, Validators.minLength(8)]],
    rememberMe: [true],
  });

  protected submit(): void {
    this.submitted.set(true);

    if (this.loginForm.invalid) {
      this.statusTone.set('error');
      this.statusMessage.set('Fix the highlighted fields before continuing.');
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const result = this.authApi.login(this.loginForm.getRawValue());
    this.loading.set(false);
    this.statusTone.set(result.success ? 'success' : 'error');
    this.statusMessage.set(result.message);

    if (result.success) {
      this.loginForm.controls.password.setValue('');
      this.loginForm.controls.rememberMe.setValue(true);
    }
  }

  protected logout(): void {
    this.authApi.logout();
    this.statusTone.set('neutral');
    this.statusMessage.set('You have been signed out of the local session.');
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  protected showFieldError(controlName: 'email' | 'password'): boolean {
    const control = this.loginForm.controls[controlName];
    return control.invalid && (control.touched || this.submitted());
  }

  protected hasRequiredError(controlName: 'email' | 'password'): boolean {
    const control = this.loginForm.controls[controlName];
    return control.hasError('required') && this.showFieldError(controlName);
  }

  protected hasEmailError(): boolean {
    const control = this.loginForm.controls.email;
    return control.hasError('email') && this.showFieldError('email');
  }
}
