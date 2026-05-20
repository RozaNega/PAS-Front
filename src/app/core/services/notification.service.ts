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
    return this.apiService.get<ApiResponseModel<NotificationListDto>>('Notifications', params);
  }

  getUnreadCount(): Observable<ApiResponseModel<number>> {
    return this.apiService.get<ApiResponseModel<number>>('Notifications/unread-count');
  }

  markAsRead(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.post<ApiResponseModel<any>>(`Notifications/${id}/read`, {});
  }

  markAllAsRead(): Observable<ApiResponseModel<any>> {
    return this.apiService.post<ApiResponseModel<any>>('Notifications/read-all', {});
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
