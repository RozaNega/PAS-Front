import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface RejectedRequisition {
  id: string;
  srNumber: string;
  date: string;
  requester: string;
  department: string;
  reason: string;
}

@Component({
  selector: 'app-rejected',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rejected.component.html',
  styleUrls: ['./rejected.component.scss']
})
export class RejectedComponent {
  searchTerm = signal('');
  dateFilter = signal('Last 30 days');

  rejectedReqs = signal<RejectedRequisition[]>([
    { id: '1', srNumber: 'SR-2024-121', date: 'Dec 14', requester: 'Mike John', department: 'Ops', reason: 'Budget' },
    { id: '2', srNumber: 'SR-2024-114', date: 'Dec 09', requester: 'Jane Doe', department: 'IT', reason: 'Stock unavailable' },
    { id: '3', srNumber: 'SR-2024-109', date: 'Dec 04', requester: 'Bob Brown', department: 'HR', reason: 'Justification' },
    { id: '4', srNumber: 'SR-2024-105', date: 'Dec 01', requester: 'Alice Lee', department: 'Fin', reason: 'Budget' }
  ]);

  summary = signal({
    totalRejected: 23,
    thisMonth: 8,
    rejectionRate: 9.8,
    byDepartment: [
      { name: 'IT', count: 5 },
      { name: 'HR', count: 3 },
      { name: 'Finance', count: 2 },
      { name: 'Operations', count: 13 }
    ],
    topReasons: [
      { name: 'Budget', percentage: 45 },
      { name: 'Justification', percentage: 30 },
      { name: 'Stock unavailable', percentage: 25 }
    ]
  });

  exportData(): void {
    console.log('Exporting rejected requisitions...');
  }

  resubmit(req: RejectedRequisition): void {
    console.log('Resubmitting:', req.srNumber);
  }
}
