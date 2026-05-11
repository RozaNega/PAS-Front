import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface InspectionLog {
  id: string;
  date: string;
  grnNumber: string;
  item: string;
  inspector: string;
  result: 'Pass' | 'Fail' | 'Partial';
}

@Component({
  selector: 'app-inspection-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inspection-logs.component.html',
  styleUrls: ['./inspection-logs.component.scss']
})
export class InspectionLogsComponent {
  searchTerm = signal('');
  dateRange = { start: '2024-12-01', end: '2024-12-15' };
  resultFilter = signal('All');
  inspectorFilter = signal('All Inspectors');

  results = ['All', 'Pass', 'Fail', 'Partial'];
  inspectors = ['All Inspectors', 'Sarah Smith', 'John Doe', 'Mike Wilson', 'Lisa Wong'];

  inspectionLogs = signal<InspectionLog[]>([
    { id: '1', date: 'Dec 15', grnNumber: 'GRN-2024-045', item: 'Dell Laptop', inspector: 'Sarah S', result: 'Pass' },
    { id: '2', date: 'Dec 15', grnNumber: 'GRN-2024-045', item: 'HP Monitor', inspector: 'Sarah S', result: 'Partial' },
    { id: '3', date: 'Dec 14', grnNumber: 'GRN-2024-044', item: 'Office Chair', inspector: 'John D', result: 'Pass' },
    { id: '4', date: 'Dec 14', grnNumber: 'GRN-2024-043', item: 'Paper', inspector: 'Mike W', result: 'Fail' },
    { id: '5', date: 'Dec 13', grnNumber: 'GRN-2024-042', item: 'Toner', inspector: 'Sarah S', result: 'Pass' }
  ]);

  summary = signal({
    totalInspections: 156,
    passRate: 85,
    failRate: 8,
    partialRate: 7,
    avgTime: 12
  });

  // Bar heights for the chart - calculated once to avoid ExpressionChangedAfterItHasBeenCheckedError
  barHeightsPass = signal<number[]>([]);
  barHeightsFail = signal<number[]>([]);
  barHeightsPartial = signal<number[]>([]);

  showModal = signal(false);
  selectedLog = signal<InspectionLog | null>(null);

  filteredLogs = signal<InspectionLog[]>([]);

  constructor() {
    // Calculate bar heights once to avoid ExpressionChangedAfterItHasBeenCheckedError
    const passHeights: number[] = [];
    const failHeights: number[] = [];
    const partialHeights: number[] = [];
    for (let i = 0; i < 8; i++) {
      passHeights.push(this.getRandomHeight(70, 20));
      failHeights.push(this.getRandomHeight(15, 10));
      partialHeights.push(this.getRandomHeight(15, 10));
    }
    this.barHeightsPass.set(passHeights);
    this.barHeightsFail.set(failHeights);
    this.barHeightsPartial.set(partialHeights);
    this.filterLogs();
  }

  filterLogs(): void {
    const search = this.searchTerm().toLowerCase();
    const result = this.resultFilter();
    const inspector = this.inspectorFilter();

    this.filteredLogs.set(
      this.inspectionLogs().filter(log => {
        const matchesSearch = log.grnNumber.toLowerCase().includes(search) || 
                              log.item.toLowerCase().includes(search);
        const matchesResult = result === 'All' || log.result === result;
        const matchesInspector = inspector === 'All Inspectors' || log.inspector === inspector;
        return matchesSearch && matchesResult && matchesInspector;
      })
    );
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.filterLogs();
  }

  onResultFilterChange(value: string): void {
    this.resultFilter.set(value);
    this.filterLogs();
  }

  exportData(): void {
    console.log('Exporting inspection logs...');
  }

  openDetailsModal(log: InspectionLog): void {
    this.selectedLog.set(log);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedLog.set(null);
  }

  printReport(): void {
    console.log('Printing inspection report for:', this.selectedLog()?.grnNumber);
  }

  getResultColor(result: string): string {
    const colors: { [key: string]: string } = {
      Pass: 'green',
      Fail: 'red',
      Partial: 'yellow'
    };
    return colors[result] || 'gray';
  }

  getResultIcon(result: string): string {
    const icons: { [key: string]: string } = {
      Pass: '🟢',
      Fail: '🔴',
      Partial: '🟡'
    };
    return icons[result] || '⚪';
  }

  getRandomHeight(base: number, variance: number): number {
    return base + Math.random() * variance;
  }
}
