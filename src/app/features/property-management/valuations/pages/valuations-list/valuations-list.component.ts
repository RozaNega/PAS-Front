import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ValuationAsset {
  id: string;
  name: string;
  cost: number;
  depreciationRate: number;
  accumulatedDepreciation: number;
  bookValue: number;
}

@Component({
  selector: 'app-valuations-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './valuations-list.component.html',
  styleUrls: ['./valuations-list.component.scss']
})
export class ValuationsListComponent {
  dateRange = { start: '2024-01-01', end: '2024-12-31' };
  categoryFilter = 'All';
  locationFilter = 'All';

  totalAssets = signal(1234);
  currentValue = signal(2543890);
  ytdDepreciation = signal(189234);
  projectedYearEnd = signal(2354656);

  valuationAssets = signal<ValuationAsset[]>([
    { id: '1', name: 'Dell XPS', cost: 2499, depreciationRate: 20, accumulatedDepreciation: 1000, bookValue: 1499 },
    { id: '2', name: 'HP Printer', cost: 899, depreciationRate: 20, accumulatedDepreciation: 360, bookValue: 539 },
    { id: '3', name: 'Office Chair', cost: 450, depreciationRate: 10, accumulatedDepreciation: 90, bookValue: 360 },
    { id: '4', name: 'Ford Transit', cost: 35000, depreciationRate: 15, accumulatedDepreciation: 10500, bookValue: 24500 }
  ]);

  categories = ['All', 'Electronics', 'Furniture', 'Vehicles', 'Machinery'];
  locations = ['All', 'Headquarters', 'Warehouse', 'Branch 1', 'Branch 2', 'Storage'];

  showScheduleModal = signal(false);
  scheduleFrequency = signal('weekly');
  scheduleEmail = signal('');
  scheduleDate = signal('');

  applyFilters(): void {
    console.log('Applying filters:', {
      dateRange: this.dateRange,
      category: this.categoryFilter,
      location: this.locationFilter
    });
  }

  isLoading = signal(false);
  reportGenerated = signal(false);
  lastRunTime = signal<Date | null>(null);

  runReport(): void {
    this.isLoading.set(true);
    this.reportGenerated.set(false);

    // Simulate API call with timeout
    setTimeout(() => {
      this.applyFilters();
      this.calculateTotals();
      this.reportGenerated.set(true);
      this.lastRunTime.set(new Date());
      this.isLoading.set(false);
      console.log('Valuation report generated successfully');
    }, 1500);
  }

  calculateTotals(): void {
    const assets = this.valuationAssets();
    const totalCost = assets.reduce((sum, a) => sum + a.cost, 0);
    const totalBookValue = assets.reduce((sum, a) => sum + a.bookValue, 0);
    const totalDepreciation = assets.reduce((sum, a) => sum + a.accumulatedDepreciation, 0);

    this.totalAssets.set(assets.length);
    this.currentValue.set(totalBookValue);
    this.ytdDepreciation.set(totalDepreciation);
    this.projectedYearEnd.set(totalBookValue * 0.93); // Assuming 7% more depreciation
  }

  exportToExcel(): void {
    const assets = this.valuationAssets();
    const headers = ['Name', 'Cost', 'Depreciation Rate', 'Accumulated Depreciation', 'Book Value'];
    const csvContent = [
      headers.join(','),
      ...assets.map(a => [
        a.name,
        a.cost,
        a.depreciationRate,
        a.accumulatedDepreciation,
        a.bookValue
      ].join(','))
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
  }

  exportToPDF(): void {
    window.print();
  }

  emailReport(): void {
    const subject = encodeURIComponent('Valuation Report');
    const body = encodeURIComponent(`Valuation Report Summary:\n\nTotal Assets: ${this.totalAssets()}\nCurrent Value: $${this.currentValue().toLocaleString()}\nYTD Depreciation: $${this.ytdDepreciation().toLocaleString()}\nProjected Year End: $${this.projectedYearEnd().toLocaleString()}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

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
}
