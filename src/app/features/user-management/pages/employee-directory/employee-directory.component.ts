import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface Employee {
  id: string;
  name: string;
  employeeCode: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  hasUserAccount: boolean;
  joinDate: Date;
  status: 'Active' | 'Inactive' | 'On Leave';
  avatar: string;
}

@Component({
  selector: 'app-employee-directory',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './employee-directory.component.html',
  styleUrls: ['./employee-directory.component.scss']
})
export class EmployeeDirectoryComponent {
  private readonly router = inject(Router);

  searchQuery = signal('');
  departmentFilter = signal('All');
  statusFilter = signal('All');
  positionFilter = signal('All');
  currentPage = signal(1);
  rowsPerPage = signal(10);

  employees: Employee[] = [
    { id: '1', name: 'John Doe', employeeCode: 'EMP-001', email: 'john@afrocom.com', phone: '+251-911-234567', department: 'IT', position: 'IT Manager', hasUserAccount: true, joinDate: new Date('2020-01-15'), status: 'Active', avatar: 'JD' },
    { id: '2', name: 'Sarah Smith', employeeCode: 'EMP-002', email: 'sarah@afrocom.com', phone: '+251-912-345678', department: 'Warehouse', position: 'Store Officer', hasUserAccount: true, joinDate: new Date('2021-03-01'), status: 'Active', avatar: 'SS' },
    { id: '3', name: 'Mike Johnson', employeeCode: 'EMP-003', email: 'mike@afrocom.com', phone: '+251-913-456789', department: 'Operations', position: 'Logistics Coordinator', hasUserAccount: false, joinDate: new Date('2022-06-10'), status: 'Active', avatar: 'MJ' },
    { id: '4', name: 'Lisa Wong', employeeCode: 'EMP-004', email: 'lisa@afrocom.com', phone: '+251-914-567890', department: 'HR', position: 'HR Manager', hasUserAccount: true, joinDate: new Date('2019-08-05'), status: 'Active', avatar: 'LW' },
    { id: '5', name: 'Peter Chen', employeeCode: 'EMP-005', email: 'peter@afrocom.com', phone: '+251-915-678901', department: 'Finance', position: 'Accountant', hasUserAccount: true, joinDate: new Date('2021-11-20'), status: 'On Leave', avatar: 'PC' },
  ];

  totalEmployees = signal(this.employees.length);

  filteredEmployees = computed(() => {
    let result = [...this.employees];

    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      result = result.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q)
      );
    }

    if (this.departmentFilter() !== 'All') {
      result = result.filter(e => e.department === this.departmentFilter());
    }

    if (this.statusFilter() !== 'All') {
      result = result.filter(e => e.status === this.statusFilter());
    }

    if (this.positionFilter() !== 'All') {
      result = result.filter(e => e.position === this.positionFilter());
    }

    return result;
  });

  pagedEmployees = computed(() => {
    const start = (this.currentPage() - 1) * this.rowsPerPage();
    const end = start + this.rowsPerPage();
    return this.filteredEmployees().slice(start, end);
  });

  totalPages = computed(() => Math.ceil(this.filteredEmployees().length / this.rowsPerPage()));

  displayRange = computed(() => {
    const start = (this.currentPage() - 1) * this.rowsPerPage() + 1;
    const end = Math.min(this.currentPage() * this.rowsPerPage(), this.filteredEmployees().length);
    return { start, end };
  });

  onSearch(e: Event): void {
    this.searchQuery.set((e.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  onDepartmentFilter(e: Event): void {
    this.departmentFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onStatusFilter(e: Event): void {
    this.statusFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onPositionFilter(e: Event): void {
    this.positionFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onRowsPerPageChange(e: Event): void {
    this.rowsPerPage.set(+(e.target as HTMLSelectElement).value);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.departmentFilter.set('All');
    this.statusFilter.set('All');
    this.positionFilter.set('All');
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'Active': 'green',
      'Inactive': 'gray',
      'On Leave': 'yellow'
    };
    return colors[status] || 'gray';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  createUserAccount(id: string): void {
    alert(`Creating user account for employee ${id}`);
  }

  deleteEmployee(id: string): void {
    if (confirm('Are you sure you want to delete this employee?')) {
      this.employees = this.employees.filter(e => e.id !== id);
      this.totalEmployees.set(this.employees.length);
    }
  }

  exportEmployees(format: string): void {
    alert(`Exporting employees as ${format}...`);
  }
}
