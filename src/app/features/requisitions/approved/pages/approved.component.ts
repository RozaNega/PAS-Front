import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ApprovedRequisition {
  id: string;
  srNumber: string;
  date: string;
  requester: string;
  items: number;
  status: 'Pending Issue' | 'Issued';
  sivNumber?: string;
}

@Component({
  selector: 'app-approved',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './approved.component.html',
  styleUrls: ['./approved.component.scss']
})
export class ApprovedComponent {
  searchTerm = signal('');
  dateFilter = signal('Last 30 days');

  approvedReqs = signal<ApprovedRequisition[]>([
    { id: '1', srNumber: 'SR-2024-122', date: 'Dec 14', requester: 'Sarah Smith', items: 2, status: 'Pending Issue' },
    { id: '2', srNumber: 'SR-2024-115', date: 'Dec 10', requester: 'John Doe', items: 3, status: 'Issued', sivNumber: 'SIV-2024-044' },
    { id: '3', srNumber: 'SR-2024-110', date: 'Dec 05', requester: 'Lisa Wong', items: 1, status: 'Issued', sivNumber: 'SIV-2024-043' },
    { id: '4', srNumber: 'SR-2024-108', date: 'Dec 03', requester: 'Mike John', items: 5, status: 'Pending Issue' }
  ]);

  summary = signal({
    totalApproved: 156,
    thisMonth: 45,
    value: 45678,
    pendingIssue: 23,
    issued: 133,
    avgProcessing: 2.3
  });

  exportData(): void {
    console.log('Exporting approved requisitions...');
  }

  getStatusColor(status: string): string {
    return status === 'Pending Issue' ? 'yellow' : 'green';
  }

  getStatusIcon(status: string): string {
    return status === 'Pending Issue' ? '🟡' : '✅';
  }
}
