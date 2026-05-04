import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
export class IssuanceReportComponent {
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

  issuances = signal<Issuance[]>([
    { date: 'Dec 15', sivNumber: 'SIV-045', requester: 'John Doe', department: 'IT', item: 'Dell Laptop', quantity: 2, value: 4998 },
    { date: 'Dec 15', sivNumber: 'SIV-044', requester: 'Sarah Smith', department: 'HR', item: 'Office Chair', quantity: 3, value: 1350 },
    { date: 'Dec 14', sivNumber: 'SIV-043', requester: 'Mike Wilson', department: 'Operations', item: 'USB Cables', quantity: 50, value: 250 },
    { date: 'Dec 14', sivNumber: 'SIV-042', requester: 'Lisa Wong', department: 'Finance', item: 'Monitor', quantity: 2, value: 700 },
    { date: 'Dec 13', sivNumber: 'SIV-041', requester: 'Peter Chen', department: 'Marketing', item: 'A4 Paper', quantity: 10, value: 250 }
  ]);

  // Computed summary statistics
  totalSIVs = computed(() => 156);
  totalItemsIssued = computed(() => 987);
  totalValueIssued = computed(() => 123450);
  avgPerDay = computed(() => '66 units/day');
  activeUsers = computed(() => 45);

  // Issuance by department
  issuanceByDepartment = computed(() => [
    { name: 'IT Department', percentage: 35, units: 345, value: 45000 },
    { name: 'HR Department', percentage: 20, units: 198, value: 23000 },
    { name: 'Operations', percentage: 18, units: 178, value: 18500 },
    { name: 'Finance', percentage: 12, units: 120, value: 15000 },
    { name: 'Marketing', percentage: 8, units: 78, value: 10500 },
    { name: 'Sales', percentage: 7, units: 68, value: 11450 }
  ]);

  // Top requested items
  topRequestedItems = computed(() => [
    { name: 'Dell XPS Laptop', requests: 45, value: 112455, percentage: 100 },
    { name: 'USB Cables', requests: 32, value: 160, percentage: 71 },
    { name: 'Office Chair', requests: 28, value: 12600, percentage: 62 },
    { name: 'HP Monitor', requests: 23, value: 8050, percentage: 51 },
    { name: 'A4 Paper', requests: 18, value: 450, percentage: 40 }
  ]);

  // Top requesters
  topRequesters = computed(() => [
    { name: 'John Doe (IT)', requests: 23, value: 45000, percentage: 100 },
    { name: 'Sarah Smith (HR)', requests: 18, value: 23000, percentage: 78 },
    { name: 'Mike Wilson (Ops)', requests: 15, value: 18500, percentage: 65 },
    { name: 'Lisa Wong (Finance)', requests: 12, value: 15000, percentage: 52 },
    { name: 'Peter Chen (Marketing)', requests: 10, value: 10500, percentage: 43 }
  ]);

  filteredIssuances = signal<Issuance[]>([]);

  constructor() {
    this.filterIssuances();
  }

  filterIssuances(): void {
    const department = this.departmentFilter();
    const requester = this.requesterFilter();
    const category = this.categoryFilter();

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

    setTimeout(() => {
      this.filterIssuances();
      this.reportGenerated.set(true);
      this.lastRunTime.set(new Date());
      this.isLoading.set(false);
      console.log('Issuance report generated successfully');
    }, 1500);
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

  getRandomHeight(base: number, variance: number): number {
    return base + Math.random() * variance;
  }
}
