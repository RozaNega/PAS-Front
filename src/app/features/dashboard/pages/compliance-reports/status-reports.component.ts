import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface StatusReport {
  id: string;
  reportName: string;
  generatedDate: string;
  complianceScore: number;
  totalItems: number;
  compliantItems: number;
  nonCompliantItems: number;
}

@Component({
  selector: 'app-status-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-reports.component.html',
  styleUrls: ['./status-reports.component.scss']
})
export class StatusReportsComponent {
  protected readonly reports = signal<StatusReport[]>([
    { id: '1', reportName: 'Compliance Status - Jan 2024', generatedDate: '2024-01-31', complianceScore: 92, totalItems: 100, compliantItems: 92, nonCompliantItems: 8 }
  ]);
}
