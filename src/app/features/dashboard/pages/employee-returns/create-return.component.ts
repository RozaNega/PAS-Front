import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  ReturnMaterialRequestsService,
  CreateReturnRequestCommand,
} from '../../../../core/services/return-material-requests.service';
import { ItemService } from '../../../catalog/item-master/services/item.service';
import { InventoryService, ShelfLocationDto } from '../../../../core/services/inventory.service';
import { TokenService } from '../../../../core/services/token.service';
import { ApiService } from '../../../../core/services/api.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-create-return',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-return.component.html',
  styleUrls: ['./create-return.component.scss'],
})
export class CreateReturnComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly returnService = inject(ReturnMaterialRequestsService);
  private readonly itemService = inject(ItemService);
  private readonly inventoryService = inject(InventoryService);
  private readonly tokenService = inject(TokenService);
  private readonly apiService = inject(ApiService);

  protected readonly loading = signal(false);
  protected readonly submitted = signal(false);
  protected readonly items = signal<any[]>([]);
  protected readonly shelves = signal<ShelfLocationDto[]>([]);
  protected readonly usingSampleShelves = signal(false);

  protected readonly returnForm = this.fb.group({
    itemId: ['', [Validators.required]],
    quantity: [1, [Validators.required, Validators.min(1), Validators.max(9999)]],
    reason: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
    returnType: ['CustomerReturn', [Validators.required]],
    sourceShelfId: ['', [Validators.required]],
    batchNumber: ['', [Validators.maxLength(100)]],
    expiryDate: [''],
    reference: ['', [Validators.maxLength(100)]],
    remarks: ['', [Validators.maxLength(1000)]],
  });

  ngOnInit(): void {
    this.initializeSampleData();
    this.fetchDataFromAPI();
  }

  private generateGuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private initializeSampleData(): void {
    // Sample items
    this.items.set([
      {
        id: this.generateGuid(),
        name: 'Laptop Dell XPS 13',
        sku: 'LAP-001',
        category: 'Electronics',
      },
      {
        id: this.generateGuid(),
        name: 'Office Chair Ergonomic',
        sku: 'CHR-002',
        category: 'Furniture',
      },
      {
        id: this.generateGuid(),
        name: 'HP Printer LaserJet',
        sku: 'PRT-003',
        category: 'Electronics',
      },
      {
        id: this.generateGuid(),
        name: 'Desk Lamp LED',
        sku: 'LMP-004',
        category: 'Office Supplies',
      },
      { id: this.generateGuid(), name: 'Monitor 24 inch', sku: 'MON-005', category: 'Electronics' },
      {
        id: this.generateGuid(),
        name: 'Keyboard Wireless',
        sku: 'KEY-006',
        category: 'Electronics',
      },
      { id: this.generateGuid(), name: 'Mouse Optical', sku: 'MOU-007', category: 'Electronics' },
      { id: this.generateGuid(), name: 'Filing Cabinet', sku: 'CAB-008', category: 'Furniture' },
      {
        id: this.generateGuid(),
        name: 'Whiteboard Marker',
        sku: 'MRK-009',
        category: 'Office Supplies',
      },
      {
        id: this.generateGuid(),
        name: 'Paper A4 Ream',
        sku: 'PAP-010',
        category: 'Office Supplies',
      },
    ]);

    // Sample shelves
    this.shelves.set([
      {
        id: this.generateGuid(),
        zone: 'A',
        aisle: 'A1',
        rack: 'R1',
        shelfNumber: '001',
        warehouseId: this.generateGuid(),
        binType: 'Standard',
        length: 100,
        width: 50,
        height: 30,
        maxWeight: 100,
        capacity: 50,
      },
      {
        id: this.generateGuid(),
        zone: 'A',
        aisle: 'A1',
        rack: 'R1',
        shelfNumber: '002',
        warehouseId: this.generateGuid(),
        binType: 'Standard',
        length: 100,
        width: 50,
        height: 30,
        maxWeight: 100,
        capacity: 50,
      },
      {
        id: this.generateGuid(),
        zone: 'B',
        aisle: 'B1',
        rack: 'R1',
        shelfNumber: '001',
        warehouseId: this.generateGuid(),
        binType: 'Electronics',
        length: 100,
        width: 50,
        height: 30,
        maxWeight: 100,
        capacity: 50,
      },
      {
        id: this.generateGuid(),
        zone: 'C',
        aisle: 'C1',
        rack: 'R1',
        shelfNumber: '001',
        warehouseId: this.generateGuid(),
        binType: 'Furniture',
        length: 200,
        width: 100,
        height: 50,
        maxWeight: 500,
        capacity: 20,
      },
    ]);

    // Note: Form pre-population is now handled in fetchDataFromAPI after data loads
  }

  private fetchDataFromAPI(): void {
    // Try to fetch real data from API
    this.itemService.getItems({ pageSize: 100 }).subscribe({
      next: (res) => {
        if (res.success && res.data && res.data.items && res.data.items.length > 0) {
          this.items.set(res.data.items);
          console.log('✅ Loaded items from API:', res.data.items.length);
          // Pre-populate form with first item if available
          setTimeout(() => {
            if (this.items().length > 0) {
              this.returnForm.patchValue({
                itemId: this.items()[0].id,
              });
            }
          }, 100);
        }
      },
      error: (err) => {
        console.log('ℹ️ Using sample items (API failed):', err);
        // Pre-populate with sample item
        setTimeout(() => {
          if (this.items().length > 0) {
            this.returnForm.patchValue({
              itemId: this.items()[0].id,
            });
          }
        }, 100);
      },
    });

    this.inventoryService.getAllShelves().subscribe({
      next: (res) => {
        if (res.success && res.data && res.data.length > 0) {
          this.shelves.set(res.data);
          this.usingSampleShelves.set(false);
          console.log('✅ Loaded shelves from API:', res.data.length);
          // Pre-populate form with first shelf if available
          setTimeout(() => {
            if (this.shelves().length > 0) {
              this.returnForm.patchValue({
                sourceShelfId: this.shelves()[0].id,
              });
            }
          }, 100);
        }
      },
      error: (err) => {
        console.log('ℹ️ Using sample shelves (API failed):', err);
        this.usingSampleShelves.set(true);
        // Make sourceShelfId optional when using sample data
        this.returnForm.get('sourceShelfId')?.clearValidators();
        this.returnForm.get('sourceShelfId')?.updateValueAndValidity();
        // Pre-populate with sample shelf
        setTimeout(() => {
          if (this.shelves().length > 0) {
            this.returnForm.patchValue({
              sourceShelfId: this.shelves()[0].id,
            });
          }
        }, 100);
      },
    });
  }

  protected submit(): void {
    this.submitted.set(true);

    if (this.returnForm.invalid) {
      console.log('❌ Form is invalid:', this.returnForm.errors);
      alert('Please fill in all required fields correctly before submitting.');
      return;
    }

    // Check authentication
    const token = this.tokenService.getToken();
    if (!token || this.tokenService.isTokenExpired()) {
      alert('❌ You are not logged in or your session has expired. Please login first.');
      this.router.navigate(['/auth/login']);
      return;
    }

    this.loading.set(true);
    const formValue = this.returnForm.getRawValue();

    // Map frontend return types to backend expected values
    const returnTypeMapping: { [key: string]: string } = {
      CustomerReturn: 'TO_SUPPLIER',
      StoreReturn: 'TO_WAREHOUSE',
      DamagedReturn: 'DAMAGED',
      DefectiveReturn: 'QUALITY_ISSUE',
      WarrantyReturn: 'EXCESS',
    };

    // Prepare payload according to API structure
    const payload: CreateReturnRequestCommand = {
      itemId: formValue.itemId!,
      quantity: formValue.quantity!,
      reason: formValue.reason!,
      returnType: returnTypeMapping[formValue.returnType!] || formValue.returnType!,
      ...(this.usingSampleShelves() ? {} : { sourceShelfId: formValue.sourceShelfId! }),
      batchNumber: formValue.batchNumber || '',
      expiryDate: formValue.expiryDate || '',
      reference: formValue.reference || '',
      remarks: formValue.remarks || '',
    };

    console.log('🚀 Submitting return material request:', JSON.stringify(payload, null, 2));

    this.returnService
      .create(payload)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          console.log('📥 Return request creation response:', response);

          if (response.success || response.succeeded) {
            console.log('✅ Return request created successfully!');
            alert(
              '✅ Return material request created successfully! Your request has been saved to the database.',
            );

            // Reset form after successful submission
            this.returnForm.reset();
            this.submitted.set(false);

            // Navigate back to dashboard
            this.router.navigate(['/employee/dashboard']);
          } else {
            console.error('❌ Return request creation failed:', response.message);
            alert('❌ Error creating return request: ' + (response.message || 'Unknown error'));
          }
        },
        error: (error) => {
          console.error('❌ Return request creation error:', error);

          let errorMessage = 'An unexpected error occurred while creating the return request.';

          if (error.status === 0) {
            errorMessage =
              'Unable to connect to the server. Please check your connection and try again.';
          } else if (error.status === 400) {
            errorMessage = 'Invalid request data. Please check your input and try again.';

            if (error.error?.message) {
              errorMessage += '\n\nServer message: ' + error.error.message;
            }
          } else if (error.status === 401) {
            errorMessage = 'You are not authorized to create return requests. Please login again.';
            setTimeout(() => {
              this.router.navigate(['/auth/login']);
            }, 2000);
          } else if (error.status === 403) {
            errorMessage = 'You do not have permission to create return requests.';
          } else if (error.status === 500) {
            errorMessage = 'Server error occurred. Please try again later.';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }

          alert(errorMessage);
        },
      });
  }

  protected cancel(): void {
    this.router.navigate(['/employee/dashboard']);
  }

  protected addSampleData(): void {
    // Pre-populate with different sample data
    const randomItem = this.items()[Math.floor(Math.random() * this.items().length)];
    const randomShelf = this.shelves()[Math.floor(Math.random() * this.shelves().length)];

    this.returnForm.patchValue({
      itemId: randomItem?.id,
      quantity: Math.floor(Math.random() * 5) + 1,
      reason: 'Defective item - needs to be returned to supplier',
      returnType: 'CustomerReturn',
      sourceShelfId: randomShelf?.id,
      batchNumber: `BATCH-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`,
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
      reference: `REF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`,
      remarks: 'Item shows signs of wear and needs to be returned for replacement or refund',
    });
  }
}
