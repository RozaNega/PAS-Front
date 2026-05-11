import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Decision {
  id: string;
  requestNumber: string;
  approver: string;
  department: string;
  approvedDate: string;
  value: number;
}

@Component({
  selector: 'app-approval-decisions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './approval-decisions.component.html',
  styleUrls: ['./approval-decisions.component.scss']
})
export class ApprovalDecisionsComponent {
  protected readonly decisions = signal<Decision[]>([
    { id: '1', requestNumber: 'SR-2024-001', approver: 'Manager A', department: 'IT', approvedDate: '2024-01-20', value: 5348 }
  ]);
}
