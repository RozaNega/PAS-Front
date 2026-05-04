import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface PendingApproval {
  srNumber: string;
  requester: string;
  priority: 'Urgent' | 'Medium' | 'Normal';
  requestedDate: string;
  requiredDate: string;
  items: number;
  value: string;
  waiting: string;
}

export interface ApprovalHistory {
  srNumber: string;
  decision: 'Approved' | 'Rejected';
  value: string;
  responseTime: string;
}

export interface WorkflowRule {
  rule: string;
}

@Component({
  selector: 'app-approval-queue-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './approval-queue-page.component.html',
  styleUrl: './approval-queue-page.component.scss',
})
export class ApprovalQueuePageComponent {
  dateFrom = 'Dec 01, 2024';
  dateTo = 'Dec 15, 2024';
  priorityFilter = 'All';
  valueFilter = 'All';

  pendingApprovals: PendingApproval[] = [
    {
      srNumber: 'SR-2024-123',
      requester: 'John Doe',
      priority: 'Urgent',
      requestedDate: 'Dec 15, 2024',
      requiredDate: 'Dec 18',
      items: 3,
      value: '$5,348',
      waiting: '2 hours',
    },
    {
      srNumber: 'SR-2024-122',
      requester: 'Peter Chen',
      priority: 'Urgent',
      requestedDate: 'Dec 14, 2024',
      requiredDate: 'Dec 17',
      items: 1,
      value: '$2,800',
      waiting: '1 day',
    },
    {
      srNumber: 'SR-2024-121',
      requester: 'Lisa Wong',
      priority: 'Medium',
      requestedDate: 'Dec 13, 2024',
      requiredDate: 'Dec 20',
      items: 2,
      value: '$900',
      waiting: '2 days',
    },
    {
      srNumber: 'SR-2024-120',
      requester: 'Mike Johnson',
      priority: 'Medium',
      requestedDate: 'Dec 12, 2024',
      requiredDate: 'Dec 21',
      items: 1,
      value: '$250',
      waiting: '3 days',
    },
    {
      srNumber: 'SR-2024-119',
      requester: 'Anna Lee',
      priority: 'Normal',
      requestedDate: 'Dec 11, 2024',
      requiredDate: 'Dec 22',
      items: 1,
      value: '$250',
      waiting: '4 days',
    },
  ];

  approvalHistory: ApprovalHistory[] = [
    { srNumber: 'SR-2024-118', decision: 'Approved', value: '$450', responseTime: '2.5 hours' },
    { srNumber: 'SR-2024-117', decision: 'Rejected', value: '$2,499', responseTime: '1.2 hours' },
    { srNumber: 'SR-2024-116', decision: 'Approved', value: '$1,200', responseTime: '3 hours' },
    { srNumber: 'SR-2024-115', decision: 'Approved', value: '$350', responseTime: '0.5 hours' },
  ];

  workflowRules: WorkflowRule[] = [
    { rule: 'Requests under $1,000: Auto-approve after 48 hours if no action' },
    { rule: 'Requests $1,000 - $10,000: Manager approval required' },
    { rule: 'Requests over $10,000: Requires Director approval' },
    { rule: 'Urgent requests: Response required within 4 hours' },
    { rule: 'Escalation after: 5 days of no response' },
  ];

  refresh(): void {
    console.log('Refreshing queue');
    alert('Queue refreshed successfully!');
  }

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

  applyFilters(): void {
    console.log('Applying filters');
    alert('Filters applied');
  }

  viewFullHistory(): void {
    console.log('Viewing full approval history');
    alert('Navigating to full approval history page');
  }

  editWorkflowRules(): void {
    console.log('Editing workflow rules');
    alert('Opening workflow rules editor');
  }

  getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'Urgent':
        return '🔴';
      case 'Medium':
        return '🟡';
      case 'Normal':
        return '🟢';
      default:
        return '⚪';
    }
  }

  getDecisionIcon(decision: string): string {
    return decision === 'Approved' ? '✅' : '❌';
  }
}
