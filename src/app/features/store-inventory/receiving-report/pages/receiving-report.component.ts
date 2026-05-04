import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
export class ReceivingReportComponent {
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

  receivings = signal<Receiving[]>([
    { date: 'Dec 15', grnNumber: 'GRN-045', supplier: 'Tech Supplies', items: 3, quantity: 125, value: 30740, status: 'Pending' },
    { date: 'Dec 14', grnNumber: 'GRN-044', supplier: 'Office Depot', items: 2, quantity: 50, value: 12500, status: 'Passed' },
    { date: 'Dec 14', grnNumber: 'GRN-043', supplier: 'Global Suppliers', items: 1, quantity: 100, value: 500, status: 'Failed' },
    { date: 'Dec 13', grnNumber: 'GRN-042', supplier: 'Paper Co', items: 2, quantity: 200, value: 5000, status: 'Passed' },
    { date: 'Dec 12', grnNumber: 'GRN-041', supplier: 'Tech Supplies', items: 3, quantity: 75, value: 18750, status: 'Passed' }
  ]);

  // Computed summary statistics
  totalGRNs = computed(() => 45);
  totalItemsReceived = computed(() => 2345);
  totalValueReceived = computed(() => 156890);
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

  filteredReceivings = signal<Receiving[]>([]);

  constructor() {
    this.filterReceivings();
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

  generateReport(): void {
    console.log('Generating receiving report...');
  }

  exportToExcel(): void {
    console.log('Exporting to Excel...');
  }

  exportToPDF(): void {
    console.log('Exporting to PDF...');
  }

  emailReport(): void {
    console.log('Emailing report...');
  }

  printReport(): void {
    console.log('Printing report...');
  }

  scheduleReport(): void {
    console.log('Opening schedule modal...');
  }

  formatValue(value: number): string {
    if (value >= 1000) {
      return '$' + (value / 1000).toFixed(0) + 'K';
    }
    return '$' + value.toString();
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'Pending': '🟡',
      'Passed': '🟢',
      'Failed': '🔴'
    };
    return icons[status] || '⚪';
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
