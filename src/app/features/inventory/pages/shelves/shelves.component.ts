import { Component, OnInit, signal, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ShelvesService, ShelfLocationDto, CreateShelfLocationRequest, UpdateShelfLocationRequest } from '../../../../core/services/shelves.service';
import { WarehousesService, WarehouseDto } from '../../../../core/services/warehouses.service';

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
        shelf.shelfCode?.toLowerCase().includes(q) ||
        shelf.shelfName?.toLowerCase().includes(q) ||
        shelf.warehouseName?.toLowerCase().includes(q) ||
        shelf.aisle?.toLowerCase().includes(q) ||
        shelf.section?.toLowerCase().includes(q)
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
      shelfCode: ['', [Validators.required, Validators.maxLength(20)]],
      shelfName: ['', [Validators.required, Validators.maxLength(100)]],
      warehouseId: ['', Validators.required],
      aisle: ['', Validators.maxLength(10)],
      section: ['', Validators.maxLength(10)],
      level: ['', Validators.maxLength(10)],
      position: ['', Validators.maxLength(10)],
      capacity: [null, [Validators.min(0)]],
      description: ['', Validators.maxLength(500)]
    });

    this.editForm = this.fb.group({
      id: ['', Validators.required],
      shelfCode: ['', [Validators.required, Validators.maxLength(20)]],
      shelfName: ['', [Validators.required, Validators.maxLength(100)]],
      warehouseId: ['', Validators.required],
      aisle: ['', Validators.maxLength(10)],
      section: ['', Validators.maxLength(10)],
      level: ['', Validators.maxLength(10)],
      position: ['', Validators.maxLength(10)],
      capacity: [null, [Validators.min(0)]],
      description: ['', Validators.maxLength(500)],
      isActive: [true]
    });
  }

  // Data loading
  loadWarehouses(): void {
    this.warehousesService.getAll({ isActive: true }).subscribe({
      next: (response) => {
        if (response.success !== false && Array.isArray(response.data)) {
          this.warehouses.set(response.data);
        }
      },
      error: (err) => {
        console.error('Error loading warehouses:', err);
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

    console.log('=== SHELVES LIST DEBUG ===');
    console.log('Loading shelves with params:', params);
    console.log('=========================');

    this.shelvesService.getAll(params).subscribe({
      next: (response) => {
        console.log('=== SHELVES API RESPONSE ===');
        console.log('Response:', JSON.stringify(response, null, 2));
        console.log('============================');
        
        if (response.success !== false && Array.isArray(response.data)) {
          this.shelves.set(response.data);
          this.totalShelves.set(response.data.length);
          console.log('Shelves loaded:', response.data.length);
        } else {
          console.error('API response unsuccessful or no data:', response);
          this.error.set(response.message || 'No shelf data received from server');
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('=== SHELVES LOAD ERROR ===');
        console.error('Full error object:', err);
        console.error('==========================');
        
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
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  // Modal handlers
  openCreateModal(): void {
    this.createForm.reset();
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.createForm.reset();
  }

  openEditModal(shelf: ShelfLocationDto): void {
    this.editingShelf.set(shelf);
    this.editForm.patchValue({
      id: shelf.id,
      shelfCode: shelf.shelfCode,
      shelfName: shelf.shelfName,
      warehouseId: shelf.warehouseId,
      aisle: shelf.aisle || '',
      section: shelf.section || '',
      level: shelf.level || '',
      position: shelf.position || '',
      capacity: shelf.capacity || null,
      description: shelf.description || '',
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

    this.loading.set(true);

    const formValue = this.createForm.value;
    const createRequest: CreateShelfLocationRequest = {
      shelfCode: formValue.shelfCode.trim(),
      shelfName: formValue.shelfName.trim(),
      warehouseId: formValue.warehouseId,
      aisle: formValue.aisle?.trim() || undefined,
      section: formValue.section?.trim() || undefined,
      level: formValue.level?.trim() || undefined,
      position: formValue.position?.trim() || undefined,
      capacity: formValue.capacity || undefined,
      description: formValue.description?.trim() || undefined
    };

    console.log('=== SHELF CREATION DEBUG ===');
    console.log('Create request payload:', JSON.stringify(createRequest, null, 2));
    console.log('============================');

    this.shelvesService.create(createRequest).subscribe({
      next: (response) => {
        console.log('=== SHELF CREATION SUCCESS ===');
        console.log('Response:', JSON.stringify(response, null, 2));
        console.log('==============================');
        
        if (response.success) {
          alert('Shelf created successfully!');
          this.closeCreateModal();
          this.loadShelves();
        } else {
          alert('Failed to create shelf: ' + response.message);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('=== SHELF CREATION ERROR ===');
        console.error('Full error object:', err);
        console.error('============================');
        
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
        
        alert(errorMessage);
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
      shelfCode: formValue.shelfCode?.trim(),
      shelfName: formValue.shelfName?.trim(),
      warehouseId: formValue.warehouseId,
      aisle: formValue.aisle?.trim() || undefined,
      section: formValue.section?.trim() || undefined,
      level: formValue.level?.trim() || undefined,
      position: formValue.position?.trim() || undefined,
      capacity: formValue.capacity || undefined,
      description: formValue.description?.trim() || undefined,
      isActive: formValue.isActive
    };

    this.shelvesService.update(updateRequest).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Shelf updated successfully!');
          this.closeEditModal();
          this.loadShelves();
        } else {
          alert('Failed to update shelf: ' + response.message);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error updating shelf:', err);
        alert('Failed to update shelf. Please try again.');
        this.loading.set(false);
      }
    });
  }

  deleteShelf(shelf: ShelfLocationDto): void {
    if (confirm(`Are you sure you want to delete shelf "${shelf.shelfName}"? This action cannot be undone.`)) {
      this.shelvesService.delete(shelf.id).subscribe({
        next: (response) => {
          if (response.success) {
            alert('Shelf deleted successfully');
            this.loadShelves();
          } else {
            alert('Failed to delete shelf: ' + response.message);
          }
        },
        error: (err) => {
          console.error('Error deleting shelf:', err);
          alert('Failed to delete shelf. Please try again.');
        }
      });
    }
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

  formatDate(date: string | Date): string {
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