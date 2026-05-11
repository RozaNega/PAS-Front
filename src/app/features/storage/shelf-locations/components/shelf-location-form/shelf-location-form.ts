import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { InventoryService, ShelfLocationDto } from '../../../../../core/services/inventory.service';

@Component({
  selector: 'app-shelf-location-form',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './shelf-location-form.html',
  styleUrl: './shelf-location-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelfLocationForm {
  readonly title = input('Add Shelf Location');
  readonly submitLabel = input('Save Location');

  private readonly formBuilder = inject(FormBuilder);
  private readonly inventoryService = inject(InventoryService);

  loading = false;

  readonly form = this.formBuilder.nonNullable.group({
    warehouseId: ['', Validators.required],
    aisle: ['', Validators.required],
    rack: ['', Validators.required],
    shelfNumber: ['', Validators.required],
    zone: [''],
    binType: [''],
    length: [0, [Validators.min(0)]],
    width: [0, [Validators.min(0)]],
    height: [0, [Validators.min(0)]],
    maxWeight: [0, [Validators.min(0)]],
    capacity: [0, [Validators.min(0)]],
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.form.getRawValue();

    this.inventoryService.createShelf({
      warehouseId: formValue.warehouseId,
      aisle: formValue.aisle,
      rack: formValue.rack,
      shelfNumber: formValue.shelfNumber,
      zone: formValue.zone,
      binType: formValue.binType,
      length: formValue.length,
      width: formValue.width,
      height: formValue.height,
      maxWeight: formValue.maxWeight,
      capacity: formValue.capacity,
    }).pipe(finalize(() => this.loading = false))
    .subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Shelf location created successfully:', response.data);
          this.form.reset();
          alert('Shelf location created successfully!');
        } else {
          console.error('Failed to create shelf location:', response.message);
          alert('Failed to create shelf location: ' + response.message);
        }
      },
      error: (error) => {
        console.error('Error creating shelf location:', error);
        alert('Error creating shelf location: ' + (error.error?.message || 'Unknown error'));
      }
    });
  }
}