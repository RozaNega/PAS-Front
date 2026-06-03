import { Component, signal, computed, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EmployeesService } from '../../../../core/services/employees.service';
import type { Employee as EmployeeDto } from '../../../../core/services/employees.service';

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

const MOCK_EMPLOYEES: Employee[] = [
  { id: '1', name: 'John Doe', employeeCode: 'EMP-001', email: 'john.doe@company.com', phone: '+1 555-0101', department: 'IT', position: 'Senior Developer', hasUserAccount: true, joinDate: new Date('2024-01-15'), status: 'Active', avatar: 'JD' },
  { id: '2', name: 'Sarah Smith', employeeCode: 'EMP-002', email: 'sarah.smith@company.com', phone: '+1 555-0102', department: 'Operations', position: 'Operations Manager', hasUserAccount: true, joinDate: new Date('2024-02-20'), status: 'Active', avatar: 'SS' },
  { id: '3', name: 'Mike Wilson', employeeCode: 'EMP-003', email: 'mike.wilson@company.com', phone: '+1 555-0103', department: 'Warehouse', position: 'Warehouse Supervisor', hasUserAccount: true, joinDate: new Date('2024-03-10'), status: 'Active', avatar: 'MW' },
  { id: '4', name: 'Peter Chen', employeeCode: 'EMP-004', email: 'peter.chen@company.com', phone: '+1 555-0104', department: 'HR', position: 'HR Coordinator', hasUserAccount: false, joinDate: new Date('2024-04-05'), status: 'Inactive', avatar: 'PC' },
  { id: '5', name: 'Lisa Wong', employeeCode: 'EMP-005', email: 'lisa.wong@company.com', phone: '+1 555-0105', department: 'Finance', position: 'Finance Manager', hasUserAccount: true, joinDate: new Date('2024-01-28'), status: 'Active', avatar: 'LW' },
  { id: '6', name: 'Robert Brown', employeeCode: 'EMP-006', email: 'robert.brown@company.com', phone: '+1 555-0106', department: 'Compliance', position: 'Compliance Officer', hasUserAccount: true, joinDate: new Date('2024-05-12'), status: 'Active', avatar: 'RB' },
  { id: '7', name: 'Alice Johnson', employeeCode: 'EMP-007', email: 'alice.johnson@company.com', phone: '+1 555-0107', department: 'Property', position: 'Property Officer', hasUserAccount: true, joinDate: new Date('2024-06-01'), status: 'Active', avatar: 'AJ' },
  { id: '8', name: 'David Lee', employeeCode: 'EMP-008', email: 'david.lee@company.com', phone: '+1 555-0108', department: 'Warehouse', position: 'Store Assistant', hasUserAccount: false, joinDate: new Date('2024-03-22'), status: 'Inactive', avatar: 'DL' },
  { id: '9', name: 'Elena Garcia', employeeCode: 'EMP-009', email: 'elena.garcia@company.com', phone: '+1 555-0109', department: 'Sales', position: 'Sales Representative', hasUserAccount: true, joinDate: new Date('2024-07-08'), status: 'Active', avatar: 'EG' },
  { id: '10', name: 'Kevin Martin', employeeCode: 'EMP-010', email: 'kevin.martin@company.com', phone: '+1 555-0110', department: 'IT', position: 'IT Manager', hasUserAccount: true, joinDate: new Date('2024-02-14'), status: 'Active', avatar: 'KM' },
  { id: '11', name: 'Neha Patel', employeeCode: 'EMP-011', email: 'neha.patel@company.com', phone: '+1 555-0111', department: 'IT', position: 'System Admin', hasUserAccount: true, joinDate: new Date('2024-01-10'), status: 'Active', avatar: 'NP' },
  { id: '12', name: 'Tom Clark', employeeCode: 'EMP-012', email: 'tom.clark@company.com', phone: '+1 555-0112', department: 'Operations', position: 'Department Head', hasUserAccount: true, joinDate: new Date('2024-04-18'), status: 'Active', avatar: 'TC' },
  { id: '13', name: 'Julia Rodriguez', employeeCode: 'EMP-013', email: 'julia.rodriguez@company.com', phone: '+1 555-0113', department: 'HR', position: 'HR Assistant', hasUserAccount: false, joinDate: new Date('2024-08-25'), status: 'Active', avatar: 'JR' },
  { id: '14', name: 'Henry Kim', employeeCode: 'EMP-014', email: 'henry.kim@company.com', phone: '+1 555-0114', department: 'Warehouse', position: 'Store Officer', hasUserAccount: false, joinDate: new Date('2024-05-30'), status: 'Inactive', avatar: 'HK' },
  { id: '15', name: 'Megan White', employeeCode: 'EMP-015', email: 'megan.white@company.com', phone: '+1 555-0115', department: 'Compliance', position: 'Internal Auditor', hasUserAccount: true, joinDate: new Date('2024-06-20'), status: 'Active', avatar: 'MW' },
];

@Component({
  selector: 'app-employee-directory',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './employee-directory.component.html',
  styleUrls: ['./employee-directory.component.scss']
})
export class EmployeeDirectoryComponent implements OnInit {
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
  useMockData = signal(false);

  showDetailModal = signal(false);
  showExportDropdown = signal(false);
  selectedEmployee = signal<Employee | null>(null);

  constructor() {
    effect(() => {
      this.searchQuery(); this.departmentFilter(); this.statusFilter();
      if (!this.useMockData()) this.loadEmployees();
    });
  }

  ngOnInit(): void { this.loadEmployees(); }

  loadEmployees(): void {
    this.loading.set(true);
    this.error.set(null);
    const params: any = {};
    if (this.searchQuery()) params.searchTerm = this.searchQuery();
    if (this.departmentFilter() !== 'All') params.department = this.departmentFilter();
    (this.employeesService as any).getAll(params).subscribe({
      next: (response: any) => {
        if (response.success !== false && Array.isArray(response.data) && response.data.length) {
          const mapped = response.data.map((emp: any) => ({
            id: emp.id, name: emp.fullName || '', employeeCode: emp.employeeCode || '',
            email: '', phone: '', department: emp.department || '', position: '',
            hasUserAccount: false, status: 'Active' as const,
            avatar: this.getInitials(emp.fullName || '?')
          }));
          this.employees.set(mapped);
          this.totalEmployees.set(mapped.length);
          this.useMockData.set(false);
        } else {
          this.fallback();
        }
        this.loading.set(false);
      },
      error: () => { this.fallback(); this.loading.set(false); }
    });
  }

  private fallback(): void {
    this.employees.set(MOCK_EMPLOYEES);
    this.totalEmployees.set(MOCK_EMPLOYEES.length);
    this.useMockData.set(true);
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  filteredEmployees = computed(() => {
    let result = [...this.employees()];
    if (this.searchQuery()) { const q = this.searchQuery().toLowerCase(); result = result.filter(e => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || e.employeeCode.toLowerCase().includes(q) || e.position.toLowerCase().includes(q)); }
    if (this.departmentFilter() !== 'All') result = result.filter(e => e.department === this.departmentFilter());
    if (this.statusFilter() !== 'All') result = result.filter(e => e.status === this.statusFilter());
    if (this.positionFilter() !== 'All') result = result.filter(e => e.position === this.positionFilter());
    return result;
  });

  pagedEmployees = computed(() => {
    const start = (this.currentPage() - 1) * this.rowsPerPage();
    return this.filteredEmployees().slice(start, start + this.rowsPerPage());
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredEmployees().length / this.rowsPerPage())));
  displayRange = computed(() => {
    const total = this.filteredEmployees().length;
    if (!total) return { start: 0, end: 0 };
    const start = (this.currentPage() - 1) * this.rowsPerPage() + 1;
    return { start, end: Math.min(this.currentPage() * this.rowsPerPage(), total) };
  });

  summaryStats = computed(() => {
    const all = this.employees();
    return {
      total: all.length,
      active: all.filter(e => e.status === 'Active').length,
      withAccount: all.filter(e => e.hasUserAccount).length,
      departments: new Set(all.map(e => e.department)).size,
    };
  });

  onSearch(e: Event): void { this.searchQuery.set((e.target as HTMLInputElement).value); this.currentPage.set(1); }
  onDepartmentFilter(e: Event): void { this.departmentFilter.set((e.target as HTMLSelectElement).value); this.currentPage.set(1); }
  onStatusFilter(e: Event): void { this.statusFilter.set((e.target as HTMLSelectElement).value); this.currentPage.set(1); }
  onPositionFilter(e: Event): void { this.positionFilter.set((e.target as HTMLSelectElement).value); this.currentPage.set(1); }
  onRowsPerPageChange(e: Event): void { this.rowsPerPage.set(+(e.target as HTMLSelectElement).value); this.currentPage.set(1); }

  resetFilters(): void { this.searchQuery.set(''); this.departmentFilter.set('All'); this.statusFilter.set('All'); this.positionFilter.set('All'); this.currentPage.set(1); }
  goToPage(page: number): void { this.currentPage.set(page); }

  getStatusColor(status: string): string {
    const c: Record<string, string> = { 'Active': 'green', 'Inactive': 'gray' };
    return c[status] || 'gray';
  }

  viewEmployee(emp: Employee): void {
    this.selectedEmployee.set(emp);
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void { this.showDetailModal.set(false); this.selectedEmployee.set(null); }

  createUserAccount(emp: Employee): void {
    alert(`User account creation for ${emp.name} is in development.`);
  }

  deleteEmployee(emp: Employee): void {
    if (!confirm(`Delete ${emp.name}? This cannot be undone.`)) return;
    (this.employeesService as any).delete(emp.id).subscribe({
      next: (response: any) => { if (response.success) this.useMockData() ? this.employees.set(this.employees().filter(e => e.id !== emp.id)) : this.loadEmployees(); },
      error: () => this.employees.set(this.employees().filter(e => e.id !== emp.id))
    });
  }

  exportEmployees(format: string): void { this.showExportDropdown.set(false); }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  editEmployee(emp: Employee): void {
    alert(`Editing ${emp.name} is in development.`);
  }

  Math = Math;
}
