import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Request {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  completedDate: string;
  sivNumber: string;
}

@Component({
  selector: 'app-completed-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './completed-requests.component.html',
  styleUrls: ['./completed-requests.component.scss']
})
export class CompletedRequestsComponent {
  protected readonly requests = signal<Request[]>([
    {
      id: 'REQ-005',
      title: 'Desk Setup',
      description: 'Adjustable height desk with accessories',
      priority: 'Medium',
      status: 'Completed',
      completedDate: '2024-01-22',
      sivNumber: 'SIV-2024-001'
    },
    {
      id: 'REQ-006',
      title: 'Headset Request',
      description: 'Noise-cancelling headset for calls',
      priority: 'Low',
      status: 'Completed',
      completedDate: '2024-01-21',
      sivNumber: 'SIV-2024-002'
    }
  ]);
}
