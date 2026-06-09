import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { ShelvesService } from '../../../../../core/services/shelves.service';
import { WarehousesService, WarehouseDto, CreateWarehouseRequest } from '../../../../../core/services/warehouses.service';

/**
 * Strict Guid (8-4-4-4-12) validator.
 * The backend's `WarehouseId` is a `System.Guid`; non-Guid strings
 * cause the model binder to default to `Guid.Empty` which then makes
 * the handler report "Warehouse with ID 00000000-... not found.".
 */
const GUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

@Component({
  selector: 'app-shelf-location-form',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './shelf-location-form.html',
  styleUrl: './shelf-location-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelfLocationForm implements OnInit {
  readonly title = input('Add Shelf Location');
  readonly submitLabel = input('Save Location');

  private readonly formBuilder = inject(FormBuilder);
  private readonly shelvesService = inject(ShelvesService);
  private readonly warehousesService = inject(WarehousesService);

  // --- Signal-based state (works correctly with OnPush) -------------------
  readonly loading = signal(false);
  readonly loadingWarehouses = signal(false);
  readonly warehouses = signal<WarehouseDto[]>([]);
  readonly loadError = signal<string | null>(null);

  /**
   * True when the loaded warehouses come from the in-memory mock fallback
   * (i.e. the backend GET /api/Warehouses returned an error or no data).
   * Submitting with a mock warehouse ID will fail on the server because
   * that ID does not exist in the database, so we disable the submit
   * button and surface a clear warning.
   */
  readonly isMockWarehouses = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly submitSuccess = signal(false);

  // Inline "create new warehouse" mini-form state
  readonly showCreateWarehouse = signal(false);
  readonly creatingWarehouse = signal(false);
  readonly newWarehouse = signal<CreateWarehouseRequest>({
    warehouseName: '',
    locationCode: '',
    address: '',
    city: '',
    country: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
  });
  readonly newWarehouseError = signal<string | null>(null);

  /** Submit is blocked when: no warehouses OR using mock OR mid-save OR mid-warehouse-create. */
  readonly canSubmit = computed(() =>
    !this.loading() &&
    !this.isMockWarehouses() &&
    !this.creatingWarehouse() &&
    this.warehouses().length > 0
  );

  readonly form = this.formBuilder.nonNullable.group({
    warehouseId: ['', [Validators.required, Validators.pattern(GUID_PATTERN)]],
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

  ngOnInit(): void {
    this.loadWarehouses();
  }

  loadWarehouses(): void {
    this.loadingWarehouses.set(true);
    this.loadError.set(null);
    this.warehousesService.getAll({ isActive: true }).subscribe({
      next: (response) => {
        this.loadingWarehouses.set(false);
        if (response.success && response.data && response.data.length > 0) {
          this.warehouses.set(response.data);
          this.isMockWarehouses.set(false);
          this.loadError.set(null);
        } else {
          // Empty OR non-success: treat as unusable.
          this.warehouses.set([]);
          this.isMockWarehouses.set(false);
          this.loadError.set(
            response.message ||
              'No warehouses are available. Please create a warehouse first.'
          );
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loadingWarehouses.set(false);
        this.warehouses.set([]);
        this.isMockWarehouses.set(false);
        this.loadError.set(
          `Unable to load warehouses from the server (HTTP ${err.status} ${err.statusText || ''}). ` +
            'You can create a new warehouse below.'
        );
      },
    });
  }

  retryLoadWarehouses(): void {
    this.loadWarehouses();
  }

  // ---- Inline "create new warehouse" --------------------------------------

  toggleCreateWarehouse(): void {
    this.showCreateWarehouse.update((v) => !v);
    this.newWarehouseError.set(null);
  }

  updateNewWarehouseField<K extends keyof CreateWarehouseRequest>(
    field: K,
    value: CreateWarehouseRequest[K]
  ): void {
    this.newWarehouse.update((current) => ({ ...current, [field]: value }));
  }

  isNewWarehouseValid(): boolean {
    const w = this.newWarehouse();
    return (
      !!w.warehouseName?.trim() &&
      !!w.locationCode?.trim() &&
      !!w.address?.trim() &&
      !!w.city?.trim() &&
      !!w.country?.trim()
    );
  }

  createNewWarehouse(): void {
    this.newWarehouseError.set(null);
    if (!this.isNewWarehouseValid()) {
      this.newWarehouseError.set('Please fill in all required fields (Name, Code, Address, City, Country).');
      return;
    }
    this.creatingWarehouse.set(true);
    this.warehousesService.create(this.newWarehouse()).subscribe({
      next: (response) => {
        this.creatingWarehouse.set(false);
        if (response.success && response.data) {
          const newId: string = response.data;
          // The new warehouse id is in response.data; reload the list and preselect it.
          this.loadWarehousesAndPreselect(newId);
          this.newWarehouse.set({
            warehouseName: '',
            locationCode: '',
            address: '',
            city: '',
            country: '',
            contactPerson: '',
            contactPhone: '',
            contactEmail: '',
          });
          this.showCreateWarehouse.set(false);
        } else {
          this.newWarehouseError.set(response.message || 'Failed to create warehouse.');
        }
      },
      error: (err: HttpErrorResponse) => {
        this.creatingWarehouse.set(false);
        const backendMessage =
          err?.error?.message ||
          (typeof err?.error === 'string' ? err.error : null) ||
          err?.message ||
          'Unknown error creating warehouse.';
        this.newWarehouseError.set(`Failed to create warehouse: ${backendMessage}`);
      },
    });
  }

  private loadWarehousesAndPreselect(selectId: string): void {
    this.loadingWarehouses.set(true);
    this.warehousesService.getAll({ isActive: true }).subscribe({
      next: (response) => {
        this.loadingWarehouses.set(false);
        if (response.success && response.data) {
          this.warehouses.set(response.data);
          this.isMockWarehouses.set(false);
          this.loadError.set(null);
          // Preselect the newly created warehouse if it's in the list.
          if (this.warehouses().some((w) => w.id === selectId)) {
            this.form.controls.warehouseId.setValue(selectId);
          }
        }
      },
      error: () => {
        this.loadingWarehouses.set(false);
        // Fall back to a normal load on error.
        this.loadWarehouses();
      },
    });
  }

  // ---- Submit shelf location ---------------------------------------------

  onSubmit(): void {
    this.submitError.set(null);
    this.submitSuccess.set(false);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const idCtrl = this.form.controls.warehouseId;
      if (idCtrl.hasError('pattern')) {
        this.submitError.set('The selected warehouse is invalid. Please pick a warehouse from the list.');
      } else if (idCtrl.hasError('required')) {
        this.submitError.set('Please select a warehouse before saving.');
      }
      return;
    }

    if (this.isMockWarehouses()) {
      this.submitError.set(
        'Cannot save: the warehouse list is loaded from offline mock data. ' +
          'Please reload from the server first, or create a warehouse below.'
      );
      return;
    }

    if (this.warehouses().length === 0) {
      this.submitError.set('No warehouses are available. Please create a warehouse first.');
      return;
    }

    this.loading.set(true);
    const formValue = this.form.getRawValue();

    this.shelvesService
      .create({
        warehouseId: formValue.warehouseId,
        aisle: formValue.aisle || undefined,
        rack: formValue.rack || undefined,
        shelfNumber: formValue.shelfNumber || undefined,
        zone: formValue.zone || undefined,
        binType: formValue.binType || undefined,
        length: formValue.length || undefined,
        width: formValue.width || undefined,
        height: formValue.height || undefined,
        maxWeight: formValue.maxWeight || undefined,
        capacity: formValue.capacity || undefined,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.submitSuccess.set(true);
            this.form.reset();
          } else {
            this.submitError.set(response.message || 'Failed to create shelf location.');
          }
        },
        error: (err: HttpErrorResponse) => {
          const backendMessage =
            err?.error?.message ||
            (typeof err?.error === 'string' ? err.error : null) ||
            err?.message ||
            'Unknown error creating shelf location.';
          this.submitError.set(
            `${err.status} ${err.statusText || ''} — ${backendMessage}`.trim()
          );
        },
      });
  }
}
