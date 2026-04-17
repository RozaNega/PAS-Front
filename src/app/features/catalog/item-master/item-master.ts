import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ItemMasterApi } from './services/item-master-api';
import { ItemRecord, ItemStatus } from './models/models';

@Component({
  selector: 'app-item-master',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './item-master.html',
  styleUrl: './item-master.css',
})
export class ItemMaster {
  private readonly formBuilder = inject(FormBuilder);
  private readonly itemApi = inject(ItemMasterApi);

  protected readonly searchTerm = signal('');
  protected readonly categoryFilter = signal('all');
  protected readonly statusFilter = signal<'all' | ItemStatus>('all');
  protected readonly selectedSort = signal<'name' | 'stock' | 'price'>('name');
  protected readonly showCreatePanel = signal(false);
  protected readonly createMessage = signal('Create a new item record to add it to the list.');
  protected readonly createTone = signal<'neutral' | 'success' | 'error'>('neutral');

  protected readonly createForm = this.formBuilder.nonNullable.group({
    sku: ['', [Validators.required]],
    name: ['', [Validators.required, Validators.minLength(3)]],
    categoryName: ['Food Staples', [Validators.required]],
    unitOfMeasure: ['Box', [Validators.required]],
    price: [0, [Validators.required, Validators.min(0)]],
    stockOnHand: [0, [Validators.required, Validators.min(0)]],
    status: ['draft' as ItemStatus, [Validators.required]],
  });

  protected readonly totalItems = this.itemApi.items;
  protected readonly activeItemCount = this.itemApi.activeItemCount;
  protected readonly totalStock = this.itemApi.totalStock;

  protected readonly categories = computed(() => {
    const uniqueCategories = new Set(this.totalItems().map((item) => item.categoryName));
    return ['all', ...uniqueCategories];
  });

  protected readonly summaryCards = computed(() => {
    const items = this.filteredItems();
    const activeCount = items.filter((item) => item.status === 'active').length;
    const draftCount = items.filter((item) => item.status === 'draft').length;
    const totalStock = items.reduce((sum, item) => sum + item.stockOnHand, 0);
    const averagePrice = items.length
      ? items.reduce((sum, item) => sum + item.price, 0) / items.length
      : 0;

    return [
      {
        label: 'SKU',
        value: items.length.toString().padStart(2, '0'),
        subtext: 'Tracked items',
        accent: 'violet',
        spark: [18, 42, 35, 48, 52],
      },
      {
        label: 'Item Name',
        value: activeCount.toString().padStart(2, '0'),
        subtext: 'Active records',
        accent: 'blue',
        spark: [32, 28, 40, 48, 44],
      },
      {
        label: 'Status',
        value: draftCount.toString().padStart(2, '0'),
        subtext: 'Draft items',
        accent: 'pink',
        spark: [14, 20, 18, 30, 24],
      },
      {
        label: 'Stock',
        value: totalStock.toString().padStart(2, '0'),
        subtext: 'Units on hand',
        accent: 'emerald',
        spark: [28, 36, 44, 41, 49],
      },
      {
        label: 'Open Rate',
        value: `ETB ${averagePrice.toFixed(2)}`,
        subtext: 'Average price',
        accent: 'amber',
        spark: [16, 22, 28, 34, 30],
      },
    ];
  });

  protected readonly statusBadges = [
    { label: 'All records', value: 'all' as const },
    { label: 'Active', value: 'active' as const },
    { label: 'Draft', value: 'draft' as const },
    { label: 'Archived', value: 'archived' as const },
  ];

  protected readonly quickStats = computed(() => {
    const items = this.filteredItems();
    const totalStock = items.reduce((sum, item) => sum + item.stockOnHand, 0);
    const lowStock = items.filter((item) => item.stockOnHand < 100).length;
    const highestStockItem = [...items].sort((a, b) => b.stockOnHand - a.stockOnHand)[0];

    return [
      { label: 'Total Items', value: items.length.toString(), tone: 'violet' },
      { label: 'Low Stock', value: lowStock.toString(), tone: 'amber' },
      { label: 'Total Stock', value: totalStock.toString(), tone: 'blue' },
      { label: 'Top Item', value: highestStockItem?.name ?? 'N/A', tone: 'emerald' },
    ];
  });

  protected readonly filteredItems = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const categoryFilter = this.categoryFilter();
    const statusFilter = this.statusFilter();
    const sort = this.selectedSort();

    const filtered = this.totalItems().filter((item) => {
      const matchesSearch =
        !term ||
        item.sku.toLowerCase().includes(term) ||
        item.name.toLowerCase().includes(term) ||
        item.categoryName.toLowerCase().includes(term);
      const matchesCategory = categoryFilter === 'all' || item.categoryName === categoryFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'stock') {
        return b.stockOnHand - a.stockOnHand;
      }

      if (sort === 'price') {
        return b.price - a.price;
      }

      return a.name.localeCompare(b.name);
    });
  });

  protected readonly topHighlights = computed(() => {
    const items = this.filteredItems();
    const totalStock = items.reduce((sum, item) => sum + item.stockOnHand, 0);
    const activeCount = items.filter((item) => item.status === 'active').length;
    const averagePrice = items.length
      ? items.reduce((sum, item) => sum + item.price, 0) / items.length
      : 0;

    return [
      { label: 'Active Records', value: activeCount },
      { label: 'Stock Value', value: Math.round(totalStock * averagePrice) },
      { label: 'Categories', value: this.categories().length - 1 },
      { label: 'Draft Queue', value: items.filter((item) => item.status === 'draft').length },
    ];
  });

  protected setSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  protected setCategoryFilter(value: string): void {
    this.categoryFilter.set(value);
  }

  protected setStatusFilter(value: 'all' | ItemStatus): void {
    this.statusFilter.set(value);
  }

  protected setSort(value: 'name' | 'stock' | 'price'): void {
    this.selectedSort.set(value);
  }

  protected stockBarWidth(stock: number): string {
    return `${Math.min(100, Math.max(10, (stock / 500) * 100))}%`;
  }

  protected openCreatePanel(): void {
    this.showCreatePanel.set(true);
    this.createTone.set('neutral');
    this.createMessage.set('Fill in the item details and save to add a new record.');
  }

  protected closeCreatePanel(): void {
    this.showCreatePanel.set(false);
  }

  protected submitCreate(): void {
    if (this.createForm.invalid) {
      this.createTone.set('error');
      this.createMessage.set('Please complete the required fields before saving the item.');
      this.createForm.markAllAsTouched();
      return;
    }

    const rawValue = this.createForm.getRawValue();
    const created = this.itemApi.create({
      sku: rawValue.sku,
      name: rawValue.name,
      categoryId: this.createCategoryId(rawValue.categoryName),
      categoryName: rawValue.categoryName,
      unitOfMeasure: rawValue.unitOfMeasure,
      price: Number(rawValue.price),
      stockOnHand: Number(rawValue.stockOnHand),
      status: rawValue.status,
    });

    this.createTone.set('success');
    this.createMessage.set(`Item ${created.sku} was added successfully.`);
    this.showCreatePanel.set(false);
    this.createForm.reset({
      sku: '',
      name: '',
      categoryName: 'Food Staples',
      unitOfMeasure: 'Box',
      price: 0,
      stockOnHand: 0,
      status: 'draft',
    });
  }

  protected clearFilters(): void {
    this.searchTerm.set('');
    this.categoryFilter.set('all');
    this.statusFilter.set('all');
    this.selectedSort.set('name');
  }

  protected itemStatusLabel(status: ItemStatus): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  protected itemStatusTone(status: ItemStatus): string {
    return status;
  }

  protected sparkWidth(value: number): string {
    return `${Math.max(20, Math.min(100, value))}%`;
  }

  protected trackByItemId(_: number, item: ItemRecord): string {
    return item.id;
  }

  protected trackByCategory(_: number, category: string): string {
    return category;
  }

  protected hasCreateError(controlName: 'sku' | 'name' | 'categoryName' | 'unitOfMeasure' | 'price' | 'stockOnHand' | 'status'): boolean {
    const control = this.createForm.controls[controlName];
    return control.invalid && (control.touched || this.createTone() === 'error');
  }

  private createCategoryId(categoryName: string): string {
    return `cat-${categoryName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  }
}
