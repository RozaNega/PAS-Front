import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Request {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  rejectedDate: string;
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
  protected readonly requests = signal<Request[]>([
    {
      id: 'REQ-004',
      title: 'Printer Request',
      description: 'Color laser printer for office',
      priority: 'Low',
      status: 'Rejected',
      rejectedDate: '2024-01-19',
      rejectionReason: 'Budget constraints for this quarter'
    }
  ]);
}
