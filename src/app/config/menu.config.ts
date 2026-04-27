export interface MenuItem {
  label: string;
  route?: string;
  icon: string;
  permission?: string;
  role?: string;
  children?: MenuItem[];
}

export const managerMenuConfig: MenuItem[] = [
  { label: 'Manager Dashboard', route: '/manager/dashboard', icon: 'bi bi-clipboard2-data-fill' },
];

export const complianceOfficerMenuConfig: MenuItem[] = [
  {
    label: 'Compliance Dashboard',
    route: '/compliance-officer/dashboard',
    icon: 'bi bi-shield-check',
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
