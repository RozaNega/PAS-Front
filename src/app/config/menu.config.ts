export interface MenuItem {
  label: string;
  route?: string;
  icon: string;
  permission?: string;
  role?: string;
  children?: MenuItem[];
}

export const menuConfig: MenuItem[] = [
  { label: 'Dashboard', route: '/dashboard', icon: 'bi bi-house-fill' },
  { label: 'Warehouse List', route: '/storage/warehouses/list', icon: 'bi bi-bank2' },
  { label: 'Shelf List', route: '/storage/shelf-locations/list', icon: 'bi bi-grid-3x3-gap-fill' },
  { label: 'Stock List', route: '/storage/inventory-stock/list', icon: 'bi bi-box-seam-fill' },
  { label: 'Ledger List', route: '/storage/stock-ledger/list', icon: 'bi bi-journal-text' },
  { label: 'Catalog Categories', route: '/catalog/categories', icon: 'bi bi-tags-fill' },
  { label: 'User Profile', route: '/dashboard/profile', icon: 'bi bi-person-circle' },
  { label: 'Notifications', route: '/notifications', icon: 'bi bi-bell-fill' },
  { label: 'Reports', route: '/reports', icon: 'bi bi-bar-chart-line-fill' },
  { label: 'Catalog Items', route: '/catalog/items', icon: 'bi bi-boxes' },
  { label: 'Warehouse Overview', route: '/storage/warehouses', icon: 'bi bi-buildings-fill' },
  { label: 'Shelf Overview', route: '/storage/shelf-locations', icon: 'bi bi-map-fill' },
  { label: 'Inventory Overview', route: '/storage/inventory-stock', icon: 'bi bi-archive-fill' }
];



