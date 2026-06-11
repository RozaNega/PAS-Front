import { Injectable, inject, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { NotificationEngineService } from './notification-engine.service';
import { AuditLogService } from './audit-log.service';
import { SignalRService } from './signalr.service';

export interface LowStockCheckItem {
  itemId: string;
  itemName: string;
  sku: string;
  currentQuantity: number;
  minQuantity: number;
  deficit: number;
  percentage: number;
  warehouseName?: string;
  severity: 'Critical' | 'Warning' | 'Info';
}

export interface LowStockCheckResult {
  checkedAt: Date;
  itemsChecked: number;
  critical: LowStockCheckItem[];
  warning: LowStockCheckItem[];
  info: LowStockCheckItem[];
  totalAlerts: number;
}

const CRITICAL_DEFICIT_PERCENT = 50;
const WARNING_DEFICIT_PERCENT = 25;

const STORAGE_KEY = 'pas_low_stock_alerts_v2';

@Injectable({ providedIn: 'root' })
export class LowStockCheckService {
  private readonly authService = inject(AuthService);
  private readonly notificationEngine = inject(NotificationEngineService);
  private readonly auditLog = inject(AuditLogService);
  private readonly signalRService = inject(SignalRService);

  private readonly alerts = signal<LowStockCheckItem[]>([]);
  private readonly lastCheck = signal<LowStockCheckResult | null>(null);
  private readonly checkResults = new BehaviorSubject<LowStockCheckResult | null>(null);

  getAlerts(): LowStockCheckItem[] {
    return this.alerts();
  }

  getCriticalAlerts(): LowStockCheckItem[] {
    return this.alerts().filter((a) => a.severity === 'Critical');
  }

  getWarningAlerts(): LowStockCheckItem[] {
    return this.alerts().filter((a) => a.severity === 'Warning');
  }

  getLastCheck(): LowStockCheckResult | null {
    return this.lastCheck();
  }

  getCheckUpdates(): Observable<LowStockCheckResult | null> {
    return this.checkResults.asObservable();
  }

  /**
   * Simulates a scheduled low-stock check.
   * In production this would call the backend API:
   *   this.apiService.post('LowStockAlerts/check', {})
   *
   * This method compares currentQuantity vs minQuantity for each item,
   * creates alert records, and dispatches notifications.
   */
  checkLowStock(items: {
    itemId: string;
    itemName: string;
    sku: string;
    currentQuantity: number;
    minQuantity: number;
    warehouseName?: string;
  }[]): LowStockCheckResult {
    const critical: LowStockCheckItem[] = [];
    const warning: LowStockCheckItem[] = [];
    const info: LowStockCheckItem[] = [];

    for (const item of items) {
      if (item.currentQuantity > item.minQuantity) continue;

      const deficit = item.minQuantity - item.currentQuantity;
      const percentage = item.minQuantity > 0
        ? Math.round((deficit / item.minQuantity) * 100)
        : 0;

      let severity: 'Critical' | 'Warning' | 'Info';
      if (percentage >= CRITICAL_DEFICIT_PERCENT) {
        severity = 'Critical';
      } else if (percentage >= WARNING_DEFICIT_PERCENT) {
        severity = 'Warning';
      } else {
        severity = 'Info';
      }

      const entry: LowStockCheckItem = {
        itemId: item.itemId,
        itemName: item.itemName,
        sku: item.sku,
        currentQuantity: item.currentQuantity,
        minQuantity: item.minQuantity,
        deficit,
        percentage,
        warehouseName: item.warehouseName,
        severity,
      };

      if (severity === 'Critical') critical.push(entry);
      else if (severity === 'Warning') warning.push(entry);
      else info.push(entry);
    }

    const result: LowStockCheckResult = {
      checkedAt: new Date(),
      itemsChecked: items.length,
      critical,
      warning,
      info,
      totalAlerts: critical.length + warning.length + info.length,
    };

    this.alerts.set([...critical, ...warning, ...info]);
    this.lastCheck.set(result);
    this.checkResults.next(result);
    this.persist();

    this.dispatchLowStockNotifications(result);
    this.logCheckResult(result);

    return result;
  }

  private dispatchLowStockNotifications(result: LowStockCheckResult): void {
    for (const alert of result.critical) {
      this.notificationEngine.notifyLowStock({
        itemName: alert.itemName,
        currentStock: alert.currentQuantity,
        minThreshold: alert.minQuantity,
        isCritical: true,
      });
    }

    for (const alert of result.warning) {
      this.notificationEngine.notifyLowStock({
        itemName: alert.itemName,
        currentStock: alert.currentQuantity,
        minThreshold: alert.minQuantity,
        isCritical: false,
      });
    }

    if (result.critical.length > 0) {
      this.notificationEngine.dispatch({
        event: 'Critical Low Stock',
        recipients: [
          { role: 'Admin' },
          { role: 'Manager' },
          { role: 'Compliance' as any },
        ],
        title: 'CRITICAL: Multiple Items Low Stock',
        message: `${result.critical.length} item(s) critically low (below 50% of minimum). Immediate action required.`,
        actionRequired: true,
        actionUrl: '/storekeeper/inventory/low-stock',
        priority: 'Critical',
      });
    }

    if (result.warning.length > 0) {
      this.notificationEngine.dispatch({
        event: 'Low Stock Alert',
        recipients: [
          { role: 'Storekeeper' },
          { role: 'Admin' },
        ],
        title: 'Low Stock Alert',
        message: `${result.warning.length} item(s) below minimum stock level. Create purchase orders.`,
        actionRequired: true,
        actionUrl: '/storekeeper/inventory/low-stock',
        priority: 'High',
      });
    }

    if (result.info.length > 0) {
      this.notificationEngine.dispatch({
        event: 'Low Stock Alert',
        recipients: [
          { role: 'Manager' },
          { role: 'Compliance' as any },
        ],
        title: 'Stock Alert - Informational',
        message: `${result.info.length} item(s) are at or slightly below minimum. May affect department requests.`,
        actionRequired: false,
        actionUrl: '/manager/inventory/low-stock',
        priority: 'Low',
      });

      this.notificationEngine.dispatch({
        event: 'Audit Log Flagged',
        recipients: [{ role: 'Compliance' as any }],
        title: 'Low Stock Alert Logged',
        message: `${result.totalAlerts} stock alert(s) recorded during scheduled check. View in audit trail.`,
        actionRequired: false,
        actionUrl: '/compliance-officer/audit-trail',
        priority: 'Low',
      });
    }
  }

  private logCheckResult(result: LowStockCheckResult): void {
    this.auditLog.createAuditLog(
      'LOW_STOCK_ALERT' as any,
      'Inventory',
      `Low stock check complete: ${result.critical.length} critical, ${result.warning.length} warning, ${result.info.length} info (${result.itemsChecked} items checked)`,
      {
        severity: result.critical.length > 0 ? 'critical' : result.warning.length > 0 ? 'warning' : 'info',
        metadata: {
          itemsChecked: result.itemsChecked,
          critical: result.critical.length,
          warning: result.warning.length,
          info: result.info.length,
        },
      },
    );
  }

  private persist(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as LowStockCheckItem[];
      const byId = new Map(existing.map((a) => [a.itemId, a]));
      for (const alert of this.alerts()) {
        byId.set(alert.itemId, alert);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(byId.values())));
    } catch {
      /* ignore */
    }
  }

  acknowledgeAlert(itemId: string): void {
    this.alerts.update((list) =>
      list.map((a) => (a.itemId === itemId ? { ...a } : a)),
    );
  }

  dismissAlert(itemId: string): void {
    this.alerts.update((list) => list.filter((a) => a.itemId !== itemId));
  }
}
