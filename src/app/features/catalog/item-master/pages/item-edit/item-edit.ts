import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ItemMasterApi } from '../../services/item-master-api';

@Component({
  selector: 'app-item-edit',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './item-edit.html',
  styleUrl: './item-edit.css',
})
export class ItemEdit {
  private readonly itemApi = inject(ItemMasterApi);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly items = this.itemApi.items;
  protected readonly selectedItemId = signal('');
  protected readonly status = signal('Pick an item and update its details.');

  protected readonly editForm = this.formBuilder.nonNullable.group({
    sku: ['', [Validators.required, Validators.minLength(3)]],
    name: ['', [Validators.required, Validators.minLength(2)]],
    categoryId: ['', [Validators.required]],
    categoryName: ['', [Validators.required]],
    unitOfMeasure: ['Unit', [Validators.required]],
    price: [0, [Validators.required, Validators.min(0)]],
    stockOnHand: [0, [Validators.required, Validators.min(0)]],
    status: this.formBuilder.nonNullable.control<'active' | 'draft' | 'archived'>('active'),
  });

  protected readonly selectedItem = computed(() => {
    const selectedId = this.selectedItemId();
    return selectedId ? this.itemApi.getById(selectedId) : undefined;
  });

  constructor() {
    effect(() => {
      const items = this.items();

      if (items.length === 0) {
        this.selectedItemId.set('');
        return;
      }

      if (!this.selectedItemId()) {
        this.selectedItemId.set(items[0].id);
      }

      const selected = this.selectedItem();

      if (selected) {
        this.editForm.setValue({
          sku: selected.sku,
          name: selected.name,
          categoryId: selected.categoryId,
          categoryName: selected.categoryName,
          unitOfMeasure: selected.unitOfMeasure,
          price: selected.price,
          stockOnHand: selected.stockOnHand,
          status: selected.status,
        });
      }
    });
  }

  protected updateSelection(id: string): void {
    this.selectedItemId.set(id);
  }

  protected saveItem(): void {
    if (this.editForm.invalid || !this.selectedItemId()) {
      this.editForm.markAllAsTouched();
      this.status.set('Select an item and complete the form before saving.');
      return;
    }

    const updated = this.itemApi.update({
      id: this.selectedItemId(),
      ...this.editForm.getRawValue(),
    });

    if (updated) {
      this.status.set(`Item "${updated.name}" was updated.`);
    }
  }
}
