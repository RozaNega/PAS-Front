import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface AuditReport {
  id: string;
  reportName: string;
  generatedDate: string;
  totalAudits: number;
  completedAudits: number;
  findings: number;
}

@Component({
  selector: 'app-audit-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audit-reports.component.html',
  styleUrls: ['./audit-reports.component.scss']
})
export class AuditReportsComponent {
  protected readonly reports = signal<AuditReport[]>([
    { id: '1', reportName: 'Monthly Audit Summary - Jan 2024', generatedDate: '2024-01-31', totalAudits: 25, completedAudits: 22, findings: 8 }
  ]);
}
