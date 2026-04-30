import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgOptimizedImage } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthThemeService } from '../../services/auth-theme.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
    protected readonly quickRoles = [
      { label: 'Admin', slug: 'property-admin' },
      { label: 'Storekeeper', slug: 'storekeeper' },
      { label: 'Employee', slug: 'employee' },
      { label: 'Manager', slug: 'manager' },
      { label: 'Compliance Officer', slug: 'compliance' },
    ];
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly theme = inject(AuthThemeService);

  protected readonly submitted = signal(false);
  protected readonly loading = signal(false);
  protected readonly statusMessage = signal('');
  protected readonly statusTone = signal<'neutral' | 'success' | 'error'>('neutral');
  protected readonly showPassword = signal(false);
  protected readonly themePanelOpen = signal(false);

  protected readonly loginForm = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8)]],
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
    const raw = this.loginForm.getRawValue();
    this.authService
      .login({
        username: raw.username.trim(),
        password: raw.password,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => {
          if (!result.succeeded) {
            this.statusTone.set('error');
            this.statusMessage.set(result.errors?.join(' ') || 'Invalid username or password.');
            return;
          }

          this.statusTone.set('success');
          this.statusMessage.set('Sign-in successful. Redirecting to your dashboard...');
          this.loginForm.controls.password.setValue('');
          this.loginForm.controls.rememberMe.setValue(raw.rememberMe);
          void this.router.navigateByUrl(this.authService.getDashboardRouteForUser(result.user));
        },
        error: () => {
          this.statusTone.set('error');
          this.statusMessage.set('Unable to sign in. Verify your credentials and try again.');
        },
      });
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
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

  protected showFieldError(controlName: 'username' | 'password'): boolean {
    const control = this.loginForm.controls[controlName];
    return control.invalid && (control.touched || this.submitted());
  }

  protected hasRequiredError(controlName: 'username' | 'password'): boolean {
    const control = this.loginForm.controls[controlName];
    return control.hasError('required') && this.showFieldError(controlName);
  }
}
