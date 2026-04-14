import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CreateItemRequest } from '../../models/models';

@Component({
  selector: 'app-item-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './item-form.html',
  styleUrl: './item-form.css',
})
export class ItemForm {
  readonly title = input('Item form');
  readonly submitLabel = input('Save item');

  readonly save = output<CreateItemRequest>();

  private readonly formBuilder = new FormBuilder();

  protected readonly form = this.formBuilder.nonNullable.group({
    sku: ['', [Validators.required, Validators.minLength(3)]],
    name: ['', [Validators.required, Validators.minLength(2)]],
    categoryId: ['', [Validators.required]],
    categoryName: ['', [Validators.required]],
    unitOfMeasure: ['Unit', [Validators.required]],
    price: [0, [Validators.required, Validators.min(0)]],
    stockOnHand: [0, [Validators.required, Validators.min(0)]],
    status: this.formBuilder.nonNullable.control<'active' | 'draft' | 'archived'>('active'),
  });

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.save.emit(this.form.getRawValue());
  }
}
