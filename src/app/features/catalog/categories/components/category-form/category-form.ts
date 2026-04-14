import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CreateCategoryRequest } from '../../models/models';

@Component({
  selector: 'app-category-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category-form.html',
  styleUrl: './category-form.css',
})
export class CategoryForm {
  readonly title = input('Category form');
  readonly submitLabel = input('Save category');

  readonly save = output<CreateCategoryRequest>();

  private readonly formBuilder = new FormBuilder();

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: ['', [Validators.required, Validators.minLength(4)]],
    parentCategoryId: [''],
  });

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.save.emit({
      name: value.name,
      description: value.description,
      parentCategoryId: value.parentCategoryId || null,
    });
  }
}
