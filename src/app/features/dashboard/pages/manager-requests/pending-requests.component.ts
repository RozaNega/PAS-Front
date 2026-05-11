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
  requiredDate: string;
  itemCount: number;
  estimatedValue: number;
  description: string;
}

@Component({
  selector: 'app-pending-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pending-requests.component.html',
  styleUrls: ['./pending-requests.component.scss']
})
export class PendingRequestsComponent {
  protected readonly requests = signal<ServiceRequest[]>([
    {
      id: '1',
      requestNumber: 'SR-2024-001',
      requesterName: 'John Doe',
      department: 'IT',
      status: 'Pending',
      priority: 'Urgent',
      requestedDate: '2024-01-15',
      requiredDate: '2024-01-18',
      itemCount: 3,
      estimatedValue: 5348,
      description: 'Laptop and accessories for new developer'
    },
    {
      id: '2',
      requestNumber: 'SR-2024-002',
      requesterName: 'Peter Chen',
      department: 'Operations',
      status: 'Pending',
      priority: 'High',
      requestedDate: '2024-01-16',
      requiredDate: '2024-01-20',
      itemCount: 1,
      estimatedValue: 2800,
      description: 'Office chair replacement'
    }
  ]);
}
