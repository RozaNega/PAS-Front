import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ItemMasterApi } from '../../services/item-master-api';

@Component({
  selector: 'app-item-create',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './item-create.html',
  styleUrl: './item-create.css',
})
export class ItemCreate {
  private readonly formBuilder = inject(FormBuilder);
  private readonly itemApi = inject(ItemMasterApi);

  protected readonly status = signal('Create a new item to expand the master catalog.');

  protected readonly itemForm = this.formBuilder.nonNullable.group({
    sku: ['', [Validators.required, Validators.minLength(3)]],
    name: ['', [Validators.required, Validators.minLength(2)]],
    categoryId: ['', [Validators.required]],
    categoryName: ['', [Validators.required]],
    unitOfMeasure: ['Unit', [Validators.required]],
    price: [0, [Validators.required, Validators.min(0)]],
    stockOnHand: [0, [Validators.required, Validators.min(0)]],
    status: this.formBuilder.nonNullable.control<'active' | 'draft' | 'archived'>('active'),
  });

  protected createItem(): void {
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      this.status.set('Please complete all required item fields.');
      return;
    }

    const created = this.itemApi.create(this.itemForm.getRawValue());
    this.status.set(`Item "${created.name}" was created.`);
    this.itemForm.reset({
      sku: '',
      name: '',
      categoryId: '',
      categoryName: '',
      unitOfMeasure: 'Unit',
      price: 0,
      stockOnHand: 0,
      status: 'active',
    });
  }
}
