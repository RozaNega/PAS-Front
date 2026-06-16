import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { WorkflowService, NotificationMessage, UserRole } from '../../../../core/services/workflow.service';
import { CurrentUserService } from '../../../../core/services/current-user.service';
import { UsersService, User } from '../../../../core/services/users.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-risk-alerts-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './risk-alerts-page.component.html',
  styleUrl: './risk-alerts-page.component.scss',
})
export class RiskAlertsPageComponent implements OnInit {
  private readonly workflowService = inject(WorkflowService);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly usersService = inject(UsersService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  users: User[] = [];
  composeMessage = '';
  selectedUserId = '';
  customName = '';
  showCustomName = false;
  sending = false;
  sentMessage: string | null = null;

  searchQuery = '';
  filterType = signal<'All' | 'unread' | 'info' | 'warning' | 'error' | 'success'>('All');

  // Load notifications for Compliance role
  protected readonly allNotifications = computed<NotificationMessage[]>(() => {
    const user = this.currentUserService.getCurrentUserValue();
    return this.workflowService.getNotificationsForUser(user?.id || '', 'Compliance');
  });

  // Filtered notifications list
  protected readonly filteredNotifications = computed<NotificationMessage[]>(() => {
    let list = this.allNotifications();
    const query = this.searchQuery.trim().toLowerCase();

    if (query) {
      list = list.filter(n => 
        n.title.toLowerCase().includes(query) || 
        n.message.toLowerCase().includes(query)
      );
    }

    const type = this.filterType();
    if (type !== 'All') {
      if (type === 'unread') {
        list = list.filter(n => !n.isRead);
      } else {
        list = list.filter(n => n.type === type);
      }
    }

    // Sort newest first
    return [...list].sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
  });

  // Unread badge count
  protected readonly unreadCount = computed(() => {
    return this.allNotifications().filter(n => !n.isRead).length;
  });

  ngOnInit(): void {
    this.loadUsers();
    // Ensure notifications are loaded
    this.workflowService.escalateStalePendingRequests();
  }

  loadUsers(): void {
    this.usersService.getAll().subscribe({
      next: (res) => {
        if (res.success && res.data && 'items' in res.data) {
          this.users = (res.data as { items: User[] }).items.filter(u => u.isActive);
        } else {
          this.users = [];
        }
      },
      error: () => {
        this.users = [];
      },
    });
  }

  onUserSelect(value: string): void {
    this.selectedUserId = value;
    this.showCustomName = value === '__other__';
    if (value !== '__other__') {
      this.customName = '';
    }
  }

  sendNotification(): void {
    const msg = this.composeMessage.trim();
    if (!msg) return;

    let userId = this.selectedUserId;
    if (this.showCustomName) {
      const name = this.customName.trim();
      if (!name) return;
      userId = name;
    }
    if (!userId) return;

    // Add local workflow notification so it shows up in recipient's dashboard
    const recipient = this.users.find(u => (u.userId || String(u.id)) === userId);
    const recipientRole = recipient ? this.mapUserRole(recipient.role) : 'Employee';
    (this.workflowService as any).createNotification({
      recipientId: userId,
      recipientRole,
      type: 'info',
      title: 'New Notification',
      message: msg,
    });

    // Show success and clear form immediately
    this.composeMessage = '';
    this.selectedUserId = '';
    this.customName = '';
    this.showCustomName = false;
    this.sentMessage = 'Notification sent successfully';
    this.sending = false;
    setTimeout(() => this.sentMessage = null, 3000);

    // Fire-and-forget the API call (best effort, no UI impact)
    this.notificationService.create({ userId, message: msg }).pipe(timeout(15000)).subscribe();
  }

  private mapUserRole(role: string): UserRole {
    const map: Record<string, UserRole> = {
      'Employee': 'Employee',
      'Manager': 'Manager',
      'Admin': 'Admin',
      'Compliance Officer': 'Compliance',
      'Storekeeper': 'Storekeeper',
      'Director': 'Director',
    };
    return map[role] || 'Employee';
  }

  getTypeIcon(type: 'info' | 'success' | 'warning' | 'error'): string {
    switch (type) {
      case 'error':
        return 'bi-exclamation-octagon-fill';
      case 'warning':
        return 'bi-exclamation-triangle-fill';
      case 'success':
        return 'bi-check-circle-fill';
      case 'info':
      default:
        return 'bi-info-circle-fill';
    }
  }

  markAsRead(id: string): void {
    this.workflowService.markNotificationAsRead(id);
  }

  markAllAsRead(): void {
    const user = this.currentUserService.getCurrentUserValue();
    const userId = user?.id || '';
    this.workflowService.markAllNotificationsAsRead(userId, 'Compliance');
    alert('All compliance notifications marked as read.');
  }

  dismissNotification(id: string): void {
    this.workflowService.dismissNotification(id);
  }

  takeAction(notif: NotificationMessage): void {
    this.markAsRead(notif.id);
    this.workflowService.createNotification({
      recipientId: '',
      recipientRole: 'Manager',
      type: 'warning',
      title: 'Compliance Flag - Manager Review Required',
      message: `Compliance flagged: ${notif.title}: ${notif.message} - Please review and take action`,
      requestId: notif.requestId,
      actionRequired: true,
      actionUrl: `/manager/dashboard`,
    });
    alert('Manager notified of compliance flag. Compliance will be updated when manager takes action.');
  }

  viewAlertDetail(notif: NotificationMessage): void {
    this.markAsRead(notif.id);
    if (notif.actionUrl) {
      void this.router.navigate([notif.actionUrl]);
    } else if (notif.requestId) {
      void this.router.navigate(['/compliance/requests', notif.requestId]);
    } else {
      void this.router.navigate(['/compliance/dashboard']);
    }
  }

  refreshAlerts(): void {
    this.workflowService.escalateStalePendingRequests();
    alert('Notifications synchronized successfully!');
  }
}
