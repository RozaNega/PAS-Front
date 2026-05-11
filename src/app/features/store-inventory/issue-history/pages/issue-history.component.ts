import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface SIV {
  sivNumber: string;
  date: string;
  srNumber: string;
  requester: string;
  department: string;
  items: number;
  value: number;
}

interface TopRequestedItem {
  name: string;
  requests: number;
  value: number;
  percentage: number;
}

@Component({
  selector: 'app-issue-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './issue-history.component.html',
  styleUrls: ['./issue-history.component.scss']
})
export class IssueHistoryComponent {
  searchTerm = signal('');
  dateRange = { start: '2024-12-01', end: '2024-12-15' };

  sivs = signal<SIV[]>([
    { sivNumber: 'SIV-045', date: 'Dec 15', srNumber: 'SR-123', requester: 'John Doe', department: 'IT', items: 3, value: 4998 },
    { sivNumber: 'SIV-044', date: 'Dec 14', srNumber: 'SR-122', requester: 'Sarah Smith', department: 'HR', items: 2, value: 900 },
    { sivNumber: 'SIV-043', date: 'Dec 14', srNumber: 'SR-119', requester: 'Peter Chen', department: 'Fin', items: 2, value: 1500 },
    { sivNumber: 'SIV-042', date: 'Dec 13', srNumber: 'SR-118', requester: 'Mike Wilson', department: 'Ops', items: 2, value: 250 },
    { sivNumber: 'SIV-041', date: 'Dec 12', srNumber: 'SR-117', requester: 'Lisa Wong', department: 'Mkt', items: 3, value: 450 },
    { sivNumber: 'SIV-040', date: 'Dec 11', srNumber: 'SR-116', requester: 'John Doe', department: 'IT', items: 1, value: 2499 }
  ]);

  showSIVDetailsModal = signal(false);
  selectedSIV = signal<SIV | null>(null);

  // Computed summary statistics
  totalSIVs = computed(() => 156);
  totalItemsIssued = computed(() => 987);
  totalValueIssued = computed(() => 123450);
  avgItemsPerSIV = computed(() => 6.3);
  mostActiveRequester = computed(() => 'John Doe');

  topRequestedItems = computed<TopRequestedItem[]>(() => [
    { name: 'Dell XPS Laptop', requests: 45, value: 112455, percentage: 100 },
    { name: 'USB Cables', requests: 32, value: 160, percentage: 71 },
    { name: 'Office Chair', requests: 28, value: 12600, percentage: 62 },
    { name: 'HP Monitor', requests: 23, value: 8050, percentage: 51 },
    { name: 'A4 Paper', requests: 18, value: 450, percentage: 40 }
  ]);

  // Bar heights for the chart - calculated once to avoid ExpressionChangedAfterItHasBeenCheckedError
  barHeights = signal<number[]>([]);

  filteredSIVs = signal<SIV[]>([]);

  constructor() {
    // Calculate bar heights once to avoid ExpressionChangedAfterItHasBeenCheckedError
    const heights: number[] = [];
    for (let i = 0; i < 8; i++) {
      heights.push(this.getRandomHeight(100, 60));
    }
    this.barHeights.set(heights);
    this.filterSIVs();
  }

  filterSIVs(): void {
    const search = this.searchTerm().toLowerCase();

    this.filteredSIVs.set(
      this.sivs().filter(siv => {
        const matchesSearch = siv.sivNumber.toLowerCase().includes(search) ||
                              siv.srNumber.toLowerCase().includes(search) ||
                              siv.requester.toLowerCase().includes(search) ||
                              siv.department.toLowerCase().includes(search);
        return matchesSearch;
      })
    );
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.filterSIVs();
  }

  openSIVDetailsModal(siv: SIV): void {
    this.selectedSIV.set(siv);
    this.showSIVDetailsModal.set(true);
  }

  closeSIVDetailsModal(): void {
    this.showSIVDetailsModal.set(false);
    this.selectedSIV.set(null);
  }

  printSIV(siv: SIV): void {
    console.log('Print SIV:', siv.sivNumber);
  }

  emailSIV(siv: SIV): void {
    console.log('Email SIV:', siv.sivNumber);
  }

  downloadSIV(siv: SIV): void {
    console.log('Download SIV:', siv.sivNumber);
  }

  formatValue(value: number): string {
    if (value >= 1000) {
      return '$' + (value / 1000).toFixed(0) + 'K';
    }
    return '$' + value.toString();
  }

  getRandomHeight(base: number, variance: number): number {
    return base + Math.random() * variance;
  }
}
