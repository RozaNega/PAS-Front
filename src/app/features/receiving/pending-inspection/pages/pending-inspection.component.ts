import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface PendingInspection {
  id: string;
  grnNumber: string;
  supplier: string;
  receivedDate: string;
  itemsToInspect: number;
  priority: 'High' | 'Medium' | 'Low';
  items: InspectionItem[];
}

interface InspectionItem {
  name: string;
  received: number;
  batchNumber: string;
  status: 'Pending' | 'In Progress' | 'Completed';
}

@Component({
  selector: 'app-pending-inspection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pending-inspection.component.html',
  styleUrls: ['./pending-inspection.component.scss']
})
export class PendingInspectionComponent {
  searchTerm = signal('');
  sortBy = signal('Oldest');

  pendingInspections = signal<PendingInspection[]>([
    {
      id: '1',
      grnNumber: 'GRN-2024-045',
      supplier: 'Tech Supplies Ltd',
      receivedDate: 'Dec 15, 2024 (2 hours ago)',
      itemsToInspect: 2,
      priority: 'High',
      items: [
        { name: 'Dell XPS Laptop', received: 10, batchNumber: 'BCH-001', status: 'Pending' },
        { name: 'HP Monitor', received: 15, batchNumber: 'BCH-001', status: 'Pending' }
      ]
    },
    {
      id: '2',
      grnNumber: 'GRN-2024-041',
      supplier: 'Tech Supplies Ltd',
      receivedDate: 'Dec 12, 2024 (3 days ago)',
      itemsToInspect: 1,
      priority: 'Medium',
      items: [
        { name: 'USB Cables', received: 100, batchNumber: 'BCH-002', status: 'Pending' }
      ]
    }
  ]);

  showModal = signal(false);
  selectedInspection = signal<PendingInspection | null>(null);

  inspectionFormData = signal({
    inspectorName: 'Sarah Smith',
    inspectionDate: '2024-12-15',
    results: [] as any[],
    disposition: 'Return to Supplier',
    comments: ''
  });

  refreshData(): void {
    console.log('Refreshing pending inspections...');
  }

  openInspectionModal(inspection: PendingInspection): void {
    this.selectedInspection.set(inspection);
    this.inspectionFormData.set({
      inspectorName: 'Sarah Smith',
      inspectionDate: new Date().toISOString().split('T')[0],
      results: inspection.items.map(item => ({
        ...item,
        checklist: {
          packagingIntact: true,
          physicalCondition: true,
          serialNumbersMatch: true,
          accessoriesIncluded: true,
          powerOnTest: true
        },
        overallResult: 'Pass',
        comments: ''
      })),
      disposition: 'Return to Supplier',
      comments: ''
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedInspection.set(null);
  }

  submitInspection(): void {
    console.log('Submitting inspection for:', this.selectedInspection()?.grnNumber);
    this.closeModal();
  }

  getPriorityColor(priority: string): string {
    const colors: { [key: string]: string } = {
      High: 'red',
      Medium: 'yellow',
      Low: 'green'
    };
    return colors[priority] || 'gray';
  }

  getPriorityIcon(priority: string): string {
    const icons: { [key: string]: string } = {
      High: '🔴',
      Medium: '🟡',
      Low: '🟢'
    };
    return icons[priority] || '⚪';
  }
}
