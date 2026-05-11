import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Decision {
  id: string;
  requestNumber: string;
  requesterName: string;
  department: string;
  decision: 'Approved' | 'Rejected';
  itemCount: number;
  estimatedValue: number;
  decisionDate: string;
  responseTime: string;
  reason?: string;
}

@Component({
  selector: 'app-my-decisions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-decisions.component.html',
  styleUrls: ['./my-decisions.component.scss']
})
export class MyDecisionsComponent {
  protected readonly decisions = signal<Decision[]>([
    {
      id: '1',
      requestNumber: 'SR-2024-118',
      requesterName: 'John Doe',
      department: 'IT',
      decision: 'Approved',
      itemCount: 2,
      estimatedValue: 450,
      decisionDate: '2024-01-20',
      responseTime: '2.5 hours'
    },
    {
      id: '2',
      requestNumber: 'SR-2024-117',
      requesterName: 'Peter Chen',
      department: 'Operations',
      decision: 'Rejected',
      itemCount: 1,
      estimatedValue: 2499,
      decisionDate: '2024-01-19',
      responseTime: '1.2 hours',
      reason: 'Budget exceeded for this quarter'
    }
  ]);
}
