import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { finalize } from 'rxjs';

import { PropertiesService } from '../../../../../core/services/properties.service';
import { PropertyTypesService, PropertyTypeDto } from '../../../../../core/services/property-types.service';
import { LocationsService, LocationDto } from '../../../../../core/services/locations.service';
import { SafetyBoxesService, SafetyBoxDto } from '../../../../../core/services/safety-boxes.service';
import { PropertyCategoryService, PropertyCategoryDto } from '../../../../property-management/property-categories/services/property-category.service';

@Component({
  selector: 'app-property-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './property-form.component.html',
  styleUrls: ['./property-form.component.scss']
})
export class PropertyFormComponent implements OnInit {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private propertiesService = inject(PropertiesService);
  private propertyTypesService = inject(PropertyTypesService);
  private locationsService = inject(LocationsService);
  private safetyBoxesService = inject(SafetyBoxesService);
  private propertyCategoryService = inject(PropertyCategoryService);

  currentStep = signal(1);
  readonly totalSteps = 4;
  loading = false;
  submitting = false;

  propertyTypes = signal<PropertyTypeDto[]>([]);
  categories = signal<PropertyCategoryDto[]>([]);
  locations = signal<LocationDto[]>([]);
  safetyBoxes = signal<SafetyBoxDto[]>([]);

  employees = [
    { value: 'john-doe', label: 'John Doe (IT Manager)' },
    { value: 'sarah-smith', label: 'Sarah Smith (Store Officer)' },
    { value: 'unassigned', label: 'Unassigned' }
  ];

  maintenanceSchedules = [
    { value: '3-months', label: 'Every 3 months' },
    { value: '6-months', label: 'Every 6 months' },
    { value: '12-months', label: 'Every 12 months' },
    { value: '24-months', label: 'Every 24 months' }
  ];

  stepIcons = ['bi-info-circle', 'bi-currency-dollar', 'bi-geo-alt', 'bi-shield-check'];
  stepLabels = ['Basic Info', 'Financial', 'Location', 'Additional'];

  uploadedFiles = signal<{ name: string; size: number; type: string }[]>([]);
  notification = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  showCancelConfirm = signal(false);
  showSuccessModal = signal(false);

  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      tagNumber: ['', Validators.required],
      propertyName: ['', Validators.required],
      serialNumber: ['', Validators.required],
      modelNumber: [''],
      description: [''],
      propertyTypeId: ['', Validators.required],
      propertyCategoryId: [''],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      currency: ['ETB'],
      purchaseDate: ['', Validators.required],
      poNumber: [''],
      supplier: [''],
      locationId: ['', Validators.required],
      safetyBoxId: [''],
      shelfNumber: [0],
      warrantyStart: [''],
      warrantyEnd: [''],
      maintenanceSchedule: ['Every 6 months'],
      assignedTo: [''],
      notes: ['']
    });

    // Auto-calculate total value when unitPrice or quantity changes
    this.form.get('unitPrice')?.valueChanges.subscribe(() => this.updateTotalValue());
    this.form.get('quantity')?.valueChanges.subscribe(() => this.updateTotalValue());
  }

  ngOnInit(): void {
    this.loadDropdownData();
  }

  loadDropdownData(): void {
    // Load property types
    this.propertyTypesService.getAll().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Handle both paginated and array responses
          const items = Array.isArray(response.data) ? response.data : ((response.data as any)?.items || []);
          this.propertyTypes.set(items);
        }
      }
    });

    // Load property categories (using the correct service with GUID IDs)
    this.propertyCategoryService.getAll().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const items = Array.isArray(response.data) ? response.data : ((response.data as any)?.items || []);
          this.categories.set(items);
        }
      }
    });

    // Load locations
    this.locationsService.getAll().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Handle both paginated and array responses
          const items = Array.isArray(response.data) ? response.data : ((response.data as any)?.items || []);
          this.locations.set(items);
        }
      }
    });

    // Load safety boxes
    this.safetyBoxesService.getAll().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Handle both paginated and array responses
          const items = Array.isArray(response.data) ? response.data : ((response.data as any)?.items || []);
          this.safetyBoxes.set(items);
        }
      }
    });
  }

  updateTotalValue(): void {
    const unitPrice = this.form.get('unitPrice')?.value || 0;
    const quantity = this.form.get('quantity')?.value || 1;
    // We don't store totalValue in the form, just calculate it for display
  }

  get totalValue(): number {
    const unitPrice = this.form.get('unitPrice')?.value || 0;
    const quantity = this.form.get('quantity')?.value || 1;
    return unitPrice * quantity;
  }

  nextStep(): void {
    if (this.currentStep() < this.totalSteps) {
      // Validate current step before moving to next
      if (this.isCurrentStepValid()) {
        this.currentStep.update(s => s + 1);
      } else {
        this.form.markAllAsTouched();
        this.showNotification('Please fill in all required fields', 'error');
      }
    }
  }

  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
    }
  }

  goToStep(step: number): void {
    if (step >= 1 && step <= this.totalSteps) {
      this.currentStep.set(step);
    }
  }

  generateTagNumber(): void {
    const tag = 'TAG-' + Date.now().toString(36).toUpperCase();
    this.form.patchValue({ tagNumber: tag });
  }

  handleFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files) {
      const newFiles = Array.from(files).map(file => ({
        name: file.name,
        size: file.size,
        type: file.type
      }));
      this.uploadedFiles.update(f => [...f, ...newFiles]);
    }
  }

  removeFile(index: number): void {
    this.uploadedFiles.update(f => f.filter((_, i) => i !== index));
  }

  showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    this.notification.set({ message, type });
    setTimeout(() => this.notification.set(null), 3500);
  }

  isCurrentStepValid(): boolean {
    const step = this.currentStep();
    if (step === 1) {
      return !!(this.form.get('tagNumber')?.valid &&
             this.form.get('propertyName')?.valid &&
             this.form.get('serialNumber')?.valid &&
             this.form.get('propertyTypeId')?.valid);
    }
    if (step === 2) {
      return !!(this.form.get('unitPrice')?.valid &&
             this.form.get('quantity')?.valid &&
             this.form.get('purchaseDate')?.valid);
    }
    if (step === 3) {
      return !!this.form.get('locationId')?.valid;
    }
    return true;
  }

  saveAsDraft(): void {
    this.showNotification('Property saved as draft!', 'success');
  }

  submitForm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.showNotification('Please fill in all required fields', 'error');
      return;
    }

    this.submitting = true;

    const formValue = this.form.value;

    // Build the payload matching the backend CreatePropertyCommand
    // Only include propertyCategoryId if a valid value was selected
    const payload: Record<string, unknown> = {
      tagNumber: formValue.tagNumber,
      name: formValue.propertyName,
      serialNumber: formValue.serialNumber,
      propertyTypeId: formValue.propertyTypeId,
      unitPrice: formValue.unitPrice,
      quantity: formValue.quantity,
      purchaseDate: formValue.purchaseDate,
      locationId: formValue.locationId,
    };

    // Only add optional fields if they have values
    if (formValue.propertyCategoryId) payload['propertyCategoryId'] = formValue.propertyCategoryId;
    if (formValue.modelNumber) payload['modelNumber'] = formValue.modelNumber;
    if (formValue.description) payload['description'] = formValue.description;
    if (formValue.poNumber) payload['poNumber'] = formValue.poNumber;
    if (formValue.supplier) payload['supplier'] = formValue.supplier;
    if (formValue.warrantyStart) payload['warrantyStart'] = formValue.warrantyStart;
    if (formValue.warrantyEnd) payload['warrantyEnd'] = formValue.warrantyEnd;
    if (formValue.maintenanceSchedule) payload['maintenanceSchedule'] = formValue.maintenanceSchedule;
    if (formValue.assignedTo) payload['assignedTo'] = formValue.assignedTo;
    if (formValue.notes) payload['notes'] = formValue.notes;
    if (formValue.safetyBoxId) payload['safetyBoxId'] = formValue.safetyBoxId;
    if (formValue.shelfNumber) payload['shelfNumber'] = formValue.shelfNumber;

    this.propertiesService.create(payload)
      .pipe(finalize(() => this.submitting = false))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showSuccessModal.set(true);
            this.showNotification('Property created successfully!', 'success');
          } else {
            this.showNotification('Failed to create property: ' + response.message, 'error');
          }
        },
        error: (error) => {
          console.error('Error creating property:', error);
          this.showNotification('Error creating property: ' + (error.error?.message || 'Unknown error'), 'error');
        }
      });
  }

  closeSuccessModal(): void {
    this.showSuccessModal.set(false);
    this.router.navigate(['/admin/properties']);
  }

  requestCancel(): void {
    this.showCancelConfirm.set(true);
  }

  cancelConfirm(): void {
    this.showCancelConfirm.set(false);
    this.router.navigate(['/admin/properties']);
  }

  cancelDismiss(): void {
    this.showCancelConfirm.set(false);
  }

  formatCurrency(value: number): string {
    return `ETB ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  getStepClass(step: number): string {
    if (this.currentStep() === step) return 'active';
    if (this.currentStep() > step) return 'completed';
    return '';
  }

  // Helper to display error messages
  hasError(controlName: string, errorName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.touched && control.hasError(errorName);
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }
}