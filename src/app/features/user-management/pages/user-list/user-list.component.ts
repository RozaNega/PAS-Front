import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

interface User {
  id: string;
  name: string;
  employeeCode: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  status: 'Active' | 'Inactive' | 'Locked';
  lastLogin: Date;
  created: Date;
  avatar: string;
}

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent {
  private readonly router = inject(Router);

  showExportDropdown = signal(false);
  searchQuery = signal('');
  roleFilter = signal('All');
  statusFilter = signal('All');
  departmentFilter = signal('All');
  currentPage = signal(1);
  rowsPerPage = signal(10);

  users: User[] = [
    { id: '1', name: 'John Doe', employeeCode: 'EMP-001', email: 'john@afrocom.com', phone: '+251-911-234567', role: 'Admin', department: 'IT', status: 'Active', lastLogin: new Date(Date.now() - 1000 * 60 * 30), created: new Date('2024-01-15'), avatar: 'JD' },
    { id: '2', name: 'Sarah Smith', employeeCode: 'EMP-002', email: 'sarah@afrocom.com', phone: '+251-912-345678', role: 'Store Officer', department: 'Warehouse', status: 'Active', lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24), created: new Date('2024-02-01'), avatar: 'SS' },
    { id: '3', name: 'Mike Johnson', employeeCode: 'EMP-003', email: 'mike@afrocom.com', phone: '+251-913-456789', role: 'Staff', department: 'Operations', status: 'Inactive', lastLogin: new Date('2024-12-10'), created: new Date('2024-03-10'), avatar: 'MJ' },
    { id: '4', name: 'Lisa Wong', employeeCode: 'EMP-004', email: 'lisa@afrocom.com', phone: '+251-914-567890', role: 'Manager', department: 'HR', status: 'Active', lastLogin: new Date(Date.now() - 1000 * 60 * 15), created: new Date('2024-04-05'), avatar: 'LW' },
    { id: '5', name: 'Peter Chen', employeeCode: 'EMP-005', email: 'peter@afrocom.com', phone: '+251-915-678901', role: 'Auditor', department: 'Finance', status: 'Locked', lastLogin: new Date('2024-12-05'), created: new Date('2024-05-20'), avatar: 'PC' },
  ];

  totalUsers = signal(this.users.length);

  filteredUsers = computed(() => {
    let result = [...this.users];

    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      result = result.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.employeeCode.toLowerCase().includes(q)
      );
    }

    if (this.roleFilter() !== 'All') {
      result = result.filter(u => u.role === this.roleFilter());
    }

    if (this.statusFilter() !== 'All') {
      result = result.filter(u => u.status === this.statusFilter());
    }

    if (this.departmentFilter() !== 'All') {
      result = result.filter(u => u.department === this.departmentFilter());
    }

    return result;
  });

  pagedUsers = computed(() => {
    const start = (this.currentPage() - 1) * this.rowsPerPage();
    const end = start + this.rowsPerPage();
    return this.filteredUsers().slice(start, end);
  });

  totalPages = computed(() => Math.ceil(this.filteredUsers().length / this.rowsPerPage()));

  displayRange = computed(() => {
    const start = (this.currentPage() - 1) * this.rowsPerPage() + 1;
    const end = Math.min(this.currentPage() * this.rowsPerPage(), this.filteredUsers().length);
    return { start, end };
  });

  onSearch(e: Event): void {
    this.searchQuery.set((e.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  onRoleFilter(e: Event): void {
    this.roleFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onStatusFilter(e: Event): void {
    this.statusFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onDepartmentFilter(e: Event): void {
    this.departmentFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onRowsPerPageChange(e: Event): void {
    this.rowsPerPage.set(+(e.target as HTMLSelectElement).value);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.roleFilter.set('All');
    this.statusFilter.set('All');
    this.departmentFilter.set('All');
    this.currentPage.set(1);
  }

  applyFilters(): void {
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  getRoleColor(role: string): string {
    const colors: Record<string, string> = {
      'Admin': 'red',
      'Super Admin': 'red',
      'Manager': 'blue',
      'Store Officer': 'green',
      'Property Officer': 'green',
      'Requisition Officer': 'yellow',
      'Staff': 'gray',
      'Department Head': 'purple',
      'Auditor': 'purple',
      'Receiver': 'cyan',
      'Inspector': 'orange',
      'Viewer': 'light-gray'
    };
    return colors[role] || 'gray';
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'Active': 'green',
      'Inactive': 'gray',
      'Locked': 'red'
    };
    return colors[status] || 'gray';
  }

  formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const mins = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (mins < 60) return `${mins} min ago`;
    if (hours < 24) return `${hours} hr ago`;
    if (days < 30) return `${days} days ago`;
    return date.toLocaleDateString();
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  toggleStatus(id: string): void {
    const user = this.users.find(u => u.id === id);
    if (user) {
      user.status = user.status === 'Active' ? 'Inactive' : 'Active';
    }
  }

  deleteUser(id: string): void {
    if (confirm('Are you sure you want to delete this user?')) {
      this.users = this.users.filter(u => u.id !== id);
      this.totalUsers.set(this.users.length);
    }
  }

  exportUsers(format: string): void {
    alert(`Exporting users as ${format}...`);
  }

  importUsers(): void {
    alert('Opening bulk import dialog...');
  }

  editUser(id: string): void {
    alert(`Editing user ${id}`);
  }

  viewUserDetails(id: string): void {
    alert(`Viewing details for user ${id}`);
  }

  impersonateUser(id: string): void {
    if (confirm(`Are you sure you want to impersonate user ${id}?`)) {
      alert(`Impersonating user ${id}`);
    }
  }

  resetPassword(id: string): void {
    if (confirm(`Send password reset email to user ${id}?`)) {
      alert(`Password reset email sent to user ${id}`);
    }
  }

  activateUser(id: string): void {
    const user = this.users.find(u => u.id === id);
    if (user) {
      user.status = 'Active';
      alert(`User ${id} has been activated`);
    }
  }

  deactivateUser(id: string): void {
    const user = this.users.find(u => u.id === id);
    if (user) {
      user.status = 'Inactive';
      alert(`User ${id} has been deactivated`);
    }
  }

  saveFilterSet(): void {
    alert('Filter set saved!');
  }

  pinFilter(): void {
    alert('Filter pinned!');
  }
}
