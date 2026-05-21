import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ItemMasterApi } from '../../services/item-master-api';
import { CategoriesService, CategoryDto } from '../../../../../core/services/categories.service';

const UNITS_OF_MEASURE = ['PCS', 'Units', 'Box', 'Set', 'Carton', 'Pallet', 'Bag', 'Bundle'];

@Component({
  selector: 'app-item-create',
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './item-create.html',
  styleUrl: './item-create.css',
})
export class ItemCreate implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly itemApi = inject(ItemMasterApi);
  private readonly categoriesService = inject(CategoriesService);

  protected readonly status = signal<{ type: 'info' | 'success' | 'error'; message: string } | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly categories = signal<CategoryDto[]>([]);
  protected readonly unitsOfMeasure = UNITS_OF_MEASURE;

  protected readonly itemForm = this.formBuilder.nonNullable.group({
    sku: ['', [Validators.required, Validators.minLength(3)]],
    itemName: ['', [Validators.required, Validators.minLength(2)]],
    categoryId: ['', [Validators.required]],
    categoryName: ['', [Validators.required]],
    unitOfMeasure: ['PCS', [Validators.required]],
    stockQuantity: [0, [Validators.required, Validators.min(0)]],
    minStockLevel: [0, [Validators.required, Validators.min(0)]],
    description: [''],
    requiresInspection: [false],
    isActive: [true, [Validators.required]],
  });

  ngOnInit(): void {
    this.loadCategories();
  }

  private loadCategories(): void {
    this.categoriesService.getAll().subscribe({
      next: (res: any) => {
        if (res.success && Array.isArray(res.data)) {
          this.categories.set(res.data);
        }
      },
      error: () => {
        this.status.set({ type: 'error', message: 'Failed to load categories.' });
      }
    });
  }

  protected onCategorySelect(categoryId: string): void {
    const selected = this.categories().find(c => c.id === categoryId);
    if (selected) {
      this.itemForm.patchValue({
        categoryId: selected.id,
        categoryName: selected.name
      });
    }
  }

  protected getFieldError(fieldName: string): string | null {
    const control = this.itemForm.get(fieldName);
    if (!control || !control.touched || !control.errors) return null;

    if (control.errors['required']) {
      const labels: Record<string, string> = {
        sku: 'SKU',
        itemName: 'Item name',
        categoryId: 'Category',
        unitOfMeasure: 'Unit of measure',
        stockQuantity: 'Stock quantity',
        minStockLevel: 'Minimum stock level'
      };
      return `${labels[fieldName] || fieldName} is required.`;
    }
    if (control.errors['minLength']) {
      return `${fieldName === 'sku' ? 'SKU' : 'Item name'} must be at least ${control.errors['minLength'].requiredLength} characters.`;
    }
    if (control.errors['min']) {
      return `Must be 0 or greater.`;
    }
    return null;
  }

  protected createItem(): void {
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      this.status.set({ type: 'error', message: 'Please complete all required fields.' });
      return;
    }

    this.isSubmitting.set(true);
    const formValue = this.itemForm.getRawValue();

    this.itemApi.create(formValue).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.success) {
          this.status.set({ type: 'success', message: `Item "${formValue.itemName}" created successfully.` });
          this.itemForm.reset({
            sku: '',
            itemName: '',
            categoryId: '',
            categoryName: '',
            unitOfMeasure: 'PCS',
            stockQuantity: 0,
            minStockLevel: 0,
            description: '',
            requiresInspection: false,
            isActive: true,
          });
        } else {
          this.status.set({ type: 'error', message: 'Error: ' + (res.message || 'Failed to create item.') });
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.status.set({ type: 'error', message: 'An error occurred during creation. Please try again.' });
      }
    });
  }
}
