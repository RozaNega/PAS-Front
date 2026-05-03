import { ROUTES } from './route.config';

export interface MenuItem {
  label: string;
  route?: string;
  icon: string;
  permission?: string;
  role?: string;
  children?: MenuItem[];
}

export const managerMenuConfig: MenuItem[] = [
  { label: 'Approval Dashboard', route: '/manager/dashboard', icon: 'bi bi-house-fill' },
  { label: 'Notifications', route: '/manager/notifications', icon: 'bi bi-bell-fill' },
  { label: 'Decision Profile', route: '/manager/dashboard', icon: 'bi bi-person-circle' },
  {
    label: 'Approval Queue',
    route: '/manager/requisition/service-requests',
    icon: 'bi bi-inboxes-fill',
  },
  {
    label: 'Approval Workflow',
    route: '/manager/workflow/approval-workflows',
    icon: 'bi bi-diagram-3-fill',
  },
  { label: 'Approver Matrix', route: '/manager/workflow/approvers', icon: 'bi bi-people-fill' },
  { label: 'Decision Reports', route: '/manager/reports', icon: 'bi bi-bar-chart-fill' },
  { label: 'Audit Reference', route: '/manager/audit-trail', icon: 'bi bi-clock-history' },
];

export const complianceOfficerMenuConfig: MenuItem[] = [
  {
    label: 'Compliance Dashboard',
    route: '/compliance-officer/dashboard',
    icon: 'bi bi-house-fill',
  },
  { label: 'Risk Alerts', route: '/compliance-officer/notifications', icon: 'bi bi-bell-fill' },
  { label: 'Officer Profile', route: '/compliance-officer/dashboard', icon: 'bi bi-person-circle' },
  { label: 'Audit Trail', route: '/compliance-officer/audit-trail', icon: 'bi bi-clock-history' },
  {
    label: 'Compliance Reports',
    route: '/compliance-officer/reports',
    icon: 'bi bi-bar-chart-fill',
  },
];

export const employeeMenuConfig: MenuItem[] = [
  { label: 'Dashboard', route: '/employee/dashboard', icon: 'bi bi-house-fill' },
  { label: 'User Profile', route: '/employee/dashboard/profile', icon: 'bi bi-person-circle' },
  { label: 'Notifications', route: '/employee/dashboard/notifications', icon: 'bi bi-bell-fill' },
  {
    label: 'My Requests Summary',
    route: '/employee/dashboard/my-requests-summary',
    icon: 'bi bi-clipboard-data-fill',
  },
  { label: 'My Activity', route: '/employee/dashboard/my-activity', icon: 'bi bi-activity' },
  { label: 'Catalog Items', route: '/employee/dashboard/catalog-items', icon: 'bi bi-boxes' },
  { label: 'My Requests', route: '/employee/dashboard/my-requests', icon: 'bi bi-card-list' },
];

export function getMenuConfigForRole(role: string): MenuItem[] {
  if (role === 'manager') {
    return managerMenuConfig;
  }

  if (role === 'compliance-officer') {
    return complianceOfficerMenuConfig;
  }

  return employeeMenuConfig;
}

export const menuConfig: MenuItem[] = employeeMenuConfig;
