import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgOptimizedImage } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, catchError, of, switchMap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { UsersService } from '../../../../core/services/users.service';
import { RegistrationService } from '../../../../core/services/registration.service';

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
  private readonly registrationService = inject(RegistrationService);
  private readonly usersService = inject(UsersService);
  private readonly router = inject(Router);
  protected readonly theme = inject(AuthThemeService);

  protected readonly isDevelopment = !environment.production;
  protected readonly activating = signal(false);

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
          console.log('DEBUG: Login result in component:', result);
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
        error: (err) => {
          console.error('Detailed login error:', err);
          console.error('Error status:', err?.status);
          console.error('Error message:', err?.message);
          console.error('Error details:', err?.error);

          if (err instanceof HttpErrorResponse) {
            console.error('🔍 Full HTTP error body:', err.error);
          }

          let errorMessage = 'Unable to sign in. Verify your credentials and try again.';

          if (err?.status === 0) {
            errorMessage =
              'Unable to connect to the server. Please ensure the backend API is running on port 5028.';
          } else if (err?.status === 404) {
            errorMessage = 'Login endpoint not found. Please check API configuration.';
          } else if (err?.error?.title) {
            errorMessage = err.error.title;
          } else if (err?.error?.message) {
            errorMessage = err.error.message;
          } else if (err?.error?.detail) {
            errorMessage = err.error.detail;
          } else if (err?.message) {
            errorMessage = err.message;
          }

          this.statusTone.set('error');
          this.statusMessage.set(errorMessage);
        },
      });
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  protected forceActivate(): void {
    const username = this.loginForm.controls.username.value.trim();
    if (!username) return;

    this.activating.set(true);
    this.statusMessage.set('Searching for account...');

    // 1. Search for user by searchTerm to get the actual GUID ID
    this.usersService
      .getAll({ searchTerm: username })
      .pipe(
        switchMap((response) => {
          if (response.success && response.data && 'items' in response.data && response.data.items.length) {
            // Find exact match by username
            const exactMatch = response.data.items.find(
              (u: any) => u.username.toLowerCase() === username.toLowerCase(),
            );
            const userId = exactMatch?.id || response.data.items[0].id;
            this.statusMessage.set('Force activating account...');
            return this.usersService.activate(userId);
          }

          // Fallback: If getAll is not matching or returns empty, try direct getById(username)
          return this.usersService.getById(username).pipe(
            switchMap((directRes) => {
              if (directRes.success && directRes.data && 'id' in directRes.data && directRes.data.id) {
                return this.usersService.activate(directRes.data.id);
              }
              throw new Error('User not found in system.');
            }),
          );
        }),
        finalize(() => this.activating.set(false)),
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.statusTone.set('success');
            this.statusMessage.set('Account activated successfully! You can now sign in.');
          } else {
            this.statusTone.set('error');
            this.statusMessage.set(response.message || 'Activation failed.');
          }
        },
        error: (err) => {
          console.error('Force activation failed:', err);
          this.statusTone.set('error');
          this.statusMessage.set('Could not activate account. The user may not exist.');
        },
      });
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
