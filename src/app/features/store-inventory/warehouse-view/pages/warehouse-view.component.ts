import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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

@Component({
  selector: 'app-warehouse-view',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './warehouse-view.component.html',
  styleUrls: ['./warehouse-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WarehouseViewComponent {
  readonly Math = Math;
  readonly router = inject(Router);

  selectedWarehouse = signal('Warehouse A');
  viewMode = signal('grid');
  warehouses = ['Warehouse A', 'Warehouse B', 'Warehouse C', 'Warehouse D'];

  shelves = signal<Shelf[]>([
    { aisle: 'A-01', rack: 'R-01', items: 234, value: 45678, occupancy: 78, status: '\uD83D\uDFE2', lastUpdated: 'Dec 15, 2024' },
    { aisle: 'A-01', rack: 'R-02', items: 189, value: 34567, occupancy: 63, status: '\uD83D\uDFE2', lastUpdated: 'Dec 14, 2024' },
    { aisle: 'A-01', rack: 'R-03', items: 98, value: 12345, occupancy: 33, status: '\uD83D\uDFE1', lastUpdated: 'Dec 13, 2024' },
    { aisle: 'A-01', rack: 'R-04', items: 156, value: 8901, occupancy: 52, status: '\uD83D\uDFE2', lastUpdated: 'Dec 15, 2024' },
    { aisle: 'A-02', rack: 'R-01', items: 67, value: 4567, occupancy: 22, status: '\uD83D\uDFE1', lastUpdated: 'Dec 12, 2024' },
    { aisle: 'A-02', rack: 'R-02', items: 34, value: 2345, occupancy: 11, status: '\uD83D\uDD34', lastUpdated: 'Dec 10, 2024' },
  ]);

  showWarehouseDetailsModal = signal(false);
  loading = signal(false);

  totalItems = computed(() => this.shelves().reduce((sum, s) => sum + s.items, 0));
  totalShelves = computed(() => this.shelves().length);
  totalValue = computed(() => this.shelves().reduce((sum, s) => sum + s.value, 0));
  occupancyRate = computed(() => {
    const shelves = this.shelves();
    if (shelves.length === 0) return 0;
    return Math.round(shelves.reduce((sum, s) => sum + s.occupancy, 0) / shelves.length);
  });
  utilizationRate = computed(() => {
    const shelves = this.shelves();
    if (shelves.length === 0) return 0;
    const active = shelves.filter(s => s.occupancy >= 60).length;
    return Math.round((active / shelves.length) * 100);
  });
  filteredShelves = computed(() => this.shelves());

  aisles = computed(() => {
    const set = new Set(this.shelves().map(s => s.aisle));
    return [...set].sort();
  });

  getShelvesByAisle(aisle: string): Shelf[] {
    return this.shelves().filter(s => s.aisle === aisle);
  }

  readonly chartOption = computed(() => {
    const shelves = this.shelves();
    const aisleList = [...new Set(shelves.map(s => s.aisle))].sort();
    const occupancyData = aisleList.map(aisle => {
      const filtered = shelves.filter(s => s.aisle === aisle);
      return Math.round(filtered.reduce((sum, s) => sum + s.occupancy, 0) / filtered.length);
    });
    const itemsData = aisleList.map(aisle => {
      const filtered = shelves.filter(s => s.aisle === aisle);
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

  onWarehouseChange(value: string): void {
    this.selectedWarehouse.set(value);
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
    this.router.navigate(['/storekeeper/inventory'], { queryParams: { shelf: `${shelf.aisle}-${shelf.rack}`, warehouse: this.selectedWarehouse() } });
  }

  printShelf(shelf: Shelf): void {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<div style="font-family: Arial; padding: 20px;"><h2>Shelf ${shelf.aisle}-${shelf.rack}</h2><p>Items: ${shelf.items}</p><p>Value: $${shelf.value.toLocaleString()}</p><p>Occupancy: ${shelf.occupancy}%</p><p>Status: ${shelf.status}</p><p>Last Updated: ${shelf.lastUpdated}</p></div>`);
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
    const headers = ['Aisle', 'Rack', 'Items', 'Value', 'Occupancy %', 'Status', 'Last Updated'];
    const csv = [
      headers.join(','),
      ...rows.map((r) => [r.aisle, r.rack, String(r.items), String(r.value), String(r.occupancy), r.status === '\uD83D\uDFE2' ? 'Active' : r.status === '\uD83D\uDFE1' ? 'Warning' : 'Critical', r.lastUpdated].map((v) => `"${v.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `warehouse-${this.selectedWarehouse().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
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
}
