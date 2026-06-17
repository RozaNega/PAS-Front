import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgOptimizedImage } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, switchMap } from 'rxjs';

import { LoginTransitionService } from '../../../../core/services/login-transition.service';
import { UsersService } from '../../../../core/services/users.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AuthApi } from '../../services/auth-api';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly usersService = inject(UsersService);
  private readonly authApi = inject(AuthApi);
  private readonly activeRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly transitionSvc = inject(LoginTransitionService);

  protected readonly submitted = signal(false);
  protected readonly loading = signal(false);
  protected readonly statusMessage = signal('');
  protected readonly statusTone = signal<'neutral' | 'success' | 'error'>('neutral');
  protected readonly showPassword = signal(false);

  protected readonly loginForm = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rememberMe: [true],
  });

  constructor() {
    // If reset-password passed the username directly, use it (no lookup needed)
    const usernameParam = this.activeRoute.snapshot.queryParamMap.get('username');
    if (usernameParam) {
      this.loginForm.controls.username.setValue(usernameParam);
      return;
    }

    const emailParam = this.activeRoute.snapshot.queryParamMap.get('email');
    if (emailParam) {
      // 1. Try AuthApi mock (local storage) — works even when backend is down
      const localUser = this.authApi
        .knownUsers()
        .find((u: any) => u.email?.toLowerCase() === emailParam.toLowerCase());
      if (localUser?.displayName) {
        this.loginForm.controls.username.setValue(localUser.displayName);
        return;
      }
      // 2. Try backend API (has real username field)
      this.usersService.getAll().subscribe({
        next: (response) => {
          if (!response.success) { this.loginForm.controls.username.setValue(emailParam); return; }
          const items = response.data && 'items' in response.data
            ? (response.data as { items: any[] }).items
            : Array.isArray(response.data) ? response.data : [];
          const user = items.find((u: any) => u.email?.toLowerCase() === emailParam.toLowerCase());
          this.loginForm.controls.username.setValue(user?.username || user?.displayName || '');
        },
        error: () => {},
      });
    }
  }

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
          this.statusMessage.set('Sign-in successful.');
          this.loginForm.controls.password.setValue('');
          this.loginForm.controls.rememberMe.setValue(raw.rememberMe);

          const targetUrl = this.authService.getDashboardRouteForUser(result.user);
          console.log('[Login] targetUrl:', targetUrl, 'user:', result.user);

          this.transitionSvc.start();

          this.router.navigateByUrl(targetUrl).then((navResult) => {
            console.log('[Login] Navigation result:', navResult);
            this.transitionSvc.end();

            setTimeout(() => {
              console.log('[Login] 2s after nav, current URL:', window.location.href, 'isAuth:', this.authService.isAuthenticated());
            }, 2000);
          }).catch((err) => {
            console.error('[Login] Navigation ERROR:', err);
            this.transitionSvc.end();
            this.statusTone.set('error');
            this.statusMessage.set('Navigation error: ' + (err?.message || 'unknown'));
          });
        },
        error: (err) => {
          let errorMessage = 'Unable to sign in. Verify your credentials and try again.';

          if (err instanceof HttpErrorResponse) {
            if (err.status === 0) {
              errorMessage = 'Unable to connect to the server. Please ensure the backend API is running.';
            } else if (err.status === 404) {
              errorMessage = 'Login endpoint not found. Please check API configuration.';
            } else if (err.error?.title) {
              errorMessage = err.error.title;
            } else if (err.error?.message) {
              errorMessage = err.error.message;
            } else if (err.error?.detail) {
              errorMessage = err.error.detail;
            }
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

    this.statusMessage.set('Searching for account...');
    this.statusTone.set('neutral');

    this.usersService
      .getAll({ searchTerm: username })
      .pipe(
        switchMap((response) => {
          if (response.success && response.data && 'items' in response.data && response.data.items.length) {
            const exactMatch = response.data.items.find(
              (u: any) => u.username.toLowerCase() === username.toLowerCase(),
            );
            const userId = exactMatch?.id || response.data.items[0].id;
            this.statusMessage.set('Force activating account...');
            return this.usersService.activate(userId);
          }
          return this.usersService.getById(username).pipe(
            switchMap((directRes) => {
              if (directRes.success && directRes.data && 'id' in directRes.data && directRes.data.id) {
                return this.usersService.activate(directRes.data.id);
              }
              throw new Error('User not found in system.');
            }),
          );
        }),
        finalize(() => {}),
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
        error: () => {
          this.statusTone.set('error');
          this.statusMessage.set('Could not activate account. The user may not exist.');
        },
      });
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
