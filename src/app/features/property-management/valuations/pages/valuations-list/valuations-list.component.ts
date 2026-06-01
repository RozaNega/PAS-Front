import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ValuationAsset {
  id: string;
  name: string;
  category: string;
  location: string;
  cost: number;
  depreciationRate: number;
  accumulatedDepreciation: number;
  bookValue: number;
}

interface StatCard {
  label: string;
  value: string;
  pct: number;
  color: string;
  icon: string;
}

interface DonutSegment {
  label: string;
  value: number;
  pct: number;
  color: string;
  dashArray: string;
  dashOffset: number;
}

interface BarItem {
  name: string;
  value: number;
  pct: number;
  color: string;
}

interface TrendItem {
  month: string;
  value: number;
  pct: number;
}

const MOCK_VALUATION_ASSETS: ValuationAsset[] = [
  { id: '1', name: 'Dell XPS 15 Laptop', category: 'Electronics', location: 'IT Dept', cost: 2499, depreciationRate: 20, accumulatedDepreciation: 1250, bookValue: 1249 },
  { id: '2', name: 'HP LaserJet Printer', category: 'Electronics', location: 'HR Dept', cost: 899, depreciationRate: 20, accumulatedDepreciation: 450, bookValue: 449 },
  { id: '3', name: 'Executive Office Chair', category: 'Furniture', location: 'Admin', cost: 450, depreciationRate: 10, accumulatedDepreciation: 135, bookValue: 315 },
  { id: '4', name: 'Ford Transit 350', category: 'Vehicles', location: 'Parking', cost: 35000, depreciationRate: 15, accumulatedDepreciation: 15750, bookValue: 19250 },
  { id: '5', name: 'Dell PowerEdge R740', category: 'Electronics', location: 'ServerRm', cost: 2800, depreciationRate: 20, accumulatedDepreciation: 1120, bookValue: 1680 },
  { id: '6', name: 'Conference Table', category: 'Furniture', location: 'Admin', cost: 2100, depreciationRate: 10, accumulatedDepreciation: 420, bookValue: 1680 },
  { id: '7', name: 'Toyota Hilux Double Cab', category: 'Vehicles', location: 'Parking', cost: 45000, depreciationRate: 15, accumulatedDepreciation: 13500, bookValue: 31500 },
  { id: '8', name: 'Cisco Catalyst Switch', category: 'Electronics', location: 'ServerRm', cost: 1200, depreciationRate: 20, accumulatedDepreciation: 840, bookValue: 360 },
  { id: '9', name: 'L-Shaped Standing Desk', category: 'Furniture', location: 'Finance', cost: 680, depreciationRate: 10, accumulatedDepreciation: 136, bookValue: 544 },
  { id: '10', name: 'MacBook Pro 16"', category: 'Electronics', location: 'Finance', cost: 3200, depreciationRate: 20, accumulatedDepreciation: 960, bookValue: 2240 },
  { id: '11', name: 'Epson L15150 Printer', category: 'Electronics', location: 'HR Dept', cost: 890, depreciationRate: 20, accumulatedDepreciation: 356, bookValue: 534 },
  { id: '12', name: 'Server UPS Backup', category: 'Electronics', location: 'ServerRm', cost: 1800, depreciationRate: 20, accumulatedDepreciation: 540, bookValue: 1260 },
  { id: '13', name: 'Samsung 49" Monitor', category: 'Electronics', location: 'IT Dept', cost: 1200, depreciationRate: 20, accumulatedDepreciation: 360, bookValue: 840 },
  { id: '14', name: 'Storage Shelving Unit', category: 'Furniture', location: 'Warehouse', cost: 320, depreciationRate: 10, accumulatedDepreciation: 128, bookValue: 192 },
  { id: '15', name: 'Ubiquiti Access Points', category: 'Electronics', location: 'ServerRm', cost: 560, depreciationRate: 20, accumulatedDepreciation: 168, bookValue: 392 }
];

const BAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const TREND_MAX = 100000;

@Component({
  selector: 'app-valuations-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './valuations-list.component.html',
  styleUrls: ['./valuations-list.component.scss']
})
export class ValuationsListComponent {
  readonly Math = Math;

  dateRange = { start: '2024-01-01', end: '2024-12-31' };
  categoryFilter = signal('All');
  locationFilter = signal('All');

  categories = ['All', 'Electronics', 'Furniture', 'Vehicles'];
  locations = ['All', 'IT Dept', 'HR Dept', 'ServerRm', 'Parking', 'Finance', 'Admin', 'Warehouse'];

  allAssets = signal<ValuationAsset[]>(MOCK_VALUATION_ASSETS);

  filteredAssets = computed(() => {
    const cat = this.categoryFilter();
    const loc = this.locationFilter();
    return this.allAssets().filter(a => {
      const matchCat = cat === 'All' || a.category === cat;
      const matchLoc = loc === 'All' || a.location === loc;
      return matchCat && matchLoc;
    });
  });

  currentPage = signal(1);
  readonly pageSize = 5;

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredAssets().length / this.pageSize)));

  paginatedAssets = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredAssets().slice(start, start + this.pageSize);
  });

  statCards = computed((): StatCard[] => {
    const assets = this.filteredAssets();
    const total = assets.length;
    const totalCost = assets.reduce((s, a) => s + a.cost, 0);
    const totalBook = assets.reduce((s, a) => s + a.bookValue, 0);
    const totalDep = assets.reduce((s, a) => s + a.accumulatedDepreciation, 0);
    const avgBook = total > 0 ? Math.round(totalBook / total) : 0;
    const depPct = totalCost > 0 ? Math.round(totalDep / totalCost * 100) : 0;
    const bookToCost = totalCost > 0 ? Math.round(totalBook / totalCost * 100) : 0;

    return [
      { label: 'Total Assets', value: total.toString(), pct: 100, color: '#3b82f6', icon: 'bi-box' },
      { label: 'Total Cost', value: `ETB ${totalCost.toLocaleString()}`, pct: Math.min(100, Math.round(totalCost / 100000 * 100)), color: '#10b981', icon: 'bi-currency-dollar' },
      { label: 'Total Book Value', value: `ETB ${totalBook.toLocaleString()}`, pct: Math.min(100, Math.round(totalBook / 100000 * 100)), color: '#8b5cf6', icon: 'bi-graph-up' },
      { label: 'Acc. Depreciation', value: `ETB ${totalDep.toLocaleString()}`, pct: depPct, color: '#f59e0b', icon: 'bi-arrow-down' },
      { label: 'Depreciation %', value: `${depPct}%`, pct: depPct, color: '#ef4444', icon: 'bi-percent' },
      { label: 'Book-to-Cost Ratio', value: `${bookToCost}%`, pct: bookToCost, color: '#ec4899', icon: 'bi-pie-chart' }
    ];
  });

  private catDist = computed(() => {
    const counts = new Map<string, { cost: number; book: number }>();
    this.filteredAssets().forEach(a => {
      const existing = counts.get(a.category) || { cost: 0, book: 0 };
      counts.set(a.category, { cost: existing.cost + a.cost, book: existing.book + a.bookValue });
    });
    const totalBook = this.filteredAssets().reduce((s, a) => s + a.bookValue, 0) || 1;
    return Array.from(counts.entries())
      .sort((a, b) => b[1].book - a[1].book)
      .map(([name, val], i) => ({ name, cost: val.cost, book: val.book, pct: Math.round(val.book / totalBook * 100), color: BAR_COLORS[i % BAR_COLORS.length] }));
  });

  private locDist = computed(() => {
    const counts = new Map<string, number>();
    this.filteredAssets().forEach(a => counts.set(a.location, (counts.get(a.location) || 0) + a.bookValue));
    const total = this.filteredAssets().reduce((s, a) => s + a.bookValue, 0) || 1;
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, val], i) => ({ name, value: val, pct: Math.round(val / total * 100), color: BAR_COLORS[(i + 2) % BAR_COLORS.length] }));
  });

  donutSegments = computed((): DonutSegment[] => {
    const C = 2 * Math.PI * 50;
    let cumulative = 0;
    return this.catDist().map(d => {
      const dashLen = C * d.pct / 100;
      const seg: DonutSegment = {
        label: d.name,
        value: Math.round(d.book / 1000),
        pct: d.pct,
        color: d.color,
        dashArray: `${dashLen} ${C}`,
        dashOffset: cumulative
      };
      cumulative += dashLen;
      return seg;
    });
  });

  categoryBars = computed((): BarItem[] =>
    this.catDist().map(d => ({ name: d.name, value: Math.round(d.book / 1000), pct: d.pct, color: d.color }))
  );

  locationBars = computed((): BarItem[] =>
    this.locDist().map(d => ({ name: d.name, value: Math.round(d.value / 1000), pct: d.pct, color: d.color }))
  );

  trendBars = computed((): TrendItem[] => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const totalBook = this.filteredAssets().reduce((s, a) => s + a.bookValue, 0);
    return months.map((m, i) => {
      const val = Math.round(totalBook * (0.5 + (i / 11) * 0.5));
      return { month: m, value: val, pct: Math.round(val / TREND_MAX * 100) };
    });
  });

  showScheduleModal = signal(false);
  scheduleFrequency = signal('weekly');
  scheduleEmail = signal('');
  scheduleDate = signal('');
  notification = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  isLoading = signal(false);
  reportGenerated = signal(false);
  lastRunTime = signal<string | null>(null);

  onFilterChange(): void {
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  prevPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  getPageRange(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  getDepreciationPct(asset: ValuationAsset): number {
    if (asset.cost <= 0) return 0;
    return Math.round(asset.accumulatedDepreciation / asset.cost * 100);
  }

  applyFilters(): void {
    this.onFilterChange();
  }

  runReport(): void {
    this.isLoading.set(true);
    this.reportGenerated.set(false);
    setTimeout(() => {
      this.reportGenerated.set(true);
      this.lastRunTime.set(new Date().toISOString());
      this.isLoading.set(false);
      this.showNotification('Valuation report generated successfully', 'success');
    }, 1500);
  }

  showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    this.notification.set({ message, type });
    setTimeout(() => this.notification.set(null), 3500);
  }

  exportToExcel(): void {
    const assets = this.filteredAssets();
    const headers = ['Name', 'Category', 'Location', 'Cost', 'Depreciation Rate', 'Acc. Depreciation', 'Book Value'];
    const csvContent = [
      headers.join(','),
      ...assets.map(a => [a.name, a.category, a.location, a.cost, `${a.depreciationRate}%`, a.accumulatedDepreciation, a.bookValue].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'valuation_report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.showNotification('Valuation report exported', 'success');
  }

  exportToPDF(): void {
    window.print();
    this.showNotification('Print dialog opened', 'info');
  }

  emailReport(): void {
    const totalCost = this.filteredAssets().reduce((s, a) => s + a.cost, 0);
    const totalBook = this.filteredAssets().reduce((s, a) => s + a.bookValue, 0);
    const subject = encodeURIComponent('Valuation Report');
    const body = encodeURIComponent(`Valuation Report Summary:\n\nTotal Assets: ${this.filteredAssets().length}\nTotal Cost: ETB ${totalCost.toLocaleString()}\nTotal Book Value: ETB ${totalBook.toLocaleString()}\nYTD Depreciation: ETB ${(totalCost - totalBook).toLocaleString()}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    this.showNotification('Email client opened', 'info');
  }

  scheduleReport(): void {
    this.showScheduleModal.set(true);
  }

  closeScheduleModal(): void {
    this.showScheduleModal.set(false);
  }

  saveSchedule(): void {
    this.showNotification('Report scheduled successfully!', 'success');
    this.closeScheduleModal();
  }
}
