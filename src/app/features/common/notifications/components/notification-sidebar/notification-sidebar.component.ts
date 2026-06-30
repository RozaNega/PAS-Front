import { Component, inject, signal, computed, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NotificationService, NotificationDto } from '../../../../../core/services/notification.service';
import { WorkflowService, NotificationMessage, UserRole } from '../../../../../core/services/workflow.service';
import { CurrentUserService } from '../../../../../core/services/current-user.service';

@Component({
  selector: 'app-notification-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notification-sidebar.component.html',
  styleUrls: ['./notification-sidebar.component.scss'],
})
export class NotificationSidebarComponent {
  private readonly notificationService = inject(NotificationService);
  private readonly workflowService = inject(WorkflowService);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly router = inject(Router);

  @Input() set isOpen(v: boolean) {
    this._isOpen = v;
    if (v) {
      this.loadNotifications();
      this.loadWorkflowNotifs();
    }
  }
  get isOpen(): boolean { return this._isOpen; }
  private _isOpen = false;

  @Output() panelClose = new EventEmitter<void>();
  @Output() badgeCountChange = new EventEmitter<number>();

  notifications = signal<NotificationDto[]>([]);
  workflowNotifs = signal<NotificationMessage[]>([]);
  loadingNotifs = signal(false);
  readonly maxRecent = 4;

  /** Merged API + workflow notifications sorted newest-first */
  mergedRecent = computed(() => {
    const api = this.notifications().map(n => ({
      id: n.id,
      message: n.message,
      isRead: n.isRead,
      date: new Date(n.sentDate).getTime(),
      sender: this.getSender(n.message),
      timeAgo: n.timeAgo || this.formatTime(n.sentDate),
      icon: this.getIconClass(n.message),
    }));
    const wf = this.workflowNotifs().map(n => ({
      id: n.id,
      message: n.message,
      isRead: n.isRead,
      date: new Date(n.createdDate).getTime(),
      sender: this.getSender(n.message, n.type),
      timeAgo: this.formatWfTime(n.createdDate),
      icon: this.getIconClass(n.message),
    }));
    return [...api, ...wf]
      .sort((a, b) => b.date - a.date)
      .slice(0, this.maxRecent * 2);
  });

  constructor() {
    this.loadNotifications();
    this.loadWorkflowNotifs();
    this.workflowService.getNotificationUpdates().subscribe(() => this.loadWorkflowNotifs());
    this.workflowService.getRequestUpdates().subscribe(() => this.loadWorkflowNotifs());
  }

  close(): void {
    this.panelClose.emit();
  }

  viewAll(): void {
    this.close();
    void this.router.navigate([this.notificationsRoute()]);
  }

  private notificationsRoute(): string {
    const url = typeof window !== 'undefined' ? window.location.pathname : '';
    if (url.startsWith('/admin')) return '/admin/notifications';
    if (url.startsWith('/storekeeper')) return '/storekeeper/notifications';
    if (url.startsWith('/manager')) return '/manager/notifications';
    if (url.startsWith('/compliance') || url.startsWith('/compliance-officer')) return '/compliance-officer/notifications';
    if (url.startsWith('/employee')) return '/employee/dashboard/notifications';
    return '/notifications';
  }

  loadWorkflowNotifs(): void {
    const user = this.currentUserService.getCurrentUserValue();
    if (!user?.id) return;
    const role = this.getRoleFromUrl();
    if (!role) return;
    const notifs = this.workflowService.getNotificationsForUser(user.id, role);
    this.workflowNotifs.set(notifs);
    this.emitBadge();
  }

  private getRoleFromUrl(): UserRole | null {
    const url = typeof window !== 'undefined' ? window.location.pathname : '';
    if (url.startsWith('/admin')) return 'Admin';
    if (url.startsWith('/storekeeper')) return 'Storekeeper';
    if (url.startsWith('/manager')) return 'Manager';
    if (url.startsWith('/compliance') || url.startsWith('/compliance-officer')) return 'Compliance';
    if (url.startsWith('/employee')) return 'Employee';
    return null;
  }

  private emitBadge(): void {
    const apiUnread = this.notifications().filter(n => !n.isRead).length;
    const wfUnread = this.workflowNotifs().filter(n => !n.isRead).length;
    this.badgeCountChange.emit(apiUnread + wfUnread);
  }

  loadNotifications(): void {
    this.loadingNotifs.set(true);
    this.notificationService.getNotifications().subscribe({
      next: (res) => {
        if (res.success && res.data?.notifications) {
          this.notifications.set(res.data.notifications);
          this.emitBadge();
        }
        this.loadingNotifs.set(false);
      },
      error: () => {
        this.notifications.set([]);
        this.loadingNotifs.set(false);
        this.emitBadge();
      },
    });
  }

  markAsRead(id: string): void {
    this.notificationService.markAsRead(id).subscribe({
      next: () => {
        this.notifications.update(list => list.map(n => (n.id === id ? { ...n, isRead: true } : n)));
        this.emitBadge();
      },
    });
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.workflowNotifs().forEach(n => this.workflowService.dismissNotification(n.id));
        this.notifications.set([]);
        this.workflowNotifs.set([]);
        this.emitBadge();
      },
      error: () => {
        this.workflowNotifs().forEach(n => this.workflowService.dismissNotification(n.id));
        this.notifications.set([]);
        this.workflowNotifs.set([]);
        this.emitBadge();
      },
    });
  }

  viewDetail(n: NotificationDto): void {
    this.close();
    const match = n.message.match(/SR[-\s]?\d+/);
    if (match) {
      const route = this.notificationsRoute().replace('/notifications', '');
      void this.router.navigate([`${route}/requests`, match[0]]);
    } else {
      void this.router.navigate([this.notificationsRoute()]);
    }
  }

  dismissNotification(id: string): void {
    this.notificationService.deleteNotification(id).subscribe({
      next: () => {
        this.notifications.update(list => list.filter(n => n.id !== id));
        this.emitBadge();
      },
    });
  }

  markWfAsRead(id: string): void {
    this.workflowService.markNotificationAsRead(id);
    this.loadWorkflowNotifs();
  }

  dismissWf(id: string): void {
    this.workflowService.dismissNotification(id);
    this.loadWorkflowNotifs();
  }

  formatWfTime(date: Date): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  }

  get unreadCount(): number {
    const api = this.notifications().filter(n => !n.isRead).length;
    const wf = this.workflowNotifs().filter(n => !n.isRead).length;
    return api + wf;
  }

  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 0) return date.toLocaleString();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    return date.toLocaleDateString();
  }

  getWfIcon(type?: string): string {
    if (type === 'success') return '✅';
    if (type === 'error') return '❌';
    if (type === 'warning') return '⚠️';
    return 'ℹ️';
  }

  formatWfDate(date: Date): string {
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toLocaleString();
  }

  getIconClass(message: string): string {
    const m = (message || '').toLowerCase();
    if (m.includes('approved') || m.includes('completed') || m.includes('success')) return '✅';
    if (m.includes('rejected') || m.includes('failed') || m.includes('error')) return '❌';
    if (m.includes('pending') || m.includes('warning') || m.includes('reminder')) return '⚠️';
    if (m.includes('submitted') || m.includes('info')) return 'ℹ️';
    return '🔔';
  }

  getSender(message: string, type?: string): string {
    if (!message) return 'System';
    const m = message.toLowerCase();
    if (m.includes('password') || m.includes('reset')) return 'System';
    if (m.includes('stock') || m.includes('pickup') || m.includes('store')) return 'Storekeeper';
    if (m.includes('compliance')) return 'Compliance';
    if (m.includes('submitted') && (m.includes('for your review') || m.includes('for your approval'))) return 'Employee';
    if (m.includes('approved') || m.includes('rejected')) {
      if (m.includes('admin')) return 'Admin';
      return 'Manager';
    }
    if (m.includes('completed') || m.includes('fulfilled')) return 'Admin';
    if (m.includes('reminder') || m.includes('pending')) return 'System';
    if (type === 'info') return 'System';
    if (type === 'success') return 'Manager';
    if (type === 'error') return 'Manager';
    if (type === 'warning') return 'System';
    return 'System';
  }
}
