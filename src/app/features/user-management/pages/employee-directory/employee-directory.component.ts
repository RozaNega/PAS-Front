import { Component, signal, computed, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { EmployeesService, EmployeeDto } from '../../../../core/services/employees.service';
import { FormsModule } from '@angular/forms';
import { ApiResponse } from '../../../../types/api-response.type';

interface Employee {
  id: string;
  name: string;
  employeeCode: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  hasUserAccount: boolean;
  joinDate?: Date;
  status: 'Active' | 'Inactive';
  avatar: string;
}

@Component({
  selector: 'app-employee-directory',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './employee-directory.component.html',
  styleUrls: ['./employee-directory.component.scss']
})
export class EmployeeDirectoryComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly employeesService = inject(EmployeesService);

  searchQuery = signal('');
  departmentFilter = signal('All');
  statusFilter = signal('All');
  positionFilter = signal('All');
  currentPage = signal(1);
  rowsPerPage = signal(10);
  loading = signal(false);
  error = signal<string | null>(null);

  employees = signal<Employee[]>([]);
  totalEmployees = signal(0);

  constructor() {
    // Reload data when filters change
    effect(() => {
      const search = this.searchQuery();
      const dept = this.departmentFilter();
      const status = this.statusFilter();
      
      this.loadEmployees();
    });
  }

  ngOnInit(): void {
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.loading.set(true);
    this.error.set(null);

    const params: any = {};

    if (this.searchQuery()) {
      params.searchTerm = this.searchQuery();
    }

    if (this.departmentFilter() !== 'All') {
      params.department = this.departmentFilter();
    }

    console.log('Loading employees with params:', params);

    this.employeesService.getAll(params).subscribe({
      next: (response) => {
        console.log('Employee API response:', response);
        
        if (response.success !== false && Array.isArray(response.data)) {
          const mappedEmployees = response.data.map((emp: EmployeeDto) => ({
            id: emp.id,
            name: emp.fullName || '',
            employeeCode: emp.employeeCode || '',
            email: '',
            phone: '',
            department: emp.department || '',
            position: '',
            hasUserAccount: false,
            status: 'Active' as const,
            avatar: this.getInitials(emp.fullName || '?')
          }));
          
          console.log('Mapped employees:', mappedEmployees);
          this.employees.set(mappedEmployees);
          this.totalEmployees.set(mappedEmployees.length);
        } else {
          console.error('API response unsuccessful or no data:', response);
          this.error.set(response.message || 'No employee data received from server');
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading employees:', err);
        this.error.set('Failed to load employees. Please try again.');
        this.loading.set(false);
      }
    });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  filteredEmployees = computed(() => {
    let result = [...this.employees()];

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
      'Inactive': 'gray'
    };
    return colors[status] || 'gray';
  }

  createUserAccount(id: string): void {
    const employee = this.employees().find(e => e.id === id);
    if (employee) {
      this.router.navigate(['/admin/users/add'], {
        queryParams: {
          employeeCode: employee.employeeCode,
          fullName: employee.name,
          email: employee.email,
          department: employee.department
        }
      });
    }
  }

  deleteEmployee(id: string): void {
    if (confirm('Are you sure you want to delete this employee?')) {
      this.employeesService.delete(id).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadEmployees();
            alert('Employee deleted successfully');
          }
        },
        error: (err) => {
          console.error('Error deleting employee:', err);
          alert('Failed to delete employee. Please try again.');
        }
      });
    }
  }

  exportEmployees(format: string): void {
    console.log(`Exporting employees as ${format}...`);
    // Implement export functionality
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }

  editEmployee(id: string): void {
    this.router.navigate(['/admin/users/employees', id, 'edit']);
  }

  viewEmployee(id: string): void {
    this.router.navigate(['/admin/users/employees', id]);
  }
}
