import { Component, signal, computed, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EmployeesService } from '../../../../core/services/employees.service';

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

  showDetailModal = signal(false);
  showExportDropdown = signal(false);
  selectedEmployee = signal<Employee | null>(null);

  constructor() {
    effect(() => {
      this.searchQuery(); this.departmentFilter(); this.statusFilter();
      this.loadEmployees();
    });
  }

  ngOnInit(): void { this.loadEmployees(); }

  loadEmployees(): void {
    this.loading.set(true);
    this.error.set(null);
    this.employeesService.getEmployees(this.currentPage(), this.rowsPerPage()).subscribe({
      next: (response: any) => {
        if (response.success && response.data?.items?.length) {
          const mapped = response.data.items.map((emp: any) => ({
            id: emp.id,
            name: emp.fullName || emp.employeeName || '',
            employeeCode: emp.employeeCode || '',
            email: emp.email || '',
            phone: emp.phoneNumber || '',
            department: emp.department || '',
            position: emp.designation || emp.position || '',
            hasUserAccount: emp.isActive ?? true,
            status: emp.isActive ? ('Active' as const) : ('Inactive' as const),
            avatar: this.getInitials(emp.fullName || emp.employeeName || '?')
          }));
          this.employees.set(mapped);
          this.totalEmployees.set(mapped.length);
        }
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); }
    });
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
    const numericId = Number(emp.id);
    if (isNaN(numericId)) return;
    this.employeesService.deleteEmployee(numericId).subscribe({
      next: (response: any) => { if (response.success) this.loadEmployees(); },
      error: () => {}
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
