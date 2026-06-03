import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ItemMasterApi } from './services/item-master-api';
import { CategoriesService, CategoryDto } from '../../../core/services/categories.service';
import { ItemMasterListDto } from '../../../core/services/item-master.service';

interface ItemMasterBulkUpdateRequest {
  categoryId: string;
  unitOfMeasure: string;
  requiresInspection: boolean;
}

interface PageNotice {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

@Component({
  selector: 'app-item-master',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './item-master.html',
  styleUrls: ['./item-master.css'],
})
export class ItemMaster {
  private readonly itemApi = inject(ItemMasterApi);
  private readonly categoriesService = inject(CategoriesService);
  private readonly fb = inject(FormBuilder);

  protected readonly searchTerm = signal('');
  protected readonly categoryFilter = signal('all');
  protected readonly statusFilter = signal<'all' | 'healthy' | 'lowStock' | 'outOfStock'>('all');
  protected readonly selectedSort = signal<'name' | 'stock' | 'price'>('name');
  protected readonly selectedIds = signal<Set<string>>(new Set());
  protected readonly categoryList = signal<CategoryDto[]>([]);

  protected readonly showCreatePanel = signal(false);
  protected readonly showEditModal = signal(false);
  protected readonly editingItem = signal<ItemMasterListDto | null>(null);
  protected readonly showQrModal = signal(false);
  protected readonly showBulkActionModal = signal(false);
  protected readonly activeBulkAction = signal<'edit' | 'adjust' | null>(null);
  protected readonly qrItems = signal<ItemMasterListDto[]>([]);
  protected readonly notice = signal<PageNotice | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly isLoading = this.itemApi.isLoading;

  protected readonly createForm = this.fb.nonNullable.group({
    sku: ['', [Validators.required, Validators.minLength(3)]],
    itemName: ['', [Validators.required, Validators.minLength(2)]],
    categoryId: ['', [Validators.required]],
    categoryName: ['', [Validators.required]],
    unitOfMeasure: ['PCS', [Validators.required]],
    stockQuantity: [0, [Validators.required, Validators.min(0)]],
    requiresInspection: [false],
    minStockLevel: [0, [Validators.required, Validators.min(0)]],
  });

  protected readonly editForm = this.fb.nonNullable.group({
    sku: ['', [Validators.required, Validators.minLength(3)]],
    itemName: ['', [Validators.required, Validators.minLength(2)]],
    categoryId: ['', [Validators.required]],
    unitOfMeasure: ['PCS', [Validators.required]],
    requiresInspection: [false],
    minStockLevel: [0, [Validators.required, Validators.min(0)]],
  });

  protected readonly bulkActionForm = this.fb.nonNullable.group({
    categoryId: [''],
    unitOfMeasure: [''],
    requiresInspection: [false],
    minStockAdjustment: [0],
  });

  constructor() {
    this.categoriesService.getAll().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.categoryList.set(response.data.items);
        }
      },
      error: (error) => {
        console.error('Failed to load categories for item master:', error);
      },
    });
  }

  protected readonly categories = computed(() => {
    return this.categoryList();
  });

  protected readonly filteredItems = computed(() => {
    const items = this.itemApi.items();
    const term = this.searchTerm().toLowerCase().trim();
    const cat = this.categoryFilter();
    const status = this.statusFilter();
    const sort = this.selectedSort();

    let result = items.filter((item) => {
      const currentStock = item.currentStock ?? item.stockQuantity ?? 0;
      const minStockLevel = item.minStockLevel ?? item['minimumThreshold'] ?? 0;
      const categoryName = item.categoryName || '';

      const matchesSearch =
        !term ||
        item.sku.toLowerCase().includes(term) ||
        item.itemName.toLowerCase().includes(term) ||
        categoryName.toLowerCase().includes(term);

      const matchesCategory = cat === 'all' || item['categoryId'] === cat;
      const matchesStatus =
        status === 'all' ||
        (status === 'healthy' && currentStock > minStockLevel) ||
        (status === 'lowStock' && currentStock > 0 && currentStock <= minStockLevel) ||
        (status === 'outOfStock' && currentStock === 0);

      return matchesSearch && matchesCategory && matchesStatus;
    });

    return result.sort((a, b) => {
      if (sort === 'stock') return (b.currentStock ?? 0) - (a.currentStock ?? 0);
      return a.itemName.localeCompare(b.itemName);
    });
  });

  protected readonly totalItems = computed(() => this.itemApi.items().length);

  protected readonly hasSelection = computed(() => this.selectedIds().size > 0);

  protected readonly selectedItemCount = computed(() => this.selectedIds().size);

  protected readonly summaryCards = computed(() => {
    const items = this.filteredItems();
    const healthyCount = items.filter((item) => (item.currentStock ?? 0) > (item.minStockLevel ?? 0)).length;
    const lowStockCount = items.filter((item) => {
      const currentStock = item.currentStock ?? 0;
      const minStockLevel = item.minStockLevel ?? 0;
      return currentStock > 0 && currentStock <= minStockLevel;
    }).length;
    const outOfStockCount = items.filter((item) => (item.currentStock ?? 0) === 0).length;

    return [
      {
        label: 'Total Items',
        value: items.length.toString().padStart(2, '0'),
        subtext: 'Tracked records',
        accent: 'violet',
        spark: [18, 42, 35, 48, 52],
      },
      {
        label: 'Healthy Items',
        value: healthyCount.toString().padStart(2, '0'),
        subtext: 'Above minimum level',
        accent: 'blue',
        spark: [32, 28, 40, 48, 44],
      },
      {
        label: 'Low Stock',
        value: lowStockCount.toString().padStart(2, '0'),
        subtext: 'Requires attention',
        accent: 'amber',
        spark: [45, 52, 48, 60, 55],
      },
      {
        label: 'Out of Stock',
        value: outOfStockCount.toString().padStart(2, '0'),
        subtext: 'Zero availability',
        accent: 'rose',
        spark: [10, 5, 8, 3, 0],
      },
    ];
  });

  protected getCurrentStock(item: ItemMasterListDto): number {
    return item.currentStock ?? item.stockQuantity ?? 0;
  }

  protected getReservedStock(item: ItemMasterListDto): number {
    return item.reservedStock ?? 0;
  }

  protected getAvailableStock(item: ItemMasterListDto): number {
    return item.availableStock ?? this.getCurrentStock(item) - this.getReservedStock(item);
  }

  protected getMinimumStockLevel(item: ItemMasterListDto): number {
    return item.minStockLevel ?? item['minimumThreshold'] ?? 0;
  }

  protected getStockStatus(item: ItemMasterListDto): 'Healthy' | 'Low Stock' | 'Out of Stock' {
    const currentStock = this.getCurrentStock(item);
    const minimumStockLevel = this.getMinimumStockLevel(item);

    if (currentStock === 0) {
      return 'Out of Stock';
    }

    if (currentStock <= minimumStockLevel) {
      return 'Low Stock';
    }

    return 'Healthy';
  }

  protected openCreatePanel(): void {
    this.showCreatePanel.set(true);
  }

  protected closeCreatePanel(): void {
    this.showCreatePanel.set(false);
    this.createForm.reset();
    this.createForm.patchValue({
      unitOfMeasure: 'PCS',
      stockQuantity: 0,
      requiresInspection: false,
      minStockLevel: 0,
    });
  }

  protected onCategorySelect(categoryId: string): void {
    const selected = this.categories().find((c) => String(c.id) === categoryId);
    if (selected) {
      this.createForm.patchValue({
        categoryId: String(selected.id),
        categoryName: selected.categoryName ?? selected.name ?? '',
      });
    }
  }

  protected submitCreate(): void {
    if (this.createForm.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.itemApi
      .create(this.createForm.getRawValue())
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.closeCreatePanel();
            this.showNotice('success', 'Item saved', 'The new item has been stored in the database.');
            return;
          }

          this.showNotice('error', 'Save failed', 'The database rejected the new item record.');
        },
        error: (error) => {
          this.showNotice('error', 'Save failed', error?.message || 'Unable to create the item.');
        },
      });
  }

  protected editItem(item: ItemMasterListDto): void {
    this.editingItem.set(item);
    this.editForm.patchValue({
      sku: item.sku,
      itemName: item.itemName,
      categoryId: String(item['categoryId'] ?? ''),
      unitOfMeasure: item.unitOfMeasure,
      requiresInspection: item.requiresInspection ?? false,
      minStockLevel: item.minStockLevel ?? item['minimumThreshold'] ?? 0,
    });
    this.showEditModal.set(true);
  }

  protected closeEditModal(): void {
    this.showEditModal.set(false);
    this.editingItem.set(null);
    this.editForm.reset();
  }

  protected submitEdit(): void {
    if (this.editForm.invalid || !this.editingItem() || this.isSubmitting()) return;
    const itemId = this.editingItem()!.id;

    this.isSubmitting.set(true);
    this.itemApi
      .update(String(itemId), this.editForm.getRawValue())
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.closeEditModal();
            this.showNotice('success', 'Item updated', 'The item changes were saved to the database.');
            return;
          }

          this.showNotice('error', 'Update failed', 'The database rejected the item changes.');
        },
        error: (error) => {
          this.showNotice('error', 'Update failed', error?.message || 'Unable to update the item.');
        },
      });
  }

  protected toggleSelection(id: string): void {
    this.selectedIds.update((set) => {
      const newSet = new Set(set);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }

  protected toggleAll(): void {
    if (this.selectedIds().size === this.filteredItems().length) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(this.filteredItems().map((i) => String(i.id))));
    }
  }

  protected isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  protected selectLowStock(): void {
    const ids = this.filteredItems().filter((item) => {
      const currentStock = item.currentStock ?? 0;
      const minStockLevel = item.minStockLevel ?? 0;
      return currentStock > 0 && currentStock <= minStockLevel;
    }).map((item) => String(item.id));
    this.selectedIds.set(new Set(ids));
  }

  protected selectOutOfStock(): void {
    const ids = this.filteredItems().filter((item) => (item.currentStock ?? 0) === 0).map((item) => String(item.id));
    this.selectedIds.set(new Set(ids));
  }

  protected onBulkEdit(): void {
    if (!this.hasSelection()) {
      this.showNotice('info', 'Select items first', 'Choose one or more items before starting a bulk edit.');
      return;
    }

    this.activeBulkAction.set('edit');
    this.showBulkActionModal.set(true);
  }

  protected onBulkAdjust(): void {
    if (!this.hasSelection()) {
      this.showNotice('info', 'Select items first', 'Choose one or more items before adjusting stock thresholds.');
      return;
    }

    this.activeBulkAction.set('adjust');
    this.showBulkActionModal.set(true);
  }

  protected onBulkExport(): void {
    const ids = Array.from(this.selectedIds());

    if (ids.length === 0) {
      this.showNotice('info', 'Select items first', 'Choose one or more items before exporting.');
      return;
    }

    this.itemApi.bulkExport(ids);
    this.showNotice('success', 'Export ready', `Downloaded CSV for ${ids.length} selected item${ids.length === 1 ? '' : 's'}.`);
  }

  protected submitBulkAction(): void {
    const ids = Array.from(this.selectedIds());
    const action = this.activeBulkAction();
    const values = this.bulkActionForm.getRawValue();

    if (ids.length === 0 || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);

    if (action === 'adjust' && values.minStockAdjustment !== 0) {
      this.itemApi.bulkAdjustStock(ids, values.minStockAdjustment).pipe(finalize(() => this.isSubmitting.set(false))).subscribe({
        next: () => {
          this.closeBulkModal();
          this.selectedIds.set(new Set());
          this.showNotice('success', 'Thresholds updated', `Updated ${ids.length} item${ids.length === 1 ? '' : 's'} in the database.`);
        },
        error: (error) => {
          this.showNotice('error', 'Bulk update failed', error?.message || 'Unable to update the selected items.');
        },
      });
    } else if (action === 'edit') {
      const updates: Partial<ItemMasterBulkUpdateRequest> = {};
      if (values.categoryId) updates.categoryId = values.categoryId;
      if (values.unitOfMeasure) updates.unitOfMeasure = values.unitOfMeasure;
      updates.requiresInspection = values.requiresInspection;

      this.itemApi.bulkEdit(ids, updates).pipe(finalize(() => this.isSubmitting.set(false))).subscribe({
        next: () => {
          this.closeBulkModal();
          this.selectedIds.set(new Set());
          this.showNotice('success', 'Bulk edit saved', `Updated ${ids.length} item${ids.length === 1 ? '' : 's'} in the database.`);
        },
        error: (error) => {
          this.showNotice('error', 'Bulk update failed', error?.message || 'Unable to update the selected items.');
        },
      });
    } else {
      this.isSubmitting.set(false);
    }
  }

  protected closeBulkModal(): void {
    this.showBulkActionModal.set(false);
    this.activeBulkAction.set(null);
    this.bulkActionForm.reset({ categoryId: '', unitOfMeasure: '', requiresInspection: false, minStockAdjustment: 0 });
  }

  protected onGenerateQR(): void {
    const selected = this.filteredItems().filter((i) => this.selectedIds().has(String(i.id)));
    if (selected.length === 0) {
      this.showNotice('info', 'Select items first', 'Choose one or more items before generating QR codes.');
      return;
    }

    this.qrItems.set(selected);
    this.showQrModal.set(true);
  }

  protected closeQrModal(): void {
    this.showQrModal.set(false);
  }

  protected getQrUrl(item: ItemMasterListDto): string {
    const data = JSON.stringify({ sku: item.sku, id: item.id, name: item.itemName });
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data)}`;
  }

  protected printLabels(): void {
    window.print();
  }

  protected exportVisible(): void {
    const ids = this.filteredItems().map(i => String(i.id));
    if (ids.length === 0) {
      this.showNotice('info', 'Nothing to export', 'Use the filters to show items before exporting.');
      return;
    }
    this.itemApi.bulkExport(ids);
    this.showNotice('success', 'Export ready', `Downloaded CSV for ${ids.length} visible item${ids.length === 1 ? '' : 's'}.`);
  }

  protected setSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  protected setCategoryFilter(value: string): void {
    this.categoryFilter.set(value);
  }

  protected setStatusFilter(value: 'all' | 'healthy' | 'lowStock' | 'outOfStock'): void {
    this.statusFilter.set(value);
  }

  protected setSort(value: 'name' | 'stock' | 'price'): void {
    this.selectedSort.set(value);
  }

  protected removeItem(item: ItemMasterListDto): void {
    if (!confirm(`Remove ${item.itemName}?`)) {
      return;
    }

    this.isSubmitting.set(true);
    this.itemApi.remove(String(item.id)).pipe(finalize(() => this.isSubmitting.set(false))).subscribe({
      next: () => {
        this.showNotice('success', 'Item deleted', `${item.itemName} was removed from the database.`);
      },
      error: (error) => {
        this.showNotice('error', 'Delete failed', error?.message || 'Unable to delete the item.');
      },
    });
  }

  protected dismissNotice(): void {
    this.notice.set(null);
  }

  protected resetFilters(): void {
    this.searchTerm.set('');
    this.categoryFilter.set('all');
    this.statusFilter.set('all');
    this.selectedSort.set('name');
    this.selectedIds.set(new Set());
    this.showNotice('info', 'Filters reset', 'The item list now shows every available record.');
  }

  private showNotice(type: PageNotice['type'], title: string, message: string): void {
    this.notice.set({ type, title, message });
  }
}
