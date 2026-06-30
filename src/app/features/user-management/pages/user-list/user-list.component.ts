import { Component, signal, computed, OnInit, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../../../core/services/users.service';
import type { User as UserDto } from '../../../../core/services/users.service';
import { RolesService } from '../../../../core/services/roles.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { WorkflowService } from '../../../../core/services/workflow.service';

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
  private readonly workflowService = inject(WorkflowService);

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
  showAssignRoleModal = signal(false);
  selectedUser = signal<User | null>(null);
  editForm = signal<Partial<User>>({});
  resetTargetUser = signal<User | null>(null);
  selectedRoleForAssignment = signal<string>('');

  notification = signal<{ type: 'success' | 'error'; message: string } | null>(null);

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
    const params: any = { pageNumber: this.currentPage(), pageSize: this.rowsPerPage() };
    if (this.searchQuery()) params.searchTerm = this.searchQuery();
    if (this.statusFilter() !== 'All') params.isActive = this.statusFilter() === 'Active';
    this.usersService.getUsers(this.currentPage(), this.rowsPerPage()).subscribe({
      next: (response: any) => {
        if (response.success && response.data?.items?.length) {
          const mapped = response.data.items.map((rawUser: any) => ({
            id: rawUser.id ?? rawUser.Id ?? 0,
            userId: this.resolveUserGuid(rawUser),
            username: rawUser.username || rawUser.UserName || '',
            name: rawUser.employeeName || rawUser.EmployeeName || rawUser.username || rawUser.UserName || '',
            employeeCode: rawUser.employeeCode || rawUser.EmployeeCode || 'N/A',
            email: rawUser.email || rawUser.Email || '',
            roleId: rawUser.roleId || rawUser.RoleId || '',
            role: rawUser.roleName || rawUser.RoleName || '',
            status: (rawUser.isActive !== false) ? ('Active' as const) : ('Inactive' as const),
            avatar: this.getInitials(rawUser.employeeName || rawUser.EmployeeName || rawUser.username || rawUser.UserName || ''),
          }));
          this.users.set(mapped);
          this.totalUsers.set(response.data.totalCount);
          this.totalPages.set(response.data.totalPages);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
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
    if (!userId) {
      this.closeEditModal();
      return;
    }

    const numericId = typeof userId === 'number' ? userId : parseInt(String(userId), 10);
    if (isNaN(numericId)) {
      this.notification.set({ type: 'error', message: 'Cannot update user: invalid user ID.' });
      this.autoDismissNotification();
      this.closeEditModal();
      return;
    }

    const original = this.users().find((u) => u.id === userId);
    const optimistic = this.users().map((u) =>
      u.id === userId ? ({ ...u, ...form } as User) : u,
    );
    this.users.set(optimistic);
    this.closeEditModal();

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
          this.loadUsers();
          this.notification.set({
            type: 'success',
            message: `${form.name ?? original?.name ?? 'User'} updated successfully.`,
          });
        } else {
          if (original) {
            this.users.set(this.users().map((u) => (u.id === userId ? original : u)));
          }
          this.notification.set({
            type: 'error',
            message: 'Failed to update user: ' + (response.message ?? 'Unknown error'),
          });
        }
        this.autoDismissNotification();
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
            this.loadUsers();
          }
        },
        error: () => {},
      });
  }

  deleteUser(user: User): void {
    if (!confirm(`Permanently delete ${user.name}? This cannot be undone.`)) return;
    const numericId = typeof user.id === 'number' ? user.id : parseInt(String(user.id), 10);
    if (isNaN(numericId)) return;
    this.usersService.deleteUser(numericId).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadUsers();
        }
      },
      error: () => {},
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

  openAssignRoleModal(user: User): void {
    this.selectedUser.set(user);
    this.selectedRoleForAssignment.set(user.role || '');
    this.showAssignRoleModal.set(true);
  }

  closeAssignRoleModal(): void {
    this.showAssignRoleModal.set(false);
    this.selectedUser.set(null);
    this.selectedRoleForAssignment.set('');
  }

  onAssignRoleChange(e: Event): void {
    this.selectedRoleForAssignment.set((e.target as HTMLSelectElement).value);
  }

  saveAssignRole(): void {
    const user = this.selectedUser();
    const roleName = this.selectedRoleForAssignment();
    if (!user || !roleName) return;

    const numericId = typeof user.id === 'number' ? user.id : parseInt(String(user.id), 10);
    if (isNaN(numericId)) return;

    this.usersService.assignRole(numericId, roleName).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadUsers();
          this.notification.set({ type: 'success', message: `Role "${roleName}" assigned to ${user.name}.` });
        } else {
          this.notification.set({ type: 'error', message: response.message || 'Failed to assign role.' });
        }
        this.autoDismissNotification();
        this.closeAssignRoleModal();
      },
      error: () => {
        this.notification.set({ type: 'error', message: 'Error assigning role.' });
        this.autoDismissNotification();
        this.closeAssignRoleModal();
      },
    });
  }

  executeResetPassword(): void {
    const user = this.resetTargetUser();
    if (!user) return;

    this.closeResetConfirmModal();

    const message =
      `Password reset instructions\n\n` +
      `Hi ${user.name},\n\n` +
      `An administrator has initiated a password reset for your account (${user.email}). ` +
      `Please check your registered email for the secure reset link, or contact IT support ` +
      `if you did not request this.`;

    this.notification.set({
      type: 'success',
      message: `Sending password reset instructions to ${user.name} (${user.email})...`,
    });

    let emailSent = false;
    let notifSent = false;
    let emailError = '';
    let notifError = '';

    const finalize = () => {
      const parts: string[] = [];
      if (emailSent) parts.push('email sent');
      if (emailError) parts.push('email failed: ' + emailError);
      if (notifSent) parts.push('dashboard notification sent');
      if (notifError) parts.push('notification failed: ' + notifError);

      const hasSuccess = emailSent || notifSent;
      this.notification.set({
        type: hasSuccess ? 'success' : 'error',
        message: `${user.name}: ${parts.join(', ')}.`,
      });
      this.autoDismissNotification();
    };

    const sendNotification = (guidHint: string | null) => {
      if (!guidHint || !this.extractGuidFromId(guidHint)) {
        notifError = 'user has no Identity GUID in the database';
        finalize();
        return;
      }
      this.notificationsService.create({
        userId: guidHint,
        message,
      }).subscribe({
        next: (res: any) => {
          if (res?.success === false) {
            notifError = res.message || 'API rejected';
          } else {
            notifSent = true;
          }
          finalize();
        },
        error: (err: any) => {
          notifError = err?.error?.message || err?.message || 'network error';
          finalize();
        },
      });
    };

    const resolveGuidAndNotify = (guidHint: string | null) => {
      if (guidHint) {
        sendNotification(guidHint);
        return;
      }
      const fromIdField = this.extractGuidFromId(user.id);
      if (fromIdField) {
        sendNotification(fromIdField);
        return;
      }
      const numericId = typeof user.id === 'number' ? user.id : parseInt(String(user.id), 10);
      if (isNaN(numericId)) {
        sendNotification(null);
        return;
      }
      this.usersService.getById(numericId).subscribe({
        next: (res: any) => {
          sendNotification(res?.data?.userId || res?.data?.UserId || null);
        },
        error: () => {
          sendNotification(null);
        },
      });
    };

    const notifGuid = user.userId || this.extractGuidFromId(user.userId) || this.extractGuidFromId(user.id) || null;

    this.usersService
      .resetUserPassword({ email: user.email, userId: user.id, username: user.username })
      .subscribe({
        next: (response: any) => {
          if (response?.success !== false && response?.statusCode !== 500) {
            emailSent = true;
            this.workflowService.createNotification({
              recipientId: user.id,
              recipientRole: 'Employee',
              type: 'info',
              title: 'Password Reset Initiated',
              message: `Admin sent password reset instructions to ${user.name}. Please check your registered email for the secure reset link.`,
              requestId: undefined,
              actionRequired: false,
              actionUrl: undefined,
            });
          } else {
            emailError = response?.message || 'API returned error';
          }
          resolveGuidAndNotify(notifGuid);
        },
        error: (err: unknown) => {
          emailError =
            (err as { error?: { message?: string }; message?: string })?.error?.message ??
            (err as { message?: string })?.message ??
            'network error';
          resolveGuidAndNotify(notifGuid);
        },
      });
  }

  /**
   * Try to interpret a value as a Guid. Only Guid-formatted strings are usable
   * for the Notifications table.
   */
  private extractGuidFromId(id: string | number | undefined | null): string | null {
    if (id == null) return null;
    const s = String(id).trim();
    if (!s) return null;
    const guidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return guidLike.test(s) ? s : null;
  }

  /**
   * Scan every possible field on a raw API user object to find the Identity Guid.
   * The backend may return it under any of these keys (camelCase, PascalCase, etc.):
   * userId, UserId, identityId, IdentityId, aspNetUserId, AspNetUserId, user_id,
   * or even as the top-level `Id` / `id` field if it happens to be a Guid string.
   */
  private resolveUserGuid(rawUser: any): string | null {
    if (!rawUser || typeof rawUser !== 'object') return null;
    const GUID_FIELDS = [
      'userId', 'UserId', 'user_id', 'userID',
      'identityId', 'IdentityId', 'identity_id',
      'aspNetUserId', 'AspNetUserId', 'asp_net_user_id',
      'applicationUserId', 'ApplicationUserId',
      'ownerId', 'OwnerId', 'owner_id',
      'createdBy', 'CreatedBy', 'created_by',
      'id', 'Id', 'ID',
    ];
    for (const field of GUID_FIELDS) {
      const found = this.extractGuidFromId(rawUser[field]);
      if (found) return found;
    }
    for (const val of Object.values(rawUser)) {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        const found = this.resolveUserGuid(val);
        if (found) return found;
      }
    }
    return null;
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
