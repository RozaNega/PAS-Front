import { Injectable, computed, inject, signal } from '@angular/core';
import {
  ItemMasterListDto,
  ItemMasterService,
} from '../../../../core/services/item-master.service';
import { finalize, forkJoin, map, Observable, of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ItemMasterApi {
  private readonly itemService = inject(ItemMasterService);
  private readonly itemsSignal = signal<ItemMasterListDto[]>([]);
  private readonly loadingSignal = signal<boolean>(false);

  readonly items = computed(() =>
    [...this.itemsSignal()].sort((a, b) => a.itemName.localeCompare(b.itemName)),
  );

  readonly isLoading = this.loadingSignal.asReadonly();

  readonly activeItemCount = computed(
    () => this.items().filter((item) => (item.isActive ?? item.currentStock > 0)).length,
  );

  readonly totalStock = computed(() =>
    this.items().reduce((sum, item) => sum + (item.currentStock ?? item.stockQuantity ?? 0), 0),
  );

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this.loadingSignal.set(true);
    console.log('=== ITEM MASTER API: Refreshing items ===');
    this.itemService.getItemMasters(1, 1000).subscribe({
      next: (res: any) => {
        console.log('=== ITEM MASTER API: Response received ===');
        console.log('Response:', res);
        if (res.success && res.data?.items) {
          console.log('Items loaded:', res.data.items);
          this.itemsSignal.set(res.data.items);
        } else {
          console.error('API response unsuccessful or no data:', res);
        }
        this.loadingSignal.set(false);
      },
      error: (err) => {
        console.error('=== ITEM MASTER API: Error loading items ===');
        console.error('Error:', err);
        this.loadingSignal.set(false);
      }
    });
  }

  getById(id: string) {
    return this.items().find((item) => String(item.id) === id);
  }

  create(payload: Record<string, unknown>) {
    console.log('=== ITEM MASTER API: Creating item ===');
    console.log('Payload:', payload);
    return this.itemService.createItemMaster(payload).pipe(
      tap(res => {
        console.log('=== ITEM MASTER API: Create response ===');
        console.log('Response:', res);
        if (res.success) {
          console.log('Item created successfully, refreshing...');
          this.refresh();
        }
      })
    );
  }

  update(id: string, payload: Record<string, unknown>) {
    console.log('=== ITEM MASTER API: Updating item ===');
    console.log('ID:', id, 'Payload:', payload);
    return this.itemService.updateItemMaster(id, payload).pipe(
      tap(res => {
        console.log('=== ITEM MASTER API: Update response ===');
        console.log('Response:', res);
        if (res.success) {
          console.log('Item updated successfully, refreshing...');
          this.refresh();
        }
      })
    );
  }

  remove(id: string): Observable<void> {
    console.log('=== ITEM MASTER API: Deleting item ===');
    console.log('ID:', id);
    return this.itemService.deleteItemMaster(id).pipe(
      tap((res) => {
      console.log('=== ITEM MASTER API: Delete response ===');
      console.log('Response:', res);
      if (res.success) {
        console.log('Item deleted successfully, refreshing...');
        this.refresh();
      }
      }),
      map(() => void 0),
    );
  }

  // Bulk Actions
  bulkAdjustStock(itemIds: string[], adjustment: number): Observable<void> {
    if (isNaN(adjustment) || itemIds.length === 0) {
      return of(void 0);
    }

    const requests = itemIds.map((id) => {
      const item = this.getById(id);
      if (!item) {
        return of(null);
      }

      const currentMinimum = item.minStockLevel ?? item['minimumThreshold'] ?? 0;
      const minStockLevel = Math.max(0, currentMinimum + adjustment);

      return this.itemService.updateItemMaster(id, { minStockLevel: minStockLevel as any });
    });

    this.loadingSignal.set(true);
    return forkJoin(requests).pipe(
      tap(() => this.refresh()),
      map(() => void 0),
      finalize(() => this.loadingSignal.set(false)),
    );
  }

  bulkEdit(itemIds: string[], updates: Record<string, unknown>): Observable<void> {
    if (itemIds.length === 0) {
      return of(void 0);
    }

    this.loadingSignal.set(true);
    const updates$ = itemIds.map((id) => {
      return this.itemService.updateItemMaster(id, updates);
    });

    return forkJoin(updates$).pipe(
      tap(() => this.refresh()),
      map(() => void 0),
      finalize(() => this.loadingSignal.set(false)),
    );
  }

  bulkExport(itemIds: string[]): void {
    const items = this.items().filter(item => itemIds.includes(String(item.id)));
    if (items.length === 0) {
      alert('No items to export');
      return;
    }

    const csv = this.generateCSV(items);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private generateCSV(items: ItemMasterListDto[]): string {
    const headers = [
      'SKU',
      'Item Name',
      'Category',
      'UoM',
      'Current Stock',
      'Reserved Stock',
      'Available Stock',
      'Min Stock Level',
      'Requires Inspection',
      'Low Stock',
    ];
    const rows = items.map(item => [
      item.sku,
      item.itemName,
      item.categoryName || 'N/A',
      item.unitOfMeasure,
      item.currentStock ?? item.stockQuantity ?? 0,
      item.reservedStock ?? 0,
      item.availableStock ?? 0,
      item.minStockLevel ?? item['minimumThreshold'] ?? 0,
      item.requiresInspection ? 'Yes' : 'No',
      item.isLowStock ? 'Yes' : 'No',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csv;
  }

  generateQrCodes(itemIds: string[]): void {
    console.log('Generating QR codes for:', itemIds);
    // Logic to generate and show/download QR codes
  }
}

