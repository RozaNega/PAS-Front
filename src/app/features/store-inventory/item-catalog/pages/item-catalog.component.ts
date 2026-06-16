import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ItemMasterService, ItemMasterPaginatedResponse } from '../../../../core/services/item-master.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { CategoriesService, CategoryDto } from '../../../../core/services/categories.service';

import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  BarChart, PieChart,
  TooltipComponent, GridComponent, LegendComponent,
  CanvasRenderer,
]);

interface Item {
  id?: string;
  sku: string;
  name: string;
  category: string;
  uom: string;
  minStock: number;
  currentStock: number;
  status: 'Active' | 'Low Stock' | 'Out of Stock';
  price: number;
}

interface StockLocation {
  warehouse: string;
  shelfLocation: string;
  quantity: number;
  reserved: number;
  available: number;
}

interface Movement {
  date: string;
  type: string;
  quantity: number;
  reference: string;
  user: string;
  balance: number;
}

interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
  visible: boolean;
}

@Component({
  selector: 'app-item-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './item-catalog.component.html',
  styleUrls: ['./item-catalog.component.scss']
})
export class ItemCatalogComponent {
  searchTerm = signal('');
  categoryFilter = signal('All Categories');
  statusFilter = signal('All Status');
  sortBy = signal('Name');
  sortDirection = signal<'asc' | 'desc'>('asc');
  viewMode = signal('table');
  detailTab = signal<'info' | 'stock' | 'movements'>('info');

  categories = ['All Categories', 'Electronics', 'Furniture', 'Stationery', 'Supplies', 'IT Equipment', 'Accessories', 'Networking'];
  statuses = ['All Status', 'Active', 'Low Stock', 'Out of Stock'];
  sortOptions = ['Name', 'SKU', 'Category', 'Stock', 'Price'];

  toast = signal<Toast>({ message: '', type: 'info', visible: false });
  private toastTimer: any = null;
  isLoading = signal(false);

  items = signal<Item[]>(this.mockItems());
  private userStatus = new Map<string, Item['status']>();

  showItemModal = signal(false);
  showAddForm = signal(false);
  showBulkImportModal = signal(false);
  selectedItem = signal<Item | null>(null);

  selectedIds = signal<string[]>([]);
  isEditing = signal(false);
  showAdjustModal = signal(false);
  adjustDraft = signal<{ itemId?: string; adjustmentType?: 'increase'|'decrease'|'set'; quantity?: number; reason?: string }>({ itemId: undefined, adjustmentType: 'increase', quantity: 0, reason: '' });
  adjustModeBulk = signal(false);

  totalItems = computed(() => this.items().length);
  activeItems = computed(() => this.items().filter(i => i.status === 'Active').length);
  lowStockItems = computed(() => this.items().filter(i => i.status === 'Low Stock').length);
  outOfStockItems = computed(() => this.items().filter(i => i.status === 'Out of Stock').length);
  categoryCount = computed(() => new Set(this.items().map(i => i.category)).size);
  totalStockValue = computed(() => this.items().reduce((sum, i) => sum + i.currentStock * i.price, 0));

  activePercentage = computed(() => this.totalItems() ? Math.round(this.activeItems() / this.totalItems() * 100) : 0);
  lowStockPercentage = computed(() => this.totalItems() ? Math.round(this.lowStockItems() / this.totalItems() * 100) : 0);
  outOfStockPercentage = computed(() => this.totalItems() ? Math.round(this.outOfStockItems() / this.totalItems() * 100) : 0);

  categoryBreakdown = computed(() => {
    const map = new Map<string, number>();
    this.items().forEach(i => map.set(i.category, (map.get(i.category) || 0) + 1));
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  });

  activeFilters = computed(() => {
    const filters: string[] = [];
    if (this.categoryFilter() !== 'All Categories') filters.push(`Category: ${this.categoryFilter()}`);
    if (this.statusFilter() !== 'All Status') filters.push(`Status: ${this.statusFilter()}`);
    return filters;
  });

  hasActiveFilters = computed(() => this.activeFilters().length > 0 || this.searchTerm().length > 0);

  filteredItems = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const category = this.categoryFilter();
    const status = this.statusFilter();
    const sort = this.sortBy();
    const dir = this.sortDirection();

    let items = this.items().filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(search) ||
                            item.sku.toLowerCase().includes(search) ||
                            item.category.toLowerCase().includes(search);
      const matchesCategory = category === 'All Categories' || item.category === category;
      const matchesStatus = status === 'All Status' || item.status === status;
      return matchesSearch && matchesCategory && matchesStatus;
    });

    const cmp = (a: any, b: any) => {
      if (a < b) return dir === 'asc' ? -1 : 1;
      if (a > b) return dir === 'asc' ? 1 : -1;
      return 0;
    };

    switch(sort) {
      case 'Name': items.sort((a, b) => cmp(a.name.toLowerCase(), b.name.toLowerCase())); break;
      case 'SKU': items.sort((a, b) => cmp(a.sku.toLowerCase(), b.sku.toLowerCase())); break;
      case 'Category': items.sort((a, b) => cmp(a.category.toLowerCase(), b.category.toLowerCase())); break;
      case 'Stock': items.sort((a, b) => cmp(a.currentStock, b.currentStock)); break;
      case 'Price': items.sort((a, b) => cmp(a.price, b.price)); break;
    }

    return items;
  });

  stockLocations = signal<StockLocation[]>([
    { warehouse: 'Warehouse A', shelfLocation: 'A-01-R-03-S-03', quantity: 35, reserved: 3, available: 32 },
    { warehouse: 'Warehouse B', shelfLocation: 'B-02-R-01-S-02', quantity: 10, reserved: 2, available: 8 }
  ]);

  recentMovements = signal<Movement[]>([
    { date: 'Dec 15, 2024', type: 'Receiving', quantity: 10, reference: 'GRN-2024-045', user: 'John Doe', balance: 45 },
    { date: 'Dec 14, 2024', type: 'Issue', quantity: -3, reference: 'SIV-2024-012', user: 'Sarah Smith', balance: 35 },
    { date: 'Dec 10, 2024', type: 'Transfer', quantity: 5, reference: 'TRF-2024-008', user: 'Mike Wilson', balance: 38 }
  ]);

  newItem = signal<Partial<Item & { isActive?: boolean; categoryId?: string }>>({ sku: '', name: '', category: '', uom: 'PCS', minStock: 0, currentStock: 0, price: 0, status: 'Active', isActive: true, categoryId: '' });

  private readonly itemService = inject(ItemMasterService);
  private readonly inventoryService = inject(InventoryService);
  private readonly categoriesService = inject(CategoriesService);

  backendCategories = signal<CategoryDto[]>([]);

  bulkEditDraft = signal<{ category?: string; uom?: string; minStock?: number }>({ category: undefined, uom: undefined, minStock: undefined });
  bulkAdjustDraft = signal<{ adjustmentType?: 'increase'|'decrease'|'set'; quantity?: number; reason?: string }>({ adjustmentType: 'increase', quantity: 0, reason: '' });

  get stockByCategoryOpts(): Record<string, unknown> {
    const data = this.categoryBreakdown();
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: '{b}<br/><strong>{c}</strong> items'
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: { type: 'category', data: data.map(c => c.name), axisLabel: { color: '#94a3b8', rotate: 15, fontSize: 10 }, axisLine: { show: false }, axisTick: { show: false } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(148,163,184,0.1)' } } },
      series: [{
        type: 'bar',
        data: data.map((c, i) => ({
          value: c.count,
          itemStyle: { color: colors[i % colors.length], borderRadius: [6, 6, 0, 0] }
        })),
        barWidth: '55%',
        animationDuration: 800,
        animationEasing: 'elasticOut'
      }]
    };
  }

  get statusPieOpts(): Record<string, unknown> {
    const total = this.totalItems() || 1;
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} items ({d}%)' },
      graphic: [{
        type: 'text',
        left: 'center',
        top: 'center',
        style: {
          text: `${total}`,
          fill: 'var(--text-color)',
          fontSize: 24,
          fontWeight: 800,
          fontFamily: 'Inter, sans-serif'
        }
      }],
      series: [{
        type: 'pie',
        radius: ['55%', '75%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        label: { show: true, position: 'outside', formatter: '{b}\n{d}%', color: '#94a3b8', fontSize: 11, lineHeight: 16, fontWeight: 600 },
        labelLine: { length: 8, length2: 12, smooth: true },
        emphasis: { itemStyle: { shadowBlur: 15, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.2)' }, scale: true, scaleSize: 8 },
        animationDuration: 1000,
        animationEasing: 'cubicOut',
        data: [
          { value: this.activeItems(), name: 'Active', itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [{ offset: 0, color: '#10b981' }, { offset: 1, color: '#059669' }]) as any } },
          { value: this.lowStockItems(), name: 'Low Stock', itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [{ offset: 0, color: '#f59e0b' }, { offset: 1, color: '#d97706' }]) as any } },
          { value: this.outOfStockItems(), name: 'Out of Stock', itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [{ offset: 0, color: '#ef4444' }, { offset: 1, color: '#dc2626' }]) as any } },
        ]
      }]
    };
  }

  constructor() {
    this.loadItems();
    this.loadCategories();
  }

  loadCategories(): void {
    this.categoriesService.getAll(1, 100).subscribe({
      next: (res: any) => {
        const data = res?.data;
        if (res?.success && Array.isArray(data)) {
          this.backendCategories.set(data);
        } else if (res?.success && data?.items) {
          this.backendCategories.set(data.items);
        }
      },
      error: () => {}
    });
  }

  loadItems(page = 1, pageSize = 50): void {
    this.itemService.getItemMasters(page, pageSize).subscribe({
      next: (res) => {
        if (res?.success && res.data) {
          const paginated = res.data as ItemMasterPaginatedResponse;
          const dt = paginated.items || [];
          const mapped = dt.map(i => {
            const id = i.id != null ? String(i.id) : undefined;
            const stock = i.currentStock ?? i.stockQuantity;
            const min = i.minStockLevel ?? 0;
            const backendStatus = i['status'] as Item['status'] | undefined;
            const saved = id && this.userStatus.get(id);
            let status: Item['status'];
            if (backendStatus) { status = backendStatus; }
            else if (saved) { status = saved; }
            else if (i.isActive === false) { status = 'Out of Stock'; }
            else if (i.isLowStock) { status = 'Low Stock'; }
            else if (stock != null && stock <= 0 && !i.isLowStock) { status = 'Active'; }
            else if (stock != null && stock <= min) { status = 'Low Stock'; }
            else { status = 'Active'; }
            return {
              id,
              sku: i.sku,
              name: i.itemName,
              category: i.categoryName || 'Uncategorized',
              uom: i.unitOfMeasure || 'PCS',
              minStock: min,
              currentStock: stock ?? 0,
              status,
              price: i['unitPrice'] ?? 0
            } as Item;
          });
          this.items.set(mapped);
        }
      },
      error: () => { this.items.set(this.mockItems()); }
    });
  }

  private mockItems(): Item[] {
    return [
      { id: '1', sku: 'LAP-001', name: 'Dell XPS Laptop', category: 'Electronics', uom: 'PCS', minStock: 10, currentStock: 45, status: 'Active', price: 2499 },
      { id: '2', sku: 'MON-002', name: 'HP 27" Monitor', category: 'Electronics', uom: 'PCS', minStock: 15, currentStock: 67, status: 'Active', price: 350 },
      { id: '3', sku: 'CHR-003', name: 'Office Chair', category: 'Furniture', uom: 'PCS', minStock: 50, currentStock: 23, status: 'Low Stock', price: 450 },
      { id: '4', sku: 'CAB-004', name: 'USB Cables', category: 'Accessories', uom: 'PCS', minStock: 50, currentStock: 5, status: 'Out of Stock', price: 5 },
      { id: '5', sku: 'PAP-005', name: 'A4 Paper', category: 'Stationery', uom: 'BOX', minStock: 100, currentStock: 120, status: 'Active', price: 25 },
      { id: '6', sku: 'TON-006', name: 'Toner Cartridge', category: 'Supplies', uom: 'PCS', minStock: 20, currentStock: 8, status: 'Low Stock', price: 75 },
      { id: '7', sku: 'SER-007', name: 'Server Rack', category: 'IT Equipment', uom: 'PCS', minStock: 5, currentStock: 8, status: 'Active', price: 2800 },
      { id: '8', sku: 'SWI-008', name: 'Cisco Switch', category: 'Networking', uom: 'PCS', minStock: 10, currentStock: 12, status: 'Active', price: 1200 },
      { id: '9', sku: 'DSK-009', name: 'Standing Desk', category: 'Furniture', uom: 'PCS', minStock: 10, currentStock: 15, status: 'Active', price: 1200 },
      { id: '10', sku: 'PEN-010', name: 'Ballpoint Pens (Box)', category: 'Stationery', uom: 'BOX', minStock: 200, currentStock: 350, status: 'Active', price: 12 },
      { id: '11', sku: 'MON-011', name: 'Dell 24" Monitor', category: 'Electronics', uom: 'PCS', minStock: 15, currentStock: 3, status: 'Low Stock', price: 280 },
      { id: '12', sku: 'KEY-012', name: 'Mechanical Keyboard', category: 'Accessories', uom: 'PCS', minStock: 20, currentStock: 0, status: 'Out of Stock', price: 150 },
    ];
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set({ message, type, visible: true });
    this.toastTimer = setTimeout(() => {
      this.toast.set({ message: '', type: 'info', visible: false });
    }, 3000);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  clearAllFilters(): void {
    this.searchTerm.set('');
    this.categoryFilter.set('All Categories');
    this.statusFilter.set('All Status');
  }

  removeFilter(filter: string): void {
    if (filter.startsWith('Category:')) this.categoryFilter.set('All Categories');
    if (filter.startsWith('Status:')) this.statusFilter.set('All Status');
  }

  toggleSort(field: string): void {
    if (this.sortBy() === field) {
      this.sortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(field);
      this.sortDirection.set('asc');
    }
  }

  getSortIcon(field: string): string {
    if (this.sortBy() !== field) return 'bi-arrow-down-up';
    return this.sortDirection() === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
  }

  toggleSelect(idOrSku: string): void {
    const sel = new Set(this.selectedIds());
    if (sel.has(idOrSku)) sel.delete(idOrSku); else sel.add(idOrSku);
    this.selectedIds.set(Array.from(sel));
  }

  selectAll(): void {
    const ids = this.filteredItems().map(i => i.id ?? i.sku);
    this.selectedIds.set(ids);
  }

  selectLowStock(): void {
    const ids = this.filteredItems().filter(i => i.status === 'Low Stock').map(i => i.id ?? i.sku);
    this.selectedIds.set(ids);
  }

  selectOutOfStock(): void {
    const ids = this.filteredItems().filter(i => i.status === 'Out of Stock').map(i => i.id ?? i.sku);
    this.selectedIds.set(ids);
  }

  clearSelection(): void {
    this.selectedIds.set([]);
  }

  bulkEdit(): void {
    this.bulkEditDraft.set({ category: undefined, uom: undefined, minStock: undefined });
    this.showBulkImportModal.set(true);
  }

  performBulkEdit(): void {
    const draft = this.bulkEditDraft();
    const selected = this.filteredItems().filter(i => this.selectedIds().includes(i.id ?? i.sku));
    if (!selected.length) return;
    let remaining = selected.length;
    selected.forEach(item => {
      if (!item.id) { remaining -= 1; if (remaining === 0) this.loadItems(); return; }
      const payload: any = { id: item.id };
      if (draft.category !== undefined) payload.categoryId = this.resolveCategoryId(draft.category) || undefined;
      if (draft.uom !== undefined) payload.unitOfMeasure = draft.uom;
      if (draft.minStock !== undefined) payload.minStockLevel = draft.minStock;
      if (Object.keys(payload).length <= 1) { remaining -= 1; if (remaining === 0) this.loadItems(); return; }
      this.itemService.updateItemMaster(item.id, payload).subscribe({
        next: () => { remaining -= 1; if (remaining === 0) { this.showBulkImportModal.set(false); this.selectedIds.set([]); this.loadItems(); this.showToast(`${selected.length} items updated`); } },
        error: () => { remaining -= 1; if (remaining === 0) { this.showBulkImportModal.set(false); this.selectedIds.set([]); this.loadItems(); } }
      });
    });
  }

  bulkAdjustStock(): void {
    this.bulkAdjustDraft.set({ adjustmentType: 'increase', quantity: 0, reason: '' });
    this.adjustDraft.set({ itemId: undefined, adjustmentType: this.bulkAdjustDraft().adjustmentType, quantity: this.bulkAdjustDraft().quantity, reason: this.bulkAdjustDraft().reason });
    this.adjustModeBulk.set(true);
    this.showAdjustModal.set(true);
  }

  performBulkAdjust(): void {
    const draft = this.bulkAdjustDraft();
    const selected = this.filteredItems().filter(i => this.selectedIds().includes(i.id ?? i.sku));
    if (!selected.length || !draft.adjustmentType || !draft.quantity) return;
    let remaining = selected.length;
    selected.forEach(item => {
      if (!item.id) { remaining -= 1; if (remaining === 0) this.loadItems(); return; }
      const adjType = draft.adjustmentType!;
      const qty = draft.quantity!;
      const newQ = adjType === 'set' ? qty : (adjType === 'increase' ? item.currentStock + qty : item.currentStock - qty);
      this.inventoryService.adjustStock({ inventoryId: item.id, newQuantity: newQ, reason: draft.reason ?? '' }).subscribe({
        next: () => { remaining -= 1; if (remaining === 0) { this.showAdjustModal.set(false); this.selectedIds.set([]); this.loadItems(); this.showToast('Stock adjusted'); } },
        error: () => { remaining -= 1; if (remaining === 0) { this.showAdjustModal.set(false); this.selectedIds.set([]); this.loadItems(); } }
      });
    });
  }

  setBulkEditField(field: string, value: any): void {
    const numFields = ['minStock'];
    const v = numFields.includes(field) ? Number(value) : value;
    this.bulkEditDraft.update(d => ({ ...(d as any), [field]: v }));
  }

  setBulkAdjustField(field: string, value: any): void {
    const numFields = ['quantity'];
    const v = numFields.includes(field) ? Number(value) : value;
    this.bulkAdjustDraft.update(d => ({ ...(d as any), [field]: v }));
  }

  onSearchChange(value: string): void { this.searchTerm.set(value); }
  onCategoryChange(value: string): void { this.categoryFilter.set(value); }
  onStatusChange(value: string): void { this.statusFilter.set(value); }
  onSortChange(value: string): void { this.sortBy.set(value); }

  toggleViewMode(mode: 'card' | 'table'): void { this.viewMode.set(mode); }

  openItemModal(item: Item): void {
    this.selectedItem.set(item);
    this.detailTab.set('info');
    this.showItemModal.set(true);
  }

  closeItemModal(): void {
    this.showItemModal.set(false);
    this.selectedItem.set(null);
  }

  openAddForm(): void {
    this.isEditing.set(false);
    this.newItem.set({ sku: '', name: '', category: '', uom: 'PCS', minStock: 0, currentStock: 0, price: 0, status: 'Active', isActive: true, categoryId: '' });
    this.showAddForm.set(true);
  }

  cancelAddForm(): void {
    this.showAddForm.set(false);
    this.isEditing.set(false);
  }

  openBulkImportModal(): void { this.showBulkImportModal.set(true); }
  closeBulkImportModal(): void { this.showBulkImportModal.set(false); }

  editItem(item: Item): void {
    this.isEditing.set(true);
    const categoryId = this.resolveCategoryId(item.category);
    this.newItem.set({ sku: item.sku, name: item.name, category: item.category, uom: item.uom, minStock: item.minStock, currentStock: item.currentStock, price: item.price, status: item.status, isActive: item.status !== 'Out of Stock', categoryId });
    this.selectedItem.set(item);
    this.showAddForm.set(true);
  }

  private computeStatus(stock: number, minStock: number): Item['status'] {
    if (stock <= 0) return 'Out of Stock';
    if (stock <= minStock) return 'Low Stock';
    return 'Active';
  }

  resolveCategoryId(categoryName: string): string {
    const match = this.backendCategories().find(c => (c.categoryName || c.name || '') === categoryName);
    return match ? String(match.id) : '';
  }

  private addToLocal(draft: Partial<Item & { isActive?: boolean }>): void {
    const nextId = String(Math.max(0, ...this.items().map(i => Number(i.id || 0))) + 1);
    const item: Item = {
      id: nextId,
      sku: draft.sku || '',
      name: draft.name || '',
      category: draft.category || 'Uncategorized',
      uom: draft.uom || 'PCS',
      minStock: draft.minStock ?? 0,
      currentStock: draft.currentStock ?? 0,
      price: draft.price ?? 0,
      status: this.computeStatus(draft.currentStock ?? 0, draft.minStock ?? 0),
    };
    this.items.update(list => [...list, item]);
  }

  private updateLocal(id: string, draft: Partial<Item & { isActive?: boolean }>): void {
    this.items.update(list =>
      list.map(i =>
        i.id === id
          ? { ...i, sku: draft.sku ?? i.sku, name: draft.name ?? i.name, category: draft.category ?? i.category, uom: draft.uom ?? i.uom, minStock: draft.minStock ?? i.minStock, currentStock: draft.currentStock ?? i.currentStock, price: draft.price ?? i.price, status: this.computeStatus(draft.currentStock ?? i.currentStock, draft.minStock ?? i.minStock) }
          : i
      )
    );
  }

  createItem(): void {
    const draft = this.newItem();
    if (!draft || !draft.sku || !draft.name) return;
    this.isLoading.set(true);
    const categoryId = draft.categoryId || this.resolveCategoryId(draft.category || '');
    const payload: any = { sku: draft.sku, itemName: draft.name, categoryId: categoryId || undefined, unitOfMeasure: draft.uom, minStockLevel: draft.minStock ?? 0, requiresInspection: false, unitPrice: Number(draft.price) || 0, status: draft.status || 'Active' };
    this.itemService.createItemMaster(payload).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res?.success) {
          const newId = res.data != null ? String(res.data) : undefined;
          this.userStatus.set(newId || draft.sku!, (draft.status as Item['status']) || 'Active');
          const newItem: Item = {
            id: newId,
            sku: draft.sku || '',
            name: draft.name || '',
            category: draft.category || 'Uncategorized',
            uom: draft.uom || 'PCS',
            minStock: draft.minStock ?? 0,
            currentStock: draft.currentStock ?? 0,
            price: draft.price ?? 0,
            status: (draft.status as Item['status']) || 'Active',
          };
          this.items.update(list => [...list, newItem]);
          this.cancelAddForm();
          this.newItem.set({ sku: '', name: '', category: '', uom: 'PCS', minStock: 0, currentStock: 0, price: 0, status: 'Active', isActive: true, categoryId: '' });
          this.showToast('Item created successfully');
        } else {
          this.showToast('Failed to create item: ' + (res?.message || 'Unknown error'), 'error');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        const detail = err?.error?.message || err?.error?.errors || err?.message || 'Server error';
        this.showToast('Failed to save item: ' + detail, 'error');
      }
    });
  }

  updateItem(): void {
    const draft = this.newItem();
    const id = this.selectedItem()?.id;
    if (!id || !draft) return;
    this.isLoading.set(true);
    const categoryId = draft.categoryId || this.resolveCategoryId(draft.category || '');
    const payload: any = { id, sku: draft.sku, itemName: draft.name, categoryId: categoryId || undefined, unitOfMeasure: draft.uom, minStockLevel: draft.minStock ?? 0, requiresInspection: false, unitPrice: Number(draft.price) || 0, status: draft.status || 'Active' };
    this.itemService.updateItemMaster(id, payload).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.cancelAddForm();
        this.isEditing.set(false);
        if (res?.success) {
          this.userStatus.set(id, (draft.status as Item['status']) || 'Active');
          this.items.update(list =>
            list.map(i => i.id === id ? { ...i, sku: draft.sku || i.sku, name: draft.name || i.name, category: draft.category || i.category, uom: draft.uom || i.uom, minStock: draft.minStock ?? i.minStock, currentStock: draft.currentStock ?? i.currentStock, price: draft.price ?? i.price, status: (draft.status as Item['status']) || i.status } : i)
          );
          this.showToast('Item updated');
        } else {
          this.showToast('Failed to update item', 'error');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.showToast('Failed to update item: ' + (err?.message || 'Server error'), 'error');
      }
    });
  }

  setNewItemField(field: string, value: any): void {
    const numFields = ['minStock', 'currentStock', 'price'];
    const v = numFields.includes(field) ? Number(value) : value;
    this.newItem.update(n => ({ ...(n as any), [field]: v }));
  }

  onFormStatusChange(status: string): void {
    this.newItem.update(n => ({ ...(n as any), status, isActive: status !== 'Out of Stock' }));
  }

  onCategorySelect(categoryName: string): void {
    const match = this.backendCategories().find(c => (c.categoryName || c.name || '') === categoryName);
    this.newItem.update(n => ({ ...(n as any), category: categoryName, categoryId: match ? String(match.id) : '' }));
  }

  adjustStock(item: Item): void {
    this.adjustDraft.set({ itemId: item.id, adjustmentType: 'increase', quantity: 0, reason: '' });
    this.adjustModeBulk.set(false);
    this.showAdjustModal.set(true);
  }

  performAdjust(): void {
    if (this.adjustModeBulk()) {
      this.bulkAdjustDraft.set({ adjustmentType: this.adjustDraft().adjustmentType, quantity: this.adjustDraft().quantity, reason: this.adjustDraft().reason });
      this.performBulkAdjust();
      return;
    }
    const d = this.adjustDraft();
    if (!d.itemId || !d.adjustmentType || !d.quantity) return;
    const item = this.filteredItems().find(i => i.id === d.itemId);
    const qty = d.quantity!;
    const adjType = d.adjustmentType!;
    const newQ = adjType === 'set' ? qty : (adjType === 'increase' ? (item?.currentStock ?? 0) + qty : (item?.currentStock ?? 0) - qty);
    this.inventoryService.adjustStock({ inventoryId: d.itemId, newQuantity: newQ, reason: d.reason ?? '' }).subscribe({
      next: () => { this.showAdjustModal.set(false); this.loadItems(); this.showToast('Stock adjusted'); },
      error: () => { this.showAdjustModal.set(false); }
    });
  }

  setAdjustField(field: string, value: any): void {
    const numFields = ['quantity'];
    const v = numFields.includes(field) ? Number(value) : value;
    this.adjustDraft.update(d => ({ ...(d as any), [field]: v }));
  }

  viewStock(item: Item): void { this.openItemModal(item); }

  bulkExport(): void {
    const list = this.selectedIds().length ? this.filteredItems().filter(i => this.selectedIds().includes(i.id ?? i.sku)) : this.filteredItems();
    const rows = [['SKU','Name','Category','UOM','MinStock','Current','Status','Price'], ...list.map(i => [i.sku, i.name, i.category, i.uom, String(i.minStock), String(i.currentStock), i.status, String(i.price)])];
    const csv = rows.map(r => r.map(c => '"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'items_export.csv'; a.click();
    URL.revokeObjectURL(url);
    this.showToast('Exported successfully', 'info');
  }

  generateQRCodes(): void {
    const list = this.selectedIds().length ? this.filteredItems().filter(i => this.selectedIds().includes(i.id ?? i.sku)) : this.filteredItems();
    const html = '<style>body{font-family:sans-serif;padding:20px;background:#f8fafc}h1{text-align:center;color:#1e293b;margin-bottom:30px}.qr-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;max-width:1200px;margin:0 auto}.qr-card{background:white;border-radius:12px;padding:20px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.08)}.qr-card svg{width:120px;height:120px;margin-bottom:12px}.qr-card .name{font-weight:700;color:#1e293b;margin-bottom:4px;font-size:14px}.qr-card .sku{color:#94a3b8;font-size:12px;font-family:monospace}</style><body><h1>Item QR Codes</h1><div class="qr-grid">' + list.map(i => '<div class="qr-card"><svg width="120" height="120" viewBox="0 0 100 100"><rect width="100" height="100" fill="white"/><path d="M10 10h15v15H10zM25 10h5v15h-5zM35 10h15v15H35zM55 10h15v15H55zM75 10h15v15H75zM10 25h15v5H10zM55 25h5v15h-5zM65 25h5v5h-5zM75 25h15v5H75zM90 25h5v5h-5zM10 35h15v15H10zM30 35h5v15h-5zM40 35h5v5h-5zM50 35h5v5h-5zM60 35h5v5h-5zM70 35h15v5H70zM90 35h5v5h-5zM30 45h5v5h-5zM40 45h5v5h-5zM50 45h5v5h-5zM60 45h5v5h-5zM70 45h15v5H70zM10 55h15v15H10zM30 55h5v5h-5zM40 55h5v5h-5zM50 55h5v5h-5zM60 55h5v5h-5zM70 55h5v5h-5zM80 55h5v5h-5zM90 55h5v5h-5zM10 75h15v15H10zM30 75h15v5H30zM50 75h5v5h-5zM60 75h15v15H60zM30 85h5v5h-5zM40 85h15v5H40zM80 85h5v5h-5z" fill="black"/></svg><div class="name">'+i.name+'</div><div class="sku">'+i.sku+'</div></div>').join('') + '</div></body></html>';
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  }

  formatValue(value: number): string {
    if (value >= 1000000) return '$' + (value / 1000000).toFixed(2) + 'M';
    if (value >= 1000) return '$' + (value / 1000).toFixed(0) + 'K';
    return '$' + value.toString();
  }

  onIsActiveChange(checked: boolean): void {
    this.newItem.update(n => ({ ...(n as any), isActive: checked, status: checked ? (n.status === 'Out of Stock' ? 'Active' : n.status) : 'Out of Stock' }));
  }

  onSelectAllChange(checked: boolean): void {
    if (checked) this.selectAll(); else this.clearSelection();
  }

  getProgressPercent(item: Item): number {
    if (item.minStock <= 0) return 100;
    const ratio = item.currentStock / item.minStock;
    return Math.min(Math.round(ratio * 100), 200);
  }
}
