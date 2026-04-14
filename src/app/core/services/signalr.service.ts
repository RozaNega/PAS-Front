import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { NotificationService } from './notification.service';

export interface Notification {
  id: string;
  message: string;
  type: string;
  sentDate: Date;
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

  stopConnection(): void {
    // No active connection in placeholder implementation.
  }
}


