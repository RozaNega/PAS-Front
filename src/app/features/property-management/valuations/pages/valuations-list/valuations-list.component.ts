import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PropertiesService, PropertyDto } from '../../../../../core/services/properties.service';
import { ApiService } from '../../../../../core/services/api.service';

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
  private readonly propertiesService = inject(PropertiesService);
  private readonly apiService = inject(ApiService);

  dateRange = { start: '2024-01-01', end: '2024-12-31' };
  categoryFilter = signal('All');
  locationFilter = signal('All');

  categories: string[] = ['All'];
  locations: string[] = ['All'];

  allAssets = signal<ValuationAsset[]>([]);

  constructor() {
    this.loadData();
  }

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

  loadData(): void {
    this.isLoading.set(true);
    this.propertiesService.getAll().subscribe({
      next: (res) => {
        if (res.success && res.data?.length) {
          this.allAssets.set(res.data.map(d => this.mapPropertyToAsset(d)));
          this.categories = ['All', ...new Set(res.data.map(d => d.propertyCategoryName).filter(Boolean))] as string[];
          this.locations = ['All', ...new Set(res.data.map(d => d.locationName).filter(Boolean))] as string[];
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.showNotification('Failed to load valuation data', 'error');
      }
    });
  }

  private mapPropertyToAsset(dto: PropertyDto): ValuationAsset {
    const cost = dto.totalValue ?? dto.purchasePrice * (dto.quantity ?? 1);
    const book = dto.currentValue;
    const dep = cost - book;
    const depRate = cost > 0 ? Math.round((dep / cost) * 100) : 0;
    return {
      id: dto.id,
      name: dto.name,
      category: dto.propertyCategoryName ?? dto.propertyCategoryId ?? '',
      location: dto.locationName ?? dto.locationId ?? '',
      cost,
      depreciationRate: depRate,
      accumulatedDepreciation: Math.max(dep, 0),
      bookValue: book,
    };
  }

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
    const to = prompt('Recipient email:');
    if (!to || !to.includes('@')) {
      this.showNotification('Please enter a valid email address', 'error');
      return;
    }

    const totalCost = this.filteredAssets().reduce((s, a) => s + a.cost, 0);
    const totalBook = this.filteredAssets().reduce((s, a) => s + a.bookValue, 0);
    const body = [
      'Valuation Report Summary',
      '-----------------------',
      `Total Assets: ${this.filteredAssets().length}`,
      `Total Cost: ETB ${totalCost.toLocaleString()}`,
      `Total Book Value: ETB ${totalBook.toLocaleString()}`,
      `Acc. Depreciation: ETB ${(totalCost - totalBook).toLocaleString()}`,
      '',
      '--- Asset Details ---',
      ...this.filteredAssets().map(a =>
        `${a.name} | ${a.category} | ${a.location} | Cost: ETB ${a.cost.toLocaleString()} | Book: ETB ${a.bookValue.toLocaleString()}`
      ),
    ].join('\n');

    this.isLoading.set(true);
    this.apiService.post<{ messageId: string }>('Notifications/send-email', {
      to,
      subject: 'Valuation Report',
      body,
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.showNotification('Valuation report sent successfully', 'success');
      },
      error: () => {
        this.isLoading.set(false);
        this.showNotification('Failed to send report. Check SMTP config in .env', 'error');
      }
    });
  }

  scheduleReport(): void {
    this.showScheduleModal.set(true);
  }

  closeScheduleModal(): void {
    this.showScheduleModal.set(false);
  }

  saveSchedule(): void {
    if (!this.scheduleEmail() || !this.scheduleDate()) {
      this.showNotification('Please fill in email and start date', 'error');
      return;
    }

    this.isLoading.set(true);
    this.apiService.post<{ id: string }>('Notifications/schedules', {
      frequency: this.scheduleFrequency(),
      email: this.scheduleEmail(),
      startDate: this.scheduleDate(),
      filters: {
        category: this.categoryFilter(),
        location: this.locationFilter(),
        dateRange: { ...this.dateRange },
      },
      reportType: 'valuation',
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.showNotification('Report scheduled successfully!', 'success');
        this.closeScheduleModal();
      },
      error: () => {
        this.isLoading.set(false);
        this.showNotification('Failed to save schedule', 'error');
      }
    });
  }
}
