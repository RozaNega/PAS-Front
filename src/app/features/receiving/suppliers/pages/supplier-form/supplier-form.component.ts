import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SupplierService } from '../../services/supplier.service';
import { SupplierModel, CreateSupplierRequest, UpdateSupplierRequest } from '../../models/supplier.model';

/** TIN must be unique; empty or short values must never be sent — backend treats '' as duplicate. */
function tinOptionalMin3(control: AbstractControl): ValidationErrors | null {
  const v = String(control.value ?? '').trim();
  if (!v) {
    return null;
  }
  return v.length >= 3 ? null : { minlength: { requiredLength: 3, actualLength: v.length } };
}

function resolveTinForApi(raw: string | undefined | null): string {
  const t = String(raw ?? '').trim();
  if (t.length >= 3) {
    return t;
  }
  return `PAS-TIN-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

function coerceBool(v: unknown): boolean {
  if (v === true || v === 'true') {
    return true;
  }
  if (v === false || v === 'false') {
    return false;
  }
  return true;
}

@Component({
  selector: 'app-supplier-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './supplier-form.component.html',
  styleUrls: ['./supplier-form.component.scss']
})
export class SupplierFormComponent implements OnInit {
  supplierForm!: FormGroup;
  isEditMode = false;
  supplierId: string | null = null;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private supplierService: SupplierService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.checkEditMode();
  }

  private initializeForm(): void {
    this.supplierForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      contactPerson: [''],
      email: ['', [Validators.email]],
      phone: [''],
      address: [''],
      tin: ['', [tinOptionalMin3]],
      isActive: [true]
    });
  }

  private checkEditMode(): void {
    this.supplierId = this.route.snapshot.paramMap.get('id');
    if (this.supplierId) {
      this.isEditMode = true;
      this.loadSupplier(this.supplierId);
    }
  }

  private loadSupplier(id: string): void {
    this.isLoading = true;
    this.supplierService.getById(id).subscribe({
      next: (response) => {
        if (response.success !== false && response.data && Object.keys(response.data).length) {
          this.supplierForm.patchValue(response.data);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading supplier:', error);
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.supplierForm.invalid) {
      this.supplierForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    if (this.isEditMode && this.supplierId) {
      this.updateSupplier();
    } else {
      this.createSupplier();
    }
  }

  private createSupplier(): void {
    const formValue = this.supplierForm.value;
    const tinValue = resolveTinForApi(formValue.tin);

    const request: CreateSupplierRequest = {
      name: String(formValue.name ?? '').trim(),
      tin: tinValue,
    };
    const cp = formValue.contactPerson?.trim();
    if (cp) {
      request.contactPerson = cp;
    }
    const em = formValue.email?.trim();
    if (em) {
      request.email = em;
    }
    const ph = formValue.phone?.trim();
    if (ph) {
      request.phone = ph;
    }
    const ad = formValue.address?.trim();
    if (ad) {
      request.address = ad;
    }
    
    this.supplierService.create(request).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Create supplier response:', JSON.stringify(response, null, 2));
        if (response.success !== false) {
          alert('Supplier created successfully!');
          this.router.navigate(['/admin/receiving/suppliers']);
        } else {
          alert('Error creating supplier: ' + (response.message || 'Unknown error'));
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error creating supplier:', error);
        
        let errorMessage = 'Error creating supplier. ';
        if (error.status === 0) {
          errorMessage += 'Cannot connect to server. Please check if the backend is running.';
        } else if (error.status === 404) {
          errorMessage += 'API endpoint not found (404). The Suppliers endpoint may not exist on the backend.';
        } else if (error.status === 400) {
          errorMessage += 'Bad request. Please check your input data. ';
          if (error.error?.message) {
            errorMessage += error.error.message;
          }
          if (error.error?.errors) {
            errorMessage += ' Details: ' + JSON.stringify(error.error.errors);
          }
        } else if (error.status === 500) {
          errorMessage += 'Server error (500). Please try again later.';
        } else {
          errorMessage += `HTTP Error ${error.status}: ${error.statusText || 'Unknown error'}`;
        }
        
        if (error.error) {
          console.error('Error details:', error.error);
        }
        
        alert(errorMessage);
      }
    });
  }

  private updateSupplier(): void {
    const formValue = this.supplierForm.value;
    console.log('Update supplier form value:', JSON.stringify(formValue, null, 2));
    
    // Build request - only include fields that have values
    const request: any = {};
    
    // Only include fields that have changed
    if (formValue.name) {
      request.name = formValue.name;
    }
    if (formValue.contactPerson && formValue.contactPerson.trim()) {
      request.contactPerson = formValue.contactPerson.trim();
    }
    if (formValue.email && formValue.email.trim()) {
      request.email = formValue.email.trim();
    }
    if (formValue.phone && formValue.phone.trim()) {
      request.phone = formValue.phone.trim();
    }
    if (formValue.address && formValue.address.trim()) {
      request.address = formValue.address.trim();
    }
    if (formValue.tin !== undefined && formValue.tin !== null) {
      if (formValue.tin.trim()) {
        request.tin = formValue.tin.trim();
      }
    }
    if (formValue.isActive !== undefined) {
      request.isActive = coerceBool(formValue.isActive);
    }
    
    console.log('Update request payload:', JSON.stringify(request, null, 2));
    
    this.supplierService.update(this.supplierId!, request).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Update supplier response:', JSON.stringify(response, null, 2));
        if (response.success !== false) {
          alert('Supplier updated successfully!');
          this.router.navigate(['/admin/receiving/suppliers']);
        } else {
          alert('Error updating supplier: ' + response.message);
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error updating supplier:', error);
        alert('Error updating supplier. Please try again.');
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/admin/receiving/suppliers']);
  }

  get f() {
    return this.supplierForm.controls;
  }
}