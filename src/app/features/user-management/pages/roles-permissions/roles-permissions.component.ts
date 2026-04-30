import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-roles-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roles-permissions.component.html',
  styleUrls: ['./roles-permissions.component.scss']
})
export class RolesPermissionsComponent {
  selectedRole = signal<string | null>(null);
  showCreateModal = signal(false);

  roles = [
    { id: 'super-admin', name: 'Super Admin', userCount: 2, color: 'red', description: 'Full system control' },
    { id: 'admin', name: 'Admin', userCount: 5, color: 'red', description: 'Administrative access' },
    { id: 'manager', name: 'Manager', userCount: 8, color: 'blue', description: 'Department oversight' },
    { id: 'store-officer', name: 'Store Officer', userCount: 12, color: 'green', description: 'Inventory management' },
    { id: 'staff', name: 'Staff', userCount: 45, color: 'gray', description: 'Basic user access' },
    { id: 'auditor', name: 'Auditor', userCount: 3, color: 'purple', description: 'Audit and reporting' }
  ];

  permissions = [
    {
      category: 'Dashboard',
      icon: 'bi bi-grid',
      items: [
        { name: 'View Dashboard', checked: true },
        { name: 'Export Dashboard', checked: false },
        { name: 'Widget Management', checked: false }
      ]
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
        { name: 'Assign Location', checked: false }
      ]
    },
    {
      category: 'Inventory Management',
      icon: 'bi bi-boxes',
      items: [
        { name: 'View Stock', checked: true },
        { name: 'Adjust Stock', checked: true },
        { name: 'Transfer Stock', checked: false },
        { name: 'Export Inventory', checked: true },
        { name: 'Set Alerts', checked: false }
      ]
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
        { name: 'Issue Items', checked: true }
      ]
    },
    {
      category: 'Receiving',
      icon: 'bi bi-box-seam',
      items: [
        { name: 'View GRN', checked: true },
        { name: 'Create GRN', checked: true },
        { name: 'Inspect Items', checked: false },
        { name: 'Return to Supplier', checked: false }
      ]
    },
    {
      category: 'User Management',
      icon: 'bi bi-people',
      items: [
        { name: 'View Users', checked: true },
        { name: 'Create Users', checked: true },
        { name: 'Edit Users', checked: true },
        { name: 'Delete Users', checked: false },
        { name: 'Assign Roles', checked: false }
      ]
    },
    {
      category: 'Reports',
      icon: 'bi bi-bar-chart',
      items: [
        { name: 'View Reports', checked: true },
        { name: 'Export Reports', checked: true },
        { name: 'Schedule Reports', checked: false },
        { name: 'Email Reports', checked: false }
      ]
    },
    {
      category: 'System',
      icon: 'bi bi-gear',
      items: [
        { name: 'View Settings', checked: true },
        { name: 'Edit Settings', checked: true },
        { name: 'View Audit Logs', checked: true },
        { name: 'Manage Backup', checked: false },
        { name: 'Maintenance', checked: false }
      ]
    },
    {
      category: 'Locations',
      icon: 'bi bi-geo-alt',
      items: [
        { name: 'View Locations', checked: true },
        { name: 'Create Locations', checked: false },
        { name: 'Edit Locations', checked: false },
        { name: 'Delete Locations', checked: false },
        { name: 'Assign Properties', checked: false }
      ]
    },
    {
      category: 'Safety Boxes',
      icon: 'bi bi-box',
      items: [
        { name: 'View Safety Boxes', checked: true },
        { name: 'Create Safety Boxes', checked: false },
        { name: 'Edit Safety Boxes', checked: false },
        { name: 'Delete Safety Boxes', checked: false },
        { name: 'Assign Shelves', checked: false }
      ]
    }
  ];

  selectRole(roleId: string): void {
    this.selectedRole.set(roleId);
  }

  getSelectedRole() {
    return this.roles.find(r => r.id === this.selectedRole());
  }

  openCreateModal(): void {
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
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
