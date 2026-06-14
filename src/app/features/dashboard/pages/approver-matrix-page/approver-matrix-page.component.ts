import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApproversService } from '../../../../core/services/approvers.service';

export interface ApprovalLevel {
  level: number;
  role: string;
  approvalLimit: string;
  escalationTo: string;
  sla: string;
}

export interface SubstituteApprover {
  role: string;
  primaryApprover: string;
  substituteApprover: string;
  status: 'Active' | 'Inactive';
}

export interface ApprovalLimit {
  role: string;
  perRequest: string;
  monthlyLimit: string;
  annualLimit: string;
  requiresJustification: string;
}

export interface AuthorityCell {
  level: string;
  color: string;
}

@Component({
  selector: 'app-approver-matrix-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './approver-matrix-page.component.html',
  styleUrl: './approver-matrix-page.component.scss',
})
export class ApproverMatrixPageComponent {
  private readonly router = inject(Router);

  // Keep service injection ready for real data integration
  protected readonly approversService = inject(ApproversService);

  readonly hierarchyData = [
    { role: 'CEO', limit: '$50,000+', color: '#4f46e5', children: [
      { role: 'VP Operations', limit: '$50,000', color: '#6366f1', children: [
        { role: 'IT Director', limit: '$25,000', color: '#818cf8', children: [
          { role: 'IT Manager', limit: '$10,000', color: '#a5b4fc', children: [
            { role: 'Team Lead', limit: '$5,000', color: '#c7d2fe', children: [] }
          ]}
        ]}
      ]}
    ]}
  ];

  approvalLevels: ApprovalLevel[] = [
    { level: 1, role: 'Team Lead', approvalLimit: '$5,000', escalationTo: 'IT Manager', sla: '24 hours' },
    { level: 2, role: 'IT Manager', approvalLimit: '$10,000', escalationTo: 'IT Director', sla: '48 hours' },
    { level: 3, role: 'IT Director', approvalLimit: '$25,000', escalationTo: 'VP Operations', sla: '72 hours' },
    { level: 4, role: 'VP Operations', approvalLimit: '$50,000', escalationTo: 'CEO', sla: '5 days' },
  ];

  substituteApprovers: SubstituteApprover[] = [
    { role: 'IT Manager', primaryApprover: 'Sarah Smith', substituteApprover: 'John Doe', status: 'Active' },
    { role: 'Team Lead', primaryApprover: 'John Doe', substituteApprover: 'Lisa Wong', status: 'Active' },
  ];

  approvalLimits: ApprovalLimit[] = [
    { role: 'Team Lead', perRequest: '$5,000', monthlyLimit: '$20,000', annualLimit: '$100,000', requiresJustification: '>$1,000' },
    { role: 'Manager', perRequest: '$10,000', monthlyLimit: '$50,000', annualLimit: '$250,000', requiresJustification: '>$2,500' },
    { role: 'Director', perRequest: '$25,000', monthlyLimit: '$100,000', annualLimit: '$500,000', requiresJustification: '>$5,000' },
    { role: 'VP', perRequest: '$50,000', monthlyLimit: '$200,000', annualLimit: '$1,000,000', requiresJustification: '>$10,000' },
  ];

  readonly authorityData: { requestType: string; levels: { threshold: string; approver: string }[] }[] = [
    {
      requestType: 'Hardware',
      levels: [
        { threshold: '<$1K', approver: 'Team' },
        { threshold: '$1K–$5K', approver: 'Manager' },
        { threshold: '$5K–$10K', approver: 'Director' },
        { threshold: '$10K–$25K', approver: 'Director' },
        { threshold: '$25K–$50K', approver: 'VP' },
        { threshold: '>$50K', approver: 'CEO' },
      ]
    },
    {
      requestType: 'Software',
      levels: [
        { threshold: '<$1K', approver: 'Team' },
        { threshold: '$1K–$5K', approver: 'Manager' },
        { threshold: '$5K–$10K', approver: 'Manager' },
        { threshold: '$10K–$25K', approver: 'Director' },
        { threshold: '$25K–$50K', approver: 'VP' },
        { threshold: '>$50K', approver: 'CEO' },
      ]
    },
    {
      requestType: 'Supplies',
      levels: [
        { threshold: '<$1K', approver: 'Auto' },
        { threshold: '$1K–$5K', approver: 'Team' },
        { threshold: '$5K–$10K', approver: 'Manager' },
        { threshold: '$10K–$25K', approver: 'Director' },
        { threshold: '$25K–$50K', approver: 'VP' },
        { threshold: '>$50K', approver: 'CEO' },
      ]
    },
    {
      requestType: 'Training',
      levels: [
        { threshold: '<$1K', approver: 'Team' },
        { threshold: '$1K–$5K', approver: 'Manager' },
        { threshold: '$5K–$10K', approver: 'Manager' },
        { threshold: '$10K–$25K', approver: 'Director' },
        { threshold: '$25K–$50K', approver: 'VP' },
        { threshold: '>$50K', approver: 'CEO' },
      ]
    },
  ];

  navigateTo(path: string): void {
    void this.router.navigate([path]);
  }

  getApproverColor(approver: string): string {
    const colors: Record<string, string> = {
      'Auto': '#94a3b8',
      'Team': '#22c55e',
      'Manager': '#6366f1',
      'Director': '#f59e0b',
      'VP': '#ef4444',
      'CEO': '#8b5cf6',
    };
    return colors[approver] || '#64748b';
  }

  addSubstitute(): void {
    alert('Opening substitute approver dialog');
  }

  editLevel(level: number): void {
    alert(`Editing approval level ${level}`);
  }

  editSubstitute(role: string): void {
    alert(`Editing substitute for ${role}`);
  }
}
