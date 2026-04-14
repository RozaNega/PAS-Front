import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CategoryApi } from '../../services/category-api';

@Component({
  selector: 'app-category-create',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category-create.html',
  styleUrl: './category-create.css',
})
export class CategoryCreate {
  private readonly categoryApi = inject(CategoryApi);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly status = signal('Create a category to extend the catalog structure.');
  protected readonly parentOptions = computed(() => this.categoryApi.categories());

  protected readonly categoryForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: ['', [Validators.required, Validators.minLength(4)]],
    parentCategoryId: [''],
  });

  protected createCategory(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      this.status.set('Please complete all required fields.');
      return;
    }

    const formValue = this.categoryForm.getRawValue();
    const created = this.categoryApi.create({
      name: formValue.name,
      description: formValue.description,
      parentCategoryId: formValue.parentCategoryId || null,
    });

    this.status.set(`Category "${created.name}" was created.`);
    this.categoryForm.reset({
      name: '',
      description: '',
      parentCategoryId: '',
    });
  }
}
