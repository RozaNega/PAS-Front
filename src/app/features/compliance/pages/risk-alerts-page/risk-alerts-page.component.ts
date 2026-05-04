import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Violation {
  id: string;
  severity: string;
  type: string;
  entity: string;
  detectedDate: string;
  status: string;
  assignedTo: string;
  dueDate?: string;
  closedDate?: string;
}

@Component({
  selector: 'app-risk-alerts-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './risk-alerts-page.component.html',
  styleUrl: './risk-alerts-page.component.scss',
})
export class RiskAlertsPageComponent {
  searchQuery = '';
  filterSeverity = 'All';
  filterStatus = 'All';

  criticalViolations: Violation[] = [
    {
      id: 'V-001',
      severity: 'Critical',
      type: 'Missing Documentation',
      entity: 'Property TAG-001',
      detectedDate: 'Dec 14, 2024',
      status: 'Open',
      assignedTo: 'John Doe',
      dueDate: 'Dec 21, 2024',
    },
    {
      id: 'V-002',
      severity: 'Critical',
      type: 'Approval Chain Violation',
      entity: 'Requisition SR-2024-122',
      detectedDate: 'Dec 13, 2024',
      status: 'Open',
      assignedTo: 'Sarah Smith',
      dueDate: 'Dec 20, 2024',
    },
    {
      id: 'V-003',
      severity: 'Critical',
      type: 'Unauthorized Access Attempt',
      entity: 'System Login',
      detectedDate: 'Dec 12, 2024',
      status: 'Resolved',
      assignedTo: 'IT Team',
      closedDate: 'Dec 14, 2024',
    },
  ];

  highRiskItems: Violation[] = [
    {
      id: 'V-004',
      severity: 'High',
      type: 'Incomplete Audit Trail',
      entity: 'GRN-2024-045',
      detectedDate: 'Dec 11, 2024',
      status: 'Open',
      assignedTo: 'Store Team',
      dueDate: 'Dec 18, 2024',
    },
    {
      id: 'V-005',
      severity: 'High',
      type: 'Policy Violation',
      entity: 'User Role Mismatch',
      detectedDate: 'Dec 10, 2024',
      status: 'In Progress',
      assignedTo: 'HR',
      dueDate: 'Dec 17, 2024',
    },
  ];

  mediumRiskItems: Violation[] = [
    {
      id: 'V-006',
      severity: 'Medium',
      type: 'Data Inconsistency',
      entity: 'Stock Level Mismatch',
      detectedDate: 'Dec 09, 2024',
      status: 'Open',
      assignedTo: 'Warehouse',
      dueDate: 'Dec 16, 2024',
    },
  ];

  lowRiskItems: Violation[] = [
    {
      id: 'V-007',
      severity: 'Low',
      type: 'Outdated Documentation',
      entity: 'Property Valuation Report',
      detectedDate: 'Dec 08, 2024',
      status: 'In Progress',
      assignedTo: 'Compliance Team',
      dueDate: 'Dec 22, 2024',
    },
  ];

  pendingInvestigations: Violation[] = [
    {
      id: 'V-001',
      severity: 'Critical',
      type: 'Missing Documentation',
      entity: 'TAG-001',
      detectedDate: 'Dec 14, 2024',
      status: 'Open',
      assignedTo: 'John Doe',
      dueDate: 'Dec 21, 2024',
    },
    {
      id: 'V-002',
      severity: 'Critical',
      type: 'Approval Chain Violation',
      entity: 'SR-2024-122',
      detectedDate: 'Dec 13, 2024',
      status: 'Open',
      assignedTo: 'Sarah Smith',
      dueDate: 'Dec 20, 2024',
    },
    {
      id: 'V-004',
      severity: 'High',
      type: 'Incomplete Audit Trail',
      entity: 'GRN-2024-045',
      detectedDate: 'Dec 11, 2024',
      status: 'Open',
      assignedTo: 'Store Team',
      dueDate: 'Dec 18, 2024',
    },
  ];

  resolvedIssues: Violation[] = [
    {
      id: 'V-003',
      severity: 'Critical',
      type: 'Unauthorized Access Attempt',
      entity: 'System Login',
      detectedDate: 'Dec 12, 2024',
      status: 'Resolved',
      assignedTo: 'IT Team',
      closedDate: 'Dec 14, 2024',
    },
    {
      id: 'V-008',
      severity: 'High',
      type: 'Data Export Anomaly',
      entity: 'Stock Report',
      detectedDate: 'Dec 13, 2024',
      status: 'Resolved',
      assignedTo: 'IT Team',
      closedDate: 'Dec 13, 2024',
    },
    {
      id: 'V-009',
      severity: 'Medium',
      type: 'Policy Violation',
      entity: 'User Access',
      detectedDate: 'Dec 12, 2024',
      status: 'Resolved',
      assignedTo: 'HR',
      closedDate: 'Dec 12, 2024',
    },
    {
      id: 'V-010',
      severity: 'High',
      type: 'Data Export Anomaly',
      entity: 'Stock Report',
      detectedDate: 'Dec 13, 2024',
      status: 'Resolved',
      assignedTo: 'IT Team',
      closedDate: 'Dec 13, 2024',
    },
  ];

  getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'Critical':
        return '🔴';
      case 'High':
        return '🟠';
      case 'Medium':
        return '🟡';
      case 'Low':
        return '🟢';
      default:
        return '⚪';
    }
  }

  refreshAlerts(): void {
    console.log('Refreshing alerts');
    alert('Alerts refreshed successfully!');
  }

  investigateViolation(violationId: string): void {
    console.log('Investigating violation:', violationId);
    alert(`Opening investigation for violation ${violationId}`);
  }

  assignViolation(violationId: string): void {
    console.log('Assigning violation:', violationId);
    alert(`Opening assignment dialog for violation ${violationId}`);
  }

  resolveViolation(violationId: string): void {
    if (confirm(`Are you sure you want to resolve violation ${violationId}?`)) {
      console.log('Resolving violation:', violationId);
      alert(`Violation ${violationId} has been resolved.`);
    }
  }

  viewViolationDetails(violationId: string): void {
    console.log('Viewing details for violation:', violationId);
    alert(`Opening detailed view for violation ${violationId}`);
  }

  applyFilters(): void {
    console.log('Applying filters');
    alert('Filters applied');
  }
}
