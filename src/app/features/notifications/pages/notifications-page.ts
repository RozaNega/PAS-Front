import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type NotificationType = 'Info' | 'Success' | 'Warning' | 'Error';

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: string;
  read: boolean;
};

interface StatCard {
  label: string;
  value: string;
  pct: number;
  color: string;
  icon: string;
}

interface DonutSegment {
  label: string;
  value: number;
  pct: number;
  color: string;
  dashArray: string;
  dashOffset: number;
}

interface DayActivity {
  day: string;
  count: number;
  pct: number;
  color: string;
}

const BAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const TYPE_COLORS: Record<NotificationType, string> = { Info: '#3b82f6', Success: '#10b981', Warning: '#f59e0b', Error: '#ef4444' };



function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '—';
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hr${hours !== 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getTypeIcon(type: NotificationType): string {
  const map: Record<NotificationType, string> = {
    Info: 'bi-info-circle-fill',
    Success: 'bi-check-circle-fill',
    Warning: 'bi-exclamation-triangle-fill',
    Error: 'bi-x-circle-fill',
  };
  return map[type];
}

function isToday(date: Date): boolean {
  const now = new Date();
  return date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function isYesterday(date: Date): boolean {
  const yesterday = new Date(Date.now() - 86400000);
  return date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();
}

function isThisWeek(date: Date): boolean {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  return date >= weekStart;
}

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notifications-page.html',
  styleUrl: './notifications-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPage {
  readonly Math = Math;
  readonly TYPE_COLORS = TYPE_COLORS;

  readonly loadError = signal<string | null>('Notifications API not available');

  readonly allNotifications = signal<NotificationItem[]>([]);

  searchTerm = signal('');
  typeFilter = signal<NotificationType | 'All'>('All');
  readFilter = signal<'all' | 'unread' | 'read'>('all');
  currentPage = signal(1);
  readonly pageSize = 5;

  readonly typeOptions: (NotificationType | 'All')[] = ['All', 'Info', 'Success', 'Warning', 'Error'];
  readonly readFilters: ('all' | 'unread' | 'read')[] = ['all', 'unread', 'read'];

  readonly filteredNotifications = computed(() => {
    let list = this.allNotifications();
    const search = this.searchTerm().toLowerCase();
    const type = this.typeFilter();
    const read = this.readFilter();

    if (search) {
      list = list.filter(n => n.title.toLowerCase().includes(search) || n.message.toLowerCase().includes(search));
    }
    if (type !== 'All') {
      list = list.filter(n => n.type === type);
    }
    if (read === 'unread') {
      list = list.filter(n => !n.read);
    } else if (read === 'read') {
      list = list.filter(n => n.read);
    }
    return list;
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredNotifications().length / this.pageSize)));

  readonly paginatedNotifications = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredNotifications().slice(start, start + this.pageSize);
  });

  readonly unreadCount = computed(() => this.allNotifications().filter(n => !n.read).length);

  readonly statCards = computed((): StatCard[] => {
    const all = this.allNotifications();
    const total = all.length;
    const unread = all.filter(n => !n.read).length;
    const success = all.filter(n => n.type === 'Success').length;
    const warnings = all.filter(n => n.type === 'Warning').length;
    const errors = all.filter(n => n.type === 'Error').length;
    const info = all.filter(n => n.type === 'Info').length;

    return [
      { label: 'Total', value: total.toString(), pct: 100, color: '#3b82f6', icon: 'bi-bell-fill' },
      { label: 'Unread', value: unread.toString(), pct: total > 0 ? Math.round(unread / total * 100) : 0, color: '#8b5cf6', icon: 'bi-envelope-fill' },
      { label: 'Success', value: success.toString(), pct: total > 0 ? Math.round(success / total * 100) : 0, color: '#10b981', icon: 'bi-check-circle-fill' },
      { label: 'Warnings', value: warnings.toString(), pct: total > 0 ? Math.round(warnings / total * 100) : 0, color: '#f59e0b', icon: 'bi-exclamation-triangle-fill' },
      { label: 'Errors', value: errors.toString(), pct: total > 0 ? Math.round(errors / total * 100) : 0, color: '#ef4444', icon: 'bi-x-circle-fill' },
      { label: 'Info', value: info.toString(), pct: total > 0 ? Math.round(info / total * 100) : 0, color: '#3b82f6', icon: 'bi-info-circle-fill' },
    ];
  });

  readonly typeDist = computed(() => {
    const counts = new Map<NotificationType, number>();
    this.filteredNotifications().forEach(n => counts.set(n.type, (counts.get(n.type) || 0) + 1));
    const total = this.filteredNotifications().length || 1;
    const order: NotificationType[] = ['Info', 'Success', 'Warning', 'Error'];
    return order.filter(t => counts.has(t)).map(t => ({ type: t, count: counts.get(t)!, pct: Math.round(counts.get(t)! / total * 100), color: TYPE_COLORS[t] }));
  });

  readonly donutSegments = computed((): DonutSegment[] => {
    const C = 2 * Math.PI * 50;
    let cumulative = 0;
    return this.typeDist().map(d => {
      const dashLen = C * d.pct / 100;
      const seg: DonutSegment = {
        label: d.type,
        value: d.count,
        pct: d.pct,
        color: d.color,
        dashArray: `${dashLen} ${C}`,
        dashOffset: cumulative,
      };
      cumulative += dashLen;
      return seg;
    });
  });

  readonly dayActivity = computed((): DayActivity[] => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = new Array(7).fill(0);
    this.allNotifications().forEach(n => {
      const d = new Date(n.createdAt).getDay();
      counts[d]++;
    });
    const max = Math.max(...counts, 1);
    return days.map((day, i) => ({
      day,
      count: counts[i],
      pct: Math.round(counts[i] / max * 100),
      color: counts[i] > 0 ? '#8b5cf6' : '#e2e8f0',
    }));
  });

  readonly timelineGroups = computed(() => {
    const groups: { label: string; items: NotificationItem[] }[] = [];
    const today: NotificationItem[] = [];
    const yesterday: NotificationItem[] = [];
    const thisWeek: NotificationItem[] = [];
    const older: NotificationItem[] = [];

    for (const n of this.paginatedNotifications()) {
      const d = new Date(n.createdAt);
      if (isToday(d)) today.push(n);
      else if (isYesterday(d)) yesterday.push(n);
      else if (isThisWeek(d)) thisWeek.push(n);
      else older.push(n);
    }

    if (today.length) groups.push({ label: 'Today', items: today });
    if (yesterday.length) groups.push({ label: 'Yesterday', items: yesterday });
    if (thisWeek.length) groups.push({ label: 'This Week', items: thisWeek });
    if (older.length) groups.push({ label: 'Older', items: older });

    return groups;
  });

  showConfirmDelete = signal(false);
  notificationToDelete = signal<NotificationItem | null>(null);
  notificationToast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
    this.currentPage.set(1);
  }

  setTypeFilter(type: NotificationType | 'All'): void {
    this.typeFilter.set(type);
    this.currentPage.set(1);
  }

  setReadFilter(filter: 'all' | 'unread' | 'read'): void {
    this.readFilter.set(filter);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  prevPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  getPageRange(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  markAsRead(item: NotificationItem): void {
    if (item.read) return;
    this.allNotifications.update(list => list.map(n => n.id === item.id ? { ...n, read: true } : n));
    this.showToast('Notification marked as read', 'success');
  }

  markAllAsRead(): void {
    const unread = this.allNotifications().filter(n => !n.read);
    if (unread.length === 0) {
      this.showToast('No unread notifications', 'info');
      return;
    }
    this.allNotifications.update(list => list.map(n => ({ ...n, read: true })));
    this.showToast('All notifications marked as read', 'success');
  }

  requestDelete(item: NotificationItem): void {
    this.notificationToDelete.set(item);
    this.showConfirmDelete.set(true);
  }

  cancelDelete(): void {
    this.showConfirmDelete.set(false);
    this.notificationToDelete.set(null);
  }

  confirmDelete(): void {
    const item = this.notificationToDelete();
    if (item) {
      this.allNotifications.update(list => list.filter(n => n.id !== item.id));
      this.showToast(`Notification "${item.title}" dismissed`, 'success');
    }
    this.cancelDelete();
  }

  showToast(message: string, type: 'success' | 'error' | 'info'): void {
    this.notificationToast.set({ message, type });
    setTimeout(() => this.notificationToast.set(null), 3500);
  }

  getTypeIcon(type: NotificationType): string {
    return getTypeIcon(type);
  }

  getTypeColor(type: NotificationType): string {
    return TYPE_COLORS[type];
  }

  getTimeLabel(timestamp: string): string {
    return formatTime(timestamp);
  }
}
