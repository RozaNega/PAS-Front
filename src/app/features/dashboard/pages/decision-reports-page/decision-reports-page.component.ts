import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ApprovalSummary {
  totalRequests: number;
  approved: number;
  rejected: number;
  approvalRate: string;
  totalValue: string;
}

export interface ResponseTimeReport {
  averageResponseTime: string;
  fastestResponse: string;
  slowestResponse: string;
}

export interface DepartmentAnalysis {
  department: string;
  requests: number;
  approved: number;
  rejected: number;
  value: string;
  avgResponse: string;
  approvalRate: string;
}

export interface ValueAnalysis {
  valueRange: string;
  requests: number;
  approved: number;
  rejected: number;
  totalValue: string;
  percentageOfTotal: string;
}

@Component({
  selector: 'app-decision-reports-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './decision-reports-page.component.html',
  styleUrl: './decision-reports-page.component.scss',
})
export class DecisionReportsPageComponent {
  dateFrom = 'Dec 01, 2024';
  dateTo = 'Dec 31, 2024';
  reportType = 'Approval Summary';
  format = 'PDF';
  includeDetails = 'Yes';

  approvalSummary: ApprovalSummary = {
    totalRequests: 28,
    approved: 24,
    rejected: 4,
    approvalRate: '85.7%',
    totalValue: '$18,750',
  };

  responseTimeReport: ResponseTimeReport = {
    averageResponseTime: '1.2 days',
    fastestResponse: '0.5 hours (SR-2024-115)',
    slowestResponse: '3.0 hours (SR-2024-116)',
  };

  departmentAnalysis: DepartmentAnalysis[] = [
    { department: 'IT', requests: 28, approved: 24, rejected: 4, value: '$18,750', avgResponse: '1.2 days', approvalRate: '85.7%' },
    { department: 'HR', requests: 15, approved: 13, rejected: 2, value: '$8,500', avgResponse: '1.5 days', approvalRate: '86.7%' },
    { department: 'Finance', requests: 12, approved: 10, rejected: 2, value: '$12,000', avgResponse: '1.8 days', approvalRate: '83.3%' },
    { department: 'Operations', requests: 20, approved: 17, rejected: 3, value: '$15,200', avgResponse: '1.4 days', approvalRate: '85.0%' },
  ];

  valueAnalysis: ValueAnalysis[] = [
    { valueRange: '< $500', requests: 12, approved: 11, rejected: 1, totalValue: '$3,850', percentageOfTotal: '15%' },
    { valueRange: '$500 - $1,000', requests: 8, approved: 7, rejected: 1, totalValue: '$5,600', percentageOfTotal: '22%' },
    { valueRange: '$1,000 - $5,000', requests: 6, approved: 5, rejected: 1, totalValue: '$8,500', percentageOfTotal: '33%' },
    { valueRange: '> $5,000', requests: 2, approved: 1, rejected: 1, totalValue: '$7,800', percentageOfTotal: '30%' },
  ];

  generate(): void {
    console.log('Generating report:', {
      dateFrom: this.dateFrom,
      dateTo: this.dateTo,
      reportType: this.reportType,
      format: this.format,
      includeDetails: this.includeDetails,
    });
    alert('Report generated successfully!');
  }

  exportExcel(): void {
    console.log('Exporting to Excel');
    alert('Report exported to Excel successfully!');
  }

  exportPDF(): void {
    console.log('Exporting to PDF');
    alert('Report exported to PDF successfully!');
  }

  emailReport(): void {
    console.log('Emailing report');
    alert('Report emailed successfully!');
  }

  printReport(): void {
    console.log('Printing report');
    window.print();
  }

  scheduleReport(): void {
    console.log('Scheduling report');
    alert('Report scheduled successfully!');
  }
}
