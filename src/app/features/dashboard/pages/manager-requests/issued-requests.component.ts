import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ServiceRequest {
  id: string;
  requestNumber: string;
  sivNumber: string;
  requesterName: string;
  department: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Issued';
  requestedDate: string;
  issuedDate: string;
  itemCount: number;
  estimatedValue: number;
  description: string;
  issuedBy: string;
}

@Component({
  selector: 'app-issued-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './issued-requests.component.html',
  styleUrls: ['./issued-requests.component.scss']
})
export class IssuedRequestsComponent {
  protected readonly requests = signal<ServiceRequest[]>([
    {
      id: '1',
      requestNumber: 'SR-2024-005',
      sivNumber: 'SIV-2024-001',
      requesterName: 'Anna Lee',
      department: 'IT',
      status: 'Issued',
      requestedDate: '2024-01-08',
      issuedDate: '2024-01-12',
      itemCount: 3,
      estimatedValue: 5348,
      description: 'Laptop and accessories',
      issuedBy: 'Storekeeper'
    }
  ]);
}
