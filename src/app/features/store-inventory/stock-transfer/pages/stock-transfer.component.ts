import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StockTransferService, TransferItem, TransferHistory } from '../services/stock-transfer.service';

interface WarehouseOption {
  id: string;
  name: string;
}

@Component({
  selector: 'app-stock-transfer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-transfer.component.html',
  styleUrls: ['./stock-transfer.component.scss']
})
export class StockTransferComponent implements OnInit {
  private readonly transferService = inject(StockTransferService);

  // Form state
  fromWarehouse = signal('');
  toWarehouse = signal('');
  transferReason = signal('');
  requiredByDate = signal('');
  notes = signal('');

  // Data state
  warehouses = signal<WarehouseOption[]>([]);
  transferItems = signal<TransferItem[]>([]);
  transferHistory = signal<TransferHistory[]>([]);

  // UI state
  showHistoryModal = signal(false);
  loading = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  loadingItems = signal(false);

  // Computed values
  selectedItems = computed(() => {
    return this.transferItems().filter(item => item.toTransfer > 0);
  });

  totalQuantity = computed(() => {
    return this.selectedItems().reduce((sum, item) => sum + item.toTransfer, 0);
  });

  totalValue = computed(() => {
    return this.selectedItems().reduce((sum, item) => sum + (item.toTransfer * (item.price || 0)), 0);
  });

  isFormValid = computed(() => {
    return (
      this.fromWarehouse() &&
      this.toWarehouse() &&
      this.fromWarehouse() !== this.toWarehouse() &&
      this.transferReason().trim().length > 0 &&
      this.requiredByDate().length > 0 &&
      this.selectedItems().length > 0
    );
  });

  ngOnInit(): void {
    this.loadWarehouses();
    this.loadTransferHistory();
  }

  // Load warehouses
  loadWarehouses(): void {
    this.loading.set(true);
    this.error.set(null);
    this.transferService.getWarehouses().subscribe({
      next: (res) => {
        if (res.success !== false && Array.isArray(res.data)) {
          const warehouseList = (res.data as any[]).map(wh => ({
            id: wh.id,
            name: wh.warehouseName
          }));
          this.warehouses.set(warehouseList);
          if (warehouseList.length >= 2) {
            this.fromWarehouse.set(warehouseList[0].id);
            this.toWarehouse.set(warehouseList[1].id);
            this.loadItemsForWarehouse();
          }
        } else {
          this.error.set(res.message || 'Failed to load warehouses');
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading warehouses:', err);
        this.error.set('Failed to load warehouses. Please try again.');
        this.loading.set(false);
      }
    });
  }

  // Load items for selected warehouse
  loadItemsForWarehouse(): void {
    const warehouseId = this.fromWarehouse();
    if (!warehouseId) return;

    this.loadingItems.set(true);
    this.error.set(null);
    this.transferService.getItemsInWarehouse(warehouseId).subscribe({
      next: (res) => {
        if (res.success !== false && Array.isArray(res.data)) {
          this.transferItems.set(res.data);
        } else {
          this.error.set(res.message || 'Failed to load items');
        }
        this.loadingItems.set(false);
      },
      error: (err) => {
        console.error('Error loading items:', err);
        this.error.set('Failed to load items. Please try again.');
        this.loadingItems.set(false);
      }
    });
  }

  // Load transfer history
  loadTransferHistory(): void {
    this.transferService.getTransferHistory().subscribe({
      next: (res) => {
        if (res.success !== false && Array.isArray(res.data)) {
          this.transferHistory.set(res.data);
        }
      },
      error: (err) => console.error('Error loading history:', err)
    });
  }

  // Update transfer quantity
  updateTransferQuantity(sku: string, value: any): void {
    const quantity = Math.max(0, parseInt(value) || 0);
    this.transferItems.update(items =>
      items.map(item =>
        item.sku === sku
          ? { ...item, toTransfer: Math.min(quantity, item.available) }
          : item
      )
    );
  }

  // On warehouse change
  onFromWarehouseChange(): void {
    this.loadItemsForWarehouse();
    this.transferItems.set([]);
  }

  // Open history modal
  openHistoryModal(): void {
    this.showHistoryModal.set(true);
  }

  // Close history modal
  closeHistoryModal(): void {
    this.showHistoryModal.set(false);
  }

  // Create transfer order
  createTransferOrder(): void {
    if (!this.isFormValid()) {
      this.error.set('Please fill in all required fields and select items to transfer.');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    this.success.set(null);

    const request = {
      fromWarehouseId: this.fromWarehouse(),
      toWarehouseId: this.toWarehouse(),
      items: this.selectedItems().map(item => ({
        itemId: item.itemId,
        quantity: item.toTransfer
      })),
      reason: this.transferReason(),
      requiredByDate: this.requiredByDate(),
      notes: this.notes()
    };

    this.transferService.createTransfer(request).subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (res.success) {
          this.success.set(`Transfer order created successfully: ${res.data?.transferNumber || 'Order ID: ' + res.data?.id}`);
          setTimeout(() => {
            this.resetForm();
            this.loadTransferHistory();
          }, 2000);
        } else {
          this.error.set(res.message || 'Failed to create transfer order');
        }
      },
      error: (err) => {
        this.submitting.set(false);
        console.error('Error creating transfer:', err);
        this.error.set(err?.error?.message || 'Failed to create transfer order. Please try again.');
      }
    });
  }

  // Cancel form
  cancelForm(): void {
    if (confirm('Are you sure you want to cancel this transfer?')) {
      this.resetForm();
    }
  }

  // Reset form
  private resetForm(): void {
    this.transferReason.set('');
    this.requiredByDate.set('');
    this.notes.set('');
    this.error.set(null);
    this.success.set(null);
    this.transferItems.update(items =>
      items.map(item => ({ ...item, toTransfer: 0 }))
    );
  }

  // Get status icon
  getStatusIcon(status: string): string {
    switch (status) {
      case 'completed':
        return 'bi bi-check-circle-fill';
      case 'in-progress':
        return 'bi bi-arrow-repeat';
      case 'pending':
        return 'bi bi-clock-fill';
      default:
        return 'bi bi-info-circle-fill';
    }
  }

  // Format value
  formatValue(value: number): string {
    if (value >= 1000) {
      return '$' + (value / 1000).toFixed(1) + 'K';
    }
    return '$' + value.toLocaleString();
  }

  // Get warehouse name
  getWarehouseName(id: string): string {
    return this.warehouses().find(w => w.id === id)?.name || id;
  }
}
