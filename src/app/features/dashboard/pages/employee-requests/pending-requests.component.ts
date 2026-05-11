import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Request {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  submittedDate: string;
}

@Component({
  selector: 'app-pending-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pending-requests.component.html',
  styleUrls: ['./pending-requests.component.scss']
})
export class PendingRequestsComponent {
  protected readonly loading = signal(false);
  protected readonly requests = signal<Request[]>([
    {
      id: 'REQ-001',
      title: 'Office Chair Request',
      description: 'Ergonomic office chair for workstation setup',
      priority: 'Medium',
      status: 'Pending',
      submittedDate: '2024-01-15'
    },
    {
      id: 'REQ-002',
      title: 'Laptop Request',
      description: 'Dell Latitude 5420 for development work',
      priority: 'High',
      status: 'Pending',
      submittedDate: '2024-01-18'
    }
  ]);
}
