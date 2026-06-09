import { Component, signal, computed, OnInit, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../../../core/services/users.service';
import type { User as UserDto } from '../../../../core/services/users.service';
import { RolesService } from '../../../../core/services/roles.service';
import { NotificationService } from '../../../../core/services/notification.service';

interface User {
  id: string;
  /** ASP.NET Identity UserId (Guid string) returned by /api/users. */
  userId?: string;
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
  {
    id: '1',
    username: 'jdoe',
    name: 'John Doe',
    employeeCode: 'EMP-001',
    email: 'john.doe@company.com',
    phone: '+1 555-0101',
    roleId: '1',
    role: 'Admin',
    department: 'IT',
    status: 'Active',
    lastLogin: new Date(Date.now() - 1000 * 60 * 15),
    created: new Date('2024-01-15'),
    avatar: 'JD',
  },
  {
    id: '2',
    username: 'ssmith',
    name: 'Sarah Smith',
    employeeCode: 'EMP-002',
    email: 'sarah.smith@company.com',
    phone: '+1 555-0102',
    roleId: '2',
    role: 'Manager',
    department: 'Operations',
    status: 'Active',
    lastLogin: new Date(Date.now() - 1000 * 60 * 120),
    created: new Date('2024-02-20'),
    avatar: 'SS',
  },
  {
    id: '3',
    username: 'mwilson',
    name: 'Mike Wilson',
    employeeCode: 'EMP-003',
    email: 'mike.wilson@company.com',
    phone: '+1 555-0103',
    roleId: '3',
    role: 'Store Officer',
    department: 'Warehouse',
    status: 'Active',
    lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 5),
    created: new Date('2024-03-10'),
    avatar: 'MW',
  },
  {
    id: '4',
    username: 'pchen',
    name: 'Peter Chen',
    employeeCode: 'EMP-004',
    email: 'peter.chen@company.com',
    phone: '+1 555-0104',
    roleId: '4',
    role: 'Staff',
    department: 'HR',
    status: 'Inactive',
    lastLogin: new Date('2026-05-20'),
    created: new Date('2024-04-05'),
    avatar: 'PC',
  },
  {
    id: '5',
    username: 'lwong',
    name: 'Lisa Wong',
    employeeCode: 'EMP-005',
    email: 'lisa.wong@company.com',
    phone: '+1 555-0105',
    roleId: '2',
    role: 'Manager',
    department: 'Finance',
    status: 'Active',
    lastLogin: new Date(Date.now() - 1000 * 60 * 30),
    created: new Date('2024-01-28'),
    avatar: 'LW',
  },
  {
    id: '6',
    username: 'rbrown',
    name: 'Robert Brown',
    employeeCode: 'EMP-006',
    email: 'robert.brown@company.com',
    phone: '+1 555-0106',
    roleId: '5',
    role: 'Auditor',
    department: 'Compliance',
    status: 'Active',
    lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 2),
    created: new Date('2024-05-12'),
    avatar: 'RB',
  },
  {
    id: '7',
    username: 'ajohnson',
    name: 'Alice Johnson',
    employeeCode: 'EMP-007',
    email: 'alice.johnson@company.com',
    phone: '+1 555-0107',
    roleId: '6',
    role: 'Property Officer',
    department: 'Property',
    status: 'Active',
    lastLogin: new Date(Date.now() - 1000 * 60 * 45),
    created: new Date('2024-06-01'),
    avatar: 'AJ',
  },
  {
    id: '8',
    username: 'dlee',
    name: 'David Lee',
    employeeCode: 'EMP-008',
    email: 'david.lee@company.com',
    phone: '+1 555-0108',
    roleId: '3',
    role: 'Store Officer',
    department: 'Warehouse',
    status: 'Inactive',
    lastLogin: new Date('2026-05-15'),
    created: new Date('2024-03-22'),
    avatar: 'DL',
  },
  {
    id: '9',
    username: 'egarcia',
    name: 'Elena Garcia',
    employeeCode: 'EMP-009',
    email: 'elena.garcia@company.com',
    phone: '+1 555-0109',
    roleId: '4',
    role: 'Staff',
    department: 'Sales',
    status: 'Active',
    lastLogin: new Date(Date.now() - 1000 * 60 * 10),
    created: new Date('2024-07-08'),
    avatar: 'EG',
  },
  {
    id: '10',
    username: 'kmartin',
    name: 'Kevin Martin',
    employeeCode: 'EMP-010',
    email: 'kevin.martin@company.com',
    phone: '+1 555-0110',
    roleId: '2',
    role: 'Manager',
    department: 'IT',
    status: 'Active',
    lastLogin: new Date(Date.now() - 1000 * 60 * 90),
    created: new Date('2024-02-14'),
    avatar: 'KM',
  },
  {
    id: '11',
    username: 'npatel',
    name: 'Neha Patel',
    employeeCode: 'EMP-011',
    email: 'neha.patel@company.com',
    phone: '+1 555-0111',
    roleId: '1',
    role: 'Admin',
    department: 'IT',
    status: 'Active',
    lastLogin: new Date(Date.now() - 1000 * 60 * 5),
    created: new Date('2024-01-10'),
    avatar: 'NP',
  },
  {
    id: '12',
    username: 'tclark',
    name: 'Tom Clark',
    employeeCode: 'EMP-012',
    email: 'tom.clark@company.com',
    phone: '+1 555-0112',
    roleId: '7',
    role: 'Department Head',
    department: 'Operations',
    status: 'Active',
    lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 8),
    created: new Date('2024-04-18'),
    avatar: 'TC',
  },
  {
    id: '13',
    username: 'jrodriguez',
    name: 'Julia Rodriguez',
    employeeCode: 'EMP-013',
    email: 'julia.rodriguez@company.com',
    phone: '+1 555-0113',
    roleId: '4',
    role: 'Staff',
    department: 'HR',
    status: 'Active',
    lastLogin: new Date(Date.now() - 1000 * 60 * 20),
    created: new Date('2024-08-25'),
    avatar: 'JR',
  },
  {
    id: '14',
    username: 'hkim',
    name: 'Henry Kim',
    employeeCode: 'EMP-014',
    email: 'henry.kim@company.com',
    phone: '+1 555-0114',
    roleId: '3',
    role: 'Store Officer',
    department: 'Warehouse',
    status: 'Inactive',
    lastLogin: new Date('2026-04-30'),
    created: new Date('2024-05-30'),
    avatar: 'HK',
  },
  {
    id: '15',
    username: 'mwhite',
    name: 'Megan White',
    employeeCode: 'EMP-015',
    email: 'megan.white@company.com',
    phone: '+1 555-0115',
    roleId: '5',
    role: 'Auditor',
    department: 'Compliance',
    status: 'Active',
    lastLogin: new Date(Date.now() - 1000 * 60 * 60),
    created: new Date('2024-06-20'),
    avatar: 'MW',
  },
];

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
})
export class UserListComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly rolesService = inject(RolesService);
  private readonly notificationsService = inject(NotificationService);

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
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.employeeCode.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q),
      );
    }
    if (this.roleFilter() !== 'All') {
      result = result.filter((u) => u.role === this.roleFilter());
    }
    if (this.statusFilter() !== 'All') {
      result = result.filter((u) => u.status === this.statusFilter());
    }
    if (this.departmentFilter() !== 'All') {
      result = result.filter((u) => u.department === this.departmentFilter());
    }
    return result;
  });

  pagedUsers = computed(() => {
    const start = (this.currentPage() - 1) * this.rowsPerPage();
    return this.filteredUsers().slice(start, start + this.rowsPerPage());
  });

  totalPagesComputed = computed(() =>
    Math.max(1, Math.ceil(this.filteredUsers().length / this.rowsPerPage())),
  );

  displayRange = computed(() => {
    const total = this.filteredUsers().length;
    if (total === 0) return { start: 0, end: 0 };
    const start = (this.currentPage() - 1) * this.rowsPerPage() + 1;
    const end = Math.min(this.currentPage() * this.rowsPerPage(), total);
    return { start, end };
  });

  summaryStats = computed(() => {
    const all = this.users();
    const active = all.filter((u) => u.status === 'Active').length;
    const total = all.length || 1;
    return {
      total: all.length,
      active,
      inactive: all.length - active,
      admins: all.filter((u) => u.role === 'Admin' || u.role === 'Super Admin').length,
      activePct: Math.round((active / total) * 100),
      inactivePct: Math.round(((all.length - active) / total) * 100),
    };
  });

  constructor() {
    effect(() => {
      this.searchQuery();
      this.roleFilter();
      this.statusFilter();
      this.departmentFilter();
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
            id: user.id,
            // Carry the Identity Guid (used for notifications, password
            // reset, etc.). The backend Notifications table is keyed by
            // this Guid, *not* by the numeric row id.
            userId: user.userId,
            username: user.username,
            name: user.employeeName || user.username,
            employeeCode: user.employeeCode || 'N/A',
            email: user.email,
            roleId: user.roleId,
            role: user.roleName,
            status: user.isActive ? ('Active' as const) : ('Inactive' as const),
            avatar: this.getInitials(user.employeeName || user.username),
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
      },
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
      next: (response: any) => {
        if (response.success && response.data) this.roles.set(response.data);
      },
      error: () => {},
    });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

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
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.roleFilter.set('All');
    this.statusFilter.set('All');
    this.departmentFilter.set('All');
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  getRoleColor(role: string): string {
    const c: Record<string, string> = {
      Admin: 'red',
      'Super Admin': 'red',
      Manager: 'blue',
      'Store Officer': 'green',
      'Property Officer': 'green',
      'Requisition Officer': 'yellow',
      Staff: 'gray',
      'Department Head': 'purple',
      Auditor: 'purple',
      Receiver: 'cyan',
      Inspector: 'orange',
      Viewer: 'light-gray',
    };
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
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatDate(date?: Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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
    const selected = this.selectedUser();
    const userId = form.id ?? selected?.id;
    console.log('[saveEdit] form.id:', form.id, 'selected?.id:', selected?.id, 'userId:', userId, 'type:', typeof userId);
    if (!userId) {
      this.closeEditModal();
      return;
    }

    const numericId = typeof userId === 'number' ? userId : parseInt(String(userId), 10);
    console.log('[saveEdit] numericId:', numericId, 'isNaN:', isNaN(numericId));
    if (isNaN(numericId)) {
      this.notification.set({ type: 'error', message: 'Cannot update user: invalid user ID.' });
      this.autoDismissNotification();
      this.closeEditModal();
      return;
    }

    // Optimistically update the local row so the UI feels instant.
    const original = this.users().find((u) => u.id === userId);
    const optimistic = this.users().map((u) =>
      u.id === userId ? ({ ...u, ...form } as User) : u,
    );
    this.users.set(optimistic);
    this.closeEditModal();

    // Persist the change to the backend. Only keep the local change if it succeeds.
    const payload: Partial<UserDto> = {
      id: numericId,
      username: form.username ?? original?.username ?? '',
      email: form.email ?? original?.email ?? '',
      isActive: (form.status ?? original?.status ?? 'Active') === 'Active',
      firstName: (form.name ?? '').split(' ')[0] ?? '',
      lastName: (form.name ?? '').split(' ').slice(1).join(' ') || '',
      phoneNumber: form.phone ?? original?.phone,
    };

    this.usersService.updateUser(numericId, payload).subscribe({
      next: (response: { success: boolean; message?: string }) => {
        if (response.success) {
          if (!this.useMockData()) {
            this.loadUsers();
          }
          this.notification.set({
            type: 'success',
            message: `${form.name ?? original?.name ?? 'User'} updated successfully.`,
          });
          this.autoDismissNotification();
        } else {
          if (original) {
            this.users.set(this.users().map((u) => (u.id === userId ? original : u)));
          }
          this.notification.set({
            type: 'error',
            message: 'Failed to update user: ' + (response.message ?? 'Unknown error'),
          });
          this.autoDismissNotification();
        }
      },
      error: (err: unknown) => {
        if (original) {
          this.users.set(this.users().map((u) => (u.id === userId ? original : u)));
        }
        const msg =
          (err as { error?: { message?: string }; message?: string })?.error?.message ??
          (err as { message?: string })?.message ??
          'Network error';
        this.notification.set({ type: 'error', message: 'Error updating user: ' + msg });
        this.autoDismissNotification();
      },
    });
  }

  updateEditName(e: Event): void {
    this.editForm.update((f) => ({ ...f, name: (e.target as HTMLInputElement).value }));
  }
  updateEditUsername(e: Event): void {
    this.editForm.update((f) => ({ ...f, username: (e.target as HTMLInputElement).value }));
  }
  updateEditEmail(e: Event): void {
    this.editForm.update((f) => ({ ...f, email: (e.target as HTMLInputElement).value }));
  }
  updateEditPhone(e: Event): void {
    this.editForm.update((f) => ({ ...f, phone: (e.target as HTMLInputElement).value }));
  }
  updateEditDepartment(e: Event): void {
    this.editForm.update((f) => ({ ...f, department: (e.target as HTMLInputElement).value }));
  }
  updateEditStatus(e: Event): void {
    this.editForm.update((f) => ({
      ...f,
      status: (e.target as HTMLSelectElement).value as 'Active' | 'Inactive',
    }));
  }

  toggleStatus(user: User): void {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    const msg = `Are you sure you want to ${newStatus === 'Active' ? 'activate' : 'deactivate'} ${user.name}?`;
    if (!confirm(msg)) return;
    const numericId = typeof user.id === 'number' ? user.id : parseInt(String(user.id), 10);
    if (isNaN(numericId)) return;
    this.usersService
      .updateUser(numericId, {
        username: user.username,
        email: user.email,
        isActive: newStatus === 'Active',
      })
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.useMockData() ? this.mockToggle(user.id, newStatus) : this.loadUsers();
          }
        },
        error: () => this.mockToggle(user.id, newStatus),
      });
  }

  private mockToggle(id: string, status: 'Active' | 'Inactive'): void {
    this.users.set(this.users().map((u) => (u.id === id ? ({ ...u, status } as User) : u)));
  }

  deleteUser(user: User): void {
    if (!confirm(`Permanently delete ${user.name}? This cannot be undone.`)) return;
    const numericId = typeof user.id === 'number' ? user.id : parseInt(String(user.id), 10);
    if (isNaN(numericId)) return;
    this.usersService.deleteUser(numericId).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.useMockData()
            ? this.users.set(this.users().filter((u) => u.id !== user.id))
            : this.loadUsers();
        }
      },
      error: () => this.users.set(this.users().filter((u) => u.id !== user.id)),
    });
  }

  exportUsers(format: string): void {
    this.showExportDropdown.set(false);
    const users = this.filteredUsers();
    if (users.length === 0) {
      this.notification.set({ type: 'error', message: 'No users to export.' });
      this.autoDismissNotification();
      return;
    }

    if (format === 'CSV') {
      this.exportCSV(users);
    } else if (format === 'Excel') {
      this.exportExcel(users);
    } else if (format === 'PDF') {
      this.exportPDF(users);
    }
  }

  private exportCSV(users: User[]): void {
    const header = 'Name,Username,Email,Phone,Employee Code,Role,Department,Status,Last Login,Created';
    const rows = users.map(u =>
      [
        `"${(u.name || '').replace(/"/g, '""')}"`,
        `"${u.username}"`,
        `"${u.email}"`,
        `"${u.phone || ''}"`,
        `"${u.employeeCode}"`,
        `"${u.role}"`,
        `"${u.department || ''}"`,
        `"${u.status}"`,
        `"${u.lastLogin ? new Date(u.lastLogin).toISOString() : ''}"`,
        `"${u.created ? new Date(u.created).toISOString() : ''}"`,
      ].join(',')
    );
    const csv = [header, ...rows].join('\n');
    this.downloadFile(csv, `users_export_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
    this.notification.set({ type: 'success', message: `Exported ${users.length} users to CSV successfully.` });
    this.autoDismissNotification();
  }

  private exportExcel(users: User[]): void {
    const header = 'Name\tUsername\tEmail\tPhone\tEmployee Code\tRole\tDepartment\tStatus\tLast Login\tCreated';
    const rows = users.map(u =>
      [
        u.name || '',
        u.username,
        u.email,
        u.phone || '',
        u.employeeCode,
        u.role,
        u.department || '',
        u.status,
        u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : '',
        u.created ? new Date(u.created).toLocaleDateString() : '',
      ].join('\t')
    );
    const tsv = [header, ...rows].join('\n');
    this.downloadFile(tsv, `users_export_${new Date().toISOString().slice(0, 10)}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
    this.notification.set({ type: 'success', message: `Exported ${users.length} users to Excel successfully.` });
    this.autoDismissNotification();
  }

  private exportPDF(users: User[]): void {
    const rows = users.map(u =>
      `<tr>
        <td>${u.name || ''}</td><td>${u.username}</td><td>${u.email}</td>
        <td>${u.phone || ''}</td><td>${u.employeeCode}</td><td>${u.role}</td>
        <td>${u.department || ''}</td><td>${u.status}</td>
      </tr>`
    ).join('');
    const html = `<!DOCTYPE html><html><head><title>Users Export</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#f5f5f5;font-weight:bold}tr:nth-child(even){background:#fafafa}</style></head>
      <body><h2>Users Export - ${new Date().toLocaleDateString()}</h2>
      <table><thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Phone</th><th>Code</th><th>Role</th><th>Department</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody></table></body></html>`;
    this.downloadFile(html, `users_export_${new Date().toISOString().slice(0, 10)}.html`, 'text/html;charset=utf-8;');
    this.notification.set({ type: 'success', message: `Exported ${users.length} users to PDF/HTML successfully.` });
    this.autoDismissNotification();
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  importUsers(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      this.processImportFile(file);
    };
    input.click();
  }

  private processImportFile(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: Event) => {
      const text = (e.target as FileReader).result as string;
      if (!text) {
        this.notification.set({ type: 'error', message: 'File is empty or unreadable.' });
        this.autoDismissNotification();
        return;
      }
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) {
        this.notification.set({ type: 'error', message: 'CSV file must have a header row and at least one data row.' });
        this.autoDismissNotification();
        return;
      }
      const header = lines[0].toLowerCase();
      const requiredCols = ['email', 'username'];
      const missingCols = requiredCols.filter(c => !header.includes(c));
      if (missingCols.length > 0) {
        this.notification.set({ type: 'error', message: `CSV is missing required columns: ${missingCols.join(', ')}.` });
        this.autoDismissNotification();
        return;
      }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const emailIdx = headers.indexOf('email');
      const usernameIdx = headers.indexOf('username');
      const nameIdx = headers.indexOf('name');
      const phoneIdx = headers.indexOf('phone');
      const roleIdx = headers.indexOf('role');
      const deptIdx = headers.indexOf('department');

      let imported = 0;
      let failed = 0;
      const dataLines = lines.slice(1);

      for (const line of dataLines) {
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const email = cols[emailIdx] || '';
        const username = cols[usernameIdx] || '';
        if (!email || !username) { failed++; continue; }

        const payload: Partial<UserDto> = {
          email,
          username,
          firstName: nameIdx >= 0 ? (cols[nameIdx] || '').split(' ')[0] : username,
          lastName: nameIdx >= 0 ? (cols[nameIdx] || '').split(' ').slice(1).join(' ') : '',
          phoneNumber: phoneIdx >= 0 ? cols[phoneIdx] : undefined,
          isActive: true,
        };

        this.usersService.createUser(payload).subscribe({
          next: (res: any) => { if (res.success) imported++; else failed++; },
          error: () => { failed++; },
        });
      }

      this.notification.set({
        type: imported > 0 ? 'success' : 'error',
        message: `Import complete: ${imported} user(s) created, ${failed} failed.`,
      });
      this.autoDismissNotification();
      setTimeout(() => this.loadUsers(), 1500);
    };
    reader.readAsText(file);
  }

  impersonateUser(user: User): void {
    if (confirm(`Impersonate ${user.name}? You will be logged in as this user.`)) {
    }
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

    this.closeResetConfirmModal();

    this.notification.set({
      type: 'success',
      message: `Sending password reset instructions to ${user.name} (${user.email})...`,
    });

    const notifUserId = user.userId || user.id;
    const notifGuid = this.extractGuidFromId(notifUserId);

    const message =
      `Password reset instructions\n\n` +
      `Hi ${user.name},\n\n` +
      `An administrator has initiated a password reset for your account (${user.email}). ` +
      `Please check your registered email for the secure reset link, or contact IT support ` +
      `if you did not request this.`;

    this.usersService
      .resetUserPassword({ email: user.email, userId: user.id, username: user.username })
      .subscribe({
        next: (response: any) => {
          if (response?.success !== false) {
            if (notifGuid) {
              this.notificationsService.create({ userId: notifGuid, message }).subscribe({
                next: (res: any) => {
                  if (res?.success === false) {
                    this.notification.set({
                      type: 'success',
                      message: `Password reset email sent to ${user.name} (${user.email}). Dashboard notification failed: ${res.message || 'unknown error'}.`,
                    });
                  } else {
                    this.notification.set({
                      type: 'success',
                      message: `Password reset instructions sent to ${user.name} via email and dashboard notification.`,
                    });
                  }
                  this.autoDismissNotification();
                },
                error: () => {
                  this.notification.set({
                    type: 'success',
                    message: `Password reset email sent to ${user.name} (${user.email}). Dashboard notification could not be delivered.`,
                  });
                  this.autoDismissNotification();
                },
              });
            } else {
              this.notification.set({
                type: 'success',
                message: `Password reset instructions sent to ${user.name} via email (${user.email}).`,
              });
              this.autoDismissNotification();
            }
          } else {
            this.notification.set({
              type: 'error',
              message: 'Failed to send reset instruction: ' + (response?.message ?? 'Unknown error'),
            });
            this.autoDismissNotification();
          }
        },
        error: (err: unknown) => {
          const msg =
            (err as { error?: { message?: string }; message?: string })?.error?.message ??
            (err as { message?: string })?.message ??
            'Network error';
          this.notification.set({
            type: 'error',
            message: 'Error sending password reset instruction: ' + msg,
          });
          this.autoDismissNotification();
        },
      });
  }

  /**
   * Try to interpret a user row `id` as a Guid. The admin user-list screen
   * may show rows whose `id` is either a numeric DB id (from /api/users)
   * or a Guid string (from /api/Employees). Only Guid strings are usable
   * for the Notifications table.
   */
  private extractGuidFromId(id: string | number | undefined | null): string | null {
    if (id == null) return null;
    const s = String(id).trim();
    if (!s) return null;
    // Guid format: 8-4-4-4-12 hex chars
    const guidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return guidLike.test(s) ? s : null;
  }

  private autoDismissNotification(): void {
    setTimeout(() => this.notification.set(null), 6000);
  }

  dismissNotification(): void {
    this.notification.set(null);
  }

  saveFilterSet(): void {}
  pinFilter(): void {}
}
