import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthApi } from '../../services/auth-api';
import { AuthThemeService } from '../../services/auth-theme.service';
import { RegistrationService } from '../../../../core/services/registration.service';

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
  private readonly registrationService = inject(RegistrationService);
  protected readonly theme = inject(AuthThemeService);

  protected readonly roleOptions = [
    { label: 'Admin', value: 'Admin' },
    { label: 'Storekeeper', value: 'Storekeeper' },
    { label: 'Employee', value: 'Employee' },
    { label: 'Manager', value: 'Manager' },
    { label: 'Compliance Officer', value: 'Compliance Officer' },
  ] as const;

  protected readonly submitted = signal(false);
  protected readonly loading = signal(false);
  protected readonly statusMessage = signal('');
  protected readonly statusTone = signal<'neutral' | 'success' | 'error'>('neutral');
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);
  protected readonly themePanelOpen = signal(false);

  protected readonly registerForm = this.formBuilder.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s()-]{7,20}$/)]],
      email: ['', [Validators.required, Validators.email]],
      department: ['', [Validators.required]],
      employeeCode: ['', [Validators.required]],
      position: ['', [Validators.required]],
      roleName: ['Employee', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      acceptedTerms: [true, [Validators.requiredTrue]],
    },
    {
      validators: [(control) => this.matchPasswordsValidator(control)],
    },
  );

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
    const registerData = {
      username: raw.username,
      password: raw.password,
      confirmPassword: raw.confirmPassword,
      email: raw.email,
      fullName: raw.fullName,
      roleName: raw.roleName,
      department: raw.department,
      employeeCode: raw.employeeCode,
      position: raw.position,
      phoneNumber: raw.phoneNumber || undefined,
    };
    console.log('Sending registration data:', registerData);

    this.registrationService.register(registerData)
    .pipe(finalize(() => this.loading.set(false)))
    .subscribe({
      next: (response) => {
        console.log('Registration response:', response);
        if (response.success) {
          this.statusTone.set('success');
          this.statusMessage.set(response.message || 'Account created successfully! Please login.');
          this.registerForm.reset({
            fullName: '',
            username: '',
            phoneNumber: '',
            email: '',
            department: '',
            employeeCode: '',
            position: '',
            roleName: 'Employee',
            password: '',
            confirmPassword: '',
            acceptedTerms: true,
          });
          this.submitted.set(false);
        } else {
          this.statusTone.set('error');
          this.statusMessage.set(response.message || 'Registration failed. Please try again.');
        }
      },
      error: (error) => {
        console.error('Registration error:', error);
        console.error('Error status:', error.status);
        console.error('Error details:', error.error);
        console.error('Full error:', JSON.stringify(error, null, 2));
        console.error('Error text:', error.error?.text || error.statusText);
        let errorMessage = 'Registration failed. Please try again.';
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.error?.errors) {
          errorMessage = Array.isArray(error.error.errors) ? error.error.errors.join(', ') : JSON.stringify(error.error.errors);
        } else if (typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.status === 400) {
          errorMessage = 'Invalid registration data. Please check your input and try again.';
        }
        this.statusTone.set('error');
        this.statusMessage.set(errorMessage);
      }
    });
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  protected toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((value) => !value);
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

  protected passwordMismatch(): boolean {
    return (
      this.registerForm.hasError('passwordMismatch') &&
      (this.registerForm.controls.confirmPassword.touched || this.submitted())
    );
  }

  protected showControlError(
    controlName:
      | 'fullName'
      | 'username'
      | 'phoneNumber'
      | 'email'
      | 'department'
      | 'employeeCode'
      | 'position'
      | 'roleName'
      | 'password'
      | 'confirmPassword'
      | 'acceptedTerms',
  ): boolean {
    const control = this.registerForm.controls[controlName];
    return control.invalid && (control.touched || this.submitted());
  }

  private matchPasswordsValidator(control: AbstractControl) {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (!password || !confirmPassword) {
      return null;
    }

    return password === confirmPassword ? null : { passwordMismatch: true };
  }
}
