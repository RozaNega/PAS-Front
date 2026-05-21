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

  // Computed summary statistics
  totalGRNs = computed(() => this.receivings().length);
  totalItemsReceived = computed(() => 2345);
  totalValueReceived = computed(() => this.receivings().reduce((sum, item) => sum + item.value, 0));
  avgDailyReceiving = computed(() => '156 units/day');
  activeSuppliers = computed(() => 12);

  // Receiving by supplier
  receivingBySupplier = computed(() => [
    { name: 'Tech Supplies Ltd', percentage: 40, value: 62800, grns: 12 },
    { name: 'Office Depot', percentage: 22, value: 34500, grns: 8 },
    { name: 'Global Suppliers', percentage: 18, value: 28200, grns: 7 },
    { name: 'Paper Co', percentage: 12, value: 18900, grns: 6 },
    { name: 'Tech Solutions', percentage: 8, value: 12490, grns: 4 }
  ]);

  // Quality inspection summary
  qualitySummary = computed(() => [
    { label: 'Pass Rate', percentage: 85, count: 38, color: '#10b981' },
    { label: 'Fail Rate', percentage: 8, count: 4, color: '#ef4444' },
    { label: 'Partial Rate', percentage: 7, count: 3, color: '#f59e0b' }
  ]);

  // Top quality issues
  topQualityIssues = computed(() => [
    { issue: 'Missing accessories', percentage: 45 },
    { issue: 'Physical damage', percentage: 30 },
    { issue: 'Wrong quantity', percentage: 15 },
    { issue: 'Expired products', percentage: 10 }
  ]);

  // Supplier performance ratings
  supplierPerformance = computed<SupplierPerformance[]>(() => [
    { name: 'Tech Supplies Ltd', onTime: '92%', quality: '88%', price: '★★★★☆', delivery: '3 days', overall: '4.2 ★', trend: '▲ Improving' },
    { name: 'Office Depot', onTime: '95%', quality: '94%', price: '★★★★☆', delivery: '2 days', overall: '4.5 ★', trend: '● Stable' },
    { name: 'Global Suppliers', onTime: '85%', quality: '78%', price: '★★★☆☆', delivery: '5 days', overall: '3.5 ★', trend: '▼ Declining' },
    { name: 'Paper Co', onTime: '98%', quality: '96%', price: '★★★★☆', delivery: '2 days', overall: '4.7 ★', trend: '▲ Improving' }
  ]);

  // Bar heights for the chart - calculated once to avoid ExpressionChangedAfterItHasBeenCheckedError
  barHeights = signal<number[]>([]);

  filteredReceivings = signal<Receiving[]>([]);

  ngOnInit(): void {
    const heights: number[] = [];
    for (let i = 0; i < 8; i++) {
      heights.push(this.getRandomHeight(100, 60));
    }
    this.barHeights.set(heights);
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
    const category = this.categoryFilter();
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

    setTimeout(() => {
      this.filterReceivings();
      this.reportGenerated.set(true);
      this.lastRunTime.set(new Date());
      this.isLoading.set(false);
      console.log('Receiving report generated successfully');
    }, 1500);
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

  getRandomHeight(base: number, variance: number): number {
    return base + Math.random() * variance;
  }

  getTrendClass(trend: string): string {
    if (trend.includes('Improving')) return 'improving';
    if (trend.includes('Stable')) return 'stable';
    if (trend.includes('Declining')) return 'declining';
    return '';
  }
}
