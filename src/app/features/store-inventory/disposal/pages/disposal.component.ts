import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { DisposalRecordsService, DisposalRecordDto } from '../../../../core/services/disposal-records.service';
import { WorkflowService } from '../../../../core/services/workflow.service';

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
  itemMasterId: string;
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
  private apiService = inject(ApiService);

  private disposalService = inject(DisposalRecordsService);

  private workflowService = inject(WorkflowService);

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
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.apiService.get<unknown>('InventoryStock', {}).subscribe({
      next: (res) => {
        this.loading.set(false);
        const extracted = this.extractItems(res);
        this.stockItems.set(extracted);
        if (extracted.length === 0) {
          this.showNotification('No stock items found in inventory', 'error');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.showNotification('Failed to load stock items from server', 'error');
      },
    });
    this.loadHistory();
  }

  private extractItems(res: any): DisplayItem[] {
    if (!res || res.success === false) {
      console.warn('[Disposal] API returned success=false', res?.message);
      return [];
    }
    let raw: any[] = [];
    if (res.data) {
      if (Array.isArray(res.data)) {
        raw = res.data;
      } else if (res.data.items && Array.isArray(res.data.items)) {
        raw = res.data.items;
      } else if (res.data.data && Array.isArray(res.data.data)) {
        raw = res.data.data;
      }
    }
    if (raw.length === 0) {
      console.warn('[Disposal] No items found in response', JSON.stringify(res).substring(0, 500));
    }
    return raw.map((x: any) => ({
      id: x.id || x.Id || '',
      itemMasterId: x.itemId || x.ItemId || x.id || x.Id || '',
      itemName: x.itemName || x.ItemName || x.name || x.Name || '',
      sku: x.sku || x.Sku || '',
      currentStock: Number(x.currentStock ?? x.CurrentStock ?? x.stockQuantity ?? x.StockQuantity ?? 0),
      unitPrice: Number(x.unitPrice ?? x.UnitPrice ?? 0),
      unitOfMeasure: x.unitOfMeasure || x.UnitOfMeasure || '',
      warehouseName: x.warehouseName || x.WarehouseName || '',
      shelfLocation: x.shelfLocation || x.ShelfLocation || '',
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
    const key = item.itemMasterId;
    const existing = this.selectedItems().find((x) => x.itemId === key);
    if (existing) {
      this.selectedItems.set(this.selectedItems().filter((x) => x.itemId !== existing.itemId));
    } else {
      this.selectedItems.set([
        ...this.selectedItems(),
        {
          itemId: key,
          itemName: item.itemName || '',
          sku: item.sku || '',
          quantity: 1,
          availableStock: item.currentStock || 0,
          unitCost: item.unitPrice || 0,
        },
      ]);
    }
  }

  isSelected(item: DisplayItem): boolean {
    return this.selectedItems().some((x) => x.itemId === item.itemMasterId);
  }

  updateQuantity(itemId: string, qty: number): void {
    this.selectedItems.set(
      this.selectedItems().map((x) =>
        x.itemId === itemId ? { ...x, quantity: Math.max(1, Math.min(qty, x.availableStock)) } : x,
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
    this.submitting.set(true);
    const payload = {
      items: this.selectedItems().map((x) => ({
        itemId: x.itemId,
        quantity: x.quantity,
        reason: this.reason().trim(),
      })),
      reason: this.reason().trim(),
    };
    this.disposalService.create(payload).subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (res.success !== false) {
          this.workflowService.createNotification({
            recipientId: '',
            recipientRole: 'Admin',
            type: 'info',
            title: 'Disposal Created',
            message: `${this.selectedItems().length} item(s) submitted for disposal. Reason: ${this.reason().trim()}`,
            actionRequired: true,
            actionUrl: '/admin/dashboard',
          });
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
        const msg = err?.error?.title || err?.error?.message || err?.message || 'Failed to create disposal';
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
