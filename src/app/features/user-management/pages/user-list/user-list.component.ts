import { Component, inject, signal, computed, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { UsersService, UserDto } from '../../../../core/services/users.service';
import { RolesService } from '../../../../core/services/roles.service';
import { FormsModule } from '@angular/forms';

interface User {
  id: string;
  username: string;
  name: string;
  employeeCode: string;
  email: string;
  phone?: string;
  roleId: string;
  role: string;
  department?: string;
  status: 'Active' | 'Inactive';
  lastLogin?: Date;
  created?: Date;
  avatar: string;
}

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly usersService = inject(UsersService);
  private readonly rolesService = inject(RolesService);

  showExportDropdown = signal(false);
  searchQuery = signal('');
  roleFilter = signal('All');
  statusFilter = signal('All');
  departmentFilter = signal('All');
  currentPage = signal(1);
  rowsPerPage = signal(10);
  loading = signal(false);
  error = signal<string | null>(null);

  users = signal<User[]>([]);
  roles = signal<any[]>([]);
  totalUsers = signal(0);
  totalPages = signal(0);

  filteredUsers = computed(() => {
    return this.users();
  });

  constructor() {
    // Reload data when filters change
    effect(() => {
      const search = this.searchQuery();
      const role = this.roleFilter();
      const status = this.statusFilter();
      const page = this.currentPage();
      
      this.loadUsers();
    });
  }

  ngOnInit(): void {
    this.loadRoles();
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.error.set(null);

    const params: any = {
      pageNumber: this.currentPage(),
      pageSize: this.rowsPerPage(),
    };

    if (this.searchQuery()) {
      params.searchTerm = this.searchQuery();
    }

    if (this.statusFilter() !== 'All') {
      params.isActive = this.statusFilter() === 'Active';
    }

    this.usersService.getAll(params).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const mappedUsers = response.data.items.map((user: UserDto) => ({
            id: user.id,
            username: user.username,
            name: user.employeeName || user.username,
            employeeCode: user.employeeCode || 'N/A',
            email: user.email,
            roleId: user.roleId,
            role: user.roleName,
            status: user.isActive ? 'Active' as const : 'Inactive' as const,
            avatar: this.getInitials(user.employeeName || user.username)
          }));
          
          this.users.set(mappedUsers);
          this.totalUsers.set(response.data.totalCount);
          this.totalPages.set(response.data.totalPages);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.error.set('Failed to load users. Please try again.');
        this.loading.set(false);
      }
    });
  }

  loadRoles(): void {
    this.rolesService.getAll().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.roles.set(response.data);
        }
      },
      error: (err) => {
        console.error('Error loading roles:', err);
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

  pagedUsers = computed(() => {
    return this.users();
  });

  displayRange = computed(() => {
    const start = (this.currentPage() - 1) * this.rowsPerPage() + 1;
    const end = Math.min(this.currentPage() * this.rowsPerPage(), this.totalUsers());
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

  formatTime(date?: Date): string {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const mins = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (mins < 60) return `${mins} min ago`;
    if (hours < 24) return `${hours} hr ago`;
    if (days < 30) return `${days} days ago`;
    return new Date(date).toLocaleDateString();
  }

  formatDate(date?: Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  toggleStatus(id: string): void {
    const user = this.users().find(u => u.id === id);
    if (!user) return;

    const newStatus = user.status !== 'Active';
    
    this.usersService.update({
      id: user.id,
      username: user.username,
      email: user.email,
      roleId: user.roleId,
      isActive: newStatus
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadUsers();
          alert(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);
        }
      },
      error: (err) => {
        console.error('Error updating user status:', err);
        alert('Failed to update user status. Please try again.');
      }
    });
  }

  deleteUser(id: string): void {
    if (confirm('Are you sure you want to delete this user?')) {
      this.usersService.delete(id).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadUsers();
            alert('User deleted successfully');
          }
        },
        error: (err) => {
          console.error('Error deleting user:', err);
          alert('Failed to delete user. Please try again.');
        }
      });
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
    const user = this.users().find(u => u.id === id);
    if (!user) return;
    if (!confirm(`Send password reset instructions to ${user.email}?`)) {
      return;
    }
    this.usersService.forgotPassword(user.email).subscribe({
      next: (response) => {
        if (response.success) {
          alert('If this account exists, password reset instructions have been sent.');
        } else {
          alert(response.message || 'Request could not be completed.');
        }
      },
      error: (err) => {
        console.error('Error requesting password reset:', err);
        alert('Failed to send reset instructions. Please try again.');
      }
    });
  }

  activateUser(id: string): void {
    this.toggleStatus(id);
  }

  deactivateUser(id: string): void {
    this.toggleStatus(id);
  }

  saveFilterSet(): void {
    alert('Filter set saved!');
  }

  pinFilter(): void {
    alert('Filter pinned!');
  }
}
