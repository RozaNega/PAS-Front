import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ApprovalLog {
  timestamp: string;
  approver: string;
  srNumber: string;
  decision: string;
  value: string;
  responseTime: string;
  justification: string;
}

export interface DecisionHistory {
  date: string;
  srNumber: string;
  decision: string;
  reason: string;
  comments: string;
}

@Component({
  selector: 'app-audit-reference-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audit-reference-page.component.html',
  styleUrl: './audit-reference-page.component.scss',
})
export class AuditReferencePageComponent {
  dateFrom = 'Dec 01, 2024';
  dateTo = 'Dec 15, 2024';
  approverFilter = 'All';
  statusFilter = 'All';

  approvalLogs: ApprovalLog[] = [
    {
      timestamp: 'Dec 15, 10:30:25',
      approver: 'Sarah Smith',
      srNumber: 'SR-2024-123',
      decision: '✅',
      value: '$5,348',
      responseTime: '2 hours',
      justification: 'Approved',
    },
    {
      timestamp: 'Dec 14, 15:45:12',
      approver: 'Sarah Smith',
      srNumber: 'SR-2024-122',
      decision: '✅',
      value: '$2,800',
      responseTime: '1 day',
      justification: 'Approved',
    },
    {
      timestamp: 'Dec 14, 09:30:02',
      approver: 'Sarah Smith',
      srNumber: 'SR-2024-121',
      decision: '⏳',
      value: '$900',
      responseTime: '-',
      justification: 'Pending',
    },
    {
      timestamp: 'Dec 13, 14:15:33',
      approver: 'Sarah Smith',
      srNumber: 'SR-2024-117',
      decision: '❌',
      value: '$2,499',
      responseTime: '1.2 hrs',
      justification: 'Budget',
    },
    {
      timestamp: 'Dec 12, 11:00:00',
      approver: 'Sarah Smith',
      srNumber: 'SR-2024-116',
      decision: '✅',
      value: '$1,200',
      responseTime: '3 hrs',
      justification: 'Approved',
    },
  ];

  decisionHistory: DecisionHistory[] = [
    {
      date: 'Dec 14',
      srNumber: 'SR-2024-118',
      decision: '✅',
      reason: 'Within budget',
      comments: 'Approved for new equipment',
    },
    {
      date: 'Dec 13',
      srNumber: 'SR-2024-117',
      decision: '❌',
      reason: 'Budget constraints',
      comments: 'Please resubmit next quarter',
    },
    {
      date: 'Dec 12',
      srNumber: 'SR-2024-116',
      decision: '✅',
      reason: 'Urgent need',
      comments: 'Critical for operations',
    },
  ];

  export(): void {
    console.log('Exporting audit reference');
    alert('Audit reference exported successfully!');
  }

  exportExcel(): void {
    console.log('Exporting to Excel');
    alert('Exported to Excel successfully!');
  }

  exportPDF(): void {
    console.log('Exporting to PDF');
    alert('Exported to PDF successfully!');
  }

  emailReport(): void {
    console.log('Emailing report');
    alert('Report emailed successfully!');
  }

  print(): void {
    console.log('Printing');
    window.print();
  }

  scheduleExport(): void {
    console.log('Scheduling export');
    alert('Export scheduled successfully!');
  }
}
