import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthApi } from '../../services/auth-api';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly authApi = inject(AuthApi);

  protected readonly submitted = signal(false);
  protected readonly loading = signal(false);
  protected readonly statusMessage = signal(
    'Paste the reset token from the previous step and set a new password.',
  );
  protected readonly statusTone = signal<'neutral' | 'success' | 'error'>('neutral');
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);
  protected readonly routeToken = signal(this.route.snapshot.queryParamMap.get('token') ?? '');
  protected readonly routeEmail = signal(this.route.snapshot.queryParamMap.get('email') ?? '');
  protected readonly resetForm = this.formBuilder.nonNullable.group(
    {
      token: [this.routeToken(), [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator },
  );

  protected submit(): void {
    this.submitted.set(true);

    if (this.resetForm.invalid) {
      this.statusTone.set('error');
      this.statusMessage.set('Add the token and a matching password before submitting.');
      this.resetForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const result = this.authApi.resetPassword({
      token: this.resetForm.controls.token.value,
      password: this.resetForm.controls.password.value,
    });
    this.loading.set(false);
    this.statusTone.set(result.success ? 'success' : 'error');
    this.statusMessage.set(result.message);

    if (result.success) {
      const token = this.resetForm.controls.token.value;
      this.resetForm.reset({
        token,
        password: '',
        confirmPassword: '',
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

  protected showControlError(controlName: 'token' | 'password' | 'confirmPassword'): boolean {
    const control = this.resetForm.controls[controlName];
    return control.invalid && (control.touched || this.submitted());
  }

  protected hasPasswordMismatch(): boolean {
    return (
      this.resetForm.hasError('passwordMismatch') &&
      (this.resetForm.controls.confirmPassword.touched || this.submitted())
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
