import { Injectable, Injector, inject } from '@angular/core';
import { WorkflowService, NotificationMessage, UserRole } from './workflow.service';
import { AuditLogService } from './audit-log.service';
import { ApiService } from './api.service';
import { SmsService } from './sms.service';
import { NotificationChannelService } from './notification-channel.service';
import { AFROCOM_NOTIFICATION_RULES } from '../constants/afrocom-workflow-policy.const';
import {
  NotificationDto,
  NOTIFICATION_TEMPLATES,
  NotificationEventKey,
  NotificationPriority,
  NotificationType,
} from '../models/notification.model';

export type NotificationEvent =
  | 'New Requisition'
  | 'Requisition Approved'
  | 'Requisition Rejected'
  | 'Requisition Escalated'
  | 'High Value Request'
  | 'Urgent Requisition'
  | 'Items Ready for Pickup'
  | 'Items Issued'
  | 'SIV Created'
  | 'Low Stock Alert'
  | 'Critical Low Stock'
  | 'PO Needs Approval'
  | 'PO Approved'
  | 'Goods Received (GRN)'
  | 'Quality Issue Found'
  | 'Inspection Complete'
  | 'New User Created'
  | 'System Maintenance'
  | 'Audit Log Flagged'
  | 'Policy Violation'
  | 'Monthly Report Ready'
  | 'Approval Reminder'
  | 'Approval Escalated';

export interface NotificationDispatch {
  event: NotificationEvent;
  recipients: { role: UserRole; userId?: string }[];
  title: string;
  message: string;
  requestId?: string;
  actionRequired?: boolean;
  actionUrl?: string;
  priority?: 'Low' | 'Normal' | 'High' | 'Critical';
}

@Injectable({ providedIn: 'root' })
export class NotificationEngineService {
  private readonly injector = inject(Injector);
  private readonly auditLog = inject(AuditLogService);
  private readonly smsService = inject(SmsService);
  private readonly apiService = inject(ApiService);
  private readonly channelService = inject(NotificationChannelService);

  private get workflowService(): WorkflowService {
    return this.injector.get(WorkflowService);
  }

  private readonly responseTimeSla: Record<string, number> = {
    Critical: 15,
    High: 60,
    Normal: 240,
    Low: 1440,
  };

  private readonly phoneNumberByRole: Record<string, string> = {
    Admin: '+251911100001',
    Manager: '+251911100002',
    Storekeeper: '+251911100003',
    Employee: '+251911100004',
    Compliance: '+251911100005',
    Director: '+251911100006',
  };

  dispatch(event: NotificationDispatch): void {
    const rule = AFROCOM_NOTIFICATION_RULES.find((r) => r.event === event.event);
    const methods = rule ? this.parseMethods(rule.method) : ['in-app'];

    const roleMapping: Record<string, UserRole> = {
      Employee: 'Employee',
      Manager: 'Manager',
      Admin: 'Admin',
      Storekeeper: 'Storekeeper',
      'Compliance Officer': 'Compliance',
      Director: 'Director',
    };

    for (const recipient of event.recipients) {
      const mappedRole = roleMapping[recipient.role] || (recipient.role as UserRole);

      const notificationId = this.workflowService['generateId']?.() || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const notification: NotificationMessage = {
        id: notificationId,
        recipientId: recipient.userId || '',
        recipientRole: mappedRole,
        type: this.mapPriorityToType(event.priority || 'Normal'),
        title: event.title,
        message: event.message,
        requestId: event.requestId,
        isRead: false,
        createdDate: new Date(),
        actionRequired: event.actionRequired || false,
        actionUrl: event.actionUrl,
      };

      this.workflowService['createNotification']?.(notification);

      this.apiService.post('Notifications/send', {
        id: notificationId,
        userId: recipient.userId || '',
        role: mappedRole,
        title: event.title,
        message: event.message,
        type: notification.type,
        priority: event.priority || 'Normal',
        requestId: event.requestId,
        actionRequired: event.actionRequired || false,
        actionUrl: event.actionUrl,
      }).subscribe({ error: () => {} });

      const slaMinutes = this.responseTimeSla[event.priority || 'Normal'] || 240;

      const ruleMethods = rule ? this.parseMethods(rule.method) : ['in-app'];
      if (ruleMethods.includes('sms')) {
        const phoneNumber = this.phoneNumberByRole[recipient.role] || '';
        if (phoneNumber) {
          this.smsService.send({
            to: phoneNumber,
            message: `${event.title}: ${event.message}`,
            priority: (event.priority as 'Critical' | 'High') || 'High',
            eventName: event.event,
          });
        }
      }

      if (ruleMethods.includes('email') && recipient.userId) {
        this.apiService.post('Notifications/send-email', {
          to: recipient.userId,
          subject: event.title,
          body: event.message,
          priority: event.priority || 'Normal',
        }).subscribe({ error: () => {} });
      }

      if (event.priority === 'Critical' || event.priority === 'High') {
        this.auditLog.createAuditLog(
          'SYSTEM_MAINTENANCE',
          'Notifications',
          `Notification sent: ${event.title} to ${recipient.role} (priority: ${event.priority}, SLA: ${slaMinutes}min)`,
          { severity: event.priority === 'Critical' ? 'critical' : 'warning', metadata: { event: event.event, recipient: recipient.role, slaMinutes } },
        );
      }
    }
  }

  private parseMethods(method: string): string[] {
    return method
      .split('+')
      .map((m) => m.trim().toLowerCase().replace(/\s+/g, '-'));
  }

  private mapPriorityToType(
    priority: 'Low' | 'Normal' | 'High' | 'Critical',
  ): 'info' | 'success' | 'warning' | 'error' {
    switch (priority) {
      case 'Critical':
        return 'error';
      case 'High':
        return 'warning';
      case 'Normal':
        return 'info';
      case 'Low':
        return 'info';
    }
  }

  notifyNewRequisition(params: {
    employeeName: string;
    managerId: string;
    srNumber: string;
    requestId: string;
    isUrgent?: boolean;
  }): void {
    if (params.isUrgent) {
      this.dispatch({
        event: 'Urgent Requisition',
        recipients: [
          { role: 'Manager', userId: params.managerId },
          { role: 'Storekeeper' },
          { role: 'Admin' },
        ],
        title: 'URGENT: New Requisition',
        message: `${params.employeeName} submitted an urgent requisition ${params.srNumber}`,
        requestId: params.requestId,
        actionRequired: true,
        actionUrl: '/manager/dashboard',
        priority: 'Critical',
      });
      return;
    }

    this.dispatch({
      event: 'New Requisition',
      recipients: [{ role: 'Manager', userId: params.managerId }],
      title: 'New Requisition Submitted',
      message: `${params.employeeName} submitted ${params.srNumber} for your approval`,
      requestId: params.requestId,
      actionRequired: true,
      actionUrl: '/manager/dashboard',
      priority: 'Normal',
    });
  }

  notifyRequisitionApproved(params: {
    srNumber: string;
    employeeId: string;
    employeeName: string;
    storekeeperId?: string;
    requestId: string;
    isHighValue?: boolean;
  }): void {
    this.dispatch({
      event: 'Requisition Approved',
      recipients: [
        { role: 'Employee', userId: params.employeeId },
        { role: 'Storekeeper', userId: params.storekeeperId },
      ],
      title: 'Requisition Approved',
      message: `${params.srNumber} has been approved. ${params.isHighValue ? 'Pending admin review.' : 'Ready for processing.'}`,
      requestId: params.requestId,
      actionRequired: true,
      actionUrl: '/employee/dashboard',
      priority: 'Normal',
    });

    if (params.isHighValue) {
      this.dispatch({
        event: 'High Value Request',
        recipients: [{ role: 'Admin' }],
        title: 'High-Value Requisition Needs Review',
        message: `${params.srNumber} from ${params.employeeName} requires admin approval`,
        requestId: params.requestId,
        actionRequired: true,
        actionUrl: '/admin/dashboard',
        priority: 'High',
      });
    }
  }

  notifyRequisitionRejected(params: {
    srNumber: string;
    employeeId: string;
    employeeName: string;
    requestId: string;
    reason?: string;
  }): void {
    this.dispatch({
      event: 'Requisition Rejected',
      recipients: [{ role: 'Employee', userId: params.employeeId }],
      title: 'Requisition Rejected',
      message: `${params.srNumber} was rejected${params.reason ? `: ${params.reason}` : ''}`,
      requestId: params.requestId,
      actionRequired: false,
      priority: 'Normal',
    });
  }

  notifyItemsReady(params: {
    srNumber: string;
    employeeId: string;
    requestId: string;
  }): void {
    this.dispatch({
      event: 'Items Ready for Pickup',
      recipients: [{ role: 'Employee', userId: params.employeeId }],
      title: 'Items Ready for Pickup',
      message: `Items for ${params.srNumber} are ready at the store`,
      requestId: params.requestId,
      actionRequired: true,
      actionUrl: '/employee/dashboard',
      priority: 'Normal',
    });
  }

  notifySIVCreated(params: {
    sivNumber: string;
    employeeId: string;
    requestId: string;
  }): void {
    this.dispatch({
      event: 'SIV Created',
      recipients: [
        { role: 'Employee', userId: params.employeeId },
        { role: 'Admin' },
      ],
      title: 'SIV Created',
      message: `SIV ${params.sivNumber} has been created for your request`,
      requestId: params.requestId,
      actionRequired: false,
      priority: 'Normal',
    });
  }

  notifyItemsReceived(params: {
    srNumber: string;
    employeeId: string;
    employeeName: string;
    requestId: string;
    storekeeperId?: string;
  }): void {
    this.dispatch({
      event: 'SIV Created',
      recipients: [
        { role: 'Storekeeper', userId: params.storekeeperId },
        { role: 'Admin' },
      ],
      title: 'Items Received by Employee',
      message: `${params.employeeName} has received items for ${params.srNumber}`,
      requestId: params.requestId,
      actionRequired: false,
      priority: 'Normal',
    });
  }

  notifyLowStock(params: {
    itemName: string;
    currentStock: number;
    minThreshold: number;
    isCritical?: boolean;
  }): void {
    const event = params.isCritical ? 'Critical Low Stock' : 'Low Stock Alert';
    const recipients = params.isCritical
      ? [{ role: 'Storekeeper' as const }, { role: 'Admin' as const }, { role: 'Manager' as const }]
      : [{ role: 'Storekeeper' as const }, { role: 'Admin' as const }];

    this.dispatch({
      event,
      recipients,
      title: params.isCritical ? 'CRITICAL: Low Stock Alert' : 'Low Stock Alert',
      message: `${params.itemName} is critically low (${params.currentStock} units, minimum ${params.minThreshold})`,
      actionRequired: true,
      actionUrl: '/storekeeper/inventory/low-stock',
      priority: params.isCritical ? 'Critical' : 'High',
    });

    this.auditLog.createAuditLog(
      params.isCritical ? 'CRITICAL_LOW_STOCK' : 'LOW_STOCK_ALERT',
      'Inventory',
      `${params.isCritical ? 'Critical low' : 'Low'} stock alert for ${params.itemName}: ${params.currentStock}/${params.minThreshold}`,
      { severity: params.isCritical ? 'critical' : 'warning' },
    );
  }

  notifyPOApproval(params: {
    poNumber: string;
    adminId?: string;
    requestId: string;
  }): void {
    this.dispatch({
      event: 'PO Needs Approval',
      recipients: [{ role: 'Admin', userId: params.adminId }],
      title: 'Purchase Order Needs Approval',
      message: `PO ${params.poNumber} requires your approval`,
      requestId: params.requestId,
      actionRequired: true,
      actionUrl: '/admin/dashboard',
      priority: 'Normal',
    });
  }

  notifyPolicyViolation(params: {
    description: string;
    userId?: string;
    details?: string;
  }): void {
    this.dispatch({
      event: 'Policy Violation',
      recipients: [
        { role: 'Compliance' as UserRole },
        { role: 'Admin' },
      ],
      title: 'Policy Violation Detected',
      message: params.description,
      actionRequired: true,
      actionUrl: '/compliance-officer/dashboard',
      priority: 'Critical',
    });

    this.auditLog.createAuditLog(
      'POLICY_VIOLATION',
      'Compliance',
      params.description,
      { severity: 'critical', details: params.details },
    );
  }

  notifyAuditFlagged(params: {
    description: string;
    details?: string;
  }): void {
    this.dispatch({
      event: 'Audit Log Flagged',
      recipients: [{ role: 'Compliance' as UserRole }],
      title: 'Audit Event Flagged',
      message: params.description,
      actionRequired: true,
      actionUrl: '/compliance-officer/audit-trail',
      priority: 'High',
    });
  }

  notifyGrnSubmitted(params: {
    grnNumber: string;
    storekeeperName: string;
    grnId: string;
  }): void {
    this.dispatch({
      event: 'Goods Received (GRN)',
      recipients: [{ role: 'Admin' }],
      title: 'GRN Submitted for Inspection',
      message: `GRN ${params.grnNumber} was submitted by ${params.storekeeperName} and is ready for inspection`,
      requestId: params.grnId,
      actionRequired: false,
      actionUrl: '/admin/receiving/inspection',
      priority: 'Low',
    });
  }

  notifyAdminDecisionNeeded(params: {
    grnNumber: string;
    grnId: string;
    itemCount: number;
  }): void {
    this.dispatch({
      event: 'Quality Issue Found',
      recipients: [{ role: 'Admin' }],
      title: 'Admin Decision Required',
      message: `GRN ${params.grnNumber} has ${params.itemCount} item(s) needing admin decision (Return/Discount/Scrap)`,
      requestId: params.grnId,
      actionRequired: true,
      actionUrl: '/admin/receiving/grn-decisions',
      priority: 'High',
    });

    this.auditLog.createAuditLog(
      'ADMIN_DECISION',
      'Receiving',
      `Admin decision required for ${params.grnNumber} - ${params.itemCount} failed item(s)`,
      { severity: 'warning' },
    );
  }

  notifyPOApproved(params: {
    poNumber: string;
    storekeeperId?: string;
    requestId: string;
  }): void {
    this.dispatch({
      event: 'PO Approved',
      recipients: [{ role: 'Storekeeper', userId: params.storekeeperId }],
      title: 'Purchase Order Approved',
      message: `PO ${params.poNumber} has been approved`,
      requestId: params.requestId,
      actionRequired: true,
      actionUrl: '/storekeeper/dashboard',
      priority: 'Normal',
    });
  }

  notifyPORejected(params: {
    poNumber: string;
    rejectedBy: string;
    reason: string;
    storekeeperId?: string;
    requestId: string;
  }): void {
    this.dispatch({
      event: 'PO Needs Approval',
      recipients: [{ role: 'Storekeeper', userId: params.storekeeperId }],
      title: 'Purchase Order Rejected',
      message: `PO ${params.poNumber} was rejected by ${params.rejectedBy}. Reason: ${params.reason}`,
      requestId: params.requestId,
      actionRequired: false,
      priority: 'High',
    });

    this.auditLog.createAuditLog(
      'APPROVE_PO',
      'PurchaseOrder',
      `PO ${params.poNumber} rejected by ${params.rejectedBy}: ${params.reason}`,
      { severity: 'warning', metadata: { poNumber: params.poNumber, reason: params.reason } },
    );
  }

  notifyGoodsReceived(params: {
    grnNumber: string;
    adminId?: string;
    requestId: string;
  }): void {
    this.dispatch({
      event: 'Goods Received (GRN)',
      recipients: [{ role: 'Admin', userId: params.adminId }],
      title: 'Goods Received',
      message: `GRN ${params.grnNumber} has been recorded`,
      requestId: params.requestId,
      actionRequired: false,
      actionUrl: '/admin/receiving/grn',
      priority: 'Low',
    });
  }

  notifyQualityIssueFound(params: {
    grnNumber: string;
    itemName: string;
    issueDescription: string;
    adminId?: string;
    requestId: string;
  }): void {
    this.dispatch({
      event: 'Quality Issue Found',
      recipients: [{ role: 'Admin', userId: params.adminId }],
      title: 'Quality Issue Reported',
      message: `Quality issue on ${params.grnNumber}: ${params.itemName} - ${params.issueDescription}`,
      requestId: params.requestId,
      actionRequired: true,
      actionUrl: '/admin/receiving/inspection',
      priority: 'High',
    });

    this.auditLog.createAuditLog(
      'INSPECT_GOODS',
      'Receiving',
      `Quality issue: ${params.itemName} in ${params.grnNumber} - ${params.issueDescription}`,
      { severity: 'warning', metadata: { grnNumber: params.grnNumber } },
    );
  }

  notifyInspectionComplete(params: {
    grnNumber: string;
    result: 'pass' | 'fail' | 'partial';
    adminId?: string;
    requestId: string;
  }): void {
    this.dispatch({
      event: 'Inspection Complete',
      recipients: [{ role: 'Admin', userId: params.adminId }],
      title: 'Inspection Complete',
      message: `Inspection for ${params.grnNumber} completed with result: ${params.result}`,
      requestId: params.requestId,
      actionRequired: false,
      priority: 'Low',
    });

    this.auditLog.createAuditLog(
      'INSPECT_GOODS',
      'Receiving',
      `Inspection ${params.result} for ${params.grnNumber}`,
      { severity: params.result === 'fail' ? 'warning' : 'info' },
    );
  }

  notifyNewUserCreated(params: {
    userName: string;
    role: string;
  }): void {
    this.dispatch({
      event: 'New User Created',
      recipients: [],
      title: 'New User Created',
      message: `User ${params.userName} was created with role ${params.role}`,
      actionRequired: false,
      priority: 'Low',
    });
  }

  notifySystemMaintenance(params: {
    message: string;
    scheduledTime?: string;
  }): void {
    this.dispatch({
      event: 'System Maintenance',
      recipients: [
        { role: 'Admin' },
        { role: 'Manager' },
        { role: 'Storekeeper' },
        { role: 'Employee' },
        { role: 'Compliance' as UserRole },
      ],
      title: 'System Maintenance',
      message: params.message + (params.scheduledTime ? ` (scheduled: ${params.scheduledTime})` : ''),
      actionRequired: false,
      priority: 'Normal',
    });
  }

  notifyApprovalWaiting(params: {
    entityType: string;
    entityId: string;
    waitingDays: number;
    currentRole: string;
  }): void {
    this.dispatch({
      event: 'Approval Reminder',
      recipients: [{ role: params.currentRole as any }],
      title: `⚠️ Request #${params.entityId} has been waiting for ${params.waitingDays} day(s) - Action required`,
      message: `${params.entityType} ${params.entityId} requires your approval after ${params.waitingDays} day(s)`,
      requestId: params.entityId,
      actionRequired: true,
      actionUrl: `/${params.currentRole.toLowerCase()}/dashboard`,
      priority: 'High',
    });

    this.auditLog.createAuditLog(
      'APPROVAL_REMINDER',
      params.entityType,
      `Approval reminder sent for ${params.entityType} ${params.entityId} to ${params.currentRole} (${params.waitingDays} days)`,
      { severity: 'warning' },
    );
  }

  notifyApprovalEscalated(params: {
    entityType: string;
    entityId: string;
    fromRole: string;
    toRole: string;
    waitingDays: number;
    reason?: string;
  }): void {
    this.dispatch({
      event: 'Approval Escalated',
      recipients: [{ role: params.toRole as any }],
      title: `🚨 Request #${params.entityId} has been auto-escalated to ${params.toRole}`,
      message: `${params.entityType} ${params.entityId} auto-escalated from ${params.fromRole} after ${params.waitingDays} day(s)${params.reason ? ': ' + params.reason : ''}`,
      requestId: params.entityId,
      actionRequired: true,
      actionUrl: `/${params.toRole.toLowerCase()}/dashboard`,
      priority: 'Critical',
    });

    this.auditLog.createAuditLog(
      'APPROVAL_ESCALATED',
      params.entityType,
      `Auto-escalated ${params.entityType} ${params.entityId} from ${params.fromRole} to ${params.toRole} (${params.waitingDays} days)`,
      { severity: 'critical', metadata: { fromRole: params.fromRole, toRole: params.toRole, waitingDays: params.waitingDays } },
    );
  }

  notifyMonthlyReportReady(params: {
    reportType: string;
    period: string;
  }): void {
    this.dispatch({
      event: 'Monthly Report Ready',
      recipients: [
        { role: 'Admin' },
        { role: 'Manager' },
        { role: 'Compliance' as UserRole },
      ],
      title: 'Monthly Report Ready',
      message: `${params.reportType} report for ${params.period} is now available`,
      actionRequired: false,
      priority: 'Low',
    });
  }

  sendTemplatedNotification(
    eventKey: NotificationEventKey,
    params: Record<string, string>,
    userId: string,
    overrides?: { priority?: NotificationPriority; type?: NotificationType },
  ): NotificationDto {
    const template = NOTIFICATION_TEMPLATES[eventKey];
    const notification: NotificationDto = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId,
      title: template.buildTitle(params),
      message: template.buildMessage(params),
      type: overrides?.type ?? template.defaultType,
      priority: overrides?.priority ?? template.defaultPriority,
      isRead: false,
      actionUrl: template.buildActionUrl(params),
      actionButtonText: template.actionButtonText,
      relatedEntityType: params['entityType'] ?? eventKey,
      relatedEntityId: params['id'] ?? '',
      createdAt: new Date(),
    };
    this.channelService.dispatch(notification);
    return notification;
  }

  notifyTemplateRequisitionCreated(params: {
    id: string;
    SRNumber: string;
    EmployeeName: string;
    itemCount: string;
    totalValue: string;
    userId: string;
  }): NotificationDto {
    return this.sendTemplatedNotification('REQ_CREATED', {
      id: params.id,
      SRNumber: params.SRNumber,
      EmployeeName: params.EmployeeName,
      itemCount: params.itemCount,
      totalValue: params.totalValue,
      entityType: 'Requisition',
    }, params.userId);
  }

  notifyTemplateRequisitionApproved(params: {
    id: string;
    SRNumber: string;
    userId: string;
  }): NotificationDto {
    return this.sendTemplatedNotification('REQ_APPROVED', {
      id: params.id,
      SRNumber: params.SRNumber,
      entityType: 'Requisition',
    }, params.userId);
  }

  notifyTemplateRequisitionRejected(params: {
    id: string;
    SRNumber: string;
    reason: string;
    userId: string;
  }): NotificationDto {
    return this.sendTemplatedNotification('REQ_REJECTED', {
      id: params.id,
      SRNumber: params.SRNumber,
      reason: params.reason,
      entityType: 'Requisition',
    }, params.userId);
  }

  notifyTemplateItemsReady(params: {
    id: string;
    SRNumber: string;
    userId: string;
  }): NotificationDto {
    return this.sendTemplatedNotification('REQ_READY', {
      id: params.id,
      SRNumber: params.SRNumber,
      entityType: 'Requisition',
    }, params.userId);
  }

  notifyTemplateLowStock(params: {
    itemId: string;
    ItemName: string;
    current: string;
    min: string;
    userId: string;
  }): NotificationDto {
    return this.sendTemplatedNotification('LOW_STOCK', {
      itemId: params.itemId,
      ItemName: params.ItemName,
      current: params.current,
      min: params.min,
      entityType: 'Inventory',
    }, params.userId);
  }

  notifyTemplateCriticalLowStock(params: {
    itemId: string;
    ItemName: string;
    current: string;
    min: string;
    userId: string;
  }): NotificationDto {
    return this.sendTemplatedNotification('CRITICAL_LOW_STOCK', {
      itemId: params.itemId,
      ItemName: params.ItemName,
      current: params.current,
      min: params.min,
      entityType: 'Inventory',
    }, params.userId);
  }

  notifyTemplatePOApproved(params: {
    id: string;
    poNumber: string;
    userId: string;
  }): NotificationDto {
    return this.sendTemplatedNotification('PO_APPROVED', {
      id: params.id,
      poNumber: params.poNumber,
      entityType: 'PurchaseOrder',
    }, params.userId);
  }

  notifyTemplateQualityIssue(params: {
    id: string;
    grnNumber: string;
    failedCount: string;
    userId: string;
  }): NotificationDto {
    return this.sendTemplatedNotification('QUALITY_ISSUE', {
      id: params.id,
      grnNumber: params.grnNumber,
      failedCount: params.failedCount,
      entityType: 'Receiving',
    }, params.userId);
  }
}
