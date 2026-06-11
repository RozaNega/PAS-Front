import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WorkflowService, NotificationMessage, UserRole } from '../../../../core/services/workflow.service';
import { CurrentUserService } from '../../../../core/services/current-user.service';

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
  private readonly router = inject(Router);

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
    // Ensure notifications are loaded
    this.workflowService.escalateStalePendingRequests();
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

  refreshAlerts(): void {
    this.workflowService.escalateStalePendingRequests();
    alert('Notifications synchronized successfully!');
  }
}
