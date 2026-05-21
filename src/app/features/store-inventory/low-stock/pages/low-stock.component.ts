import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService, InventoryStockDto } from '../../../../core/services/inventory.service';
import { WarehousesService } from '../../../../core/services/warehouses.service';

interface LowStockItem {
  id: string;
  severity: 'Critical' | 'Warning' | 'Info';
  name: string;
  sku: string;
  current: number;
  minStock: number;
  deficit: number;
  location: string;
  lastOrder: string;
  daysUntilEmpty: string;
  daysOverdue: string;
}

@Component({
  selector: 'app-low-stock',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './low-stock.component.html',
  styleUrls: ['./low-stock.component.scss'],
})
export class LowStockComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly warehousesService = inject(WarehousesService);
  private readonly warehouseNameToId = new Map<string, string>();

  alertThreshold = signal('Show items below min stock');
  warehouseFilter = signal('All Warehouses');
  categoryFilter = signal('All Categories');

  warehouses = signal<string[]>(['All Warehouses']);
  categories = ['All Categories', 'General'];

  loading = signal(false);
  loadError = signal<string | null>(null);

  allLowStock = signal<LowStockItem[]>([]);

  criticalAlerts = computed(() => this.allLowStock().filter((x) => x.severity === 'Critical'));
  warningAlerts = computed(() => this.allLowStock().filter((x) => x.severity === 'Warning'));
  infoAlerts = computed(() => this.allLowStock().filter((x) => x.severity === 'Info'));

  categoryAnalysis = signal<{ name: string; items: number; percentage: number }[]>([]);
  warehouseAnalysis = signal<{ name: string; items: number; percentage: number }[]>([]);

  showModal = signal(false);
  selectedItem = signal<LowStockItem | null>(null);

  ngOnInit(): void {
    this.warehousesService.getAll({ isActive: true }).subscribe({
      next: (res) => {
        this.warehouseNameToId.clear();
        if (res.success !== false && Array.isArray(res.data)) {
          for (const w of res.data) {
            this.warehouseNameToId.set(w.warehouseName, w.id);
          }
          this.warehouses.set(['All Warehouses', ...res.data.map((w) => w.warehouseName)]);
        }
      },
      error: () => {},
      complete: () => this.loadLowStock(),
    });
  }

  loadLowStock(): void {
    this.loading.set(true);
    this.loadError.set(null);
    const params: { warehouseId?: string; lowStockOnly?: boolean; pageSize?: number } = {
      lowStockOnly: true,
      pageSize: 500,
    };
    const wname = this.warehouseFilter();
    if (wname !== 'All Warehouses') {
      const id = this.warehouseNameToId.get(wname);
      if (id) params.warehouseId = id;
    }
    this.inventory.getLowStockItems(params).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success === false || !Array.isArray(res.data)) {
          this.loadError.set(res.message || 'No low-stock data returned.');
          this.allLowStock.set([]);
          this.categoryAnalysis.set([]);
          this.warehouseAnalysis.set([]);
          return;
        }
        const rows = res.data.map((r) => this.mapRow(r));
        this.allLowStock.set(rows);
        this.recomputeAnalysis(rows);
      },
      error: (err) => {
        this.loading.set(false);
        this.loadError.set('Failed to load low stock alerts.');
        console.error(err);
        this.allLowStock.set([]);
      },
    });
  }

  private mapRow(r: InventoryStockDto): LowStockItem {
    const min = Number(r.minimumThreshold) || 0;
    const cur = Number(r.currentStock) || 0;
    const deficit = cur - min;
    let severity: LowStockItem['severity'] = 'Info';
    if (min > 0) {
      if (cur <= min * 0.25) severity = 'Critical';
      else if (cur <= min) severity = 'Warning';
    }
    const loc = [r.warehouseName, r.shelfLocation].filter(Boolean).join(' — ') || '—';
    return {
      id: r.id,
      severity,
      name: r.itemName || '—',
      sku: r.sku || '—',
      current: cur,
      minStock: min,
      deficit,
      location: loc,
      lastOrder: r.lastUpdated ? new Date(r.lastUpdated).toLocaleDateString() : '—',
      daysUntilEmpty: '—',
      daysOverdue: '—',
    };
  }

  private recomputeAnalysis(rows: LowStockItem[]): void {
    const wmap = new Map<string, number>();
    for (const r of rows) {
      const wh = r.location.split(' — ')[0] || '—';
      wmap.set(wh, (wmap.get(wh) || 0) + 1);
    }
    const wmax = Math.max(...[...wmap.values()], 1);
    this.warehouseAnalysis.set(
      [...wmap.entries()]
        .map(([name, items]) => ({ name, items, percentage: Math.round((items / wmax) * 100) }))
        .sort((a, b) => b.items - a.items),
    );
    const total = rows.length || 1;
    this.categoryAnalysis.set([{ name: 'General', items: total, percentage: 100 }]);
  }

  refreshData(): void {
    this.loadLowStock();
  }

  onWarehouseFilterChange(): void {
    this.loadLowStock();
  }

  openOrderModal(item: LowStockItem): void {
    this.selectedItem.set(item);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedItem.set(null);
  }

  createOrder(): void {
    console.log('Creating purchase order for:', this.selectedItem()?.name);
    this.closeModal();
  }

  getSeverityIcon(severity: string): string {
    const icons: { [key: string]: string } = {
      Critical: '🔴',
      Warning: '🟡',
      Info: '🔵',
    };
    return icons[severity] || '⚪';
  }

  getSeverityColor(severity: string): string {
    const colors: { [key: string]: string } = {
      Critical: 'red',
      Warning: 'orange',
      Info: 'blue',
    };
    return colors[severity] || 'gray';
  }

  getSeverityClass(severity: string): string {
    switch (severity) {
      case 'Critical':
        return 'severity-critical';
      case 'Warning':
        return 'severity-warning';
      default:
        return 'severity-info';
    }
  }
}
