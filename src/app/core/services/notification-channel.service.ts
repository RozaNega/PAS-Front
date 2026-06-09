import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { SmsService } from './sms.service';
import { AuditLogService } from './audit-log.service';
import { SignalRService } from './signalr.service';
import { WorkflowService, NotificationMessage, UserRole } from './workflow.service';
import {
  NotificationDto,
  NotificationPriority,
  NotificationChannel,
  PRIORITY_CHANNEL_MAP,
} from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationChannelService {
  private readonly apiService = inject(ApiService);
  private readonly smsService = inject(SmsService);
  private readonly auditLog = inject(AuditLogService);
  private readonly signalR = inject(SignalRService);
  private readonly workflowService = inject(WorkflowService);

  private readonly roleMapping: Record<string, UserRole> = {
    Employee: 'Employee',
    Manager: 'Manager',
    Admin: 'Admin',
    Storekeeper: 'Storekeeper',
    'Compliance Officer': 'Compliance',
    Director: 'Director',
  };

  dispatch(notification: NotificationDto): void {
    const channels = PRIORITY_CHANNEL_MAP[notification.priority] ?? ['in-app'];

    for (const channel of channels) {
      switch (channel) {
        case 'in-app':
          this.sendInApp(notification);
          break;
        case 'email':
          this.sendEmail(notification);
          break;
        case 'sms':
          this.sendSms(notification);
          break;
      }
    }

    if (notification.priority === 'Critical' || notification.priority === 'High') {
      this.auditLog.createAuditLog(
        'SYSTEM_MAINTENANCE',
        'Notifications',
        `[${notification.priority}] ${notification.title} sent to ${notification.userId} via ${channels.join(', ')}`,
        {
          severity: notification.priority === 'Critical' ? 'critical' : 'warning',
          metadata: {
            notificationId: notification.id,
            channels,
            priority: notification.priority,
          },
        },
      );
    }

    this.apiService.post('Notifications/send', {
      id: notification.id,
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      priority: notification.priority,
      isRead: false,
      actionUrl: notification.actionUrl,
      actionButtonText: notification.actionButtonText,
      relatedEntityType: notification.relatedEntityType,
      relatedEntityId: notification.relatedEntityId,
      channels,
    }).subscribe({ error: () => {} });
  }

  markAsRead(id: string): void {
    this.signalR.markNotificationAsRead(id);
    this.apiService.post(`Notifications/${id}/read`, {}).subscribe({ error: () => {} });
  }

  markAllAsRead(userId: string): void {
    this.signalR.markAllNotificationsAsRead();
    this.apiService.post('Notifications/read-all', {}).subscribe({ error: () => {} });
  }

  private sendInApp(notification: NotificationDto): void {
    const type = this.mapPriorityToType(notification.priority);

    const msg: NotificationMessage = {
      id: notification.id,
      recipientId: notification.userId,
      recipientRole: this.resolveRole(notification.userId),
      type,
      title: notification.title,
      message: notification.message,
      requestId: notification.relatedEntityId,
      isRead: false,
      createdDate: new Date(),
      actionRequired: notification.priority === 'Critical' || notification.priority === 'High',
      actionUrl: notification.actionUrl,
    };

    (this.workflowService as any).createNotification?.(msg);
    this.signalR.pushNotification({
      id: notification.id,
      userId: notification.userId,
      message: `${notification.title}: ${notification.message}`,
      isRead: false,
      sentDate: new Date(),
      type: type,
      title: notification.title,
      actionUrl: notification.actionUrl,
    });
  }

  private sendEmail(notification: NotificationDto): void {
    this.apiService.post('Notifications/send-email', {
      to: notification.userId,
      subject: notification.title,
      body: notification.message,
      priority: notification.priority,
      actionUrl: notification.actionUrl,
      actionButtonText: notification.actionButtonText,
    }).subscribe({ error: () => {} });
  }

  private sendSms(notification: NotificationDto): void {
    this.smsService.send({
      to: notification.userId,
      message: `${notification.title}: ${notification.message}`,
      priority: 'Critical',
      eventName: notification.relatedEntityType || 'System',
    });
  }

  private mapPriorityToType(priority: NotificationPriority): 'info' | 'success' | 'warning' | 'error' {
    switch (priority) {
      case 'Critical': return 'error';
      case 'High': return 'warning';
      case 'Normal': return 'info';
      case 'Low': return 'info';
    }
  }

  private resolveRole(userId: string): UserRole {
    for (const [roleName, role] of Object.entries(this.roleMapping)) {
      if (userId.toLowerCase().includes(roleName.toLowerCase())) return role;
    }
    return 'Employee';
  }
}
