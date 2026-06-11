import { Component, OnInit, signal, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ShelvesService, ShelfLocationDto, CreateShelfLocationRequest, UpdateShelfLocationRequest } from '../../../../core/services/shelves.service';
import { WarehousesService, WarehouseDto } from '../../../../core/services/warehouses.service';

/**
 * Strict Guid (8-4-4-4-12) pattern.
 * The backend's WarehouseId is a `System.Guid`; sending an empty string or
 * a non-Guid value makes ASP.NET Core's model binder default to `Guid.Empty`,
 * which is then reported by the handler as
 * "Warehouse with ID 00000000-0000-0000-0000-000000000000 not found.".
 */
const GUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

@Component({
  selector: 'app-shelves',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './shelves.component.html',
  styleUrls: ['./shelves.component.scss']
})
export class ShelvesComponent implements OnInit {
  private readonly shelvesService = inject(ShelvesService);
  private readonly warehousesService = inject(WarehousesService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  // State
  searchTerm = signal('');
  warehouseFilter = signal('All');
  statusFilter = signal('All');
  currentPage = signal(1);
  rowsPerPage = signal(10);
  loading = signal(false);
  error = signal<string | null>(null);

  // Data
  shelves = signal<ShelfLocationDto[]>([]);
  warehouses = signal<WarehouseDto[]>([]);
  totalShelves = signal(0);

  // Track whether the warehouse list came from the live API (success=true)
  // or the in-memory mock fallback. We use this to warn the user and gate
  // the Save button on the modal.
  warehousesLoadedFromApi = signal(false);
  warehousesLoadError = signal<string | null>(null);

  // Modal states
  showCreateModal = signal(false);
  showEditModal = signal(false);
  editingShelf = signal<ShelfLocationDto | null>(null);

  // Forms
  createForm!: FormGroup;
  editForm!: FormGroup;

  // Filter options
  statuses = ['All', 'Active', 'Inactive'];

  constructor() {
    // Reload data when filters change
    effect(() => {
      const search = this.searchTerm();
      const warehouse = this.warehouseFilter();
      const status = this.statusFilter();
      const page = this.currentPage();

      this.loadShelves();
    });
  }

  ngOnInit(): void {
    this.initializeForms();
    this.loadWarehouses();
    this.loadShelves();
  }

  // Computed properties
  filteredShelves = computed(() => {
    let result = [...this.shelves()];

    if (this.searchTerm()) {
      const q = this.searchTerm().toLowerCase();
      result = result.filter(shelf =>
        shelf.rack?.toLowerCase().includes(q) ||
        shelf.shelfNumber?.toLowerCase().includes(q) ||
        shelf.warehouseName?.toLowerCase().includes(q) ||
        shelf.aisle?.toLowerCase().includes(q) ||
        shelf.zone?.toLowerCase().includes(q)
      );
    }

    if (this.warehouseFilter() !== 'All') {
      result = result.filter(shelf => shelf.warehouseId === this.warehouseFilter());
    }

    if (this.statusFilter() !== 'All') {
      const isActive = this.statusFilter() === 'Active';
      result = result.filter(shelf => shelf.isActive === isActive);
    }

    return result;
  });

  pagedShelves = computed(() => {
    const start = (this.currentPage() - 1) * this.rowsPerPage();
    const end = start + this.rowsPerPage();
    return this.filteredShelves().slice(start, end);
  });

  totalPages = computed(() => Math.ceil(this.filteredShelves().length / this.rowsPerPage()));

  displayRange = computed(() => {
    const start = (this.currentPage() - 1) * this.rowsPerPage() + 1;
    const end = Math.min(this.currentPage() * this.rowsPerPage(), this.filteredShelves().length);
    return { start, end };
  });

  // Form initialization
  initializeForms(): void {
    this.createForm = this.fb.group({
      // Send the warehouseId (Guid) directly. Looking the warehouse up by name
      // was fragile — if the list hadn't loaded yet, the request went out with
      // an empty warehouseId which the backend parsed as Guid.Empty and then
      // reported "Warehouse with ID 00000000-... not found.".
      warehouseId: ['', [Validators.required, Validators.pattern(GUID_PATTERN)]],
      aisle: ['', Validators.maxLength(10)],
      rack: ['', [Validators.required, Validators.maxLength(20)]],
      shelfNumber: ['', [Validators.required, Validators.maxLength(100)]],
      zone: ['', Validators.maxLength(10)],
      binType: ['', Validators.maxLength(10)],
      length: [null, [Validators.min(0)]],
      width: [null, [Validators.min(0)]],
      height: [null, [Validators.min(0)]],
      maxWeight: [null, [Validators.min(0)]],
      capacity: [null, [Validators.min(0)]]
    });

    this.editForm = this.fb.group({
      id: ['', Validators.required],
      warehouseId: ['', [Validators.required, Validators.pattern(GUID_PATTERN)]],
      aisle: ['', Validators.maxLength(10)],
      rack: ['', [Validators.required, Validators.maxLength(20)]],
      shelfNumber: ['', [Validators.required, Validators.maxLength(100)]],
      zone: ['', Validators.maxLength(10)],
      binType: ['', Validators.maxLength(10)],
      length: [null, [Validators.min(0)]],
      width: [null, [Validators.min(0)]],
      height: [null, [Validators.min(0)]],
      maxWeight: [null, [Validators.min(0)]],
      capacity: [null, [Validators.min(0)]],
      isActive: [true]
    });
  }

  // Data loading
  loadWarehouses(): void {
    this.warehousesService.getAll({ isActive: true }).subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.data) && response.data.length > 0) {
          this.warehouses.set(response.data);
          this.warehousesLoadedFromApi.set(true);
          this.warehousesLoadError.set(null);
        } else if (response.success && Array.isArray(response.data) && response.data.length === 0) {
          this.warehouses.set([]);
          this.warehousesLoadedFromApi.set(true);
          this.warehousesLoadError.set('No warehouses exist yet. Please create a warehouse first.');
        } else {
          // service fell back to mock data
          this.warehouses.set(response.data ?? []);
          this.warehousesLoadedFromApi.set(false);
          this.warehousesLoadError.set(
            response.message ||
            'Warehouses API is unavailable. Sample warehouses are shown but cannot be used to create real shelf locations.'
          );
        }
      },
      error: (err) => {
        this.warehousesLoadedFromApi.set(false);
        this.warehousesLoadError.set(
          `Failed to load warehouses (${err?.status || 'network error'}). You cannot create a shelf location until the warehouses API is reachable.`
        );
      }
    });
  }

  loadShelves(): void {
    this.loading.set(true);
    this.error.set(null);

    const params: any = {};

    if (this.searchTerm()) {
      params.searchTerm = this.searchTerm();
    }

    if (this.warehouseFilter() !== 'All') {
      params.warehouseId = this.warehouseFilter();
    }

    if (this.statusFilter() !== 'All') {
      params.isActive = this.statusFilter() === 'Active';
    }

    this.shelvesService.getAll(params).subscribe({
      next: (response) => {
        if (response.success !== false && Array.isArray(response.data)) {
          this.shelves.set(response.data);
          this.totalShelves.set(response.data.length);
        } else {
          this.error.set(response.message || 'No shelf data received from server');
        }
        this.loading.set(false);
      },
      error: (err) => {
        let errorMessage = 'Failed to load shelves. Please try again.';

        if (err.error) {
          if (err.error.message) {
            errorMessage = err.error.message;
          } else if (err.error.title) {
            errorMessage = err.error.title;
          } else if (typeof err.error === 'string') {
            errorMessage = err.error;
          }
        }

        if (err.status) {
          errorMessage = `[${err.status} ${err.statusText}] ${errorMessage}`;
        }

        this.error.set(errorMessage);
        this.loading.set(false);
      }
    });
  }

  // Filter handlers
  onSearch(e: Event): void {
    this.searchTerm.set((e.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  onWarehouseFilter(e: Event): void {
    this.warehouseFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onStatusFilter(e: Event): void {
    this.statusFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onRowsPerPageChange(e: Event): void {
    this.rowsPerPage.set(+(e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.warehouseFilter.set('All');
    this.statusFilter.set('All');
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  // Modal handlers
  openCreateModal(): void {
    // Always re-attempt to load warehouses so the dropdown reflects the
    // current state of the database when the user opens the modal.
    this.loadWarehouses();
    this.createForm.reset();
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.createForm.reset();
  }

  openEditModal(shelf: ShelfLocationDto): void {
    this.loadWarehouses();
    this.editingShelf.set(shelf);
    this.editForm.patchValue({
      id: shelf.id,
      warehouseId: shelf.warehouseId || '',
      aisle: shelf.aisle || '',
      rack: shelf.rack || '',
      shelfNumber: shelf.shelfNumber || '',
      zone: shelf.zone || '',
      binType: shelf.binType || '',
      length: shelf.length || null,
      width: shelf.width || null,
      height: shelf.height || null,
      maxWeight: shelf.maxWeight || null,
      capacity: shelf.capacity || null,
      isActive: shelf.isActive
    });
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.editingShelf.set(null);
    this.editForm.reset();
  }

  // CRUD operations
  createShelf(): void {
    if (!this.createForm.valid) {
      this.markFormGroupTouched(this.createForm);
      return;
    }

    // Guard: refuse to submit unless we have real warehouse data from the API.
    if (!this.warehousesLoadedFromApi() || this.warehouses().length === 0) {
      this.error.set(
        'Cannot create a shelf location: the warehouse list could not be loaded from the server. ' +
        'Click "Retry" to try again, or create a warehouse first.'
      );
      return;
    }

    this.loading.set(true);

    const formValue = this.createForm.value;

    const createRequest: CreateShelfLocationRequest = {
      // Send the warehouseId straight from the form. No name lookup, no
      // empty-string fallback, no risk of Guid.Empty.
      warehouseId: formValue.warehouseId,
      aisle: formValue.aisle?.trim() || undefined,
      rack: formValue.rack.trim(),
      shelfNumber: formValue.shelfNumber.trim(),
      zone: formValue.zone?.trim() || undefined,
      binType: formValue.binType?.trim() || undefined,
      length: formValue.length || undefined,
      width: formValue.width || undefined,
      height: formValue.height || undefined,
      maxWeight: formValue.maxWeight || undefined,
      capacity: formValue.capacity || undefined
    };

    this.shelvesService.create(createRequest).subscribe({
      next: (response) => {
        if (response.success) {
          this.closeCreateModal();
          this.loadShelves();
        } else {
          this.error.set('Failed to create shelf: ' + response.message);
        }
        this.loading.set(false);
      },
      error: (err) => {
        let errorMessage = 'Failed to create shelf. Please try again.';

        if (err.error) {
          if (err.error.errors && typeof err.error.errors === 'object') {
            const validationErrors = err.error.errors;
            const errorDetails = Object.keys(validationErrors).map(key => {
              const messages = Array.isArray(validationErrors[key])
                ? validationErrors[key].join(', ')
                : validationErrors[key];
              return `• ${key}: ${messages}`;
            });
            errorMessage = 'Validation errors:\n' + errorDetails.join('\n');
          } else if (err.error.message) {
            errorMessage = err.error.message;
          } else if (err.error.title) {
            errorMessage = err.error.title;
          }
        }

        if (err.status) {
          errorMessage = `[${err.status} ${err.statusText}]\n${errorMessage}`;
        }

        this.error.set(errorMessage);
        this.loading.set(false);
      }
    });
  }

  updateShelf(): void {
    if (!this.editForm.valid) {
      this.markFormGroupTouched(this.editForm);
      return;
    }

    this.loading.set(true);

    const formValue = this.editForm.value;
    const updateRequest: UpdateShelfLocationRequest = {
      id: formValue.id,
      warehouseId: formValue.warehouseId,
      aisle: formValue.aisle?.trim() || undefined,
      rack: formValue.rack?.trim(),
      shelfNumber: formValue.shelfNumber?.trim(),
      zone: formValue.zone?.trim() || undefined,
      binType: formValue.binType?.trim() || undefined,
      length: formValue.length || undefined,
      width: formValue.width || undefined,
      height: formValue.height || undefined,
      maxWeight: formValue.maxWeight || undefined,
      capacity: formValue.capacity || undefined,
      isActive: formValue.isActive
    };

    this.shelvesService.update(updateRequest).subscribe({
      next: (response) => {
        if (response.success) {
          this.closeEditModal();
          this.loadShelves();
        } else {
          this.error.set('Failed to update shelf: ' + response.message);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to update shelf. ' + (err?.error?.message || err?.message || ''));
        this.loading.set(false);
      }
    });
  }

  deleteShelf(shelf: ShelfLocationDto): void {
    if (!confirm(`Are you sure you want to delete shelf "${shelf.rack} - ${shelf.shelfNumber}"? This action cannot be undone.`)) {
      return;
    }
    this.shelvesService.delete(shelf.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadShelves();
        } else {
          this.error.set('Failed to delete shelf: ' + response.message);
        }
      },
      error: (err) => {
        this.error.set('Failed to delete shelf. ' + (err?.error?.message || err?.message || ''));
      }
    });
  }

  // Utility methods
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  getWarehouseName(warehouseId: string): string {
    const warehouse = this.warehouses().find(w => w.id === warehouseId);
    return warehouse?.warehouseName || 'Unknown';
  }

  getStatusClass(isActive: boolean): string {
    return isActive ? 'badge-success' : 'badge-secondary';
  }

  getStatusText(isActive: boolean): string {
    return isActive ? 'Active' : 'Inactive';
  }

  getUtilizationClass(utilization: number): string {
    if (utilization >= 90) return 'text-danger';
    if (utilization >= 70) return 'text-warning';
    return 'text-success';
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  trackByShelfId(index: number, item: ShelfLocationDto): string {
    return item.id;
  }
}
