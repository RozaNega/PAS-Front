import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RolesService } from '../../../../core/services/roles.service';

interface RoleRow {
  id: string;
  name: string;
  userCount: number;
  color: string;
  description: string;
}

@Component({
  selector: 'app-roles-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roles-permissions.component.html',
  styleUrls: ['./roles-permissions.component.scss'],
})
export class RolesPermissionsComponent implements OnInit {
  private readonly rolesService = inject(RolesService);

  selectedRole = signal<string | null>(null);
  showCreateModal = signal(false);

  roles = signal<RoleRow[]>([]);

  // Create role form
  newRoleName = signal('');
  newRoleDescription = signal('');
  newRoleColor = signal('blue');
  copyFromRoleId = signal('');
  saving = signal(false);
  notification = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  permissions = [
    {
      category: 'Dashboard',
      icon: 'bi bi-grid',
      items: [
        { name: 'View Dashboard', checked: true },
        { name: 'Export Dashboard', checked: false },
        { name: 'Widget Management', checked: false },
      ],
    },
    {
      category: 'Property Management',
      icon: 'bi bi-building',
      items: [
        { name: 'View Properties', checked: true },
        { name: 'Create Properties', checked: true },
        { name: 'Edit Properties', checked: true },
        { name: 'Delete Properties', checked: false },
        { name: 'Transfer Properties', checked: false },
        { name: 'Assign Location', checked: false },
      ],
    },
    {
      category: 'Inventory Management',
      icon: 'bi bi-boxes',
      items: [
        { name: 'View Stock', checked: true },
        { name: 'Adjust Stock', checked: true },
        { name: 'Transfer Stock', checked: false },
        { name: 'Export Inventory', checked: true },
        { name: 'Set Alerts', checked: false },
      ],
    },
    {
      category: 'Requisitions',
      icon: 'bi bi-file-text',
      items: [
        { name: 'View Requisitions', checked: true },
        { name: 'Create Requisitions', checked: true },
        { name: 'Edit Requisitions', checked: true },
        { name: 'Delete Requisitions', checked: false },
        { name: 'Approve Requisitions', checked: true },
        { name: 'Reject Requisitions', checked: true },
        { name: 'Issue Items', checked: true },
      ],
    },
    {
      category: 'Receiving',
      icon: 'bi bi-box-seam',
      items: [
        { name: 'View GRN', checked: true },
        { name: 'Create GRN', checked: true },
        { name: 'Inspect Items', checked: false },
        { name: 'Return to Supplier', checked: false },
      ],
    },
    {
      category: 'User Management',
      icon: 'bi bi-people',
      items: [
        { name: 'View Users', checked: true },
        { name: 'Create Users', checked: true },
        { name: 'Edit Users', checked: true },
        { name: 'Delete Users', checked: false },
        { name: 'Assign Roles', checked: false },
      ],
    },
    {
      category: 'Reports',
      icon: 'bi bi-bar-chart',
      items: [
        { name: 'View Reports', checked: true },
        { name: 'Export Reports', checked: true },
        { name: 'Schedule Reports', checked: false },
        { name: 'Email Reports', checked: false },
      ],
    },
    {
      category: 'System',
      icon: 'bi bi-gear',
      items: [
        { name: 'View Settings', checked: true },
        { name: 'Edit Settings', checked: true },
        { name: 'View Audit Logs', checked: true },
        { name: 'Manage Backup', checked: false },
        { name: 'Maintenance', checked: false },
      ],
    },
    {
      category: 'Locations',
      icon: 'bi bi-geo-alt',
      items: [
        { name: 'View Locations', checked: true },
        { name: 'Create Locations', checked: false },
        { name: 'Edit Locations', checked: false },
        { name: 'Delete Locations', checked: false },
        { name: 'Assign Properties', checked: false },
      ],
    },
    {
      category: 'Safety Boxes',
      icon: 'bi bi-box',
      items: [
        { name: 'View Safety Boxes', checked: true },
        { name: 'Create Safety Boxes', checked: false },
        { name: 'Edit Safety Boxes', checked: false },
        { name: 'Delete Safety Boxes', checked: false },
        { name: 'Assign Shelves', checked: false },
      ],
    },
  ];

  ngOnInit(): void {
    this.rolesService.getRoles().subscribe({
      next: (res: any) => {
        if (res.success && res.data?.length) {
          const palette = ['red', 'blue', 'green', 'gray', 'purple', 'orange'];
          this.roles.set(
            (res.data as any[]).map((r: any, i: number) => ({
              id: r.id,
              name: r.roleName,
              userCount: r.userCount ?? 0,
              color: palette[i % palette.length],
              description: r.description || '',
            })),
          );
          if (!this.selectedRole() && res.data[0]) {
            this.selectedRole.set(res.data[0].id);
          }
        }
      },
      error: (err: any) => console.error('Failed to load roles', err),
    });
  }

  selectRole(roleId: string): void {
    this.selectedRole.set(roleId);
  }

  getSelectedRole(): RoleRow | undefined {
    return this.roles().find((r) => r.id === this.selectedRole());
  }

  openCreateModal(): void {
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.newRoleName.set('');
    this.newRoleDescription.set('');
    this.newRoleColor.set('blue');
    this.copyFromRoleId.set('');
  }

  createRole(): void {
    const name = this.newRoleName().trim();
    if (!name) {
      this.showNotification('error', 'Role name is required');
      return;
    }
    this.saving.set(true);
    this.rolesService.createRole({
      name,
      description: this.newRoleDescription(),
    }).subscribe({
      next: (res: any) => {
        this.saving.set(false);
        if (res.success && res.data) {
          const palette = ['red', 'blue', 'green', 'gray', 'purple', 'orange'];
          const created = res.data as any;
          const newRow: RoleRow = {
            id: created.id,
            name: created.roleName || name,
            userCount: 0,
            color: this.newRoleColor(),
            description: this.newRoleDescription(),
          };
          this.roles.update(list => [...list, newRow]);
          this.showNotification('success', `Role "${name}" created successfully`);
          this.closeCreateModal();
        } else {
          this.showNotification('error', res.message || 'Failed to create role');
        }
      },
      error: (err: any) => {
        this.saving.set(false);
        this.showNotification('error', err?.error?.message || 'Failed to create role');
      }
    });
  }

  deleteRole(roleId: string, roleName: string, e: Event): void {
    e.stopPropagation();
    if (!confirm(`Delete role "${roleName}"? This cannot be undone.`)) return;
    this.rolesService.deleteRole(roleId).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.roles.update(list => list.filter(r => r.id !== roleId));
          if (this.selectedRole() === roleId) {
            this.selectedRole.set(this.roles()[0]?.id ?? null);
          }
          this.showNotification('success', `Role "${roleName}" deleted`);
        } else {
          this.showNotification('error', res.message || 'Failed to delete role');
        }
      },
      error: (err: any) => this.showNotification('error', err?.error?.message || 'Failed to delete role')
    });
  }

  showNotification(type: 'success' | 'error', message: string): void {
    this.notification.set({ type, message });
    setTimeout(() => this.notification.set(null), 5000);
  }

  saveChanges(): void {
    alert('Permissions saved successfully!');
  }

  resetPermissions(): void {
    if (confirm('Reset all permissions to defaults?')) {
      alert('Permissions reset!');
    }
  }
}
