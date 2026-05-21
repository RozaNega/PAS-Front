import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InventoryService } from '../../../../core/services/inventory.service';

@Component({
  selector: 'app-item-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './item-management.component.html',
  styleUrls: ['./item-management.component.scss']
})
export class ItemManagementComponent implements OnInit {
  private readonly inventoryService = inject(InventoryService);
  private readonly router = inject(Router);

  isNew = signal(true);
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);

  // Form data
  itemId: string = '';
  itemName: string = '';
  sku: string = '';
  description: string = '';
  unitOfMeasure: string = 'Units';
  warehouseId: string = '';
  shelfId: string = '';
  minimumThreshold: number = 0;
  maximumThreshold: number = 0;
  reorderQuantity: number = 0;

  warehouses = signal<any[]>([]);
  shelves = signal<any[]>([]);

  unitOptions = ['Units', 'Boxes', 'Packs', 'Cartons', 'Pieces', 'Kg', 'Liters'];

  ngOnInit(): void {
    this.loadWarehouses();
  }

  loadWarehouses(): void {
    // This should call the warehouses service
    // For now, using mock data
    this.warehouses.set([
      { id: 'wh-001', warehouseName: 'Main Warehouse' },
      { id: 'wh-002', warehouseName: 'Branch Warehouse A' }
    ]);
  }

  onWarehouseChange(): void {
    // Load shelves for selected warehouse
    if (this.warehouseId) {
      this.shelves.set([
        { id: 'shelf-001', shelfName: 'Shelf A1' },
        { id: 'shelf-002', shelfName: 'Shelf A2' }
      ]);
    }
  }

  saveItem(): void {
    if (!this.itemName || !this.sku || !this.warehouseId || !this.shelfId) {
      this.error.set('Please fill in all required fields');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const itemData = {
      itemId: this.itemId || undefined,
      itemName: this.itemName,
      sku: this.sku,
      description: this.description,
      unitOfMeasure: this.unitOfMeasure,
      warehouseId: this.warehouseId,
      shelfId: this.shelfId,
      minimumThreshold: this.minimumThreshold,
      maximumThreshold: this.maximumThreshold,
      reorderQuantity: this.reorderQuantity
    };

    // TODO: Implement item create/update API call
    // this.inventoryService.createItem(itemData).subscribe({
    //   next: () => {
    //     this.success.set(true);
    //     setTimeout(() => this.router.navigate(['/admin/inventory']), 2000);
    //   },
    //   error: (err) => {
    //     this.error.set(err.error?.message || 'Failed to save item');
    //     this.loading.set(false);
    //   }
    // });

    // Mock success for now
    this.success.set(true);
    this.loading.set(false);
  }

  cancel(): void {
    this.router.navigate(['/admin/inventory']);
  }
}
