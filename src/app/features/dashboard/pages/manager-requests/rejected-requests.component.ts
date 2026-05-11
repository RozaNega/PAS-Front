import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ServiceRequest {
  id: string;
  requestNumber: string;
  requesterName: string;
  department: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Issued';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  requestedDate: string;
  rejectedDate: string;
  itemCount: number;
  estimatedValue: number;
  description: string;
  rejectedBy: string;
  rejectionReason: string;
}

@Component({
  selector: 'app-rejected-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rejected-requests.component.html',
  styleUrls: ['./rejected-requests.component.scss']
})
export class RejectedRequestsComponent {
  protected readonly requests = signal<ServiceRequest[]>([
    {
      id: '1',
      requestNumber: 'SR-2024-004',
      requesterName: 'Mike Johnson',
      department: 'Finance',
      status: 'Rejected',
      priority: 'Low',
      requestedDate: '2024-01-10',
      rejectedDate: '2024-01-12',
      itemCount: 5,
      estimatedValue: 1200,
      description: 'Stationery supplies',
      rejectedBy: 'Manager',
      rejectionReason: 'Budget exceeded for this quarter'
    }
  ]);
}
