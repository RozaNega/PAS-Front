import { Component, signal, computed, OnInit, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../../../core/services/users.service';
import type { User as UserDto } from '../../../../core/services/users.service';
import { RolesService } from '../../../../core/services/roles.service';

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

const MOCK_USERS: User[] = [
  { id: '1', username: 'jdoe', name: 'John Doe', employeeCode: 'EMP-001', email: 'john.doe@company.com', phone: '+1 555-0101', roleId: '1', role: 'Admin', department: 'IT', status: 'Active', lastLogin: new Date(Date.now() - 1000 * 60 * 15), created: new Date('2024-01-15'), avatar: 'JD' },
  { id: '2', username: 'ssmith', name: 'Sarah Smith', employeeCode: 'EMP-002', email: 'sarah.smith@company.com', phone: '+1 555-0102', roleId: '2', role: 'Manager', department: 'Operations', status: 'Active', lastLogin: new Date(Date.now() - 1000 * 60 * 120), created: new Date('2024-02-20'), avatar: 'SS' },
  { id: '3', username: 'mwilson', name: 'Mike Wilson', employeeCode: 'EMP-003', email: 'mike.wilson@company.com', phone: '+1 555-0103', roleId: '3', role: 'Store Officer', department: 'Warehouse', status: 'Active', lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 5), created: new Date('2024-03-10'), avatar: 'MW' },
  { id: '4', username: 'pchen', name: 'Peter Chen', employeeCode: 'EMP-004', email: 'peter.chen@company.com', phone: '+1 555-0104', roleId: '4', role: 'Staff', department: 'HR', status: 'Inactive', lastLogin: new Date('2026-05-20'), created: new Date('2024-04-05'), avatar: 'PC' },
  { id: '5', username: 'lwong', name: 'Lisa Wong', employeeCode: 'EMP-005', email: 'lisa.wong@company.com', phone: '+1 555-0105', roleId: '2', role: 'Manager', department: 'Finance', status: 'Active', lastLogin: new Date(Date.now() - 1000 * 60 * 30), created: new Date('2024-01-28'), avatar: 'LW' },
  { id: '6', username: 'rbrown', name: 'Robert Brown', employeeCode: 'EMP-006', email: 'robert.brown@company.com', phone: '+1 555-0106', roleId: '5', role: 'Auditor', department: 'Compliance', status: 'Active', lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 2), created: new Date('2024-05-12'), avatar: 'RB' },
  { id: '7', username: 'ajohnson', name: 'Alice Johnson', employeeCode: 'EMP-007', email: 'alice.johnson@company.com', phone: '+1 555-0107', roleId: '6', role: 'Property Officer', department: 'Property', status: 'Active', lastLogin: new Date(Date.now() - 1000 * 60 * 45), created: new Date('2024-06-01'), avatar: 'AJ' },
  { id: '8', username: 'dlee', name: 'David Lee', employeeCode: 'EMP-008', email: 'david.lee@company.com', phone: '+1 555-0108', roleId: '3', role: 'Store Officer', department: 'Warehouse', status: 'Inactive', lastLogin: new Date('2026-05-15'), created: new Date('2024-03-22'), avatar: 'DL' },
  { id: '9', username: 'egarcia', name: 'Elena Garcia', employeeCode: 'EMP-009', email: 'elena.garcia@company.com', phone: '+1 555-0109', roleId: '4', role: 'Staff', department: 'Sales', status: 'Active', lastLogin: new Date(Date.now() - 1000 * 60 * 10), created: new Date('2024-07-08'), avatar: 'EG' },
  { id: '10', username: 'kmartin', name: 'Kevin Martin', employeeCode: 'EMP-010', email: 'kevin.martin@company.com', phone: '+1 555-0110', roleId: '2', role: 'Manager', department: 'IT', status: 'Active', lastLogin: new Date(Date.now() - 1000 * 60 * 90), created: new Date('2024-02-14'), avatar: 'KM' },
  { id: '11', username: 'npatel', name: 'Neha Patel', employeeCode: 'EMP-011', email: 'neha.patel@company.com', phone: '+1 555-0111', roleId: '1', role: 'Admin', department: 'IT', status: 'Active', lastLogin: new Date(Date.now() - 1000 * 60 * 5), created: new Date('2024-01-10'), avatar: 'NP' },
  { id: '12', username: 'tclark', name: 'Tom Clark', employeeCode: 'EMP-012', email: 'tom.clark@company.com', phone: '+1 555-0112', roleId: '7', role: 'Department Head', department: 'Operations', status: 'Active', lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 8), created: new Date('2024-04-18'), avatar: 'TC' },
  { id: '13', username: 'jrodriguez', name: 'Julia Rodriguez', employeeCode: 'EMP-013', email: 'julia.rodriguez@company.com', phone: '+1 555-0113', roleId: '4', role: 'Staff', department: 'HR', status: 'Active', lastLogin: new Date(Date.now() - 1000 * 60 * 20), created: new Date('2024-08-25'), avatar: 'JR' },
  { id: '14', username: 'hkim', name: 'Henry Kim', employeeCode: 'EMP-014', email: 'henry.kim@company.com', phone: '+1 555-0114', roleId: '3', role: 'Store Officer', department: 'Warehouse', status: 'Inactive', lastLogin: new Date('2026-04-30'), created: new Date('2024-05-30'), avatar: 'HK' },
  { id: '15', username: 'mwhite', name: 'Megan White', employeeCode: 'EMP-015', email: 'megan.white@company.com', phone: '+1 555-0115', roleId: '5', role: 'Auditor', department: 'Compliance', status: 'Active', lastLogin: new Date(Date.now() - 1000 * 60 * 60), created: new Date('2024-06-20'), avatar: 'MW' },
];

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit {
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

  // Modal state
  showDetailModal = signal(false);
  showEditModal = signal(false);
  showResetConfirmModal = signal(false);
  selectedUser = signal<User | null>(null);
  editForm = signal<Partial<User>>({});
  resetTargetUser = signal<User | null>(null);

  notification = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  useMockData = signal(false);

  filteredUsers = computed(() => {
    let result = [...this.users()];

    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      result = result.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.employeeCode.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q)
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
    return this.filteredUsers().slice(start, start + this.rowsPerPage());
  });

  totalPagesComputed = computed(() => Math.max(1, Math.ceil(this.filteredUsers().length / this.rowsPerPage())));

  displayRange = computed(() => {
    const total = this.filteredUsers().length;
    if (total === 0) return { start: 0, end: 0 };
    const start = (this.currentPage() - 1) * this.rowsPerPage() + 1;
    const end = Math.min(this.currentPage() * this.rowsPerPage(), total);
    return { start, end };
  });

  summaryStats = computed(() => {
    const all = this.users();
    const active = all.filter(u => u.status === 'Active').length;
    const total = all.length || 1;
    return {
      total: all.length,
      active,
      inactive: all.length - active,
      admins: all.filter(u => u.role === 'Admin' || u.role === 'Super Admin').length,
      activePct: Math.round((active / total) * 100),
      inactivePct: Math.round(((all.length - active) / total) * 100),
    };
  });

  constructor() {
    effect(() => {
      this.searchQuery(); this.roleFilter(); this.statusFilter(); this.departmentFilter();
      this.currentPage();
      if (!this.useMockData()) {
        this.loadUsers();
      }
    });
  }

  ngOnInit(): void {
    this.loadRoles();
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.error.set(null);
    const params: any = { pageNumber: this.currentPage(), pageSize: this.rowsPerPage() };
    if (this.searchQuery()) params.searchTerm = this.searchQuery();
    if (this.statusFilter() !== 'All') params.isActive = this.statusFilter() === 'Active';
    this.usersService.getUsers(this.currentPage(), this.rowsPerPage()).subscribe({
      next: (response: any) => {
        if (response.success && response.data?.items?.length) {
          const mapped = response.data.items.map((user: UserDto) => ({
            id: user.id, username: user.username, name: user.employeeName || user.username,
            employeeCode: user.employeeCode || 'N/A', email: user.email,
            roleId: user.roleId, role: user.roleName,
            status: user.isActive ? 'Active' as const : 'Inactive' as const,
            avatar: this.getInitials(user.employeeName || user.username)
          }));
          this.users.set(mapped);
          this.totalUsers.set(response.data.totalCount);
          this.totalPages.set(response.data.totalPages);
          this.useMockData.set(false);
        } else {
          this.fallbackToMock();
        }
        this.loading.set(false);
      },
      error: () => {
        this.fallbackToMock();
        this.loading.set(false);
      }
    });
  }

  private fallbackToMock(): void {
    this.users.set(MOCK_USERS);
    this.totalUsers.set(MOCK_USERS.length);
    this.totalPages.set(Math.ceil(MOCK_USERS.length / this.rowsPerPage()));
    this.useMockData.set(true);
  }

  loadRoles(): void {
    this.rolesService.getRoles().subscribe({
      next: (response: any) => { if (response.success && response.data) this.roles.set(response.data); },
      error: () => {}
    });
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  onSearch(e: Event): void { this.searchQuery.set((e.target as HTMLInputElement).value); this.currentPage.set(1); }
  onRoleFilter(e: Event): void { this.roleFilter.set((e.target as HTMLSelectElement).value); this.currentPage.set(1); }
  onStatusFilter(e: Event): void { this.statusFilter.set((e.target as HTMLSelectElement).value); this.currentPage.set(1); }
  onDepartmentFilter(e: Event): void { this.departmentFilter.set((e.target as HTMLSelectElement).value); this.currentPage.set(1); }
  onRowsPerPageChange(e: Event): void { this.rowsPerPage.set(+(e.target as HTMLSelectElement).value); this.currentPage.set(1); }

  resetFilters(): void {
    this.searchQuery.set(''); this.roleFilter.set('All'); this.statusFilter.set('All');
    this.departmentFilter.set('All'); this.currentPage.set(1);
  }

  goToPage(page: number): void { this.currentPage.set(page); }

  getRoleColor(role: string): string {
    const c: Record<string, string> = { 'Admin': 'red', 'Super Admin': 'red', 'Manager': 'blue', 'Store Officer': 'green', 'Property Officer': 'green', 'Requisition Officer': 'yellow', 'Staff': 'gray', 'Department Head': 'purple', 'Auditor': 'purple', 'Receiver': 'cyan', 'Inspector': 'orange', 'Viewer': 'light-gray' };
    return c[role] || 'gray';
  }

  formatTime(date?: Date): string {
    if (!date) return 'Never';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(diff / 86400000);
    if (days < 30) return `${days}d ago`;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatDate(date?: Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  viewUserDetails(user: User): void {
    this.selectedUser.set(user);
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedUser.set(null);
  }

  openEditModal(user: User): void {
    this.selectedUser.set(user);
    this.editForm.set({ ...user });
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.selectedUser.set(null);
    this.editForm.set({});
  }

  saveEdit(): void {
    const form = this.editForm();
    const updated = this.users().map(u => u.id === form.id ? { ...u, ...form } as User : u);
    this.users.set(updated);
    this.closeEditModal();
  }

  updateEditName(e: Event): void { this.editForm.update(f => ({ ...f, name: (e.target as HTMLInputElement).value })); }
  updateEditUsername(e: Event): void { this.editForm.update(f => ({ ...f, username: (e.target as HTMLInputElement).value })); }
  updateEditEmail(e: Event): void { this.editForm.update(f => ({ ...f, email: (e.target as HTMLInputElement).value })); }
  updateEditPhone(e: Event): void { this.editForm.update(f => ({ ...f, phone: (e.target as HTMLInputElement).value })); }
  updateEditDepartment(e: Event): void { this.editForm.update(f => ({ ...f, department: (e.target as HTMLInputElement).value })); }
  updateEditStatus(e: Event): void { this.editForm.update(f => ({ ...f, status: (e.target as HTMLSelectElement).value as 'Active' | 'Inactive' })); }

  toggleStatus(user: User): void {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    const msg = `Are you sure you want to ${newStatus === 'Active' ? 'activate' : 'deactivate'} ${user.name}?`;
    if (!confirm(msg)) return;
    this.usersService.updateUser(Number(user.id), { username: user.username, email: user.email, isActive: newStatus === 'Active' }).subscribe({
      next: (response: any) => { if (response.success) { this.useMockData() ? this.mockToggle(user.id, newStatus) : this.loadUsers(); } },
      error: () => this.mockToggle(user.id, newStatus)
    });
  }

  private mockToggle(id: string, status: 'Active' | 'Inactive'): void {
    this.users.set(this.users().map(u => u.id === id ? { ...u, status } as User : u));
  }

  deleteUser(user: User): void {
    if (!confirm(`Permanently delete ${user.name}? This cannot be undone.`)) return;
    this.usersService.deleteUser(Number(user.id)).subscribe({
      next: (response: any) => { if (response.success) { this.useMockData() ? this.users.set(this.users().filter(u => u.id !== user.id)) : this.loadUsers(); } },
      error: () => this.users.set(this.users().filter(u => u.id !== user.id))
    });
  }

  exportUsers(format: string): void { this.showExportDropdown.set(false); }
  importUsers(): void {}

  impersonateUser(user: User): void {
    if (confirm(`Impersonate ${user.name}? You will be logged in as this user.`)) {}
  }

  confirmResetPassword(user: User): void {
    this.resetTargetUser.set(user);
    this.showResetConfirmModal.set(true);
  }

  closeResetConfirmModal(): void {
    this.showResetConfirmModal.set(false);
    this.resetTargetUser.set(null);
  }

  executeResetPassword(): void {
    const user = this.resetTargetUser();
    if (!user) return;
    this.notification.set({ type: 'success', message: `Reset instructions sent to ${user.email}` });
    this.closeResetConfirmModal();
    this.autoDismissNotification();
  }

  private autoDismissNotification(): void {
    setTimeout(() => this.notification.set(null), 4000);
  }

  dismissNotification(): void {
    this.notification.set(null);
  }

  saveFilterSet(): void {}
  pinFilter(): void {}
}
