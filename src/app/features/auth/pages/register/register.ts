import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthApi } from '../../services/auth-api';
import { RegistrationService } from '../../../../core/services/registration.service';

interface CountryCallingCode {
  name: string;
  code: string;
}

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

  protected readonly submitted = signal(false);
  protected readonly loading = signal(false);
  protected readonly statusMessage = signal('');
  protected readonly statusTone = signal<'neutral' | 'success' | 'error'>('neutral');
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);

  protected readonly countryCallingCodes: CountryCallingCode[] = [
    { name: 'Ethiopia', code: '+251' },
    { name: 'Afghanistan', code: '+93' },
    { name: 'Albania', code: '+355' },
    { name: 'Algeria', code: '+213' },
    { name: 'Angola', code: '+244' },
    { name: 'Argentina', code: '+54' },
    { name: 'Australia', code: '+61' },
    { name: 'Austria', code: '+43' },
    { name: 'Bahrain', code: '+973' },
    { name: 'Bangladesh', code: '+880' },
    { name: 'Belgium', code: '+32' },
    { name: 'Botswana', code: '+267' },
    { name: 'Brazil', code: '+55' },
    { name: 'Bulgaria', code: '+359' },
    { name: 'Cameroon', code: '+237' },
    { name: 'Canada', code: '+1' },
    { name: 'Chile', code: '+56' },
    { name: 'China', code: '+86' },
    { name: 'Colombia', code: '+57' },
    { name: 'Croatia', code: '+385' },
    { name: 'Cyprus', code: '+357' },
    { name: 'Czech Republic', code: '+420' },
    { name: 'Denmark', code: '+45' },
    { name: 'Egypt', code: '+20' },
    { name: 'Finland', code: '+358' },
    { name: 'France', code: '+33' },
    { name: 'Germany', code: '+49' },
    { name: 'Ghana', code: '+233' },
    { name: 'Greece', code: '+30' },
    { name: 'India', code: '+91' },
    { name: 'Indonesia', code: '+62' },
    { name: 'Ireland', code: '+353' },
    { name: 'Israel', code: '+972' },
    { name: 'Italy', code: '+39' },
    { name: 'Japan', code: '+81' },
    { name: 'Jordan', code: '+962' },
    { name: 'Kenya', code: '+254' },
    { name: 'Kuwait', code: '+965' },
    { name: 'Lebanon', code: '+961' },
    { name: 'Malaysia', code: '+60' },
    { name: 'Mauritius', code: '+230' },
    { name: 'Mexico', code: '+52' },
    { name: 'Morocco', code: '+212' },
    { name: 'Mozambique', code: '+258' },
    { name: 'Namibia', code: '+264' },
    { name: 'Netherlands', code: '+31' },
    { name: 'New Zealand', code: '+64' },
    { name: 'Nigeria', code: '+234' },
    { name: 'Norway', code: '+47' },
    { name: 'Oman', code: '+968' },
    { name: 'Pakistan', code: '+92' },
    { name: 'Philippines', code: '+63' },
    { name: 'Poland', code: '+48' },
    { name: 'Portugal', code: '+351' },
    { name: 'Qatar', code: '+974' },
    { name: 'Romania', code: '+40' },
    { name: 'Rwanda', code: '+250' },
    { name: 'Saudi Arabia', code: '+966' },
    { name: 'Singapore', code: '+65' },
    { name: 'Somalia', code: '+252' },
    { name: 'South Africa', code: '+27' },
    { name: 'South Korea', code: '+82' },
    { name: 'Spain', code: '+34' },
    { name: 'Sudan', code: '+249' },
    { name: 'Sweden', code: '+46' },
    { name: 'Switzerland', code: '+41' },
    { name: 'Tanzania', code: '+255' },
    { name: 'Thailand', code: '+66' },
    { name: 'Tunisia', code: '+216' },
    { name: 'Turkey', code: '+90' },
    { name: 'Uganda', code: '+256' },
    { name: 'Ukraine', code: '+380' },
    { name: 'United Arab Emirates', code: '+971' },
    { name: 'United Kingdom', code: '+44' },
    { name: 'United States', code: '+1' },
    { name: 'Vietnam', code: '+84' },
    { name: 'Zambia', code: '+260' },
    { name: 'Zimbabwe', code: '+263' },
  ];

  protected countryAbbreviation(countryName: string): string {
    const knownAbbreviations: Record<string, string> = {
      Ethiopia: 'ET',
      'Czech Republic': 'CZ',
      'New Zealand': 'NZ',
      'Saudi Arabia': 'SA',
      Singapore: 'SG',
      'South Africa': 'ZA',
      'South Korea': 'KR',
      'United Arab Emirates': 'AE',
      'United Kingdom': 'UK',
      'United States': 'US',
    };

    return knownAbbreviations[countryName] ?? countryName.slice(0, 2).toUpperCase();
  }

  protected readonly registerForm = this.formBuilder.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      username: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(50),
          Validators.pattern(/^[a-zA-Z0-9_]+$/),
        ],
      ],
      countryCode: ['+251', [Validators.required]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{4,15}$/)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      department: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      employeeCode: ['', [Validators.required, this.employeeCodeValidator.bind(this)]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(100),
          this.passwordStrengthValidator,
        ],
      ],
      confirmPassword: ['', [Validators.required]],
      acceptedTerms: [true, [Validators.requiredTrue]],
    },
    {
      validators: [(control) => this.matchPasswordsValidator(control)],
    },
  );

  private employeeCodeValidator(control: AbstractControl) {
    const value = control.value;
    if (!value) return { required: true };
    if (!/^EMP\d+$/.test(value)) return { invalidFormat: true };
    if (value.length < 4 || value.length > 15) return { invalidLength: true };
    return null;
  }

  protected submit(): void {
    this.submitted.set(true);

    if (this.registerForm.invalid) {
      this.statusTone.set('error');
      this.statusMessage.set('Complete all required fields before creating the account.');
      this.registerForm.markAllAsTouched();
      return;
    }

    const raw = this.registerForm.getRawValue();
    const localPhoneNumber = raw.phoneNumber.trim().replace(/\D/g, '').replace(/^0+/, '');
    const registerData = {
      username: raw.username.trim(),
      password: raw.password,
      confirmPassword: raw.confirmPassword,
      email: raw.email.trim().toLowerCase(),
      fullName: raw.fullName.trim(),
      department: raw.department.trim(),
      employeeCode: raw.employeeCode.trim(),
      phoneNumber: localPhoneNumber ? `${raw.countryCode}${localPhoneNumber}` : undefined,
    };

    const validationErrors = this.validateRegistrationData(registerData);
    if (validationErrors.length > 0) {
      this.statusTone.set('error');
      this.statusMessage.set(validationErrors.join(' '));
      return;
    }

    this.loading.set(true);
    this.registrationService
      .register(registerData)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.statusTone.set('success');
            this.statusMessage.set(response.message || 'Account created successfully! Please login.');
            this.registerForm.reset({
              fullName: '',
              username: '',
              countryCode: '+251',
              phoneNumber: '',
              email: '',
              department: '',
              employeeCode: '',
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
          let errorMessage = 'Registration failed. Please try again.';

          if (error.status === 0) {
            errorMessage = 'Unable to connect to the server. Please ensure the backend API is running.';
          } else if (error.status === 400) {
            if (error.error?.errors) {
              const errors = error.error.errors;
              if (typeof errors === 'object') {
                errorMessage = Object.keys(errors).map((key) =>
                  Array.isArray(errors[key]) ? errors[key].join(', ') : errors[key],
                ).join(' ');
              } else if (Array.isArray(errors)) {
                errorMessage = errors.join(' ');
              } else {
                errorMessage = errors.toString();
              }
            } else if (error.error?.message) {
              errorMessage = error.error.message;
            } else {
              errorMessage = 'Invalid registration data. Check your inputs and try again.';
            }
          } else if (error.status === 409) {
            errorMessage = 'Username or email already exists. Please use different credentials.';
          } else if (error.status === 500) {
            errorMessage = 'Server error occurred. Please try again later.';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.error?.errors) {
            errorMessage = Array.isArray(error.error.errors)
              ? error.error.errors.join(', ')
              : JSON.stringify(error.error.errors);
          }

          this.statusTone.set('error');
          this.statusMessage.set(errorMessage);
        },
      });
  }

  private validateRegistrationData(data: any): string[] {
    const errors: string[] = [];
    if (!data.username || data.username.length < 3) errors.push('Username must be at least 3 characters.');
    if (!/^[a-zA-Z0-9_]+$/.test(data.username)) errors.push('Username can only contain letters, numbers, and underscores.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('Please enter a valid email address.');
    if (data.password.length < 8) errors.push('Password must be at least 8 characters.');
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.password)) errors.push('Password must contain uppercase, lowercase, and a number.');
    if (data.phoneNumber && !/^\+\d{7,18}$/.test(data.phoneNumber)) errors.push('Please enter a valid phone number.');
    if (!data.employeeCode || !/^EMP\d+$/.test(data.employeeCode)) errors.push('Employee code must be in format EMP followed by numbers (e.g., EMP1234).');
    if (!data.fullName || data.fullName.length < 2) errors.push('Full name must be at least 2 characters.');
    return errors;
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  protected toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((value) => !value);
  }

  protected passwordMismatch(): boolean {
    return (
      this.registerForm.hasError('passwordMismatch') &&
      (this.registerForm.controls.confirmPassword.touched || this.submitted())
    );
  }

  protected showControlError(controlName: string): boolean {
    const control = this.registerForm.controls[controlName as keyof typeof this.registerForm.controls];
    return control.invalid && (control.touched || this.submitted());
  }

  protected getPasswordStrength(): number {
    const password = this.registerForm.controls.password.value;
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 10;
    if (/[A-Z]/.test(password)) score += 20;
    if (/[a-z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 15;
    return Math.min(score, 100);
  }

  private matchPasswordsValidator(control: AbstractControl) {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    if (!password || !confirmPassword) return null;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  private passwordStrengthValidator(control: AbstractControl) {
    const password = control.value;
    if (!password) return null;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumeric = /[0-9]/.test(password);
    return hasUpperCase && hasLowerCase && hasNumeric ? null : { passwordStrength: true };
  }
}
