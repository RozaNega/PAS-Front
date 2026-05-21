import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { ShelvesService, ShelfLocationDto } from '../../../../../core/services/shelves.service';

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
  private readonly shelvesService = inject(ShelvesService);

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
    const shelfCode = [formValue.aisle, formValue.rack, formValue.shelfNumber].filter(Boolean).join('-') || `SH-${Date.now()}`;
    const shelfName =
      [formValue.zone, formValue.aisle, formValue.rack, formValue.shelfNumber].filter(Boolean).join(' ').trim() ||
      'Shelf location';

    this.shelvesService
      .create({
        warehouseId: formValue.warehouseId,
        shelfCode,
        shelfName,
        aisle: formValue.aisle || undefined,
        section: formValue.rack || undefined,
        level: formValue.shelfNumber || undefined,
        position: formValue.zone || undefined,
        capacity: formValue.capacity || undefined,
        description: [formValue.binType, `L×W×H: ${formValue.length}×${formValue.width}×${formValue.height}`]
          .filter(Boolean)
          .join(' | ') || undefined,
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