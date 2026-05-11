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
  approvedDate: string;
  itemCount: number;
  estimatedValue: number;
  description: string;
  approvedBy: string;
}

@Component({
  selector: 'app-approved-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './approved-requests.component.html',
  styleUrls: ['./approved-requests.component.scss']
})
export class ApprovedRequestsComponent {
  protected readonly requests = signal<ServiceRequest[]>([
    {
      id: '1',
      requestNumber: 'SR-2024-003',
      requesterName: 'Lisa Wong',
      department: 'HR',
      status: 'Approved',
      priority: 'Medium',
      requestedDate: '2024-01-12',
      approvedDate: '2024-01-15',
      itemCount: 2,
      estimatedValue: 900,
      description: 'Desk accessories',
      approvedBy: 'Manager'
    }
  ]);
}
