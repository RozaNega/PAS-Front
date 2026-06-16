import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  protected readonly submitted = signal(false);
  protected readonly loading = signal(false);
  protected readonly statusMessage = signal('');
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

    this.authService
      .resetPassword({
        email: this.routeEmail(),
        token: this.resetForm.controls.token.value,
        newPassword: this.resetForm.controls.password.value,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => {
          this.statusTone.set(result.succeeded ? 'success' : 'error');
          this.statusMessage.set(result.message || (result.succeeded ? 'Password successfully reset.' : 'Failed to reset password.'));

          if (result.succeeded) {
            const email = this.routeEmail();
            void this.router.navigate(['/auth/login'], { queryParams: { email } });
          }
        },
        error: () => {
          this.statusTone.set('error');
          this.statusMessage.set('Unable to process request. Please try again later.');
        },
      });
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
