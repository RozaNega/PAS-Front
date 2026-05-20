import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ApprovalReport {
  id: string;
  reportName: string;
  generatedBy: string;
  generatedDate: string;
  totalApprovals: number;
  totalRejections: number;
  avgResponseTime: string;
}

@Component({
  selector: 'app-approval-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './approval-reports.component.html',
  styleUrls: ['./approval-reports.component.scss']
})
export class ApprovalReportsComponent {
  protected readonly reports = signal<ApprovalReport[]>([
    {
      id: '1',
      reportName: 'Monthly Approval Report - Jan 2024',
      generatedBy: 'System',
      generatedDate: '2024-01-31',
      totalApprovals: 45,
      totalRejections: 5,
      avgResponseTime: '2.3 hours'
    }
  ]);
}
