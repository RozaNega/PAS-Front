import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AuditSummary {
  label: string;
  value: string;
  subtitle: string;
}

export interface SystemActivity {
  timestamp: string;
  user: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  status: string;
}

export interface UserActionSummary {
  user: string;
  create: number;
  update: number;
  delete: number;
  view: number;
  export: number;
  login: number;
  total: number;
}

export interface PropertyChange {
  date: string;
  property: string;
  changeType: string;
  oldValue: string;
  newValue: string;
  user: string;
  status: string;
}

export interface StockMovement {
  date: string;
  item: string;
  type: string;
  quantity: string;
  reference: string;
  user: string;
  status: string;
}

export interface RequisitionAudit {
  srNumber: string;
  requester: string;
  value: string;
  approver: string;
  status: string;
  approvalChain: string;
  compliance: string;
}

export interface UserLoginHistory {
  dateTime: string;
  user: string;
  ipAddress: string;
  status: string;
  location: string;
}

export interface DataExportLog {
  dateTime: string;
  user: string;
  exportType: string;
  records: string;
  format: string;
  status: string;
}

@Component({
  selector: 'app-audit-trail-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audit-trail-page.component.html',
  styleUrl: './audit-trail-page.component.scss',
})
export class AuditTrailPageComponent {
  auditSummaries: AuditSummary[] = [
    { label: 'Total Events', value: '45,678', subtitle: 'this month' },
    { label: "Today's Events", value: '1,234', subtitle: '▲ +15%' },
    { label: "This Week's Events", value: '8,567', subtitle: '● Same' },
    { label: 'Most Active User', value: 'John Doe', subtitle: '(1,234 actions)' },
    { label: 'Suspicious Activities', value: '23', subtitle: '⚠️ Flagged' },
  ];

  systemActivities: SystemActivity[] = [
    { timestamp: 'Dec 15, 10:30:25', user: 'John Doe', action: '➕ Create', entity: 'Property', entityId: 'TAG-001', details: 'Added', status: '✅' },
    { timestamp: 'Dec 15, 09:45:12', user: 'Sarah Smith', action: '✏️ Update', entity: 'Requisition', entityId: 'SR-123', details: 'Status', status: '✅' },
    { timestamp: 'Dec 15, 09:30:02', user: 'System', action: '⚠️ Alert', entity: 'Stock', entityId: 'LAP-001', details: 'Low', status: '⚠️' },
    { timestamp: 'Dec 15, 08:45:33', user: 'Mike Wilson', action: '📥 Export', entity: 'Report', entityId: 'N/A', details: 'Stock', status: '✅' },
    { timestamp: 'Dec 15, 08:15:21', user: 'Unknown', action: '❌ Login', entity: 'User', entityId: 'admin', details: 'Failed', status: '❌' },
  ];

  userActionSummaries: UserActionSummary[] = [
    { user: 'John Doe', create: 234, update: 156, delete: 12, view: 567, export: 45, login: 89, total: 1103 },
    { user: 'Sarah Smith', create: 89, update: 234, delete: 5, view: 890, export: 23, login: 67, total: 1308 },
    { user: 'Mike Wilson', create: 45, update: 67, delete: 2, view: 234, export: 89, login: 45, total: 482 },
  ];

  propertyChanges: PropertyChange[] = [
    { date: 'Dec 15', property: 'TAG-001', changeType: 'Location', oldValue: 'IT Dept', newValue: 'Warehouse', user: 'John Doe', status: '✅' },
    { date: 'Dec 14', property: 'TAG-002', changeType: 'Status', oldValue: 'Active', newValue: 'Inactive', user: 'Sarah Smith', status: '✅' },
  ];

  stockMovements: StockMovement[] = [
    { date: 'Dec 15', item: 'Dell Laptop', type: 'Receiving', quantity: '+10', reference: 'GRN-045', user: 'John Doe', status: '✅' },
    { date: 'Dec 14', item: 'HP Monitor', type: 'Issue', quantity: '-3', reference: 'SIV-012', user: 'Sarah Smith', status: '✅' },
  ];

  requisitionAudits: RequisitionAudit[] = [
    { srNumber: 'SR-2024-123', requester: 'John Doe', value: '$5,348', approver: 'Sarah Smith', status: '✅', approvalChain: 'Complete', compliance: '✅ Compliant' },
    { srNumber: 'SR-2024-122', requester: 'Peter Chen', value: '$2,800', approver: 'Pending', status: '🟡', approvalChain: 'Incomplete', compliance: '⚠️ Violation' },
  ];

  userLoginHistory: UserLoginHistory[] = [
    { dateTime: 'Dec 15, 09:30 AM', user: 'John Doe', ipAddress: '192.168.1.100', status: '✅', location: 'Office' },
    { dateTime: 'Dec 15, 08:15 AM', user: 'Unknown', ipAddress: '10.0.0.45', status: '❌ Failed', location: 'Unknown' },
  ];

  dataExportLogs: DataExportLog[] = [
    { dateTime: 'Dec 15, 08:45 AM', user: 'Mike Wilson', exportType: 'Stock Report', records: '1,234', format: 'Excel', status: '✅' },
    { dateTime: 'Dec 14, 03:30 PM', user: 'Sarah Smith', exportType: 'Audit Log', records: '5,678', format: 'PDF', status: '✅' },
  ];

  exportAuditLogs(): void {
    console.log('Exporting audit logs');
    alert('Audit logs exported successfully!');
  }

  generateReport(): void {
    console.log('Generating report');
    alert('Report generated successfully!');
  }

  exportToExcel(): void {
    console.log('Exporting to Excel');
    alert('Exported to Excel successfully!');
  }

  exportToPdf(): void {
    console.log('Exporting to PDF');
    alert('Exported to PDF successfully!');
  }

  emailReport(): void {
    console.log('Emailing report');
    alert('Report emailed successfully!');
  }

  printReport(): void {
    console.log('Printing report');
    window.print();
  }

  scheduleReport(): void {
    console.log('Scheduling report');
    alert('Report scheduled successfully!');
  }
}
