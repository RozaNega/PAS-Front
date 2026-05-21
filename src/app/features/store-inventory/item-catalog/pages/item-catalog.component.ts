import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ItemMasterService } from '../../../../core/services/item-master.service';
import { InventoryService } from '../../../../core/services/inventory.service';

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

@Component({
  selector: 'app-item-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './item-catalog.component.html',
  styleUrls: ['./item-catalog.component.scss']
})
export class ItemCatalogComponent {
  searchTerm = signal('');
  categoryFilter = signal('All Categories');
  statusFilter = signal('All Status');
  sortBy = signal('Name');
  viewMode = signal('table'); // 'card' or 'table'

  categories = ['All Categories', 'Electronics', 'Furniture', 'Stationery', 'Supplies', 'IT Equipment', 'Accessories'];
  statuses = ['All Status', 'Active', 'Low Stock', 'Out of Stock'];
  sortOptions = ['Name', 'SKU', 'Category', 'Stock', 'Price'];

  items = signal<Item[]>([
    { sku: 'LAP-001', name: 'Dell XPS Laptop', category: 'Electronics', uom: 'PCS', minStock: 10, currentStock: 45, status: 'Active', price: 2499 },
    { sku: 'MON-002', name: 'HP 27" Monitor', category: 'Electronics', uom: 'PCS', minStock: 15, currentStock: 67, status: 'Active', price: 350 },
    { sku: 'CHR-003', name: 'Office Chair', category: 'Furniture', uom: 'PCS', minStock: 50, currentStock: 23, status: 'Low Stock', price: 450 },
    { sku: 'CAB-004', name: 'USB Cables', category: 'Accessories', uom: 'PCS', minStock: 50, currentStock: 5, status: 'Out of Stock', price: 5 },
    { sku: 'PAP-005', name: 'A4 Paper', category: 'Stationery', uom: 'BOX', minStock: 100, currentStock: 120, status: 'Active', price: 25 },
    { sku: 'TON-006', name: 'Toner Cartridge', category: 'Supplies', uom: 'PCS', minStock: 20, currentStock: 8, status: 'Low Stock', price: 75 },
    { sku: 'SER-007', name: 'Server Rack', category: 'IT Equipment', uom: 'PCS', minStock: 5, currentStock: 8, status: 'Active', price: 2800 },
    { sku: 'SWI-008', name: 'Cisco Switch', category: 'Networking', uom: 'PCS', minStock: 10, currentStock: 12, status: 'Active', price: 1200 }
  ]);

  showItemModal = signal(false);
  showAddModal = signal(false);
  showBulkImportModal = signal(false);
  selectedItem = signal<Item | null>(null);

  // selection state (store item ids when available, fallback to sku)
  selectedIds = signal<string[]>([]);
  isEditing = signal(false);
  showAdjustModal = signal(false);
  adjustDraft = signal<{ itemId?: string; adjustmentType?: 'increase'|'decrease'|'set'; quantity?: number; reason?: string }>({ itemId: undefined, adjustmentType: 'increase', quantity: 0, reason: '' });
  adjustModeBulk = signal(false);

  // Computed / reactive summary statistics
  totalItems = computed(() => this.items().length);
  activeItems = computed(() => this.items().filter(i => i.status === 'Active').length);
  categoryCount = signal(0);
  lowStockItems = computed(() => this.items().filter(i => i.status === 'Low Stock').length);
  outOfStockItems = computed(() => this.items().filter(i => i.status === 'Out of Stock').length);

  filteredItems = signal<Item[]>([]);

  // Stock locations for selected item
  stockLocations = signal<StockLocation[]>([
    { warehouse: 'Warehouse A', shelfLocation: 'A-01-R-03-S-03', quantity: 35, reserved: 3, available: 32 },
    { warehouse: 'Warehouse B', shelfLocation: 'B-02-R-01-S-02', quantity: 10, reserved: 2, available: 8 }
  ]);

  // Recent movements for selected item
  recentMovements = signal<Movement[]>([
    { date: 'Dec 15, 2024', type: '📥 Receiving', quantity: 10, reference: 'GRN-2024-045', user: 'John Doe', balance: 45 },
    { date: 'Dec 14, 2024', type: '📤 Issue', quantity: -3, reference: 'SIV-2024-012', user: 'Sarah Smith', balance: 35 },
    { date: 'Dec 10, 2024', type: '🔄 Transfer', quantity: 5, reference: 'TRF-2024-008', user: 'Mike Wilson', balance: 38 }
  ]);

  // New item draft for Add modal
  newItem = signal<Partial<Item & { isActive?: boolean }>>({ sku: '', name: '', category: '', uom: 'PCS', minStock: 0, currentStock: 0, price: 0, isActive: true });

  private readonly itemService = inject(ItemMasterService);
  private readonly inventoryService = inject(InventoryService);

  // Bulk edit/adjust drafts
  bulkEditDraft = signal<{ category?: string; uom?: string; minStock?: number }>({ category: undefined, uom: undefined, minStock: undefined });
  bulkAdjustDraft = signal<{ adjustmentType?: 'increase'|'decrease'|'set'; quantity?: number; reason?: string }>({ adjustmentType: 'increase', quantity: 0, reason: '' });

  constructor() {
    this.loadItems();
  }

  loadItems(page = 1, pageSize = 50): void {
    this.itemService.getItemMasters({ pageNumber: page, pageSize }).subscribe({
      next: (res) => {
        if (res?.success && res.data) {
          const dt = res.data.items || [];
          const mapped = dt.map(i => ({
            id: i.id,
            sku: i.sku,
            name: i.itemName,
            category: i.categoryName || 'Uncategorized',
            uom: i.unitOfMeasure || 'PCS',
            minStock: i.minStockLevel ?? 0,
            currentStock: i.currentStock ?? (i.stockQuantity ?? 0),
            status: (i.isActive ? ((i.currentStock ?? (i.stockQuantity ?? 0)) === 0 ? 'Out of Stock' : ((i.isLowStock || (i.currentStock ?? 0) <= (i.minStockLevel ?? 0)) ? 'Low Stock' : 'Active')) : 'Out of Stock') as any,
            price: 0
          } as Item));

          this.items.set(mapped);
          this.filteredItems.set(mapped);
          const uniqueCategories = Array.from(new Set(mapped.map(m => m.category)));
          this.categoryCount.set(uniqueCategories.length);
        } else {
          this.filterItems();
        }
      },
      error: () => this.filterItems()
    });
  }

  // Selection helpers
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

  // Bulk workflows
  bulkEdit(): void {
    // open bulk edit modal
    this.bulkEditDraft.set({ category: undefined, uom: undefined, minStock: undefined });
    // show using same add modal? create a dedicated modal in template
    this.showBulkImportModal.set(true);
  }

  performBulkEdit(): void {
    const draft = this.bulkEditDraft();
    const selected = this.filteredItems().filter(i => this.selectedIds().includes(i.id ?? i.sku));
    if (!selected.length) return;
    let remaining = selected.length;
    selected.forEach(item => {
      if (!item.id) { remaining -= 1; if (remaining === 0) this.loadItems(); return; }
      const payload: any = {};
      if (draft.category !== undefined) payload.categoryName = draft.category;
      if (draft.uom !== undefined) payload.unitOfMeasure = draft.uom;
      if (draft.minStock !== undefined) payload.minStockLevel = draft.minStock;
      if (Object.keys(payload).length === 0) { remaining -= 1; if (remaining === 0) this.loadItems(); return; }
      this.itemService.updateItemMaster(item.id!, payload).subscribe({ next: () => { remaining -= 1; if (remaining === 0) { this.showBulkImportModal.set(false); this.selectedIds.set([]); this.loadItems(); } }, error: () => { remaining -= 1; if (remaining === 0) { this.showBulkImportModal.set(false); this.selectedIds.set([]); this.loadItems(); } } });
    });
  }

  bulkAdjustStock(): void {
    // open bulk adjust modal
    this.bulkAdjustDraft.set({ adjustmentType: 'increase', quantity: 0, reason: '' });
    // copy into adjustDraft for modal binding
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
      const req = { itemId: item.id!, shelfId: '', adjustmentType: draft.adjustmentType!, quantity: draft.quantity!, reason: draft.reason ?? '' };
      this.inventoryService.adjustStock(req).subscribe({ next: () => { remaining -= 1; if (remaining === 0) { this.showAdjustModal.set(false); this.selectedIds.set([]); this.loadItems(); } }, error: () => { remaining -= 1; if (remaining === 0) { this.showAdjustModal.set(false); this.selectedIds.set([]); this.loadItems(); } } });
    });
  }

  setBulkEditField(field: string, value: any): void {
    this.bulkEditDraft.update(d => ({ ...(d as any), [field]: value }));
  }

  setBulkAdjustField(field: string, value: any): void {
    this.bulkAdjustDraft.update(d => ({ ...(d as any), [field]: value }));
  }

  filterItems(): void {
    const search = this.searchTerm().toLowerCase();
    const category = this.categoryFilter();
    const status = this.statusFilter();

    this.filteredItems.set(
      this.items().filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(search) || 
                              item.sku.toLowerCase().includes(search) ||
                              item.category.toLowerCase().includes(search);
        const matchesCategory = category === 'All Categories' || item.category === category;
        const matchesStatus = status === 'All Status' || item.status === status;
        return matchesSearch && matchesCategory && matchesStatus;
      })
    );
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.filterItems();
  }

  onCategoryChange(value: string): void {
    this.categoryFilter.set(value);
    this.filterItems();
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(value);
    this.filterItems();
  }

  onSortChange(value: string): void {
    this.sortBy.set(value);
    this.sortItems();
  }

  sortItems(): void {
    const sort = this.sortBy();
    const sorted = [...this.filteredItems()];
    
    switch(sort) {
      case 'Name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'SKU':
        sorted.sort((a, b) => a.sku.localeCompare(b.sku));
        break;
      case 'Category':
        sorted.sort((a, b) => a.category.localeCompare(b.category));
        break;
      case 'Stock':
        sorted.sort((a, b) => b.currentStock - a.currentStock);
        break;
      case 'Price':
        sorted.sort((a, b) => b.price - a.price);
        break;
    }
    
    this.filteredItems.set(sorted);
  }

  toggleViewMode(mode: 'card' | 'table'): void {
    this.viewMode.set(mode);
  }

  openItemModal(item: Item): void {
    this.selectedItem.set(item);
    this.showItemModal.set(true);
  }

  closeItemModal(): void {
    this.showItemModal.set(false);
    this.selectedItem.set(null);
  }

  openAddModal(): void {
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
  }

  openBulkImportModal(): void {
    this.showBulkImportModal.set(true);
  }

  closeBulkImportModal(): void {
    this.showBulkImportModal.set(false);
  }

  editItem(item: Item): void {
    // open modal in edit mode
    this.isEditing.set(true);
    this.newItem.set({ sku: item.sku, name: item.name, category: item.category, uom: item.uom, minStock: item.minStock, currentStock: item.currentStock, price: item.price });
    this.selectedItem.set(item);
    this.showAddModal.set(true);
  }

  createItem(): void {
    const draft = this.newItem();
    if (!draft || !draft.sku || !draft.name) {
      return;
    }
    const payload: any = {
      sku: draft.sku,
      itemName: draft.name,
      categoryName: draft.category,
      unitOfMeasure: draft.uom,
      minStockLevel: draft.minStock,
      stockQuantity: draft.currentStock,
      isActive: draft.isActive ?? true
    };
    this.itemService.createItemMaster(payload).subscribe({
      next: (res) => {
        // After successful create, reload list
        this.closeAddModal();
        this.newItem.set({ sku: '', name: '', category: '', uom: 'PCS', minStock: 0, currentStock: 0, price: 0, isActive: true });
        this.loadItems();
      },
      error: () => {
        // on error, still close modal and fallback to local list
        this.closeAddModal();
      }
    });
  }

  updateItem(): void {
    const draft = this.newItem();
    const id = this.selectedItem()?.id;
    if (!id || !draft) return;
    const payload: any = {
      sku: draft.sku,
      itemName: draft.name,
      categoryName: draft.category,
      unitOfMeasure: draft.uom,
      minStockLevel: draft.minStock,
      stockQuantity: draft.currentStock,
      isActive: draft.isActive ?? true
    };
    this.itemService.updateItemMaster(id, payload).subscribe({ next: () => { this.closeAddModal(); this.loadItems(); this.isEditing.set(false); }, error: () => { this.closeAddModal(); this.isEditing.set(false); } });
  }

  setNewItemField(field: string, value: any): void {
    this.newItem.update(n => ({ ...(n as any), [field]: value }));
  }

  adjustStock(item: Item): void {
    // open adjust modal prefilled for single item
    this.adjustDraft.set({ itemId: item.id, adjustmentType: 'increase', quantity: 0, reason: '' });
    this.adjustModeBulk.set(false);
    this.showAdjustModal.set(true);
  }

  performAdjust(): void {
    if (this.adjustModeBulk()) {
      // save bulk draft then perform bulk adjust
      this.bulkAdjustDraft.set({ adjustmentType: this.adjustDraft().adjustmentType, quantity: this.adjustDraft().quantity, reason: this.adjustDraft().reason });
      this.performBulkAdjust();
      return;
    }
    const d = this.adjustDraft();
    if (!d.itemId || !d.adjustmentType || !d.quantity) return;
    const req = { itemId: d.itemId, shelfId: '', adjustmentType: d.adjustmentType, quantity: d.quantity, reason: d.reason ?? '' };
    this.inventoryService.adjustStock(req).subscribe({ next: () => { this.showAdjustModal.set(false); this.loadItems(); }, error: () => { this.showAdjustModal.set(false); } });
  }

  setAdjustField(field: string, value: any): void {
    this.adjustDraft.update(d => ({ ...(d as any), [field]: value }));
  }

  viewStock(item: Item): void {
    this.openItemModal(item);
  }

  bulkExport(): void {
    console.log('Bulk export items');
    const list = this.selectedIds().length ? this.filteredItems().filter(i => this.selectedIds().includes(i.id ?? i.sku)) : this.filteredItems();
    const rows = [
      ['SKU','Name','Category','UOM','MinStock','Current','Status','Price'],
      ...list.map(i => [i.sku, i.name, i.category, i.uom, String(i.minStock), String(i.currentStock), i.status, String(i.price)])
    ];
    const csv = rows.map(r => r.map(c => '"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'items_export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  generateQRCodes(): void {
    // Open a printable page listing selected items' SKUs
    const list = this.selectedIds().length ? this.filteredItems().filter(i => this.selectedIds().includes(i.id ?? i.sku)) : this.filteredItems();
    const html = `<!doctype html><html><head><title>QR Codes</title></head><body><h1>QR Codes</h1>${list.map(i=>`<div style="margin:10px;padding:10px;border:1px solid #ccc;"><div><strong>${i.name}</strong></div><div>${i.sku}</div></div>`).join('')}</body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  }

  formatValue(value: number): string {
    if (value >= 1000) {
      return '$' + (value / 1000).toFixed(0) + 'K';
    }
    return '$' + value.toString();
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'Active': '🟢',
      'Low Stock': '🟡',
      'Out of Stock': '🔴'
    };
    return icons[status] || '⚪';
  }

  getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      'Electronics': '📱',
      'Furniture': '🪑',
      'Accessories': '🔌',
      'Stationery': '📄',
      'Supplies': '📦',
      'IT Equipment': '💻',
      'Networking': '🌐'
    };
    return icons[category] || '📦';
  }
}
