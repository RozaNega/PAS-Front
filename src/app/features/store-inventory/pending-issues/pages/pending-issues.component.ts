import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface IssueItem {
  name: string;
  requested: number;
  available: number;
  location: string;
  status: string;
}

interface PendingIssue {
  id: string;
  srNumber: string;
  requester: string;
  department: string;
  requestedDate: string;
  waitingTime: string;
  priority: 'Urgent' | 'Medium' | 'Normal';
  requiredBy: string;
  items: IssueItem[];
}

@Component({
  selector: 'app-pending-issues',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pending-issues.component.html',
  styleUrls: ['./pending-issues.component.scss']
})
export class PendingIssuesComponent {
  searchTerm = signal('');
  dateRange = { start: '2024-12-01', end: '2024-12-15' };
  priorityFilter = signal('All');
  departmentFilter = signal('All Departments');

  priorities = ['All', 'Urgent', 'Medium', 'Normal'];
  departments = ['All Departments', 'IT', 'HR', 'Finance', 'Operations', 'Marketing'];

  pendingIssues = signal<PendingIssue[]>([
    {
      id: '1',
      srNumber: 'SR-2024-123',
      requester: 'John Doe',
      department: 'IT Department',
      requestedDate: 'Dec 15, 2024',
      waitingTime: '2 hours',
      priority: 'Urgent',
      requiredBy: 'Dec 18',
      items: [
        { name: 'Dell XPS Laptop', requested: 2, available: 45, location: 'WH A - A-01-S-03', status: '✅ In Stock' },
        { name: 'HP Monitor', requested: 1, available: 67, location: 'WH A - A-01-S-05', status: '✅ In Stock' }
      ]
    },
    {
      id: '2',
      srNumber: 'SR-2024-119',
      requester: 'Peter Chen',
      department: 'Finance Department',
      requestedDate: 'Dec 13, 2024',
      waitingTime: '2 days',
      priority: 'Urgent',
      requiredBy: 'Dec 19',
      items: [
        { name: 'Printer', requested: 1, available: 12, location: 'WH B - B-01-S-02', status: '✅ In Stock' },
        { name: 'Toner Cartridge', requested: 5, available: 8, location: 'WH A - A-02-S-01', status: '✅ In Stock' }
      ]
    },
    {
      id: '3',
      srNumber: 'SR-2024-118',
      requester: 'Sarah Smith',
      department: 'HR Department',
      requestedDate: 'Dec 12, 2024',
      waitingTime: '3 days',
      priority: 'Medium',
      requiredBy: 'Dec 25',
      items: [
        { name: 'Office Chair', requested: 2, available: 23, location: 'WH B - B-02-S-01', status: '✅ In Stock' },
        { name: 'Desk', requested: 1, available: 15, location: 'WH B - B-02-S-03', status: '✅ In Stock' }
      ]
    },
    {
      id: '4',
      srNumber: 'SR-2024-117',
      requester: 'Mike Wilson',
      department: 'Operations Department',
      requestedDate: 'Dec 11, 2024',
      waitingTime: '4 days',
      priority: 'Normal',
      requiredBy: 'Dec 28',
      items: [
        { name: 'USB Cables', requested: 50, available: 55, location: 'WH A - A-03-S-02', status: '✅ In Stock' },
        { name: 'A4 Paper', requested: 10, available: 120, location: 'WH B - B-01-S-04', status: '✅ In Stock' }
      ]
    }
  ]);

  showProcessModal = signal(false);
  selectedIssue = signal<PendingIssue | null>(null);
  currentStep = signal(1);

  // Computed summary statistics
  pendingCount = computed(() => this.pendingIssues().length);
  urgentCount = computed(() => this.pendingIssues().filter(i => i.priority === 'Urgent').length);
  readyToIssue = computed(() => this.pendingIssues().length);
  awaitingStock = computed(() => 1);
  avgWaitTime = computed(() => '1.5 days');

  urgentIssues = computed(() => this.pendingIssues().filter(i => i.priority === 'Urgent'));
  mediumIssues = computed(() => this.pendingIssues().filter(i => i.priority === 'Medium'));
  normalIssues = computed(() => this.pendingIssues().filter(i => i.priority === 'Normal'));

  filteredIssues = signal<PendingIssue[]>([]);

  constructor() {
    this.filterIssues();
  }

  filterIssues(): void {
    const search = this.searchTerm().toLowerCase();
    const priority = this.priorityFilter();
    const department = this.departmentFilter();

    this.filteredIssues.set(
      this.pendingIssues().filter(issue => {
        const matchesSearch = issue.srNumber.toLowerCase().includes(search) ||
                              issue.requester.toLowerCase().includes(search) ||
                              issue.department.toLowerCase().includes(search);
        const matchesPriority = priority === 'All' || issue.priority === priority;
        const matchesDepartment = department === 'All Departments' || issue.department.includes(department);
        return matchesSearch && matchesPriority && matchesDepartment;
      })
    );
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.filterIssues();
  }

  onPriorityChange(value: string): void {
    this.priorityFilter.set(value);
    this.filterIssues();
  }

  onDepartmentChange(value: string): void {
    this.departmentFilter.set(value);
    this.filterIssues();
  }

  openProcessModal(issue: PendingIssue): void {
    this.selectedIssue.set(issue);
    this.currentStep.set(1);
    this.showProcessModal.set(true);
  }

  closeProcessModal(): void {
    this.showProcessModal.set(false);
    this.selectedIssue.set(null);
  }

  nextStep(): void {
    if (this.currentStep() < 3) {
      this.currentStep.set(this.currentStep() + 1);
    }
  }

  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.set(this.currentStep() - 1);
    }
  }

  processIssue(): void {
    console.log('Processing issue:', this.selectedIssue()?.srNumber);
    this.closeProcessModal();
  }

  viewDetails(issue: PendingIssue): void {
    console.log('View details:', issue.srNumber);
  }

  addNote(issue: PendingIssue): void {
    console.log('Add note:', issue.srNumber);
  }

  snooze(issue: PendingIssue): void {
    console.log('Snooze:', issue.srNumber);
  }

  bulkProcess(): void {
    console.log('Bulk process selected issues');
  }

  printPickingList(): void {
    console.log('Print picking list');
  }

  exportList(): void {
    console.log('Export list');
  }

  getPriorityColor(priority: string): string {
    switch(priority) {
      case 'Urgent': return '🔴';
      case 'Medium': return '🟡';
      case 'Normal': return '🟢';
      default: return '⚪';
    }
  }

  getStepTitle(): string {
    switch(this.currentStep()) {
      case 1: return 'Review Requisition';
      case 2: return 'Select Items & Quantities';
      case 3: return 'SIV Details & Signature';
      default: return '';
    }
  }
}
