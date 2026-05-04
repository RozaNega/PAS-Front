import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PendingAtMyLevel {
  srNumber: string;
  requester: string;
  priority: string;
  value: string;
  waiting: string;
}

export interface CompletedAtMyLevel {
  srNumber: string;
  decision: string;
  value: string;
  responseTime: string;
}

export interface WorkflowRule {
  rule: string;
}

@Component({
  selector: 'app-approval-workflow-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './approval-workflow-page.component.html',
  styleUrl: './approval-workflow-page.component.scss',
})
export class ApprovalWorkflowPageComponent {
  pendingAtMyLevel: PendingAtMyLevel[] = [
    { srNumber: 'SR-2024-123', requester: 'John Doe', priority: 'Urgent', value: '$5,348', waiting: '2 hours' },
    { srNumber: 'SR-2024-122', requester: 'Peter Chen', priority: 'Urgent', value: '$2,800', waiting: '1 day' },
    { srNumber: 'SR-2024-121', requester: 'Lisa Wong', priority: 'Medium', value: '$900', waiting: '2 days' },
    { srNumber: 'SR-2024-120', requester: 'Mike Johnson', priority: 'Medium', value: '$250', waiting: '3 days' },
    { srNumber: 'SR-2024-119', requester: 'Anna Lee', priority: 'Normal', value: '$250', waiting: '4 days' },
  ];

  completedAtMyLevel: CompletedAtMyLevel[] = [
    { srNumber: 'SR-2024-118', decision: 'Approved', value: '$450', responseTime: '2.5 hours' },
    { srNumber: 'SR-2024-117', decision: 'Rejected', value: '$2,499', responseTime: '1.2 hours' },
    { srNumber: 'SR-2024-116', decision: 'Approved', value: '$1,200', responseTime: '3 hours' },
  ];

  workflowRules: WorkflowRule[] = [
    { rule: 'Under $1,000: Auto-approve after 48 hours' },
    { rule: '$1,000-$10,000: Manager approval required' },
    { rule: 'Over $10,000: Director approval required' },
    { rule: 'Urgent requests: Response within 4 hours' },
    { rule: 'Escalation after: 5 days no response' },
  ];

  approveRequest(srNumber: string): void {
    console.log('Approving request:', srNumber);
    alert(`Request ${srNumber} has been approved.`);
  }

  rejectRequest(srNumber: string): void {
    if (confirm(`Are you sure you want to reject request ${srNumber}?`)) {
      console.log('Rejecting request:', srNumber);
      alert(`Request ${srNumber} has been rejected.`);
    }
  }

  viewRequestDetails(srNumber: string): void {
    console.log('Viewing details for request:', srNumber);
    alert(`Opening detailed view for request ${srNumber}`);
  }

  editWorkflowRules(): void {
    console.log('Editing workflow rules');
    alert('Opening workflow rules editor');
  }
}
