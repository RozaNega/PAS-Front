import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface InspectionReport {
  id: string;
  reportName: string;
  generatedDate: string;
  totalInspections: number;
  passedInspections: number;
  failedInspections: number;
}

@Component({
  selector: 'app-inspection-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inspection-reports.component.html',
  styleUrls: ['./inspection-reports.component.scss']
})
export class InspectionReportsComponent {
  protected readonly reports = signal<InspectionReport[]>([
    { id: '1', reportName: 'Monthly Inspection Report - Jan 2024', generatedDate: '2024-01-31', totalInspections: 15, passedInspections: 12, failedInspections: 3 }
  ]);
}
