import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../../../config/api.config';
import { ApiService } from '../../../../core/services/api.service';
import { ApiResponse } from '../../../../types/api-response.type';
import { toCamelCaseDeep, unwrapPasEnvelope } from '../../../../core/utils/pas-api-json.util';

export interface Notification {
  id: string;
  userId?: string;
  message: string;
  isRead: boolean;
  sentDate: string;
  type?: string;
  createdAt?: string;
  updatedAt?: string;
  isDeleted?: boolean;
}

export interface NotificationList {
  notifications: Notification[];
  totalCount: number;
  unreadCount: number;
  pageNumber: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationFeatureService {
  constructor(private readonly apiService: ApiService) {}

  getNotifications(params?: Record<string, unknown>): Observable<ApiResponse<NotificationList>> {
    return this.apiService.get<unknown>(API_ENDPOINTS.NOTIFICATIONS.GET_ALL, params).pipe(
      map((raw) => this.normalizeListResponse(raw)),
    );
  }

  getUnreadCount(): Observable<ApiResponse<number>> {
    return this.apiService.get<unknown>(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT).pipe(
      map((raw) => this.normalizeNumberResponse(raw)),
    );
  }

  markAsRead(id: string): Observable<ApiResponse<unknown>> {
    return this.apiService.post<unknown>(API_ENDPOINTS.NOTIFICATIONS.MARK_AS_READ(id), {}).pipe(
      map((raw) => this.normalizeVoidResponse(raw)),
    );
  }

  markAllAsRead(): Observable<ApiResponse<unknown>> {
    return this.apiService.post<unknown>(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ, {}).pipe(
      map((raw) => this.normalizeVoidResponse(raw)),
    );
  }

  deleteNotification(id: string): Observable<ApiResponse<unknown>> {
    return this.apiService.delete<unknown>(API_ENDPOINTS.NOTIFICATIONS.DELETE(id)).pipe(
      map((raw) => this.normalizeVoidResponse(raw)),
    );
  }

  private normalizeListResponse(raw: unknown): ApiResponse<NotificationList> {
    /** Root `{ notifications: [...] }` without a `data` wrapper (common ASP.NET shapes). */
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const root = raw as Record<string, unknown>;
      const direct = root['notifications'] ?? root['Notifications'];
      if (Array.isArray(direct)) {
        const notifications = direct.map((row) => this.coerceNotification(row));
        const explicitFail = root['success'] === false || root['Success'] === false;
        return {
          success: !explicitFail,
          message:
            (typeof root['message'] === 'string' ? root['message'] : undefined) ??
            (typeof root['Message'] === 'string' ? root['Message'] : undefined) ??
            '',
          data: {
            notifications,
            totalCount: notifications.length,
            unreadCount: notifications.filter((n) => !n.isRead).length,
            pageNumber: 1,
            totalPages: 1,
          },
          statusCode: typeof root['statusCode'] === 'number' ? root['statusCode'] : 200,
        };
      }
    }

    const env = unwrapPasEnvelope<unknown>(raw);
    const inner = env.data;
    let rows: unknown[] = [];

    if (Array.isArray(inner)) {
      rows = inner;
    } else if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      const o = inner as Record<string, unknown>;
      const list = o['notifications'] ?? o['Notifications'] ?? o['items'] ?? o['Items'];
      rows = Array.isArray(list) ? list : [];
    }

    const notifications = rows.map((r) => this.coerceNotification(r));
    const unreadCount = notifications.filter((n) => !n.isRead).length;

    const data: NotificationList = {
      notifications,
      totalCount: notifications.length,
      unreadCount,
      pageNumber: 1,
      totalPages: 1,
    };

    return {
      success: env.success !== false,
      message: env.message ?? '',
      data,
      statusCode: env.statusCode ?? 200,
    };
  }

  private coerceNotification(row: unknown): Notification {
    const n = toCamelCaseDeep<Notification>(row);
    const fallbackId =
      typeof globalThis !== 'undefined' && 'crypto' in globalThis && typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return {
      ...n,
      id: n.id != null && String(n.id).trim() !== '' ? String(n.id) : fallbackId,
      message: (n.message ?? '').trim() || '(No message)',
      isRead: Boolean(n.isRead),
      sentDate: n.sentDate || n.createdAt || new Date().toISOString(),
    };
  }

  private normalizeNumberResponse(raw: unknown): ApiResponse<number> {
    const env = unwrapPasEnvelope<unknown>(raw);
    const v = env.data;
    const num = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : 0;
    return {
      success: env.success !== false,
      message: env.message ?? '',
      data: Number.isFinite(num) ? num : 0,
      statusCode: env.statusCode ?? 200,
    };
  }

  private normalizeVoidResponse(raw: unknown): ApiResponse<unknown> {
    const env = unwrapPasEnvelope<unknown>(raw);
    return {
      success: env.success !== false,
      message: env.message ?? '',
      data: env.data,
      statusCode: env.statusCode ?? 200,
    };
  }
}
