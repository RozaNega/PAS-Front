import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-decision-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './decision-profile-page.component.html',
  styleUrl: './decision-profile-page.component.scss',
})
export class DecisionProfilePageComponent {
  profile = {
    name: 'Sarah Smith',
    title: 'IT Department Manager',
    employeeCode: 'EMP-002',
    department: 'IT Department',
    email: 'sarah.smith@afrocom.com',
    phone: '+251-912-345678',
    joinDate: 'Mar 01, 2019',
  };

  approvalLimits = {
    singleRequestLimit: '$10,000',
    monthlyDepartmentLimit: '$50,000',
    requireEscalationAbove: '$10,000',
    escalationApprover: 'Director of Operations',
  };

  departmentScope = {
    department: 'IT Department',
    staffCount: 12,
    subDepartments: 'None',
    approvalAuthority: 'All requests from IT Department',
  };

  delegation = {
    delegateTo: '',
    startDate: '',
    endDate: '',
    reason: '',
  };

  notificationPreferences = {
    emailEveryApproval: true,
    smsUrgent: true,
    dailySummary: true,
    weeklyReport: true,
    budgetAlerts: false,
  };

  savePreferences(): void {
    console.log('Saving preferences:', this.notificationPreferences);
    alert('Preferences saved successfully!');
  }

  setDelegation(): void {
    console.log('Setting delegation:', this.delegation);
    alert('Delegation set successfully!');
  }

  editProfile(): void {
    console.log('Editing profile');
    alert('Profile edit functionality would open an edit modal here.');
  }

  changePhoto(): void {
    console.log('Changing profile photo');
    alert('Photo upload dialog would open here.');
  }
}
