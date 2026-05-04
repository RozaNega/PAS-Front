export type PasRole = 'Super Admin' | 'Admin' | 'Property Manager' | 'Tenant' | 'Guest';

export interface KpiCard {
  label: string;
  value: string;
  delta: string;
}

export interface TimelineItem {
  title: string;
  detail: string;
  at: string;
}

export interface NotificationItem {
  title: string;
  body: string;
  level: 'info' | 'warning' | 'critical';
}
