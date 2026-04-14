export interface MenuItem {
  label: string;
  route: string;
  icon: string;
}

export const menuConfig: MenuItem[] = [
  { label: 'Dashboard', route: '/', icon: 'fas fa-gauge-high' },
  { label: 'Catalog', route: '/', icon: 'fas fa-boxes-stacked' },
  { label: 'Reports', route: '/', icon: 'fas fa-chart-line' },
  { label: 'Settings', route: '/', icon: 'fas fa-gear' }
];



