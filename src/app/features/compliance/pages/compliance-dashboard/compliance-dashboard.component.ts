import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ComplianceScore {
  category: string;
  percentage: number;
}

export interface RiskSummary {
  severity: string;
  count: number;
  open: number;
}

export interface ViolationTrend {
  month: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface RecentActivity {
  date: string;
  description: string;
  icon: string;
}

export interface QuickStat {
  label: string;
  value: string;
  subtitle: string;
}

@Component({
  selector: 'app-compliance-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './compliance-dashboard.component.html',
  styleUrl: './compliance-dashboard.component.scss',
})
export class ComplianceDashboardComponent {
  currentScore = 92;
  scoreLabel = 'Excellent';

  complianceScores: ComplianceScore[] = [
    { category: 'Policy Adherence', percentage: 94 },
    { category: 'Documentation', percentage: 89 },
    { category: 'Approval Chain', percentage: 96 },
    { category: 'Audit Readiness', percentage: 91 },
    { category: 'Data Integrity', percentage: 95 },
  ];

  riskSummary: RiskSummary[] = [
    { severity: 'Critical', count: 3, open: 2 },
    { severity: 'High', count: 5, open: 3 },
    { severity: 'Medium', count: 8, open: 5 },
    { severity: 'Low', count: 7, open: 4 },
  ];

  totalViolations = 23;

  violationTrends: ViolationTrend[] = [
    { month: 'Jul', critical: 5, high: 7, medium: 10, low: 12 },
    { month: 'Aug', critical: 4, high: 6, medium: 9, low: 11 },
    { month: 'Sep', critical: 4, high: 7, medium: 8, low: 10 },
    { month: 'Oct', critical: 3, high: 6, medium: 9, low: 9 },
    { month: 'Nov', critical: 3, high: 5, medium: 8, low: 8 },
    { month: 'Dec', critical: 3, high: 5, medium: 8, low: 7 },
  ];

  recentActivities: RecentActivity[] = [
    { date: 'Dec 15, 2024', description: 'Critical violation detected: Missing documentation for TAG-001', icon: '🔴' },
    { date: 'Dec 14, 2024', description: 'High risk alert: Approval chain violation in SR-2024-122', icon: '🟠' },
    { date: 'Dec 13, 2024', description: 'Medium risk: Incomplete audit trail in GRN-2024-045', icon: '🟡' },
    { date: 'Dec 12, 2024', description: 'Low risk: Policy violation resolved - User access review completed', icon: '🟢' },
    { date: 'Dec 11, 2024', description: 'Compliance score improved to 92% (+2% from last month)', icon: '✅' },
  ];

  quickStats: QuickStat[] = [
    { label: 'Audit Coverage', value: '100%', subtitle: 'All modules' },
    { label: 'Compliance Score Trend', value: '▲ +2%', subtitle: 'Improving' },
    { label: 'Open Investigations', value: '3', subtitle: 'Active' },
    { label: 'Resolved This Month', value: '12', subtitle: 'Completed' },
  ];

  viewAllActivity(): void {
    console.log('Viewing all compliance activity');
    alert('Navigating to full compliance activity log');
  }
}
