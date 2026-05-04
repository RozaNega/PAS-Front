import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

export interface SavedReport {
  name: string;
  date: string;
  type: string;
  size: string;
}

@Component({
  selector: 'app-compliance-reports-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './compliance-reports-page.component.html',
  styleUrl: './compliance-reports-page.component.scss',
})
export class ComplianceReportsPageComponent {
  constructor(private router: Router) {}

  dateRange = 'Dec 01, 2024 to Dec 31, 2024';
  reportType = 'Compliance Summary';
  format = 'PDF';
  includeDetails = 'Yes';
  confidential = 'Yes';
  emailTo = 'sarah.smith@afrocom.com';

  savedReports: SavedReport[] = [
    { name: 'Q4_Compliance_Report_2024', date: 'Dec 14', type: 'Full Compliance', size: '2.3MB' },
    { name: 'December_Risk_Assessment', date: 'Dec 10', type: 'Risk Summary', size: '1.1MB' },
    { name: 'December_Violation_Report', date: 'Dec 05', type: 'Violation', size: '3.2MB' },
  ];

  generateReport(): void {
    console.log('Generating report with parameters:', {
      dateRange: this.dateRange,
      reportType: this.reportType,
      format: this.format,
      includeDetails: this.includeDetails,
      confidential: this.confidential,
      emailTo: this.emailTo,
    });
    
    this.router.navigate(['/compliance-officer/report-preview']);
  }

  exportToExcel(): void {
    console.log('Exporting to Excel');
  }

  exportToPdf(): void {
    console.log('Exporting to PDF');
  }

  exportReport(format: string): void {
    console.log(`Exporting report as ${format}`);
    alert(`Report exported as ${format} successfully!`);
  }

  emailReport(reportId?: string): void {
    console.log(`Emailing report ${reportId || 'current report'}`);
    alert(`Report ${reportId || 'current report'} emailed successfully!`);
  }

  printReport(reportId?: string): void {
    console.log(`Printing report ${reportId || 'current report'}`);
    window.print();
  }

  scheduleReport(): void {
    console.log('Scheduling report');
    alert('Report scheduled successfully!');
  }

  deleteReport(reportId: string): void {
    if (confirm(`Are you sure you want to delete report ${reportId}?`)) {
      console.log(`Deleting report ${reportId}`);
      alert(`Report ${reportId} deleted successfully!`);
    }
  }
}
