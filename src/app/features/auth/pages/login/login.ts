import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgOptimizedImage } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { AuthApi } from '../../services/auth-api';
import { AuthThemeService } from '../../services/auth-theme.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authApi = inject(AuthApi);
  private readonly route = inject(ActivatedRoute);
  protected readonly theme = inject(AuthThemeService);

  protected readonly submitted = signal(false);
  protected readonly loading = signal(false);
  protected readonly statusMessage = signal('');
  protected readonly statusTone = signal<'neutral' | 'success' | 'error'>('neutral');
  protected readonly showPassword = signal(false);
  protected readonly themePanelOpen = signal(false);
  protected readonly quickRoles = [
    { label: 'Admin', slug: 'admin' },
    { label: 'Storekeeper', slug: 'storekeeper' },
    { label: 'Employee', slug: 'employee' },
    { label: 'Manager', slug: 'manager' },
    { label: 'Compliance Officer', slug: 'compliance-officer' },
  ] as const;
  private readonly roleFromUrl = toSignal(
    this.route.paramMap.pipe(map((params) => (params.get('role') ?? '').toLowerCase())),
    { initialValue: '' },
  );
  protected readonly activeRoleLabel = computed(() => {
    const slug = this.roleFromUrl();
    const match = this.quickRoles.find((role) => role.slug === slug);
    return match?.label ?? null;
  });

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
    const result = this.authApi.login({
      email: raw.username,
      password: raw.password,
      rememberMe: raw.rememberMe,
    });

    this.loading.set(false);
    this.statusTone.set(result.success ? 'success' : 'error');
    this.statusMessage.set(result.message);

    if (result.success) {
      this.loginForm.controls.password.setValue('');
      this.loginForm.controls.rememberMe.setValue(raw.rememberMe);
    }
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
