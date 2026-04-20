import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../../config/api.config';
import { ApiService } from '../../../../core/services/api.service';
import { ApiResponse } from '../../../../types/api-response.type';

export interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  sentDate: string;
  timeAgo: string;
}

export interface NotificationList {
  notifications: Notification[];
  totalCount: number;
  unreadCount: number;
  pageNumber: number;
  totalPages: number;
}

@Injectable()
export class NotificationService {
  constructor(private apiService: ApiService) {}

  getNotifications(params?: any): Observable<ApiResponse<NotificationList>> {
    return this.apiService.get<ApiResponse<NotificationList>>(API_ENDPOINTS.NOTIFICATIONS.GET_ALL, params);
  }

  getUnreadCount(): Observable<ApiResponse<number>> {
    return this.apiService.get<ApiResponse<number>>(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
  }

  markAsRead(id: string): Observable<ApiResponse<object>> {
    return this.apiService.post<ApiResponse<object>>(API_ENDPOINTS.NOTIFICATIONS.MARK_AS_READ(id), {});
  }

  markAllAsRead(): Observable<ApiResponse<object>> {
    return this.apiService.post<ApiResponse<object>>(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ, {});
  }
}
