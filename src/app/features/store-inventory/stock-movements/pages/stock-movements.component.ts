import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

@Component({
  selector: 'app-stock-movements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-movements.component.html',
  styleUrls: ['./stock-movements.component.scss']
})
export class StockMovementsComponent {
  searchTerm = signal('');
  dateRange = { start: '2024-12-01', end: '2024-12-15' };
  typeFilter = signal('All Types');
  warehouseFilter = signal('All Warehouses');
  userFilter = signal('All Users');

  movementTypes = ['All Types', 'Inflow', 'Outflow', 'Transfer', 'Adjustment'];
  warehouses = ['All Warehouses', 'Warehouse A', 'Warehouse B', 'Warehouse C', 'Storage'];

  movements = signal<Movement[]>([
    { id: '1', dateTime: 'Dec 15, 10:30', type: 'Inflow', item: 'Dell XPS Laptop', quantity: 10, refNumber: 'GRN-2024-045', user: 'John Doe', balance: 45 },
    { id: '2', dateTime: 'Dec 15, 09:45', type: 'Outflow', item: 'HP Monitor', quantity: -3, refNumber: 'SIV-2024-012', user: 'Sarah Smith', balance: 67 },
    { id: '3', dateTime: 'Dec 14, 16:20', type: 'Transfer', item: 'USB Cables', quantity: 50, refNumber: 'TRF-2024-001', user: 'Mike Wilson', balance: 55 },
    { id: '4', dateTime: 'Dec 14, 14:15', type: 'Adjustment', item: 'A4 Paper', quantity: -2, refNumber: 'ADJ-2024-023', user: 'Admin', balance: 118 },
    { id: '5', dateTime: 'Dec 14, 11:00', type: 'Inflow', item: 'Office Chair', quantity: 20, refNumber: 'GRN-2024-044', user: 'John Doe', balance: 43 },
    { id: '6', dateTime: 'Dec 13, 15:30', type: 'Outflow', item: 'Toner Cartridge', quantity: -5, refNumber: 'SIV-2024-011', user: 'Lisa Wong', balance: 8 }
  ]);

  summary = signal({
    inflow: { units: 1245, value: 156890 },
    outflow: { units: 987, value: 123450 },
    transfer: { units: 234, value: 28900 },
    adjustment: { units: -12, value: -1200 }
  });

  filteredMovements = signal<Movement[]>([]);

  constructor() {
    this.filterMovements();
  }

  filterMovements(): void {
    const search = this.searchTerm().toLowerCase();
    const type = this.typeFilter();
    const warehouse = this.warehouseFilter();

    this.filteredMovements.set(
      this.movements().filter(mov => {
        const matchesSearch = mov.item.toLowerCase().includes(search) || mov.refNumber.toLowerCase().includes(search);
        const matchesType = type === 'All Types' || mov.type === type;
        return matchesSearch && matchesType;
      })
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
    this.filterMovements();
  }

  getMovementIcon(type: string): string {
    const icons: { [key: string]: string } = {
      Inflow: '📥',
      Outflow: '📤',
      Transfer: '🔄',
      Adjustment: '📝'
    };
    return icons[type] || '📋';
  }

  getMovementColor(type: string): string {
    const colors: { [key: string]: string } = {
      Inflow: 'green',
      Outflow: 'red',
      Transfer: 'blue',
      Adjustment: 'orange'
    };
    return colors[type] || 'gray';
  }

  exportData(): void {
    console.log('Exporting stock movements...');
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
