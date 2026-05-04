import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

export interface ReportData {
  reportType: string;
  dateRange: string;
  format: string;
  generatedDate: string;
  generatedBy: string;
}

@Component({
  selector: 'app-report-preview-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-preview-page.component.html',
  styleUrl: './report-preview-page.component.scss',
})
export class ReportPreviewPageComponent implements OnInit {
  constructor(private router: Router) {}

  reportData: ReportData = {
    reportType: 'Compliance Summary',
    dateRange: 'Dec 01, 2024 to Dec 31, 2024',
    format: 'PDF',
    generatedDate: '',
    generatedBy: 'Sarah Smith',
  };

  complianceScore = 92;
  riskSummary = {
    critical: 3,
    high: 5,
    medium: 8,
    low: 7,
  };

  violationTrends = [
    { month: 'Jul', violations: 12 },
    { month: 'Aug', violations: 15 },
    { month: 'Sep', violations: 10 },
    { month: 'Oct', violations: 8 },
    { month: 'Nov', violations: 6 },
    { month: 'Dec', violations: 4 },
  ];

  recentViolations = [
    { id: 'V-001', severity: 'Critical', type: 'Unauthorized Access', date: 'Dec 15, 2024', status: 'Open' },
    { id: 'V-002', severity: 'High', type: 'Data Breach Attempt', date: 'Dec 14, 2024', status: 'In Progress' },
    { id: 'V-003', severity: 'Medium', type: 'Outdated Documentation', date: 'Dec 13, 2024', status: 'Resolved' },
  ];

  ngOnInit(): void {
    this.reportData.generatedDate = new Date().toLocaleString();
  }

  exportReport(): void {
    console.log('Exporting report in format:', this.reportData.format);
    alert(`Report exported as ${this.reportData.format} successfully!`);
  }

  emailReport(): void {
    console.log('Emailing report');
    alert('Report emailed successfully!');
  }

  printReport(): void {
    console.log('Printing report');
    window.print();
  }

  editReport(): void {
    console.log('Editing report');
    alert('Opening report editor');
  }

  goBack(): void {
    this.router.navigate(['/compliance-officer/compliance-reports']);
  }

  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'Critical':
        return '#ef4444';
      case 'High':
        return '#f97316';
      case 'Medium':
        return '#eab308';
      case 'Low':
        return '#22c55e';
      default:
        return '#6b7280';
    }
  }
}
