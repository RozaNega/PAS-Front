export interface MenuItem {
  label: string;
  icon?: string;
  route?: string;
  permissions?: string[];
  children?: MenuItem[];
  badge?: string | number;
  badgeColor?: string;
  expanded?: boolean;
  roles?: string[];
}
