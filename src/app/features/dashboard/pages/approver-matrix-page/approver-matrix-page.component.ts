import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  status: string;
}

export interface ApprovalLimit {
  role: string;
  perRequest: string;
  monthlyLimit: string;
  annualLimit: string;
  requiresJustification: string;
}

@Component({
  selector: 'app-approver-matrix-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './approver-matrix-page.component.html',
  styleUrl: './approver-matrix-page.component.scss',
})
export class ApproverMatrixPageComponent {
  approvalLevels: ApprovalLevel[] = [
    { level: 1, role: 'Team Lead', approvalLimit: '$5,000', escalationTo: 'IT Manager', sla: '24 hours' },
    { level: 2, role: 'IT Manager', approvalLimit: '$10,000', escalationTo: 'IT Director', sla: '48 hours' },
    { level: 3, role: 'IT Director', approvalLimit: '$25,000', escalationTo: 'VP Operations', sla: '72 hours' },
    { level: 4, role: 'VP Operations', approvalLimit: '$50,000', escalationTo: 'CEO', sla: '5 days' },
  ];

  substituteApprovers: SubstituteApprover[] = [
    { role: 'IT Manager', primaryApprover: 'Sarah Smith', substituteApprover: 'John Doe', status: '🟢' },
    { role: 'Team Lead', primaryApprover: 'John Doe', substituteApprover: 'Lisa Wong', status: '🟢' },
  ];

  approvalLimits: ApprovalLimit[] = [
    { role: 'Team Lead', perRequest: '$5,000', monthlyLimit: '$20,000', annualLimit: '$100,000', requiresJustification: '>$1,000' },
    { role: 'Manager', perRequest: '$10,000', monthlyLimit: '$50,000', annualLimit: '$250,000', requiresJustification: '>$2,500' },
    { role: 'Director', perRequest: '$25,000', monthlyLimit: '$100,000', annualLimit: '$500,000', requiresJustification: '>$5,000' },
    { role: 'VP', perRequest: '$50,000', monthlyLimit: '$200,000', annualLimit: '$1,000,000', requiresJustification: '>$10,000' },
  ];

  addSubstitute(): void {
    console.log('Adding substitute approver');
    alert('Opening substitute approver dialog');
  }

  editWorkflowRules(): void {
    console.log('Editing workflow rules');
    alert('Opening workflow rules editor');
  }

  editLevel(level: number): void {
    console.log('Editing level:', level);
    alert(`Editing approval level ${level}`);
  }

  viewLevel(level: number): void {
    console.log('Viewing level:', level);
    alert(`Viewing approval level ${level}`);
  }

  viewSubstitute(role: string): void {
    console.log('Viewing substitute for role:', role);
    alert(`Viewing substitute for ${role}`);
  }

  editSubstitute(role: string): void {
    console.log('Editing substitute for role:', role);
    alert(`Editing substitute for ${role}`);
  }
}
