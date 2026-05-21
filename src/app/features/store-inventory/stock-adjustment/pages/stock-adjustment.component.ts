import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService, InventoryStockDto, StockMovementDto } from '../../../../core/services/inventory.service';

interface PickRow {
  itemId: string;
  shelfId: string;
  name: string;
  sku: string;
  current: number;
  low?: boolean;
  warehouse: string;
  shelf: string;
}

interface Adjustment {
  id: string;
  dateTime: string;
  item: string;
  quantity: number;
  type: string;
  reason: string;
  status: 'Approved' | 'Pending';
}

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

@Component({
  selector: 'app-stock-adjustment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-adjustment.component.html',
  styleUrls: ['./stock-adjustment.component.scss'],
})
export class StockAdjustmentComponent implements OnInit {
  private readonly inventory = inject(InventoryService);

  searchTerm = signal('');
  selectedRow = signal<PickRow | null>(null);
  adjustmentType = signal('Remove');
  quantityToAdjust = signal(1);
  reason = signal('');
  notes = signal('');

  loading = signal(false);
  loadError = signal<string | null>(null);
  submitMessage = signal<string | null>(null);

  recentItemsRaw = signal<PickRow[]>([]);
  recentItems = computed(() => {
    const t = this.searchTerm().toLowerCase();
    return this.recentItemsRaw().filter(
      (x) => !t || x.name.toLowerCase().includes(t) || x.sku.toLowerCase().includes(t),
    );
  });

  adjustmentHistory = signal<Adjustment[]>([]);

  summary = signal({
    totalAdjustments: 0,
    totalAdded: 0,
    totalRemoved: 0,
    pendingApprovals: 0,
  });

  currentQuantity = signal(0);
  newQuantity = signal(0);

  locationLabel = computed(() => {
    const r = this.selectedRow();
    if (!r) return '—';
    return `${r.warehouse} — ${r.shelf}`;
  });

  selectedItemLabel = computed(() => this.selectedRow()?.name ?? '');

  ngOnInit(): void {
    this.loadPickerStock();
    this.loadHistory();
  }

  loadPickerStock(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.inventory.getStockOverview({ pageSize: 500 }).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success === false || !Array.isArray(res.data)) {
          this.loadError.set(res.message || 'Could not load items.');
          return;
        }
        const rows = res.data.map((r) => this.mapPick(r));
        this.recentItemsRaw.set(rows);
      },
      error: (err) => {
        this.loading.set(false);
        this.loadError.set('Failed to load stock.');
        console.error(err);
      },
    });
  }

  private mapPick(r: InventoryStockDto): PickRow {
    const min = Number(r.minimumThreshold) || 0;
    const cur = Number(r.currentStock) || 0;
    const low = min > 0 && cur <= min;
    return {
      itemId: r.itemId,
      shelfId: r.shelfId,
      name: r.itemName || '—',
      sku: r.sku || '—',
      current: cur,
      low,
      warehouse: r.warehouseName || '—',
      shelf: r.shelfLocation || '—',
    };
  }

  loadHistory(): void {
    const end = new Date();
    const start = addDays(end, -30);
    this.inventory
      .getStockMovements({
        dateFrom: toYmd(start),
        dateTo: toYmd(end),
        pageSize: 200,
      })
      .subscribe({
        next: (res) => {
          if (res.success === false || !Array.isArray(res.data)) return;
          const adj = res.data
            .filter((m) => this.isAdjustmentLike(m))
            .slice(0, 20)
            .map((m, i) => ({
              id: m.id || String(i),
              dateTime: m.movementDate ? new Date(m.movementDate).toLocaleString() : '—',
              item: m.itemName || '—',
              quantity: Number(m.quantity) || 0,
              type: 'Adjustment',
              reason: m.notes || m.referenceType || '—',
              status: 'Approved' as const,
            }));
          this.adjustmentHistory.set(adj);
          const added = adj.filter((a) => a.quantity > 0).reduce((s, a) => s + a.quantity, 0);
          const removed = adj.filter((a) => a.quantity < 0).reduce((s, a) => s + Math.abs(a.quantity), 0);
          this.summary.set({
            totalAdjustments: adj.length,
            totalAdded: added,
            totalRemoved: removed,
            pendingApprovals: 0,
          });
        },
        error: () => {},
      });
  }

  private isAdjustmentLike(m: StockMovementDto): boolean {
    const u = `${m.movementType || ''} ${m.referenceType || ''}`.toUpperCase();
    return u.includes('ADJUST') || u.includes('ADJ') || u.includes('COUNT');
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  selectItem(item: PickRow): void {
    this.selectedRow.set(item);
    this.currentQuantity.set(item.current);
    this.submitMessage.set(null);
    this.calculateNewQuantity();
  }

  onAdjustmentTypeChange(value: string): void {
    this.adjustmentType.set(value);
    this.calculateNewQuantity();
  }

  onQuantityChange(value: number): void {
    this.quantityToAdjust.set(Number(value) || 0);
    this.calculateNewQuantity();
  }

  calculateNewQuantity(): void {
    const qty = this.quantityToAdjust();
    const type = this.adjustmentType();
    const current = this.currentQuantity();
    if (type === 'Add') {
      this.newQuantity.set(current + qty);
    } else if (type === 'Remove') {
      this.newQuantity.set(current - qty);
    } else {
      this.newQuantity.set(qty);
    }
  }

  submitAdjustment(): void {
    const row = this.selectedRow();
    if (!row) {
      alert('Please select an item from the list.');
      return;
    }
    const r = this.reason();
    if (!r) {
      alert('Please select a reason.');
      return;
    }
    let adjustmentType: 'increase' | 'decrease' | 'set' = 'decrease';
    if (this.adjustmentType() === 'Add') adjustmentType = 'increase';
    if (this.adjustmentType() === 'Set') adjustmentType = 'set';
    const quantity = this.quantityToAdjust();
    this.submitMessage.set(null);
    this.inventory
      .adjustStock({
        itemId: row.itemId,
        shelfId: row.shelfId,
        adjustmentType,
        quantity,
        reason: r,
        notes: this.notes() || undefined,
      })
      .subscribe({
        next: (res) => {
          if (res.success === false) {
            this.submitMessage.set(res.message || 'Adjustment failed.');
            return;
          }
          this.submitMessage.set('Adjustment submitted successfully.');
          this.loadPickerStock();
          this.loadHistory();
        },
        error: (err) => {
          this.submitMessage.set('Request failed.');
          console.error(err);
        },
      });
  }

  viewHistory(): void {
    this.loadHistory();
  }

  cancelForm(): void {
    this.searchTerm.set('');
    this.selectedRow.set(null);
    this.adjustmentType.set('Remove');
    this.quantityToAdjust.set(1);
    this.reason.set('');
    this.notes.set('');
    this.currentQuantity.set(0);
    this.newQuantity.set(0);
    this.submitMessage.set(null);
  }

  requiresApproval(): boolean {
    const qty = Math.abs(this.quantityToAdjust());
    const current = this.currentQuantity();
    if (current <= 0) return qty > 0;
    return qty > current * 0.1;
  }

  getStatusColor(status: string): string {
    return status === 'Approved' ? 'green' : 'yellow';
  }
}
