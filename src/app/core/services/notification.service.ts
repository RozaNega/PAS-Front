import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface NotificationDto {
  id: string;
  message: string;
  isRead: boolean;
  sentDate: string;
  timeAgo: string;
}

export interface NotificationListDto {
  notifications: NotificationDto[];
  totalCount: number;
  unreadCount: number;
  pageNumber: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor(private apiService: ApiService) {}

  getAll(params?: { showOnlyUnread?: boolean; pageNumber?: number; pageSize?: number }): Observable<ApiResponseModel<NotificationListDto>> {
    return this.apiService.get<NotificationListDto>('Notifications', params);
  }

  getUnreadCount(): Observable<ApiResponseModel<number>> {
    return this.apiService.get<number>('Notifications/unread-count');
  }

  markAsRead(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.post<any>(`Notifications/${id}/read`, {});
  }

  markAllAsRead(): Observable<ApiResponseModel<any>> {
    return this.apiService.post<any>('Notifications/read-all', {});
  }

  /**
   * Create a notification for a specific user.
   * Used by admins to send password-reset instructions
   * or any other message that should appear in the user's dashboard.
   */
  create(payload: { userId: string; message: string }): Observable<ApiResponseModel<string>> {
    return this.apiService.post<string>('Notifications', {
      userId: payload.userId,
      message: payload.message
    });
  }

  getNotifications(): Observable<ApiResponseModel<NotificationListDto>> {
    const params = { pageNumber: 1, pageSize: 50 };
    return this.getAll(params);
  }

  deleteNotification(id: string | number): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<any>(`Notifications/${id}`);
  }

  // UI toast helpers (kept for backward compatibility)
  success(message: string): void {
    console.log('SUCCESS:', message);
  }

  info(message: string, title?: string): void {
    if (title) {
      console.log(`INFO (${title}):`, message);
      return;
    }
    console.log('INFO:', message);
  }

  error(message: string): void {
    console.error('ERROR:', message);
  }
}
