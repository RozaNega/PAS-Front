import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface RequestReport {
  id: string;
  reportName: string;
  generatedBy: string;
  generatedDate: string;
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  totalValue: number;
}

@Component({
  selector: 'app-request-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './request-reports.component.html',
  styleUrls: ['./request-reports.component.scss']
})
export class RequestReportsComponent {
  protected readonly reports = signal<RequestReport[]>([
    {
      id: '1',
      reportName: 'Monthly Request Report - Jan 2024',
      generatedBy: 'System',
      generatedDate: '2024-01-31',
      totalRequests: 50,
      pendingRequests: 5,
      approvedRequests: 40,
      totalValue: 125000
    }
  ]);
}
