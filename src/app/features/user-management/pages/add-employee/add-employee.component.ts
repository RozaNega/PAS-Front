import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-add-employee',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './add-employee.component.html',
  styleUrls: ['./add-employee.component.scss']
})
export class AddEmployeeComponent {
  showCreateModal = signal(true);

  departments = [
    'Information Technology (IT)',
    'Human Resources (HR)',
    'Finance',
    'Operations',
    'Warehouse',
    'Sales',
    'Marketing',
    'Procurement'
  ];

  positions = [
    'Manager',
    'Officer',
    'Staff',
    'Intern',
    'Coordinator',
    'Specialist',
    'Director'
  ];

  contractTypes = [
    'Permanent',
    'Contract',
    'Temporary',
    'Internship'
  ];

  roles = [
    { value: 'staff', label: 'Staff' },
    { value: 'store-officer', label: 'Store Officer' },
    { value: 'manager', label: 'Manager' },
    { value: 'admin', label: 'Admin' }
  ];

  formData = {
    employeeCode: '',
    fullName: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    address: '',
    joinDate: '',
    contractType: 'Permanent',
    manager: '',
    reportsTo: '',
    createUserAccount: false,
    userRole: 'staff'
  };

  closeModal(): void {
    this.showCreateModal.set(false);
  }

  saveDraft(): void {
    alert('Draft saved!');
  }

  saveEmployee(): void {
    alert('Employee saved successfully!');
  }
}
