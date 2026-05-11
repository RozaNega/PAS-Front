import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface RiskReport {
  id: string;
  reportName: string;
  riskLevel: string;
  generatedDate: string;
  highRiskItems: number;
  mediumRiskItems: number;
  lowRiskItems: number;
}

@Component({
  selector: 'app-risk-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './risk-reports.component.html',
  styleUrls: ['./risk-reports.component.scss']
})
export class RiskReportsComponent {
  protected readonly reports = signal<RiskReport[]>([
    { id: '1', reportName: 'Monthly Risk Assessment - Jan 2024', riskLevel: 'Medium', generatedDate: '2024-01-31', highRiskItems: 3, mediumRiskItems: 8, lowRiskItems: 15 }
  ]);
}
