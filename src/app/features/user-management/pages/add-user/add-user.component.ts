import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-add-user',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './add-user.component.html',
  styleUrls: ['./add-user.component.scss']
})
export class AddUserComponent {
  currentStep = signal(1);
  totalSteps = 3;

  steps = [
    { number: 1, title: 'Basic Information' },
    { number: 2, title: 'Permissions & Notifications' },
    { number: 3, title: 'Review & Submit' }
  ];

  formData = {
    fullName: '',
    employeeCode: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    username: '',
    role: '',
    password: '',
    confirmPassword: '',
    autoGeneratePassword: false,
    sendWelcomeEmail: true,
    sendApprovalEmails: true,
    sendLowStockAlerts: false,
    sendSystemAnnouncements: true
  };

  roles = [
    { value: 'super-admin', label: 'Super Admin', permissions: ['All permissions'] },
    { value: 'admin', label: 'Admin', permissions: ['Most permissions'] },
    { value: 'manager', label: 'Manager', permissions: ['View, Approve, Reports'] },
    { value: 'store-officer', label: 'Store Officer', permissions: ['Stock, Receiving, Issuing'] },
    { value: 'staff', label: 'Staff', permissions: ['Create requests only'] },
    { value: 'auditor', label: 'Auditor', permissions: ['View all, Audit logs'] }
  ];

  departments = ['IT', 'HR', 'Finance', 'Operations', 'Warehouse', 'Sales', 'Marketing'];

  permissions = [
    { category: 'Dashboard', items: [
      { name: 'View Dashboard', checked: true },
      { name: 'Export Dashboard', checked: false }
    ]},
    { category: 'Property Management', items: [
      { name: 'View Properties', checked: true },
      { name: 'Create Properties', checked: false },
      { name: 'Edit Properties', checked: false },
      { name: 'Delete Properties', checked: false }
    ]},
    { category: 'Inventory', items: [
      { name: 'View Stock', checked: true },
      { name: 'Adjust Stock', checked: false },
      { name: 'Transfer Stock', checked: false },
      { name: 'Export Inventory', checked: false }
    ]},
    { category: 'User Management', items: [
      { name: 'View Users', checked: false },
      { name: 'Create Users', checked: false },
      { name: 'Edit Users', checked: false },
      { name: 'Delete Users', checked: false }
    ]}
  ];

  goToStep(step: number): void {
    if (step >= 1 && step <= this.totalSteps) {
      this.currentStep.set(step);
    }
  }

  nextStep(): void {
    if (this.currentStep() < this.totalSteps) {
      this.currentStep.set(this.currentStep() + 1);
    }
  }

  prevStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.set(this.currentStep() - 1);
    }
  }

  submitForm(): void {
    alert('User created successfully!');
  }

  saveDraft(): void {
    alert('Draft saved!');
  }
}
