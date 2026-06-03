import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EmployeesService } from '../../../../core/services/employees.service';
import { RolesService } from '../../../../core/services/roles.service';

@Component({
  selector: 'app-add-employee',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './add-employee.component.html',
  styleUrls: ['./add-employee.component.scss']
})
export class AddEmployeeComponent implements OnInit {
  private readonly employeesService = inject(EmployeesService);
  private readonly rolesService = inject(RolesService);
  private readonly router = inject(Router);

  showCreateModal = signal(true);
  loading = signal(false);
  error = signal<string | null>(null);
  roles = signal<any[]>([]);

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
    'Manager', 'Officer', 'Staff', 'Intern', 'Coordinator', 'Specialist', 'Director'
  ];

  contractTypes = [
    'Permanent', 'Contract', 'Temporary', 'Internship'
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

  ngOnInit(): void {
    this.loadRoles();
    if (!this.formData.employeeCode) {
      this.formData.employeeCode = this.generateEmployeeCode();
    }
  }

  generateNewCode(): void {
    this.formData.employeeCode = this.generateEmployeeCode();
  }

  loadRoles(): void {
    this.rolesService.getRoles().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.roles.set((response.data as any[]).map((role: any) => ({
            value: (role.roleName || '').toLowerCase().replace(/\s+/g, '-'),
            label: role.roleName || 'Role'
          })));
        }
      }
    });
  }

  closeModal(): void {
    this.showCreateModal.set(false);
    this.router.navigate(['/admin/users/employees']);
  }

  validateForm(): boolean {
    if (!this.formData.fullName || !this.formData.email || !this.formData.department) {
      alert('Please fill in required fields');
      return false;
    }
    return true;
  }

  saveDraft(): void {
    localStorage.setItem('employeeDraft', JSON.stringify(this.formData));
    alert('Draft saved!');
  }

  loadDraft(): void {
    const draft = localStorage.getItem('employeeDraft');
    if (draft) {
      this.formData = JSON.parse(draft);
    }
  }

  generateEmployeeCode(): string {
    return `EMP${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  }

  saveEmployee(): void {
    if (!this.validateForm()) return;

    this.loading.set(true);
    const employeeCode = this.formData.employeeCode || this.generateEmployeeCode();

    const employeeData: any = {
      employeeCode: employeeCode,
      fullName: this.formData.fullName,
      department: this.formData.department,
      position: this.formData.position || null,
      email: this.formData.email || null,
      phone: this.formData.phone || null,
      hireDate: this.formData.joinDate ? new Date(this.formData.joinDate).toISOString() : null,
    };

    this.employeesService.createEmployee(employeeData).subscribe({
      next: (response: any) => {
        if (response.success) {
          alert('Employee created!');
          this.router.navigate(['/admin/users/employees']);
        } else {
          this.error.set(response.message);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Connection error');
        this.loading.set(false);
      }
    });
  }
}
