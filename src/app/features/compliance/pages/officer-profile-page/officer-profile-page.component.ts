import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Investigation {
  caseId: string;
  violationType: string;
  assignedTo: string;
  status: string;
  date: string;
}

export interface Certification {
  name: string;
  year: string;
}

@Component({
  selector: 'app-officer-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './officer-profile-page.component.html',
  styleUrl: './officer-profile-page.component.scss',
})
export class OfficerProfilePageComponent {
  profile = {
    name: 'Mike Wilson',
    employeeCode: 'EMP-005',
    email: 'mike.wilson@afrocom.com',
    phone: '+251-913-456789',
    title: 'Compliance Officer',
    department: 'Audit & Compliance',
    joinDate: 'Jan 10, 2021',
    status: 'Active',
  };

  auditScope = {
    auditScope: 'Full System Access',
    modulesCovered: 'All Modules (Property, Inventory, Requisition, Receiving, Users)',
    readOnlyAccess: 'Yes - Cannot modify any data',
    exportPermissions: 'Full export capabilities',
  };

  notificationSettings = [
    { label: 'Alert me for critical violations', checked: true },
    { label: 'Daily risk summary email', checked: true },
    { label: 'Weekly compliance report', checked: true },
    { label: 'Notify when violations are resolved', checked: true },
    { label: 'Monthly audit digest', checked: false },
  ];

  investigations: Investigation[] = [
    { caseId: 'INV-001', violationType: 'Missing Documentation', assignedTo: 'John Doe', status: 'Open', date: 'Dec 14' },
    { caseId: 'INV-002', violationType: 'Approval Chain', assignedTo: 'Sarah Smith', status: 'Open', date: 'Dec 13' },
    { caseId: 'INV-003', violationType: 'Incomplete Audit Trail', assignedTo: 'Store Team', status: 'Open', date: 'Dec 11' },
    { caseId: 'INV-004', violationType: 'Unauthorized Access', assignedTo: 'IT Team', status: 'Closed', date: 'Dec 12' },
  ];

  certifications: Certification[] = [
    { name: 'Certified Internal Auditor (CIA)', year: '2023' },
    { name: 'ISO 27001 Lead Auditor', year: '2022' },
    { name: 'GDPR Compliance Specialist', year: '2024' },
  ];

  newCertificationName = '';
  newCertificationYear = '';
  showAddCertificationForm = false;

  savePreferences(): void {
    console.log('Preferences saved');
  }

  toggleAddCertificationForm(): void {
    this.showAddCertificationForm = !this.showAddCertificationForm;
  }

  addCertification(): void {
    if (this.newCertificationName && this.newCertificationYear) {
      this.certifications.push({
        name: this.newCertificationName,
        year: this.newCertificationYear,
      });
      this.newCertificationName = '';
      this.newCertificationYear = '';
      this.showAddCertificationForm = false;
    }
  }

  cancelAddCertification(): void {
    this.newCertificationName = '';
    this.newCertificationYear = '';
    this.showAddCertificationForm = false;
  }
}
