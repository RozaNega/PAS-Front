import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthApi } from '../../services/auth-api';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authApi = inject(AuthApi);

  protected readonly submitted = signal(false);
  protected readonly loading = signal(false);
  protected readonly statusMessage = signal(
    'Create a local profile to keep testing the auth flow.',
  );
  protected readonly statusTone = signal<'neutral' | 'success' | 'error'>('neutral');
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);
  protected readonly registerForm = this.formBuilder.nonNullable.group(
    {
      displayName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      acceptedTerms: [false, [Validators.requiredTrue]],
    },
    { validators: passwordsMatchValidator },
  );

  protected submit(): void {
    this.submitted.set(true);

    if (this.registerForm.invalid) {
      this.statusTone.set('error');
      this.statusMessage.set('Complete all required fields before creating the account.');
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const result = this.authApi.register(this.registerForm.getRawValue());
    this.loading.set(false);
    this.statusTone.set(result.success ? 'success' : 'error');
    this.statusMessage.set(result.message);

    if (result.success) {
      this.registerForm.reset({
        displayName: '',
        email: '',
        password: '',
        confirmPassword: '',
        acceptedTerms: false,
      });
      this.submitted.set(false);
    }
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  protected toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((value) => !value);
  }

  protected showControlError(
    controlName: 'displayName' | 'email' | 'password' | 'confirmPassword' | 'acceptedTerms',
  ): boolean {
    const control = this.registerForm.controls[controlName];
    return control.invalid && (control.touched || this.submitted());
  }

  protected hasPasswordMismatch(): boolean {
    return (
      this.registerForm.hasError('passwordMismatch') &&
      (this.registerForm.controls.confirmPassword.touched || this.submitted())
    );
  }
}

const passwordsMatchValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  return password === confirmPassword ? null : { passwordMismatch: true };
};
