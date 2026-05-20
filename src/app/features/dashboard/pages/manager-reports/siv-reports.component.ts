import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface SIVReport {
  id: string;
  reportName: string;
  generatedBy: string;
  generatedDate: string;
  totalSIVs: number;
  totalItemsIssued: number;
  totalValue: number;
}

@Component({
  selector: 'app-siv-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './siv-reports.component.html',
  styleUrls: ['./siv-reports.component.scss']
})
export class SIVReportsComponent {
  protected readonly reports = signal<SIVReport[]>([
    {
      id: '1',
      reportName: 'Monthly SIV Report - Jan 2024',
      generatedBy: 'System',
      generatedDate: '2024-01-31',
      totalSIVs: 35,
      totalItemsIssued: 120,
      totalValue: 87500
    }
  ]);
}
