import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InventoryService, InventoryStockDto, AdjustStockRequest } from '../../../../core/services/inventory.service';

@Component({
  selector: 'app-bulk-adjust-stock',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bulk-adjust-stock.component.html',
  styleUrls: ['./bulk-adjust-stock.component.scss']
})
export class BulkAdjustStockComponent implements OnInit {
  private readonly inventoryService = inject(InventoryService);
  private readonly router = inject(Router);

  items = signal<InventoryStockDto[]>([]);
  adjustmentType: 'increase' | 'decrease' | 'set' = 'increase';
  quantity: number = 0;
  reason: string = '';
  notes: string = '';
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);

  adjustmentReasons = [
    'Stock count verification',
    'Inventory correction',
    'Damage/waste',
    'Shrinkage',
    'Transfer',
    'Return',
    'Other'
  ];

  ngOnInit(): void {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state?.['items']) {
      this.items.set(navigation.extras.state['items']);
    } else {
      this.router.navigate(['/admin/inventory']);
    }
  }

  adjustStock(): void {
    if (!this.reason) {
      this.error.set('Please select a reason');
      return;
    }

    if (this.adjustmentType !== 'set' && this.quantity <= 0) {
      this.error.set('Please enter a valid quantity');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const adjustmentPromises = this.items().map(item =>
      this.inventoryService.adjustStock({
        itemId: item.itemId,
        shelfId: item.shelfId,
        adjustmentType: this.adjustmentType,
        quantity: this.quantity,
        reason: this.reason,
        notes: this.notes
      }).toPromise()
    );

    Promise.all(adjustmentPromises)
      .then(() => {
        this.success.set(true);
        this.loading.set(false);
        setTimeout(() => {
          this.router.navigate(['/admin/inventory']);
        }, 2000);
      })
      .catch(err => {
        this.error.set('Failed to adjust stock: ' + (err.error?.message || err.message));
        this.loading.set(false);
      });
  }

  cancel(): void {
    this.router.navigate(['/admin/inventory']);
  }

  getTotalAdjustment(): number {
    return this.items().length * this.quantity;
  }
}
