import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { InventoryService, AdjustStockRequest } from '../../../../core/services/inventory.service';
import { ItemMasterService, ItemMasterListDto } from '../../../../core/services/item-master.service';
import { ShelvesService, ShelfLocationDto } from '../../../../core/services/shelves.service';

@Component({
  selector: 'app-stock-adjustment',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './stock-adjustment.component.html',
  styleUrls: ['./stock-adjustment.component.scss']
})
export class StockAdjustmentComponent implements OnInit {
  private readonly inventoryService = inject(InventoryService);
  private readonly itemMasterService = inject(ItemMasterService);
  private readonly shelvesService = inject(ShelvesService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // State
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  // Data
  items = signal<ItemMasterListDto[]>([]);
  shelves = signal<ShelfLocationDto[]>([]);
  currentStock = signal<number | null>(null);

  // Form
  adjustmentForm!: FormGroup;

  // Options
  adjustmentTypes = [
    { value: 'increase', label: 'Increase Stock', icon: 'bi-plus-circle', class: 'text-success' },
    { value: 'decrease', label: 'Decrease Stock', icon: 'bi-dash-circle', class: 'text-warning' },
    { value: 'set', label: 'Set Stock Level', icon: 'bi-gear', class: 'text-info' }
  ];

  adjustmentReasons = [
    'Physical Count Adjustment',
    'Damaged Goods',
    'Expired Items',
    'Theft/Loss',
    'Supplier Return',
    'Transfer Correction',
    'System Error Correction',
    'Other'
  ];

  ngOnInit(): void {
    this.initializeForm();
    this.loadItems();
    this.loadShelves();
    this.checkQueryParams();
  }

  initializeForm(): void {
    this.adjustmentForm = this.fb.group({
      itemId: ['', Validators.required],
      shelfId: ['', Validators.required],
      adjustmentType: ['increase', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      reason: ['', Validators.required],
      notes: ['', Validators.maxLength(500)]
    });

    // Watch for item and shelf changes to load current stock
    this.adjustmentForm.get('itemId')?.valueChanges.subscribe(() => {
      this.loadCurrentStock();
    });

    this.adjustmentForm.get('shelfId')?.valueChanges.subscribe(() => {
      this.loadCurrentStock();
    });
  }

  checkQueryParams(): void {
    this.route.queryParams.subscribe(params => {
      if (params['itemId']) {
        this.adjustmentForm.patchValue({ itemId: params['itemId'] });
      }
      if (params['shelfId']) {
        this.adjustmentForm.patchValue({ shelfId: params['shelfId'] });
      }
      if (params['currentStock']) {
        this.currentStock.set(+params['currentStock']);
      }
    });
  }

  loadItems(): void {
    this.itemMasterService.getItemMasters().subscribe({
      next: (response) => {
        if (response.success !== false && Array.isArray(response.data?.items)) {
          this.items.set(response.data.items);
        } else if (Array.isArray(response.data)) {
          this.items.set(response.data);
        }
      },
      error: (err) => {
        console.error('Error loading items:', err);
        // Load sample items for demo
        this.items.set([
          {
            id: '1',
            itemName: 'Dell XPS Laptop',
            sku: 'DELL-XPS-15',
            description: 'High-performance laptop',
            unitOfMeasure: 'Units',
            stockQuantity: 45,
            currentStock: 45,
            reservedStock: 0,
            availableStock: 45,
            minStockLevel: 10,
            requiresInspection: false,
            isLowStock: false,
            categoryId: '1',
            categoryName: 'Electronics',
            isActive: true
          },
          {
            id: '2',
            itemName: 'HP 27" Monitor',
            sku: 'HP-MON-27',
            description: '27-inch LED monitor',
            unitOfMeasure: 'Units',
            stockQuantity: 67,
            currentStock: 67,
            reservedStock: 0,
            availableStock: 67,
            minStockLevel: 10,
            requiresInspection: false,
            isLowStock: false,
            categoryId: '1',
            categoryName: 'Electronics',
            isActive: true
          }
        ]);
      }
    });
  }

  loadShelves(): void {
    this.shelvesService.getAll({ isActive: true }).subscribe({
      next: (response) => {
        if (response.success !== false && Array.isArray(response.data)) {
          this.shelves.set(response.data);
        }
      },
      error: (err) => {
        console.error('Error loading shelves:', err);
      }
    });
  }

  loadCurrentStock(): void {
    const itemId = this.adjustmentForm.get('itemId')?.value;
    const shelfId = this.adjustmentForm.get('shelfId')?.value;

    if (itemId && shelfId) {
      this.inventoryService.getStockByShelf(shelfId).subscribe({
        next: (response) => {
          if (response.success !== false && Array.isArray(response.data)) {
            const stockItem = response.data.find(item => item.itemId === itemId);
            this.currentStock.set(stockItem?.currentStock || 0);
          }
        },
        error: (err) => {
          console.error('Error loading current stock:', err);
          this.currentStock.set(0);
        }
      });
    }
  }

  calculateNewStock(): number | null {
    const currentStock = this.currentStock();
    const adjustmentType = this.adjustmentForm.get('adjustmentType')?.value;
    const quantity = this.adjustmentForm.get('quantity')?.value;

    if (currentStock === null || !quantity) return null;

    switch (adjustmentType) {
      case 'increase':
        return currentStock + quantity;
      case 'decrease':
        return Math.max(0, currentStock - quantity);
      case 'set':
        return quantity;
      default:
        return null;
    }
  }

  submitAdjustment(): void {
    if (!this.adjustmentForm.valid) {
      this.markFormGroupTouched(this.adjustmentForm);
      return;
    }

    const newStock = this.calculateNewStock();
    if (newStock === null) {
      this.error.set('Unable to calculate new stock level');
      return;
    }

    if (newStock < 0) {
      this.error.set('Stock level cannot be negative');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    const formValue = this.adjustmentForm.value;
    const adjustmentRequest: AdjustStockRequest = {
      itemId: formValue.itemId,
      shelfId: formValue.shelfId,
      adjustmentType: formValue.adjustmentType,
      quantity: formValue.quantity,
      reason: formValue.reason,
      notes: formValue.notes?.trim() || undefined
    };

    console.log('=== STOCK ADJUSTMENT DEBUG ===');
    console.log('Current stock:', this.currentStock());
    console.log('Adjustment request:', JSON.stringify(adjustmentRequest, null, 2));
    console.log('Expected new stock:', newStock);
    console.log('==============================');

    this.inventoryService.adjustStock(adjustmentRequest).subscribe({
      next: (response) => {
        console.log('=== STOCK ADJUSTMENT SUCCESS ===');
        console.log('Response:', JSON.stringify(response, null, 2));
        console.log('================================');
        
        if (response.success) {
          this.success.set(`Stock adjustment completed successfully. New stock level: ${newStock}`);
          
          // Reset form after successful adjustment
          setTimeout(() => {
            this.adjustmentForm.reset();
            this.adjustmentForm.patchValue({
              adjustmentType: 'increase',
              quantity: 1
            });
            this.currentStock.set(null);
            this.success.set(null);
          }, 3000);
        } else {
          this.error.set(response.message || 'Failed to adjust stock');
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('=== STOCK ADJUSTMENT ERROR ===');
        console.error('Full error object:', err);
        console.error('==============================');
        
        let errorMessage = 'Failed to adjust stock. Please try again.';
        
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

  cancel(): void {
    this.router.navigate(['/admin/inventory']);
  }

  // Utility methods
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  getSelectedItem(): ItemMasterListDto | null {
    const itemId = this.adjustmentForm.get('itemId')?.value;
    return this.items().find(item => item.id === itemId) || null;
  }

  getSelectedShelf(): ShelfLocationDto | null {
    const shelfId = this.adjustmentForm.get('shelfId')?.value;
    return this.shelves().find(shelf => shelf.id === shelfId) || null;
  }

  getAdjustmentTypeInfo() {
    const adjustmentType = this.adjustmentForm.get('adjustmentType')?.value;
    return this.adjustmentTypes.find(type => type.value === adjustmentType);
  }

  isValidAdjustment(): boolean {
    const adjustmentType = this.adjustmentForm.get('adjustmentType')?.value;
    const quantity = this.adjustmentForm.get('quantity')?.value;
    const currentStock = this.currentStock();

    if (currentStock === null || !quantity) return false;

    if (adjustmentType === 'decrease' && quantity > currentStock) {
      return false;
    }

    return true;
  }
}