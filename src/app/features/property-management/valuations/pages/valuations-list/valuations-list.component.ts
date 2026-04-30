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

  applyFilters(): void {
    console.log('Applying filters:', {
      dateRange: this.dateRange,
      category: this.categoryFilter,
      location: this.locationFilter
    });
  }

  runReport(): void {
    alert('Running valuation report...');
  }

  exportToExcel(): void {
    alert('Exporting to Excel...');
  }

  exportToPDF(): void {
    alert('Exporting to PDF...');
  }

  emailReport(): void {
    alert('Emailing report...');
  }

  scheduleReport(): void {
    alert('Opening report scheduler...');
  }
}
