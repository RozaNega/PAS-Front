export type NotificationType = 'Info' | 'Success' | 'Warning' | 'Error' | 'Critical';
export type NotificationPriority = 'Low' | 'Normal' | 'High' | 'Critical';
export type NotificationChannel = 'in-app' | 'email' | 'sms';

export const PRIORITY_CHANNEL_MAP: Record<NotificationPriority, NotificationChannel[]> = {
  Critical: ['sms', 'email', 'in-app'],
  High: ['email', 'in-app'],
  Normal: ['email', 'in-app'],
  Low: ['in-app'],
};

export interface NotificationDto {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  isRead: boolean;
  actionUrl?: string;
  actionButtonText?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  createdAt: Date;
  readAt?: Date;
}

export interface PaginatedNotificationResponse {
  notifications: NotificationDto[];
  totalCount: number;
  unreadCount: number;
  pageNumber: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export type NotificationEventKey =
  | 'REQ_CREATED'
  | 'REQ_APPROVED'
  | 'REQ_REJECTED'
  | 'REQ_READY'
  | 'LOW_STOCK'
  | 'CRITICAL_LOW_STOCK'
  | 'PO_APPROVED'
  | 'QUALITY_ISSUE';

export interface NotificationTemplate {
  eventKey: NotificationEventKey;
  buildTitle(params: Record<string, string>): string;
  buildMessage(params: Record<string, string>): string;
  buildActionUrl(params: Record<string, string>): string;
  defaultPriority: NotificationPriority;
  defaultType: NotificationType;
  actionButtonText: string;
}

export const NOTIFICATION_TEMPLATES: Record<NotificationEventKey, NotificationTemplate> = {
  REQ_CREATED: {
    eventKey: 'REQ_CREATED',
    buildTitle: () => 'New Requisition Created',
    buildMessage: (p) => `${p['EmployeeName']} created requisition #${p['SRNumber']} for ${p['itemCount']} item(s). Value: $${p['totalValue']}`,
    buildActionUrl: (p) => `/requisitions/${p['id']}/approve`,
    defaultPriority: 'Normal',
    defaultType: 'Info',
    actionButtonText: 'Review',
  },
  REQ_APPROVED: {
    eventKey: 'REQ_APPROVED',
    buildTitle: () => 'Requisition Approved',
    buildMessage: (p) => `Your requisition #${p['SRNumber']} has been approved. Items will be issued soon.`,
    buildActionUrl: (p) => `/requisitions/${p['id']}/track`,
    defaultPriority: 'Normal',
    defaultType: 'Success',
    actionButtonText: 'Track',
  },
  REQ_REJECTED: {
    eventKey: 'REQ_REJECTED',
    buildTitle: () => 'Requisition Rejected',
    buildMessage: (p) => `Your requisition #${p['SRNumber']} was rejected. Reason: ${p['reason']}`,
    buildActionUrl: (p) => `/requisitions/${p['id']}/resubmit`,
    defaultPriority: 'Normal',
    defaultType: 'Error',
    actionButtonText: 'Resubmit',
  },
  REQ_READY: {
    eventKey: 'REQ_READY',
    buildTitle: () => 'Items Ready for Pickup',
    buildMessage: (p) => `Your items for requisition #${p['SRNumber']} are ready. Please visit store with your ID.`,
    buildActionUrl: (p) => `/requisitions/${p['id']}/siv`,
    defaultPriority: 'Normal',
    defaultType: 'Success',
    actionButtonText: 'View SIV',
  },
  LOW_STOCK: {
    eventKey: 'LOW_STOCK',
    buildTitle: () => '⚠️ Low Stock Alert',
    buildMessage: (p) => `${p['ItemName']} is low (Current: ${p['current']}, Min: ${p['min']}). Please create purchase order.`,
    buildActionUrl: (p) => `/inventory/low-stock/${p['itemId']}/create-po`,
    defaultPriority: 'High',
    defaultType: 'Warning',
    actionButtonText: 'Create PO',
  },
  CRITICAL_LOW_STOCK: {
    eventKey: 'CRITICAL_LOW_STOCK',
    buildTitle: () => '🔴 CRITICAL: Low Stock Alert',
    buildMessage: (p) => `${p['ItemName']} is critically low (Current: ${p['current']}, Min: ${p['min']}). Immediate action required!`,
    buildActionUrl: (p) => `/inventory/low-stock/${p['itemId']}/create-po`,
    defaultPriority: 'Critical',
    defaultType: 'Critical',
    actionButtonText: 'Create PO',
  },
  PO_APPROVED: {
    eventKey: 'PO_APPROVED',
    buildTitle: () => 'Purchase Order Approved',
    buildMessage: (p) => `PO #${p['poNumber']} has been approved. You can now place order with supplier.`,
    buildActionUrl: (p) => `/purchase-orders/${p['id']}/order`,
    defaultPriority: 'Normal',
    defaultType: 'Success',
    actionButtonText: 'Place Order',
  },
  QUALITY_ISSUE: {
    eventKey: 'QUALITY_ISSUE',
    buildTitle: () => 'Quality Issue Detected',
    buildMessage: (p) => `GRN #${p['grnNumber']}: ${p['failedCount']} items failed inspection. Decision required.`,
    buildActionUrl: (p) => `/receiving/grn/${p['id']}/decide`,
    defaultPriority: 'High',
    defaultType: 'Warning',
    actionButtonText: 'Review',
  },
};

export function buildNotificationFromTemplate(
  template: NotificationTemplate,
  params: Record<string, string>,
  userId: string,
  overrides?: Partial<Pick<NotificationDto, 'priority' | 'type'>>,
): NotificationDto {
  const now = new Date();
  return {
    id: `notif_${now.getTime()}_${Math.random().toString(36).substring(2, 9)}`,
    userId,
    title: template.buildTitle(params),
    message: template.buildMessage(params),
    type: overrides?.type ?? template.defaultType,
    priority: overrides?.priority ?? template.defaultPriority,
    isRead: false,
    actionUrl: template.buildActionUrl(params),
    actionButtonText: template.actionButtonText,
    relatedEntityType: params['entityType'] ?? '',
    relatedEntityId: params['id'] ?? '',
    createdAt: now,
  };
}
