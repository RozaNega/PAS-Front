import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { WarehousesService, CreateWarehouseRequest } from '../../../../../core/services/warehouses.service';

@Component({
  selector: 'app-warehouse-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './warehouse-create.html',
  styleUrl: './warehouse-create.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class WarehouseCreate implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly warehousesService = inject(WarehousesService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Reactive form that mirrors the API contract (CreateWarehouseCommand) */
  form!: FormGroup;

  isSubmitting = false;
  submitError = '';
  submitSuccess = '';

  /** Field length caps — mirror CreateWarehouseCommandValidator */
  readonly maxLengths = {
    warehouseName: 100,
    locationCode: 50,
    address: 200,
    city: 100,
    country: 100,
    contactPerson: 100,
    contactPhone: 20,
    contactEmail: 100,
  };

  ngOnInit(): void {
    this.form = this.fb.nonNullable.group({
      warehouseName: ['', [Validators.required, Validators.maxLength(this.maxLengths.warehouseName)]],
      locationCode: ['', [Validators.required, Validators.maxLength(this.maxLengths.locationCode)]],
      address: ['', [Validators.maxLength(this.maxLengths.address)]],
      city: ['', [Validators.maxLength(this.maxLengths.city)]],
      country: ['', [Validators.maxLength(this.maxLengths.country)]],
      contactPerson: ['', [Validators.maxLength(this.maxLengths.contactPerson)]],
      contactPhone: ['', [Validators.maxLength(this.maxLengths.contactPhone)]],
      contactEmail: [
        '',
        [
          Validators.email,
          Validators.maxLength(this.maxLengths.contactEmail),
        ],
      ],
    });
  }

  // ── Field helpers ─────────────────────────────────────────────────────────

  /** Human-readable label used for required-field error messages */
  fieldLabel(field: string): string {
    switch (field) {
      case 'warehouseName':
        return 'Warehouse name';
      case 'locationCode':
        return 'Location code';
      case 'contactEmail':
        return 'Contact email';
      default:
        return field;
    }
  }

  hasError(field: string, error: string): boolean {
    const ctrl = this.form.get(field);
    return !!ctrl && ctrl.touched && ctrl.hasError(error);
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!ctrl && ctrl.invalid && (ctrl.touched || ctrl.dirty);
  }

  // ── Submit / cancel ───────────────────────────────────────────────────────

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    this.submitError = '';
    this.submitSuccess = '';
    this.cdr.markForCheck();

    // Build the payload EXACTLY as the API expects
    // (CreateWarehouseCommand has no IsActive — server defaults it).
    const payload: CreateWarehouseRequest = {
      warehouseName: this.form.value.warehouseName?.trim() ?? '',
      locationCode: this.form.value.locationCode?.trim() ?? '',
      address: this.form.value.address?.trim() ?? '',
      city: this.form.value.city?.trim() ?? '',
      country: this.form.value.country?.trim() ?? '',
      contactPerson: this.form.value.contactPerson?.trim() ?? '',
      contactPhone: this.form.value.contactPhone?.trim() ?? '',
      contactEmail: this.form.value.contactEmail?.trim() ?? '',
    };

    this.warehousesService.create(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        if (res.success) {
          this.submitSuccess = 'Warehouse created successfully.';
          this.cdr.markForCheck();
          setTimeout(() => {
            void this.router.navigate(['/storage/warehouses']);
          }, 800);
        } else {
          this.submitError = res.message || 'Failed to create warehouse.';
          this.cdr.markForCheck();
        }
      },
      error: (err: { status?: number; error?: { message?: string; detail?: string; errors?: Record<string, string[]> } }) => {
        this.isSubmitting = false;
        const status = err.status ?? 0;
        let msg = 'Failed to create warehouse. Please try again.';
        if (status === 0) msg = 'Network error — check your connection.';
        else if (status === 400) {
          const fieldErrors = err.error?.errors;
          if (fieldErrors) {
            const firstKey = Object.keys(fieldErrors)[0];
            const firstMsg = firstKey ? fieldErrors[firstKey]?.[0] : undefined;
            msg = firstMsg
              ? `${this.fieldLabel(this.camelToField(firstKey))}: ${firstMsg}`
              : (err.error?.message ?? 'Invalid data.');
          } else {
            msg = err.error?.message ?? err.error?.detail ?? 'Invalid data.';
          }
        } else if (status === 401) msg = 'Your session has expired. Please log in again.';
        else if (status === 403) msg = 'You do not have permission to create warehouses.';
        else if (status === 500)
          msg = `Server error: ${err.error?.message ?? err.error?.detail ?? 'Please try again later.'}`;
        this.submitError = msg;
        this.cdr.markForCheck();
      },
    });
  }

  cancel(): void {
    void this.router.navigate(['/storage/warehouses']);
  }

  /** Convert PascalCase API field name → camelCase form control name */
  private camelToField(name: string): string {
    return name.charAt(0).toLowerCase() + name.slice(1);
  }
}
