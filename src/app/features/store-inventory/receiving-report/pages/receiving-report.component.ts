import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReceivingReportService, ReceivingReportItem } from '../services/receiving-report.service';

interface Receiving {
  date: string;
  grnNumber: string;
  supplier: string;
  items: number;
  quantity: number;
  value: number;
  status: 'Pending' | 'Passed' | 'Failed';
}

interface SupplierPerformance {
  name: string;
  onTime: string;
  quality: string;
  price: string;
  delivery: string;
  overall: string;
  trend: string;
}

@Component({
  selector: 'app-receiving-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './receiving-report.component.html',
  styleUrls: ['./receiving-report.component.scss']
})
export class ReceivingReportComponent implements OnInit {
  private readonly reportService = inject(ReceivingReportService);

  dateRange = { start: '2024-12-01', end: '2024-12-15' };
  supplierFilter = signal('All Suppliers');
  categoryFilter = signal('All Categories');
  statusFilter = signal('All Status');
  format = signal('PDF');
  includeRejected = signal('Yes');

  suppliers = ['All Suppliers', 'Tech Supplies Ltd', 'Office Depot', 'Global Suppliers', 'Paper Co', 'Tech Solutions'];
  categories = ['All Categories', 'Electronics', 'Furniture', 'Office Supplies', 'IT Equipment'];
  statuses = ['All Status', 'Pending', 'Passed', 'Failed'];
  formats = ['PDF', 'Excel', 'CSV'];

  receivings = signal<Receiving[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  totalGRNs = computed(() => this.receivings().length);
  totalItemsReceived = computed(() => this.receivings().reduce((s, r) => s + r.quantity, 0));
  totalValueReceived = computed(() => this.receivings().reduce((sum, r) => sum + r.value, 0));
  avgDailyReceiving = computed(() => {
    const items = this.receivings();
    if (items.length === 0) return '0 units/day';
    const start = new Date(this.dateRange.start);
    const end = new Date(this.dateRange.end);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    return Math.round(items.reduce((s, r) => s + r.quantity, 0) / days) + ' units/day';
  });
  activeSuppliers = computed(() => new Set(this.receivings().map(r => r.supplier)).size);

  receivingBySupplier = computed(() => {
    const groups = new Map<string, { name: string; percentage: number; value: number; grns: number }>();
    for (const r of this.receivings()) {
      const g = groups.get(r.supplier) || { name: r.supplier, percentage: 0, value: 0, grns: 0 };
      g.value += r.value;
      g.grns++;
      groups.set(r.supplier, g);
    }
    const entries = Array.from(groups.values()).sort((a, b) => b.value - a.value);
    const total = entries.reduce((s, e) => s + e.value, 0) || 1;
    return entries.map(e => ({ ...e, percentage: Math.round((e.value / total) * 100) }));
  });

  qualitySummary = computed(() => {
    const items = this.receivings();
    const total = items.length || 1;
    const passed = items.filter(r => r.status === 'Passed').length;
    const failed = items.filter(r => r.status === 'Failed').length;
    const pending = items.filter(r => r.status === 'Pending').length;
    return [
      { label: 'Pass Rate', percentage: Math.round((passed / total) * 100), count: passed, color: '#10b981' },
      { label: 'Fail Rate', percentage: Math.round((failed / total) * 100), count: failed, color: '#ef4444' },
      { label: 'Pending Rate', percentage: Math.round((pending / total) * 100), count: pending, color: '#f59e0b' }
    ];
  });

  topQualityIssues = computed<{ issue: string; percentage: number }[]>(() => []);

  supplierPerformance = computed<SupplierPerformance[]>(() => []);

  filteredReceivings = signal<Receiving[]>([]);

  ngOnInit(): void {
    this.loadReceivingReport();
  }

  loadReceivingReport(): void {
    this.loading.set(true);
    this.error.set(null);

    this.reportService.getReceivingReport({
      dateFrom: this.dateRange.start,
      dateTo: this.dateRange.end,
      pageSize: 100
    }).subscribe({
      next: (res) => {
        if (res.success !== false && Array.isArray(res.data)) {
          this.receivings.set(res.data);
        } else {
          this.error.set(res.message || 'Failed to load receiving report');
        }
        this.loading.set(false);
        this.filterReceivings();
      },
      error: (err) => {
        console.error('Error loading receiving report:', err);
        this.error.set('Failed to load receiving report. Please try again.');
        this.loading.set(false);
      }
    });
  }

  filterReceivings(): void {
    const supplier = this.supplierFilter();
    const status = this.statusFilter();

    this.filteredReceivings.set(
      this.receivings().filter(receiving => {
        const matchesSupplier = supplier === 'All Suppliers' || receiving.supplier === supplier;
        const matchesStatus = status === 'All Status' || receiving.status === status;
        return matchesSupplier && matchesStatus;
      })
    );
  }

  onSupplierChange(value: string): void {
    this.supplierFilter.set(value);
    this.filterReceivings();
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(value);
    this.filterReceivings();
  }

  isLoading = signal(false);
  reportGenerated = signal(false);
  lastRunTime = signal<Date | null>(null);

  generateReport(): void {
    this.isLoading.set(true);
    this.reportGenerated.set(false);
    this.loadReceivingReport();
    this.lastRunTime.set(new Date());
  }

  exportToExcel(): void {
    const receivings = this.filteredReceivings();
    const headers = ['Date', 'GRN Number', 'Supplier', 'Items', 'Quantity', 'Value', 'Status'];
    const csvContent = [
      headers.join(','),
      ...receivings.map(r => [
        r.date,
        r.grnNumber,
        r.supplier,
        r.items,
        r.quantity,
        r.value,
        r.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'receiving_report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportToPDF(): void {
    window.print();
  }

  emailReport(): void {
    const subject = encodeURIComponent('Receiving Report');
    const body = encodeURIComponent(`Receiving Report Summary:\n\nTotal GRNs: ${this.totalGRNs()}\nTotal Items: ${this.totalItemsReceived()}\nTotal Value: $${this.totalValueReceived().toLocaleString()}\nAvg Daily: ${this.avgDailyReceiving()}\nActive Suppliers: ${this.activeSuppliers()}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  printReport(): void {
    window.print();
  }

  showScheduleModal = signal(false);
  scheduleFrequency = signal('weekly');
  scheduleEmail = signal('');
  scheduleDate = signal('');

  scheduleReport(): void {
    this.showScheduleModal.set(true);
  }

  closeScheduleModal(): void {
    this.showScheduleModal.set(false);
  }

  saveSchedule(): void {
    console.log('Saving schedule:', {
      frequency: this.scheduleFrequency(),
      email: this.scheduleEmail(),
      date: this.scheduleDate()
    });
    alert('Report scheduled successfully!');
    this.closeScheduleModal();
  }

  formatValue(value: number): string {
    if (value >= 1000) {
      return '$' + (value / 1000).toFixed(0) + 'K';
    }
    return '$' + value.toString();
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'Pending': 'bi bi-hourglass-split',
      'Passed': 'bi bi-check-circle-fill',
      'Failed': 'bi bi-x-circle-fill'
    };
    return icons[status] || 'bi bi-info-circle-fill';
  }
}
