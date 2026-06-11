import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, PieChart } from 'echarts/charts';
import {
  TooltipComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

import { ShelvesService, ShelfLocationDto } from '../../../../core/services/shelves.service';
import { WarehousesService } from '../../../../core/services/warehouses.service';

echarts.use([
  BarChart,
  PieChart,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  CanvasRenderer,
]);

interface Shelf {
  aisle: string;
  rack: string;
  items: number;
  value: number;
  occupancy: number;
  status: string;
  lastUpdated: string;
}

interface WarehouseOption {
  id: string;
  name: string;
}

function getStatusSymbol(occupancy: number, isActive: boolean): string {
  if (!isActive) return '\u26AA';
  if (occupancy >= 70) return '\uD83D\uDFE2';
  if (occupancy >= 30) return '\uD83D\uDFE1';
  return '\uD83D\uDD34';
}

function getStatusLabel(occupancy: number, isActive: boolean): string {
  if (!isActive) return 'Inactive';
  if (occupancy >= 70) return 'Active';
  if (occupancy >= 30) return 'Warning';
  return 'Critical';
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '\u2014';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

@Component({
  selector: 'app-warehouse-view',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './warehouse-view.component.html',
  styleUrls: ['./warehouse-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WarehouseViewComponent implements OnInit {
  readonly Math = Math;
  readonly router = inject(Router);
  private readonly shelvesService = inject(ShelvesService);
  private readonly warehousesService = inject(WarehousesService);

  selectedWarehouseId = signal<string>('');
  viewMode = signal('grid');
  warehouses = signal<WarehouseOption[]>([]);
  shelves = signal<Shelf[]>([]);
  showWarehouseDetailsModal = signal(false);
  loading = signal(false);
  loadError = signal<string | null>(null);

  selectedWarehouseName = computed(() => {
    const id = this.selectedWarehouseId();
    const found = this.warehouses().find(w => w.id === id);
    return found?.name || 'Select a warehouse';
  });

  totalItems = computed(() => this.shelves().reduce((sum, s) => sum + s.items, 0));
  totalShelves = computed(() => this.shelves().length);
  totalValue = computed(() => this.shelves().reduce((sum, s) => sum + s.value, 0));
  occupancyRate = computed(() => {
    const items = this.shelves();
    if (items.length === 0) return 0;
    return Math.round(items.reduce((sum, s) => sum + s.occupancy, 0) / items.length);
  });
  utilizationRate = computed(() => {
    const items = this.shelves();
    if (items.length === 0) return 0;
    const active = items.filter(s => s.occupancy >= 60).length;
    return Math.round((active / items.length) * 100);
  });
  filteredShelves = computed(() => this.shelves());

  aisles = computed(() => {
    const set = new Set(this.shelves().map(s => s.aisle));
    return [...set].sort();
  });

  ngOnInit(): void {
    this.loadWarehouses();
  }

  private loadWarehouses(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.warehousesService.getAll({ isActive: true }).subscribe({
      next: (res) => {
        if (res.success !== false && Array.isArray(res.data)) {
          const list = res.data.map(w => ({ id: w.id, name: w.warehouseName }));
          this.warehouses.set(list);
          if (list.length > 0) {
            this.selectedWarehouseId.set(list[0].id);
            this.loadShelves(list[0].id);
          } else {
            this.loading.set(false);
          }
        } else {
          this.loading.set(false);
          this.loadError.set('Failed to load warehouses');
        }
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('Warehouses API unavailable');
      },
    });
  }

  private loadShelves(warehouseId: string): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.shelvesService.getAll({ warehouseId, isActive: true }).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success === false) {
          this.shelves.set([]);
          this.loadError.set(res.message || 'Failed to load shelves');
          return;
        }
        if (Array.isArray(res.data) && res.data.length > 0) {
          this.shelves.set(res.data.map(d => this.mapShelf(d)));
        } else {
          this.shelves.set([]);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.shelves.set([]);
        this.loadError.set(err.message || 'Failed to load shelves');
      },
    });
  }

  private mapShelf(d: ShelfLocationDto): Shelf {
    const occ = d.currentUtilization ?? 0;
    const isActive = d.isActive ?? true;
    return {
      aisle: d.aisle || '\u2014',
      rack: d.rack || '\u2014',
      items: d.capacity ? Math.round(d.capacity * occ / 100) : 0,
      value: 0,
      occupancy: occ,
      status: getStatusSymbol(occ, isActive),
      lastUpdated: formatDate(d.updatedAt || d.createdAt || ''),
    };
  }

  getShelvesByAisle(aisle: string): Shelf[] {
    return this.shelves().filter(s => s.aisle === aisle);
  }

  readonly chartOption = computed(() => {
    const items = this.shelves();
    const aisleList = [...new Set(items.map(s => s.aisle))].sort();
    const occupancyData = aisleList.map(aisle => {
      const filtered = items.filter(s => s.aisle === aisle);
      return Math.round(filtered.reduce((sum, s) => sum + s.occupancy, 0) / filtered.length);
    });
    const itemsData = aisleList.map(aisle => {
      const filtered = items.filter(s => s.aisle === aisle);
      return filtered.reduce((sum, s) => sum + s.items, 0);
    });

    return {
      tooltip: { trigger: 'axis' as const },
      legend: {
        data: ['Avg Occupancy %', 'Total Items'],
        bottom: 0,
        textStyle: { color: '#94a3b8' },
      },
      grid: { left: '10%', right: '10%', top: '15%', bottom: '25%' },
      xAxis: {
        type: 'category' as const,
        data: aisleList,
        axisLabel: { color: '#94a3b8', fontWeight: 600 },
        axisLine: { lineStyle: { color: 'rgba(148,163,184,0.2)' } },
      },
      yAxis: [
        {
          type: 'value' as const,
          name: 'Occupancy %',
          nameTextStyle: { color: '#94a3b8', fontSize: 11 },
          axisLabel: { color: '#94a3b8' },
          splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)' } },
        },
        {
          type: 'value' as const,
          name: 'Items',
          nameTextStyle: { color: '#94a3b8', fontSize: 11 },
          axisLabel: { color: '#94a3b8' },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'Avg Occupancy %',
          type: 'bar',
          data: occupancyData,
          barWidth: '35%',
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#3b82f6' },
              { offset: 1, color: '#8b5cf6' },
            ]) as any,
          },
        },
        {
          name: 'Total Items',
          type: 'bar',
          yAxisIndex: 1,
          data: itemsData,
          barWidth: '35%',
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#10b981' },
              { offset: 1, color: '#059669' },
            ]) as any,
          },
        },
      ],
    };
  });

  onWarehouseChange(id: string): void {
    this.selectedWarehouseId.set(id);
    if (id) this.loadShelves(id);
  }

  setViewMode(mode: string): void {
    this.viewMode.set(mode);
  }

  openWarehouseDetailsModal(): void {
    this.showWarehouseDetailsModal.set(true);
  }

  closeWarehouseDetailsModal(): void {
    this.showWarehouseDetailsModal.set(false);
  }

  viewShelf(shelf: Shelf): void {
    this.router.navigate(['/storekeeper/warehouse/shelves'], { queryParams: { aisle: shelf.aisle, rack: shelf.rack } });
  }

  editShelf(shelf: Shelf): void {
    this.router.navigate(['/storekeeper/warehouse/shelves'], { queryParams: { aisle: shelf.aisle, rack: shelf.rack, edit: 'true' } });
  }

  viewItems(shelf: Shelf): void {
    this.router.navigate(['/storekeeper/inventory'], { queryParams: { shelf: `${shelf.aisle}-${shelf.rack}`, warehouse: this.selectedWarehouseName() } });
  }

  printShelf(shelf: Shelf): void {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<div style="font-family: Arial; padding: 20px;"><h2>Shelf ${shelf.aisle}-${shelf.rack}</h2><p>Items: ${shelf.items}</p><p>Occupancy: ${shelf.occupancy}%</p><p>Status: ${getStatusLabel(shelf.occupancy, true)}</p><p>Last Updated: ${shelf.lastUpdated}</p></div>`);
    win.document.close();
    win.print();
  }

  addShelf(): void {
    this.router.navigate(['/storekeeper/warehouse/shelves'], { queryParams: { add: 'true' } });
  }

  rearrangeShelves(): void {
    this.router.navigate(['/storekeeper/warehouse/shelves']);
  }

  exportData(): void {
    const rows = this.shelves();
    const headers = ['Aisle', 'Rack', 'Items', 'Occupancy %', 'Status', 'Last Updated'];
    const csv = [
      headers.join(','),
      ...rows.map((r) => [r.aisle, r.rack, String(r.items), String(r.occupancy), getStatusLabel(r.occupancy, true), r.lastUpdated].map((v) => `"${v.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `warehouse-${this.selectedWarehouseName().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  printLayout(): void {
    window.print();
  }

  scanQRCode(): void {
    this.router.navigate(['/storekeeper/warehouse/scanner']);
  }

  getOccupancyBar(occupancy: number): string {
    const filled = Math.floor(occupancy / 10);
    return '\u2588'.repeat(filled) + '\u2591'.repeat(8 - filled);
  }

  getOccupancyColor(occupancy: number): string {
    if (occupancy >= 70) return 'green';
    if (occupancy >= 30) return 'yellow';
    return 'red';
  }

  getStatusLabel = getStatusLabel;
}
