import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface InspectionItem {
  name: string;
  sku: string;
  quantity: number;
  priority: string;
  age: string;
  supplier: string;
  grnNumber: string;
}

@Component({
  selector: 'app-inspection-queue',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inspection-queue.component.html',
  styleUrls: ['./inspection-queue.component.scss']
})
export class InspectionQueueComponent {
  searchTerm = signal('');
  priorityFilter = signal('All');
  inspectorFilter = signal('All');
  ageFilter = signal('All');

  priorities = ['All', 'Urgent', 'High', 'Medium', 'Low'];
  inspectors = ['All', 'Sarah Smith', 'John Doe', 'Mike Wilson'];
  ages = ['All', 'Today', 'This Week', 'This Month'];

  inspectionItems = signal<InspectionItem[]>([
    {
      name: 'Dell XPS Laptop',
      sku: 'LAP-001',
      quantity: 10,
      priority: 'Urgent',
      age: '2 hours',
      supplier: 'Tech Supplies Ltd',
      grnNumber: 'GRN-2024-045'
    },
    {
      name: 'HP 27" Monitor',
      sku: 'MON-002',
      quantity: 15,
      priority: 'High',
      age: '2 hours',
      supplier: 'Tech Supplies Ltd',
      grnNumber: 'GRN-2024-045'
    }
  ]);

  showInspectionModal = signal(false);
  selectedItem = signal<InspectionItem | null>(null);

  // Computed summary statistics
  totalPending = computed(() => this.inspectionItems().length);
  todayQueue = computed(() => 2);
  weekQueue = computed(() => 8);
  urgentItems = computed(() => this.inspectionItems().filter(i => i.priority === 'Urgent').length);
  avgWaitTime = computed(() => '1.5 days');

  filteredItems = signal<InspectionItem[]>([]);

  constructor() {
    this.filterItems();
  }

  filterItems(): void {
    const search = this.searchTerm().toLowerCase();
    const priority = this.priorityFilter();
    const inspector = this.inspectorFilter();
    const age = this.ageFilter();

    this.filteredItems.set(
      this.inspectionItems().filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(search) ||
                              item.sku.toLowerCase().includes(search) ||
                              item.supplier.toLowerCase().includes(search) ||
                              item.grnNumber.toLowerCase().includes(search);
        const matchesPriority = priority === 'All' || item.priority === priority;
        return matchesSearch && matchesPriority;
      })
    );
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.filterItems();
  }

  onPriorityChange(value: string): void {
    this.priorityFilter.set(value);
    this.filterItems();
  }

  onInspectorChange(value: string): void {
    this.inspectorFilter.set(value);
    this.filterItems();
  }

  onAgeChange(value: string): void {
    this.ageFilter.set(value);
    this.filterItems();
  }

  startInspection(item: InspectionItem): void {
    this.selectedItem.set(item);
    this.showInspectionModal.set(true);
  }

  closeInspectionModal(): void {
    this.showInspectionModal.set(false);
    this.selectedItem.set(null);
  }

  viewGRN(item: InspectionItem): void {
    console.log('View GRN:', item.grnNumber);
  }

  remindLater(item: InspectionItem): void {
    console.log('Remind later:', item.sku);
  }

  submitInspection(): void {
    console.log('Submit inspection');
    this.closeInspectionModal();
  }

  saveDraft(): void {
    console.log('Save draft');
  }

  cancelInspection(): void {
    this.closeInspectionModal();
  }

  getPriorityColor(priority: string): string {
    switch(priority) {
      case 'Urgent': return '🔴';
      case 'High': return '🟠';
      case 'Medium': return '🟡';
      case 'Low': return '🟢';
      default: return '⚪';
    }
  }
}
