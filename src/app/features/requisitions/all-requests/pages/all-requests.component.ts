import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Requisition {
  id: string;
  srNumber: string;
  date: string;
  requester: string;
  department: string;
  items: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
}

interface RequestItem {
  id: string;
  name: string;
  qtyRequested: number;
  available: number;
}

@Component({
  selector: 'app-all-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './all-requests.component.html',
  styleUrls: ['./all-requests.component.scss']
})
export class AllRequestsComponent {
  searchTerm = signal('');
  dateRange = { start: '2024-12-01', end: '2024-12-15' };
  statusFilter = signal('All');
  departmentFilter = signal('All Depts');
  priorityFilter = signal('All');

  statuses = ['All', 'Pending', 'Approved', 'Rejected', 'Completed'];
  departments = ['All Depts', 'IT', 'HR', 'Finance', 'Operations', 'Marketing'];
  priorities = ['All', 'Normal', 'Medium', 'Urgent', 'Critical'];

  requisitions = signal<Requisition[]>([
    { id: '1', srNumber: 'SR-2024-123', date: 'Dec 15', requester: 'John Doe', department: 'IT', items: 3, status: 'Pending' },
    { id: '2', srNumber: 'SR-2024-122', date: 'Dec 14', requester: 'Sarah Smith', department: 'HR', items: 2, status: 'Approved' },
    { id: '3', srNumber: 'SR-2024-121', date: 'Dec 14', requester: 'Mike John', department: 'Operations', items: 5, status: 'Rejected' },
    { id: '4', srNumber: 'SR-2024-120', date: 'Dec 13', requester: 'Lisa Wong', department: 'Finance', items: 1, status: 'Completed' },
    { id: '5', srNumber: 'SR-2024-119', date: 'Dec 13', requester: 'Peter Chen', department: 'IT', items: 4, status: 'Pending' }
  ]);

  summary = signal({
    total: 234,
    pending: 8,
    approved: 156,
    rejected: 23,
    completed: 47
  });

  showModal = signal(false);
  modalStep = signal(1);

  modalFormData = signal({
    srNumber: 'SR-2024-124',
    requester: 'John Doe',
    department: 'IT Department',
    justification: '',
    requiredBy: '2024-12-20',
    priority: 'Urgent',
    items: [] as RequestItem[]
  });

  filteredRequisitions = signal<Requisition[]>([]);

  constructor() {
    this.filterRequisitions();
  }

  filterRequisitions(): void {
    const search = this.searchTerm().toLowerCase();
    const status = this.statusFilter();
    const dept = this.departmentFilter();

    this.filteredRequisitions.set(
      this.requisitions().filter(req => {
        const matchesSearch = req.srNumber.toLowerCase().includes(search) || 
                              req.requester.toLowerCase().includes(search);
        const matchesStatus = status === 'All' || req.status === status;
        const matchesDept = dept === 'All Depts' || req.department === dept;
        return matchesSearch && matchesStatus && matchesDept;
      })
    );
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.filterRequisitions();
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.filterRequisitions();
  }

  openCreateModal(): void {
    this.modalStep.set(1);
    this.modalFormData.set({
      srNumber: 'SR-2024-' + (this.requisitions().length + 124),
      requester: 'John Doe',
      department: 'IT Department',
      justification: '',
      requiredBy: '2024-12-20',
      priority: 'Urgent',
      items: []
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.modalStep.set(1);
  }

  nextStep(): void {
    if (this.modalStep() < 3) {
      this.modalStep.set(this.modalStep() + 1);
    }
  }

  prevStep(): void {
    if (this.modalStep() > 1) {
      this.modalStep.set(this.modalStep() - 1);
    }
  }

  submitRequisition(): void {
    const data = this.modalFormData();
    const newReq: Requisition = {
      id: Date.now().toString(),
      srNumber: data.srNumber,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      requester: data.requester,
      department: data.department.split(' ')[0],
      items: data.items.length,
      status: 'Pending'
    };
    this.requisitions.update(reqs => [newReq, ...reqs]);
    this.filterRequisitions();
    this.closeModal();
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      Pending: 'yellow',
      Approved: 'green',
      Rejected: 'red',
      Completed: 'blue'
    };
    return colors[status] || 'gray';
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      Pending: '🟡',
      Approved: '🟢',
      Rejected: '🔴',
      Completed: '✅'
    };
    return icons[status] || '⚪';
  }
}
