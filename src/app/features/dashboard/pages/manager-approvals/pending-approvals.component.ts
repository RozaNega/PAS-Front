import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ServiceRequest {
  id: string;
  requestNumber: string;
  requesterName: string;
  requesterId: string;
  department: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: string;
  requestedDate: string;
  requiredDate: string;
  itemCount: number;
  estimatedValue: number;
  description: string;
}

@Component({
  selector: 'app-pending-approvals',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pending-approvals.component.html',
  styleUrls: ['./pending-approvals.component.scss']
})
export class PendingApprovalsComponent {
  protected readonly pendingRequests = signal<ServiceRequest[]>([
    {
      id: '1',
      requestNumber: 'SR-2024-001',
      requesterName: 'John Doe',
      requesterId: 'EMP-001',
      department: 'IT',
      priority: 'Urgent',
      status: 'Pending',
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
      requesterId: 'EMP-002',
      department: 'Operations',
      priority: 'High',
      status: 'Pending',
      requestedDate: '2024-01-16',
      requiredDate: '2024-01-20',
      itemCount: 1,
      estimatedValue: 2800,
      description: 'Office chair replacement'
    }
  ]);

  protected approve(id: string): void {
    alert(`Approving request ${id}`);
  }

  protected reject(id: string): void {
    alert(`Rejecting request ${id}`);
  }

  protected viewDetails(id: string): void {
    alert(`Viewing details for request ${id}`);
  }
}
