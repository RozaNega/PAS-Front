import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';

import {
  NotificationFeatureService,
  Notification,
} from '../../services/notification-feature.service';
import { NotificationService as ToastService } from '../../../../../core/services/notification.service';
import { pasApiUrlHint } from '../../../../../core/config/api-base';

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './notification-list.component.html',
  styleUrls: ['./notification-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationListComponent {
  private readonly router = inject(Router);
  private readonly notificationsApi = inject(NotificationFeatureService);
  private readonly toast = inject(ToastService);

  readonly notifications = signal<Notification[]>([]);
  readonly loading = signal(false);
  readonly actionBusy = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly searchQuery = signal('');
  readonly currentFilter = signal<'all' | 'unread'>('all');

  readonly unreadCount = computed(
    () => this.notifications().filter((n) => !n.isRead).length,
  );

  readonly dashboardBackLink = computed(() => {
    const url = this.router.url;
    if (url.startsWith('/admin')) return '/admin/dashboard';
    if (url.startsWith('/storekeeper')) return '/storekeeper/dashboard';
    if (url.startsWith('/manager')) return '/manager/dashboard';
    return '/employee/dashboard';
  });

  readonly pageSubtitle = computed(() => {
    const url = this.router.url;
    if (url.startsWith('/admin')) return 'Administrator · system and workflow alerts';
    if (url.startsWith('/storekeeper')) return 'Storekeeper · receiving and inventory alerts';
    if (url.startsWith('/manager')) return 'Manager · approvals and team alerts';
    return 'Your account notifications';
  });

  readonly filteredNotifications = computed(() => {
    let list = this.notifications();
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter((n) => n.message.toLowerCase().includes(q));
    }
    if (this.currentFilter() === 'unread') {
      list = list.filter((n) => !n.isRead);
    }
    return list;
  });

  constructor() {
    this.loadNotifications();
  }

  apiConnectionHint(): string {
    return pasApiUrlHint();
  }

  loadNotifications(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.notificationsApi
      .getNotifications()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          if (response.success !== false && response.data?.notifications) {
            this.notifications.set(response.data.notifications);
          } else {
            this.notifications.set([]);
            if (response.success === false && response.message) {
              this.loadError.set(response.message);
            }
          }
        },
        error: (err: unknown) => {
          this.notifications.set([]);
          const hint = pasApiUrlHint();
          const msg =
            err instanceof HttpErrorResponse && err.status === 0
              ? `Could not reach the notifications API. ${hint}`
              : `Could not load notifications. ${hint}`;
          this.loadError.set(msg);
          this.toast.error('Failed to load notifications');
        },
      });
  }

  setFilter(filter: 'all' | 'unread'): void {
    this.currentFilter.set(filter);
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }

  markAsRead(id: string, event?: Event): void {
    event?.stopPropagation();
    const n = this.notifications().find((x) => x.id === id);
    if (!n || n.isRead) return;

    this.notificationsApi.markAsRead(id).subscribe({
      next: (res) => {
        if (res.success !== false) {
          this.notifications.update((list) =>
            list.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
          );
        } else {
          this.toast.error(res.message || 'Could not mark as read');
        }
      },
      error: () => this.toast.error('Could not mark notification as read'),
    });
  }

  markAllAsRead(): void {
    if (this.unreadCount() === 0) {
      this.toast.info('No unread notifications');
      return;
    }
    this.actionBusy.set(true);
    this.notificationsApi
      .markAllAsRead()
      .pipe(finalize(() => this.actionBusy.set(false)))
      .subscribe({
        next: (res) => {
          if (res.success !== false) {
            this.notifications.update((list) => list.map((n) => ({ ...n, isRead: true })));
            this.toast.success('All notifications marked as read');
          } else {
            this.toast.error(res.message || 'Could not mark all as read');
          }
        },
        error: () => this.toast.error('Could not mark all as read'),
      });
  }

  dismissNotification(id: string, event: Event): void {
    event.stopPropagation();
    this.notificationsApi.deleteNotification(id).subscribe({
      next: (res) => {
        if (res.success !== false) {
          this.notifications.update((list) => list.filter((n) => n.id !== id));
          this.toast.success('Notification dismissed');
        } else {
          this.toast.error(res.message || 'Could not dismiss');
        }
      },
      error: () => this.toast.error('Could not dismiss notification'),
    });
  }

  formatTime(timestamp: Date | string): string {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    if (Number.isNaN(date.getTime())) return '—';

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 0) return date.toLocaleString();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hr${hours !== 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  previewTitle(message: string): string {
    const t = (message || '').trim();
    if (t.length <= 72) return t;
    return `${t.slice(0, 72)}…`;
  }

  getIconClass(message: string): string {
    const msg = (message || '').toLowerCase();
    if (msg.includes('success') || msg.includes('approved')) return 'bi-check-circle-fill';
    if (msg.includes('warning') || msg.includes('pending')) return 'bi-exclamation-triangle-fill';
    if (msg.includes('error') || msg.includes('rejected') || msg.includes('failed')) return 'bi-x-circle-fill';
    if (msg.includes('info')) return 'bi-info-circle-fill';
    return 'bi-bell-fill';
  }

  cardTone(n: Notification): string {
    const t = (n.type || '').toLowerCase();
    const m = (n.message || '').toLowerCase();
    if (t === 'error' || m.includes('error') || m.includes('rejected') || m.includes('failed')) return 'tone-error';
    if (t === 'warning' || m.includes('warning') || m.includes('pending')) return 'tone-warning';
    if (t === 'success' || m.includes('success') || m.includes('approved')) return 'tone-success';
    return 'tone-info';
  }
}
