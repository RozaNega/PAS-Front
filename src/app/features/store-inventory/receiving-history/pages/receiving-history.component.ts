import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface GRN {
  grnNumber: string;
  date: string;
  supplier: string;
  items: number;
  quantity: number;
  value: number;
  status: string;
}

@Component({
  selector: 'app-receiving-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './receiving-history.component.html',
  styleUrls: ['./receiving-history.component.scss']
})
export class ReceivingHistoryComponent {
  searchTerm = signal('');
  dateRange = { start: '2024-12-01', end: '2024-12-15' };
  supplierFilter = signal('All Suppliers');
  statusFilter = signal('All Status');
  categoryFilter = signal('All Categories');

  suppliers = ['All Suppliers', 'Tech Supplies Ltd', 'Office Depot', 'Global Suppliers', 'Paper Co'];
  statuses = ['All Status', 'Pending', 'Passed', 'Failed'];
  categories = ['All Categories', 'Electronics', 'Office Supplies', 'Stationery'];

  grns = signal<GRN[]>([
    { grnNumber: 'GRN-045', date: 'Dec 15', supplier: 'Tech Supplies', items: 3, quantity: 125, value: 30740, status: 'Pending' },
    { grnNumber: 'GRN-044', date: 'Dec 14', supplier: 'Office Depot', items: 2, quantity: 50, value: 12500, status: 'Passed' },
    { grnNumber: 'GRN-043', date: 'Dec 14', supplier: 'Global Suppliers', items: 1, quantity: 100, value: 500, status: 'Failed' },
    { grnNumber: 'GRN-042', date: 'Dec 13', supplier: 'Paper Co', items: 2, quantity: 200, value: 5000, status: 'Passed' },
    { grnNumber: 'GRN-041', date: 'Dec 12', supplier: 'Tech Supplies', items: 3, quantity: 75, value: 18750, status: 'Passed' },
    { grnNumber: 'GRN-040', date: 'Dec 10', supplier: 'Office Depot', items: 1, quantity: 30, value: 7500, status: 'Passed' }
  ]);

  showGRNDetailsModal = signal(false);
  selectedGRN = signal<GRN | null>(null);

  // Computed summary statistics
  totalGRNs = computed(() => 45);
  totalItemsReceived = computed(() => 2345);
  totalValueReceived = computed(() => 156890);
  avgValuePerGRN = computed(() => 3486);
  avgProcessingTime = computed(() => '1.5 days');

  // Bar heights for the chart - calculated once to avoid ExpressionChangedAfterItHasBeenCheckedError
  barHeights = signal<number[]>([]);

  filteredGRNs = signal<GRN[]>([]);

  constructor() {
    // Calculate bar heights once to avoid ExpressionChangedAfterItHasBeenCheckedError
    const heights: number[] = [];
    for (let i = 0; i < 8; i++) {
      heights.push(this.getRandomHeight(100, 60));
    }
    this.barHeights.set(heights);
    this.filterGRNs();
  }

  filterGRNs(): void {
    const search = this.searchTerm().toLowerCase();
    const supplier = this.supplierFilter();
    const status = this.statusFilter();
    const category = this.categoryFilter();

    this.filteredGRNs.set(
      this.grns().filter(grn => {
        const matchesSearch = grn.grnNumber.toLowerCase().includes(search) ||
                              grn.supplier.toLowerCase().includes(search);
        const matchesSupplier = supplier === 'All Suppliers' || grn.supplier.includes(supplier);
        const matchesStatus = status === 'All Status' || grn.status === status;
        return matchesSearch && matchesSupplier && matchesStatus;
      })
    );
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.filterGRNs();
  }

  onSupplierChange(value: string): void {
    this.supplierFilter.set(value);
    this.filterGRNs();
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(value);
    this.filterGRNs();
  }

  onCategoryChange(value: string): void {
    this.categoryFilter.set(value);
    this.filterGRNs();
  }

  openGRNDetailsModal(grn: GRN): void {
    this.selectedGRN.set(grn);
    this.showGRNDetailsModal.set(true);
  }

  closeGRNDetailsModal(): void {
    this.showGRNDetailsModal.set(false);
    this.selectedGRN.set(null);
  }

  viewGRN(grn: GRN): void {
    console.log('View GRN:', grn.grnNumber);
  }

  printGRN(grn: GRN): void {
    console.log('Print GRN:', grn.grnNumber);
  }

  downloadGRN(grn: GRN): void {
    console.log('Download GRN:', grn.grnNumber);
  }

  exportList(): void {
    console.log('Export list');
  }

  applyFilters(): void {
    console.log('Apply filters');
  }

  resetFilters(): void {
    console.log('Reset filters');
  }

  formatValue(value: number): string {
    if (value >= 1000) {
      return '$' + (value / 1000).toFixed(0) + 'K';
    }
    return '$' + value.toString();
  }

  getStatusColor(status: string): string {
    switch(status) {
      case 'Pending': return '🟡';
      case 'Passed': return '🟢';
      case 'Failed': return '🔴';
      default: return '⚪';
    }
  }

  getRandomHeight(base: number, variance: number): number {
    return base + Math.random() * variance;
  }
}
