import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CategoryApi } from '../../services/category-api';

@Component({
  selector: 'app-category-edit',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category-edit.html',
  styleUrl: './category-edit.css',
})
export class CategoryEdit {
  private readonly categoryApi = inject(CategoryApi);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly categories = this.categoryApi.categories;
  protected readonly selectedCategoryId = signal<string>('');
  protected readonly status = signal('Pick a category and update its details.');

  protected readonly editForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: ['', [Validators.required, Validators.minLength(4)]],
    parentCategoryId: [''],
  });

  protected readonly selectedCategory = computed(() => {
    const selectedId = this.selectedCategoryId();
    return selectedId ? this.categoryApi.getById(selectedId) : undefined;
  });

  constructor() {
    effect(() => {
      const categories = this.categories();

      if (categories.length === 0) {
        this.selectedCategoryId.set('');
        return;
      }

      if (!this.selectedCategoryId()) {
        this.selectedCategoryId.set(String(categories[0].id));
      }

      const selected = this.selectedCategory();

      if (selected) {
        this.editForm.setValue({
          name: selected.name ?? '',
          description: selected.description ?? '',
          parentCategoryId: String(selected.parentCategoryId ?? ''),
        });
      }
    });
  }

  protected updateSelection(id: string): void {
    this.selectedCategoryId.set(id);
  }

  protected saveCategory(): void {
    if (this.editForm.invalid || !this.selectedCategoryId()) {
      this.editForm.markAllAsTouched();
      this.status.set('Select a valid category and complete the form.');
      return;
    }

    const formValue = this.editForm.getRawValue();
    this.categoryApi.update({
      id: this.selectedCategoryId(),
      name: formValue.name,
      description: formValue.description,
      parentCategoryId: formValue.parentCategoryId || null,
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.status.set(`Category "${formValue.name}" was updated successfully.`);
        } else {
          this.status.set('Error: ' + (res.message || 'Failed to update category.'));
        }
      },
      error: () => this.status.set('A server error occurred during update.')
    });
  }
}
