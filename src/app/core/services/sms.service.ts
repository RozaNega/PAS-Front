import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { AuditLogService } from './audit-log.service';

export interface SmsPayload {
  to: string;
  message: string;
  priority: 'Critical' | 'High';
  eventName: string;
}

@Injectable({ providedIn: 'root' })
export class SmsService {
  private readonly apiService = inject(ApiService);
  private readonly auditLog = inject(AuditLogService);

  send(payload: SmsPayload): void {
    this.apiService.post('Notifications/send-sms', {
      phoneNumber: payload.to,
      message: payload.message,
      priority: payload.priority,
      eventName: payload.eventName,
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.auditLog.createAuditLog(
            'SYSTEM_MAINTENANCE',
            'Notifications',
            `SMS sent for ${payload.eventName} to ${payload.to}`,
            { severity: 'info', metadata: { event: payload.eventName, priority: payload.priority } },
          );
        }
      },
      error: (err) => {
        console.warn(`[SmsService] Failed to send SMS for ${payload.eventName}:`, err);
        this.auditLog.createAuditLog(
          'SYSTEM_MAINTENANCE',
          'Notifications',
          `SMS send failed for ${payload.eventName} to ${payload.to}`,
          { severity: 'warning', metadata: { error: err.message } },
        );
      },
    });
  }
}
