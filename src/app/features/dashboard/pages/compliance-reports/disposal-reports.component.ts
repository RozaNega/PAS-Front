import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface DisposalReport {
  id: string;
  reportName: string;
  generatedDate: string;
  totalDisposals: number;
  totalValue: number;
  approvedDisposals: number;
}

@Component({
  selector: 'app-disposal-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './disposal-reports.component.html',
  styleUrls: ['./disposal-reports.component.scss']
})
export class DisposalReportsComponent {
  protected readonly reports = signal<DisposalReport[]>([
    { id: '1', reportName: 'Monthly Disposal Report - Jan 2024', generatedDate: '2024-01-31', totalDisposals: 8, totalValue: 45000, approvedDisposals: 6 }
  ]);
}
