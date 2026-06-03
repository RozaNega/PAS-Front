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
    itemName: ['', [Validators.required, Validators.minLength(2)]],
    categoryId: ['', [Validators.required]],
    categoryName: ['', [Validators.required]],
    unitOfMeasure: ['Unit', [Validators.required]],
    stockQuantity: [0, [Validators.required, Validators.min(0)]],
    isActive: [true, [Validators.required]],
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
        this.selectedItemId.set(String(items[0].id));
      }

      const selected = this.selectedItem();

      if (selected) {
        this.editForm.setValue({
          sku: selected.sku,
          itemName: selected.itemName,
          categoryId: String(selected['categoryId'] ?? ''),
          categoryName: selected.categoryName ?? '',
          unitOfMeasure: selected.unitOfMeasure,
          stockQuantity: selected.stockQuantity ?? 0,
          isActive: selected.isActive ?? true,
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

    const payload = this.editForm.getRawValue();
    this.itemApi.update(this.selectedItemId(), payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.status.set(`Item "${payload.itemName}" was updated.`);
        } else {
          this.status.set('Failed to update: ' + res.message);
        }
      },
      error: () => this.status.set('An error occurred while saving.')
    });
  }
}
