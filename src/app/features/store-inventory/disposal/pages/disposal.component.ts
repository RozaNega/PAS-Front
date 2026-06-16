import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DisposalRecordsService, DisposalRecordDto } from '../../../../core/services/disposal-records.service';
import { ItemMasterService, ItemMaster, ItemMasterPaginatedResponse } from '../../../../core/services/item-master.service';

interface SelectedItem {
  itemId: string;
  itemName: string;
  sku: string;
  quantity: number;
  availableStock: number;
  unitCost: number;
}

interface DisplayItem {
  id: string;
  itemName: string;
  sku: string;
  currentStock: number;
  unitPrice: number;
  unitOfMeasure: string;
  warehouseName: string;
  shelfLocation: string;
}

@Component({
  selector: 'app-disposal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './disposal.component.html',
  styleUrls: ['./disposal.component.scss'],
})
export class DisposalComponent implements OnInit {
  private disposalService = inject(DisposalRecordsService);
  private itemMasterService = inject(ItemMasterService);

  showDisposalForm = signal(false);
  searchTerm = signal('');
  reason = signal('');
  loading = signal(false);
  submitting = signal(false);
  notification = signal<{ message: string; type: 'success' | 'error' } | null>(null);

  stockItems = signal<DisplayItem[]>([]);
  selectedItems = signal<SelectedItem[]>([]);
  disposalHistory = signal<DisposalRecordDto[]>([]);

  filteredStock = computed(() => {
    const t = this.searchTerm().toLowerCase();
    return this.stockItems().filter(
      (x) =>
        (x.itemName || '').toLowerCase().includes(t) ||
        (x.sku || '').toLowerCase().includes(t) ||
        (x.warehouseName || '').toLowerCase().includes(t),
    );
  });

  totalQuantity = computed(() => this.selectedItems().reduce((s, i) => s + i.quantity, 0));
  totalValue = computed(() => this.selectedItems().reduce((s, i) => s + i.quantity * (i.unitCost || 0), 0));

  ngOnInit(): void {
    this.loadHistory();
  }

  openCreateForm(): void {
    this.showDisposalForm.set(true);
    this.searchTerm.set('');
    this.selectedItems.set([]);
    this.reason.set('');
    this.notification.set(null);
    this.loadItemMasterItems();
  }

  cancelCreateForm(): void {
    this.showDisposalForm.set(false);
    this.selectedItems.set([]);
    this.reason.set('');
    this.searchTerm.set('');
    this.notification.set(null);
  }

  loadItemMasterItems(): void {
    this.loading.set(true);
    this.itemMasterService.getItemMasters(1, 200).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data && typeof res.data === 'object' && 'items' in res.data) {
          const items = (res.data as ItemMasterPaginatedResponse).items;
          this.stockItems.set(this.mapItemMasters(items));
          if (items.length === 0) {
            this.showNotification('No items found in inventory', 'error');
          }
        } else {
          this.stockItems.set([]);
          this.showNotification('No items found in inventory', 'error');
        }
      },
      error: () => {
        this.loading.set(false);
        this.stockItems.set([]);
        this.showNotification('Failed to load items from server', 'error');
      },
    });
  }

  private mapItemMasters(items: ItemMaster[]): DisplayItem[] {
    return items.map((x) => ({
      id: String(x.id),
      itemName: x.itemName || '',
      sku: x.sku || '',
      currentStock: x.availableStock ?? x.currentStock ?? x.stockQuantity ?? 0,
      unitPrice: x.unitPrice ?? 0,
      unitOfMeasure: x.unitOfMeasure || '',
      warehouseName: '',
      shelfLocation: '',
    }));
  }

  loadHistory(): void {
    this.disposalService.getAll({ pageSize: 50 }).subscribe({
      next: (res) => {
        if (res.success !== false && res.data) {
          const items = (res.data as any)?.items || (Array.isArray(res.data) ? res.data : []);
          this.disposalHistory.set(items);
        }
      },
      error: () => {},
    });
  }

  toggleItem(item: DisplayItem): void {
    const key = item.id;
    const existing = this.selectedItems().find((x) => x.itemId === key);
    if (existing) {
      this.selectedItems.set(this.selectedItems().filter((x) => x.itemId !== existing.itemId));
    } else {
      const stock = item.currentStock || 0;
      if (stock <= 0) {
        this.showNotification(`"${item.itemName}" has no available stock (0) and cannot be disposed.`, 'error');
        return;
      }
      this.selectedItems.set([
        ...this.selectedItems(),
        {
          itemId: key,
          itemName: item.itemName || '',
          sku: item.sku || '',
          quantity: 1,
          availableStock: stock,
          unitCost: item.unitPrice || 0,
        },
      ]);
    }
  }

  isSelected(item: DisplayItem): boolean {
    return this.selectedItems().some((x) => x.itemId === item.id);
  }

  updateQuantity(itemId: string, qty: number): void {
    this.selectedItems.set(
      this.selectedItems().map((x) =>
        x.itemId === itemId
          ? { ...x, quantity: x.availableStock > 0 ? Math.max(1, Math.min(qty, x.availableStock)) : 0 }
          : x,
      ),
    );
  }

  removeItem(itemId: string): void {
    this.selectedItems.set(this.selectedItems().filter((x) => x.itemId !== itemId));
  }

  submitDisposal(): void {
    if (this.selectedItems().length === 0) {
      this.showNotification('Select at least one item to dispose', 'error');
      return;
    }
    if (!this.reason().trim()) {
      this.showNotification('Enter a reason for disposal', 'error');
      return;
    }
    const overstock = this.selectedItems().find((x) => x.quantity > x.availableStock);
    if (overstock) {
      this.showNotification(`"${overstock.itemName}" — requested ${overstock.quantity} but only ${overstock.availableStock} available.`, 'error');
      return;
    }
    const zerostock = this.selectedItems().find((x) => x.availableStock <= 0);
    if (zerostock) {
      this.showNotification(`"${zerostock.itemName}" has no available stock and cannot be disposed.`, 'error');
      return;
    }
    this.submitting.set(true);
    const payload = {
      items: this.selectedItems().map((x) => ({
        itemId: x.itemId,
        itemName: x.itemName,
        quantity: x.quantity,
        reason: this.reason().trim(),
      })),
      reason: this.reason().trim(),
    };
    this.disposalService.create(payload).subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (res.success !== false) {
          this.showNotification('Disposal created successfully. Admin has been notified.', 'success');
          this.selectedItems.set([]);
          this.reason.set('');
          this.loadHistory();
        } else {
          this.showNotification(res.message || 'Failed to create disposal', 'error');
        }
      },
      error: (err) => {
        this.submitting.set(false);
        const msg = err?.error?.message || err?.error?.title || err?.message || 'Failed to create disposal';
        this.showNotification(msg, 'error');
      },
    });
  }

  statusClass(status: string): string {
    switch ((status || '').toLowerCase()) {
      case 'pending': return 'status-pending';
      case 'completed': return 'status-completed';
      case 'rejected': return 'status-rejected';
      default: return '';
    }
  }

  private showNotification(message: string, type: 'success' | 'error'): void {
    this.notification.set({ message, type });
    setTimeout(() => this.notification.set(null), 5000);
  }
}
