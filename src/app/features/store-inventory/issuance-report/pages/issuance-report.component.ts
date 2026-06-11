import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IssuanceReportService, IssuanceReportItem } from '../services/issuance-report.service';

interface Issuance {
  date: string;
  sivNumber: string;
  requester: string;
  department: string;
  item: string;
  quantity: number;
  value: number;
}

@Component({
  selector: 'app-issuance-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './issuance-report.component.html',
  styleUrls: ['./issuance-report.component.scss']
})
export class IssuanceReportComponent implements OnInit {
  private readonly reportService = inject(IssuanceReportService);

  dateRange = { start: '2024-12-01', end: '2024-12-15' };
  warehouseFilter = signal('All Warehouses');
  departmentFilter = signal('All Departments');
  categoryFilter = signal('All Categories');
  requesterFilter = signal('All Requesters');
  format = signal('PDF');

  warehouses = ['All Warehouses', 'Warehouse A', 'Warehouse B', 'Warehouse C'];
  departments = ['All Departments', 'IT', 'HR', 'Operations', 'Finance', 'Marketing', 'Sales'];
  categories = ['All Categories', 'Electronics', 'Furniture', 'Office Supplies', 'IT Equipment'];
  requesters = ['All Requesters', 'John Doe', 'Sarah Smith', 'Mike Wilson', 'Lisa Wong', 'Peter Chen'];
  formats = ['PDF', 'Excel', 'CSV'];

  issuances = signal<Issuance[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  totalSIVs = computed(() => this.issuances().length);
  totalItemsIssued = computed(() => this.issuances().reduce((s, i) => s + i.quantity, 0));
  totalValueIssued = computed(() => this.issuances().reduce((sum, item) => sum + item.value, 0));
  avgPerDay = computed(() => {
    const items = this.issuances();
    if (items.length === 0) return '0 units/day';
    const start = new Date(this.dateRange.start);
    const end = new Date(this.dateRange.end);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    return Math.round(items.reduce((s, i) => s + i.quantity, 0) / days) + ' units/day';
  });
  activeUsers = computed(() => new Set(this.issuances().map(i => i.requester)).size);

  issuanceByDepartment = computed(() => {
    const groups = new Map<string, { name: string; percentage: number; units: number; value: number }>();
    for (const i of this.issuances()) {
      const g = groups.get(i.department) || { name: i.department, percentage: 0, units: 0, value: 0 };
      g.units += i.quantity;
      g.value += i.value;
      groups.set(i.department, g);
    }
    const entries = Array.from(groups.values()).sort((a, b) => b.value - a.value);
    const total = entries.reduce((s, e) => s + e.value, 0) || 1;
    return entries.map(e => ({ ...e, percentage: Math.round((e.value / total) * 100) }));
  });

  topRequestedItems = computed(() => {
    const groups = new Map<string, { name: string; requests: number; value: number; percentage: number }>();
    for (const i of this.issuances()) {
      const g = groups.get(i.item) || { name: i.item, requests: 0, value: 0, percentage: 0 };
      g.requests += i.quantity;
      g.value += i.value;
      groups.set(i.item, g);
    }
    const entries = Array.from(groups.values()).sort((a, b) => b.requests - a.requests).slice(0, 5);
    const max = entries[0]?.requests || 1;
    return entries.map(e => ({ ...e, percentage: Math.round((e.requests / max) * 100) }));
  });

  topRequesters = computed(() => {
    const groups = new Map<string, { name: string; requests: number; value: number; percentage: number }>();
    for (const i of this.issuances()) {
      const g = groups.get(i.requester) || { name: i.requester, requests: 0, value: 0, percentage: 0 };
      g.requests += i.quantity;
      g.value += i.value;
      groups.set(i.requester, g);
    }
    const entries = Array.from(groups.values()).sort((a, b) => b.requests - a.requests).slice(0, 5);
    const max = entries[0]?.requests || 1;
    return entries.map(e => ({ ...e, percentage: Math.round((e.requests / max) * 100) }));
  });

  filteredIssuances = signal<Issuance[]>([]);

  ngOnInit(): void {
    this.loadIssuanceReport();
  }

  loadIssuanceReport(): void {
    this.loading.set(true);
    this.error.set(null);

    this.reportService.getIssuanceReport({
      dateFrom: this.dateRange.start,
      dateTo: this.dateRange.end,
      pageSize: 100
    }).subscribe({
      next: (res) => {
        if (res.success !== false && Array.isArray(res.data)) {
          this.issuances.set(res.data);
        } else {
          this.error.set(res.message || 'Failed to load issuance report');
        }
        this.loading.set(false);
        this.filterIssuances();
      },
      error: (err) => {
        console.error('Error loading issuance report:', err);
        this.error.set('Failed to load issuance report. Please try again.');
        this.loading.set(false);
      }
    });
  }

  filterIssuances(): void {
    const department = this.departmentFilter();
    const requester = this.requesterFilter();

    this.filteredIssuances.set(
      this.issuances().filter(issuance => {
        const matchesDepartment = department === 'All Departments' || issuance.department === department;
        const matchesRequester = requester === 'All Requesters' || issuance.requester === requester;
        return matchesDepartment && matchesRequester;
      })
    );
  }

  onDepartmentChange(value: string): void {
    this.departmentFilter.set(value);
    this.filterIssuances();
  }

  onRequesterChange(value: string): void {
    this.requesterFilter.set(value);
    this.filterIssuances();
  }

  isLoading = signal(false);
  reportGenerated = signal(false);
  lastRunTime = signal<Date | null>(null);

  generateReport(): void {
    this.isLoading.set(true);
    this.reportGenerated.set(false);
    this.loadIssuanceReport();
    this.lastRunTime.set(new Date());
  }

  exportToExcel(): void {
    const issuances = this.filteredIssuances();
    const headers = ['Date', 'SIV Number', 'Requester', 'Department', 'Item', 'Quantity', 'Value'];
    const csvContent = [
      headers.join(','),
      ...issuances.map(i => [
        i.date,
        i.sivNumber,
        i.requester,
        i.department,
        i.item,
        i.quantity,
        i.value
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'issuance_report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportToPDF(): void {
    window.print();
  }

  emailReport(): void {
    const subject = encodeURIComponent('Issuance Report');
    const body = encodeURIComponent(`Issuance Report Summary:\n\nTotal SIVs: ${this.totalSIVs()}\nTotal Items: ${this.totalItemsIssued()}\nTotal Value: $${this.totalValueIssued().toLocaleString()}\nAvg Per Day: ${this.avgPerDay()}\nActive Users: ${this.activeUsers()}`);
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
}

