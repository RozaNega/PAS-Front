import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { NotificationService } from './notification.service';

export interface Notification {
  id: string;
  userId?: string;
  message: string;
  isRead: boolean;
  sentDate: Date;
  type?: string;
  createdAt?: Date;
  updatedAt?: Date;
  isDeleted?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SignalRService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  constructor(private notificationService: NotificationService) {}

  startConnection(): void {
    // Placeholder until backend hub events are wired.
    this.notificationService.info('Realtime notifications are initialized.');
  }

  pushNotification(notification: Notification): void {
    const current = this.notificationsSubject.value;
    this.notificationsSubject.next([notification, ...current]);
    this.notificationService.info(notification.message, 'New Notification');
  }

  markNotificationAsRead(id: string): void {
    if (!id) return;
    this.notificationsSubject.next(
      this.notificationsSubject.value.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
  }

  markAllNotificationsAsRead(): void {
    this.notificationsSubject.next(this.notificationsSubject.value.map((n) => ({ ...n, isRead: true })));
  }

  dismissNotification(id: string): void {
    if (!id) return;
    this.notificationsSubject.next(this.notificationsSubject.value.filter((n) => n.id !== id));
  }

  stopConnection(): void {
    // No active connection in placeholder implementation.
  }
}


