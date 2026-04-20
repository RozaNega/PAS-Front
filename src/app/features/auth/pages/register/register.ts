import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthApi } from '../../services/auth-api';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authApi = inject(AuthApi);

  protected readonly submitted = signal(false);
  protected readonly loading = signal(false);
  protected readonly statusMessage = signal('Register your PAS account.');
  protected readonly statusTone = signal<'neutral' | 'success' | 'error'>('neutral');
  protected readonly showPassword = signal(false);

  protected readonly registerForm = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    acceptedTerms: [true, [Validators.requiredTrue]],
  });

  protected submit(): void {
    this.submitted.set(true);

    if (this.registerForm.invalid) {
      this.statusTone.set('error');
      this.statusMessage.set('Complete all required fields before creating the account.');
      this.registerForm.markAllAsTouched();
      return;
    }

    const raw = this.registerForm.getRawValue();

    this.loading.set(true);
    const result = this.authApi.register({
      displayName: raw.fullName,
      email: raw.email,
      password: raw.password,
      acceptedTerms: raw.acceptedTerms,
    });

    this.loading.set(false);
    this.statusTone.set(result.success ? 'success' : 'error');
    this.statusMessage.set(result.message);

    if (result.success) {
      this.registerForm.reset({
        fullName: '',
        username: '',
        email: '',
        password: '',
        acceptedTerms: true,
      });
      this.submitted.set(false);
    }
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  protected showControlError(
    controlName: 'fullName' | 'username' | 'email' | 'password' | 'acceptedTerms',
  ): boolean {
    const control = this.registerForm.controls[controlName];
    return control.invalid && (control.touched || this.submitted());
  }
}
