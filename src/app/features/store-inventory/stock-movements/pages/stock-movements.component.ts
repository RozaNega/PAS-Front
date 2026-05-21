import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService, StockMovementDto } from '../../../../core/services/inventory.service';
import { WarehousesService } from '../../../../core/services/warehouses.service';

interface Movement {
  id: string;
  dateTime: string;
  type: 'Inflow' | 'Outflow' | 'Transfer' | 'Adjustment';
  item: string;
  quantity: number;
  refNumber: string;
  user: string;
  balance: number;
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
  selector: 'app-stock-movements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-movements.component.html',
  styleUrls: ['./stock-movements.component.scss'],
})
export class StockMovementsComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly warehousesService = inject(WarehousesService);
  private readonly warehouseNameToId = new Map<string, string>();

  searchTerm = signal('');
  dateFrom = signal(toYmd(addDays(new Date(), -30)));
  dateTo = signal(toYmd(new Date()));
  typeFilter = signal('All Types');
  warehouseFilter = signal('All Warehouses');
  userFilter = signal('All Users');

  loading = signal(false);
  loadError = signal<string | null>(null);

  movementTypes = ['All Types', 'Inflow', 'Outflow', 'Transfer', 'Adjustment'];
  warehouses = signal<string[]>(['All Warehouses']);
  userOptions = signal<string[]>(['All Users']);

  movements = signal<Movement[]>([]);

  summary = signal({
    inflow: { units: 0, value: 0 },
    outflow: { units: 0, value: 0 },
    transfer: { units: 0, value: 0 },
    adjustment: { units: 0, value: 0 },
  });

  barHeightsInflow = signal<number[]>([]);
  barHeightsOutflow = signal<number[]>([]);
  barHeightsNet = signal<number[]>([]);

  filteredMovements = signal<Movement[]>([]);

  ngOnInit(): void {
    const inflowHeights: number[] = [];
    const outflowHeights: number[] = [];
    const netHeights: number[] = [];
    for (let i = 0; i < 8; i++) {
      inflowHeights.push(this.getRandomHeight(80, 50));
      outflowHeights.push(this.getRandomHeight(60, 40));
      netHeights.push(this.getRandomHeight(40, 20));
    }
    this.barHeightsInflow.set(inflowHeights);
    this.barHeightsOutflow.set(outflowHeights);
    this.barHeightsNet.set(netHeights);

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
      complete: () => this.loadMovements(),
    });
  }

  loadMovements(): void {
    this.loading.set(true);
    this.loadError.set(null);
    const params: {
      warehouseId?: string;
      dateFrom?: string;
      dateTo?: string;
      pageSize?: number;
    } = {
      dateFrom: this.dateFrom(),
      dateTo: this.dateTo(),
      pageSize: 500,
    };
    const wname = this.warehouseFilter();
    if (wname !== 'All Warehouses') {
      const id = this.warehouseNameToId.get(wname);
      if (id) params.warehouseId = id;
    }
    this.inventory.getStockMovements(params).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success === false || !Array.isArray(res.data)) {
          this.loadError.set(res.message || 'No movement data returned.');
          this.movements.set([]);
          this.filterMovements();
          return;
        }
        const mapped = res.data.map((d) => this.mapDto(d));
        this.movements.set(mapped);
        const users = new Set(mapped.map((m) => m.user).filter(Boolean));
        this.userOptions.set(['All Users', ...[...users].sort()]);
        this.recomputeSummary(mapped);
        this.filterMovements();
      },
      error: (err) => {
        this.loading.set(false);
        this.loadError.set('Failed to load stock movements.');
        console.error(err);
        this.movements.set([]);
        this.filterMovements();
      },
    });
  }

  private mapDto(d: StockMovementDto): Movement {
    return {
      id: d.id,
      dateTime: d.movementDate ? new Date(d.movementDate).toLocaleString() : '—',
      type: this.mapMovementType(d.movementType, d.referenceType),
      item: d.itemName || '—',
      quantity: Number(d.quantity) || 0,
      refNumber: d.referenceNumber || '—',
      user: d.performedBy || '—',
      balance: Number(d.newStock) || 0,
    };
  }

  private mapMovementType(movementType: string, referenceType?: string): Movement['type'] {
    const u = `${movementType || ''} ${referenceType || ''}`.toUpperCase();
    if (u.includes('TRANSFER')) return 'Transfer';
    if (u.includes('ADJUST')) return 'Adjustment';
    if (u.includes('IN') || u.includes('RECEIV') || u.includes('GRN')) return 'Inflow';
    if (u.includes('OUT') || u.includes('ISSUE') || u.includes('SIV')) return 'Outflow';
    if ((Number(movementType) || 0) > 0) return 'Inflow';
    return 'Adjustment';
  }

  private recomputeSummary(rows: Movement[]): void {
    let inU = 0;
    let outU = 0;
    let trU = 0;
    let adjU = 0;
    for (const m of rows) {
      const q = Math.abs(m.quantity);
      switch (m.type) {
        case 'Inflow':
          inU += q;
          break;
        case 'Outflow':
          outU += q;
          break;
        case 'Transfer':
          trU += q;
          break;
        default:
          adjU += q;
      }
    }
    this.summary.set({
      inflow: { units: inU, value: 0 },
      outflow: { units: outU, value: 0 },
      transfer: { units: trU, value: 0 },
      adjustment: { units: adjU, value: 0 },
    });
  }

  filterMovements(): void {
    const search = this.searchTerm().toLowerCase();
    const type = this.typeFilter();
    const user = this.userFilter();

    this.filteredMovements.set(
      this.movements().filter((mov) => {
        const matchesSearch =
          mov.item.toLowerCase().includes(search) || mov.refNumber.toLowerCase().includes(search);
        const matchesType = type === 'All Types' || mov.type === type;
        const matchesUser = user === 'All Users' || mov.user === user;
        return matchesSearch && matchesType && matchesUser;
      }),
    );
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.filterMovements();
  }

  onTypeFilterChange(value: string): void {
    this.typeFilter.set(value);
    this.filterMovements();
  }

  onWarehouseFilterChange(value: string): void {
    this.warehouseFilter.set(value);
    this.loadMovements();
  }

  onUserFilterChange(value: string): void {
    this.userFilter.set(value);
    this.filterMovements();
  }

  onDateFromChange(value: string): void {
    this.dateFrom.set(value);
  }

  onDateToChange(value: string): void {
    this.dateTo.set(value);
  }

  applyDateFilters(): void {
    this.loadMovements();
  }

  resetDateFilters(): void {
    this.dateFrom.set(toYmd(addDays(new Date(), -30)));
    this.dateTo.set(toYmd(new Date()));
    this.loadMovements();
  }

  getMovementIcon(type: string): string {
    const icons: { [key: string]: string } = {
      Inflow: '📥',
      Outflow: '📤',
      Transfer: '🔄',
      Adjustment: '📝',
    };
    return icons[type] || '📋';
  }

  getMovementIconClass(type: string): string {
    const iconClasses: { [key: string]: string } = {
      Inflow: 'bi bi-arrow-down-circle',
      Outflow: 'bi bi-arrow-up-circle',
      Transfer: 'bi bi-arrow-left-right-circle',
      Adjustment: 'bi bi-pencil-square',
    };
    return iconClasses[type] || 'bi bi-info-circle';
  }

  getMovementColor(type: string): string {
    const colors: { [key: string]: string } = {
      Inflow: 'green',
      Outflow: 'red',
      Transfer: 'blue',
      Adjustment: 'orange',
    };
    return colors[type] || 'gray';
  }

  exportData(): void {
    console.log('Exporting stock movements...', this.filteredMovements().length);
  }

  formatValue(value: number): string {
    if (value >= 1000000) {
      return '$' + (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return '$' + (value / 1000).toFixed(0) + 'K';
    }
    return '$' + value.toString();
  }

  getRandomHeight(base: number, variance: number): number {
    return base + Math.random() * variance;
  }
}
