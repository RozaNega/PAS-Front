import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { DashboardService } from './dashboard.service';
import { ApiService } from './api.service';
import { normalizePasListResponse, toCamelCaseDeep } from '../utils/pas-api-json.util';

export interface ActivityLogDto {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  actionType: string;
  entityType: string;
  entityId: string;
  details: string;
  ipAddress: string;
  status: string;
}

interface RecentActivityRow {
  id?: string;
  actionDate?: string;
  userName?: string;
  action?: string;
  entityName?: string;
  entityId?: string;
}

function classifyAction(action: string | undefined | null): string {
  const a = (action || '').toLowerCase();
  if (a.includes('delete') || a.includes('removed')) return 'Delete';
  if (a.includes('create') || a.includes('added')) return 'Create';
  if (a.includes('update') || a.includes('adjust') || a.includes('edit')) return 'Update';
  if (a.includes('approve')) return 'Approve';
  if (a.includes('reject')) return 'Reject';
  if (a.includes('login')) return 'Login';
  if (a.includes('logout')) return 'Logout';
  if (a.includes('export')) return 'Export';
  return 'View';
}

function pickStr(r: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      return String(v);
    }
  }
  return '';
}

@Injectable({ providedIn: 'root' })
export class ActivityLogsService {
  private readonly dashboard = inject(DashboardService);
  private readonly api = inject(ApiService);

  /**
   * Prefers GET /api/AuditTrails (live audit DB). Merges with dashboard `recentActivities`
   * when present so short-term feed still appears if the audit API returns nothing.
   */
  getAll(): Observable<ActivityLogDto[]> {
    const audit$ = this.api.get<unknown>('AuditTrails', { pageNumber: 1, pageSize: 500 }).pipe(
      map((raw) => this.mapAuditTrailsResponse(raw)),
      catchError((err) => {
        console.warn('[ActivityLogs] AuditTrails request failed; will use dashboard feed only if available.', err);
        return of([] as ActivityLogDto[]);
      }),
    );

    const dashboard$ = this.dashboard.getStatistics().pipe(
      map((res) => this.mapDashboardActivities(res)),
      catchError((err) => {
        console.warn('[ActivityLogs] Dashboard/statistics failed.', err);
        return of([] as ActivityLogDto[]);
      }),
    );

    return forkJoin({ audit: audit$, dashboard: dashboard$ }).pipe(
      map(({ audit, dashboard }) => this.mergeActivityLogs(audit, dashboard)),
    );
  }

  private mapAuditTrailsResponse(raw: unknown): ActivityLogDto[] {
    const normalized = normalizePasListResponse<Record<string, unknown>>(raw);
    const rows = normalized.data ?? [];
    return rows.map((row) => this.mapFlexibleAuditRow(row as Record<string, unknown>));
  }

  /** Maps backend audit / activity rows with tolerant field names (camelCase already applied in list normalizer). */
  private mapFlexibleAuditRow(row: Record<string, unknown>): ActivityLogDto {
    const r = toCamelCaseDeep<Record<string, unknown>>(row);
    const id =
      pickStr(r, ['id', 'auditId', 'logId', 'eventId']) ||
      `row-${pickStr(r, ['timestamp', 'createdAt', 'occurredAt', 'actionDate'])}-${pickStr(r, ['action', 'actionType'])}`.replace(/\s+/g, '-');
    const timestamp = pickStr(r, [
      'timestamp',
      'createdAt',
      'occurredAt',
      'actionDate',
      'createdOn',
      'dateTime',
      'loggedAt',
      'auditDate',
    ]);
    const user = pickStr(r, ['userName', 'user', 'performedBy', 'actor', 'createdBy', 'fullName', 'email']) || '—';
    const action =
      pickStr(r, ['action', 'actionType', 'eventType', 'activityType', 'operation', 'description']) || 'Activity';
    const entityType =
      pickStr(r, ['entityType', 'entityName', 'tableName', 'module', 'resource', 'objectType']) || '—';
    const entityId = pickStr(r, ['entityId', 'recordId', 'primaryKey', 'referenceId', 'targetId']) || '—';
    const details =
      pickStr(r, ['details', 'description', 'changes', 'message', 'metadata', 'summary', 'comment']) ||
      `${action} — ${entityType}`.trim();
    const ipAddress = pickStr(r, ['ipAddress', 'ip', 'clientIp', 'remoteIp']) || '—';
    const status = pickStr(r, ['status', 'outcome', 'result']) || 'Success';

    return {
      id,
      timestamp: timestamp || new Date().toISOString(),
      user,
      action,
      actionType: classifyAction(action),
      entityType,
      entityId,
      details,
      ipAddress,
      status,
    };
  }

  private mapDashboardActivities(res: { data?: unknown; success?: boolean }): ActivityLogDto[] {
    const d = res.data as Record<string, unknown> | undefined;
    if (!d) {
      return [];
    }
    const rawList =
      (Array.isArray(d['recentActivities']) ? d['recentActivities'] : null) ??
      (Array.isArray(d['activities']) ? d['activities'] : null) ??
      (Array.isArray(d['auditLogs']) ? d['auditLogs'] : null) ??
      (Array.isArray(d['systemActivities']) ? d['systemActivities'] : null) ??
      (Array.isArray(d['lastActivities']) ? d['lastActivities'] : null);
    const list = Array.isArray(rawList) ? rawList : [];
    if (!list.length) {
      return [];
    }
    return list.map((row) => {
      const a = toCamelCaseDeep<RecentActivityRow>(row);
      return {
        id: String(a.id ?? ''),
        timestamp: String(a.actionDate ?? ''),
        user: a.userName || '—',
        action: a.action || 'Activity',
        actionType: classifyAction(a.action),
        entityType: a.entityName || '—',
        entityId: String(a.entityId ?? '—'),
        details: `${a.action || 'Activity'} — ${a.entityName || ''}`.trim(),
        ipAddress: '—',
        status: 'Success',
      };
    });
  }

  private mergeActivityLogs(audit: ActivityLogDto[], dashboard: ActivityLogDto[]): ActivityLogDto[] {
    const seen = new Set<string>();
    const out: ActivityLogDto[] = [];
    for (const log of [...audit, ...dashboard]) {
      const key = `${log.timestamp}|${log.user}|${log.action}|${log.entityId}|${log.details}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.push(log);
    }
    out.sort((x, y) => {
      const tx = Date.parse(x.timestamp);
      const ty = Date.parse(y.timestamp);
      if (!Number.isNaN(tx) && !Number.isNaN(ty)) {
        return ty - tx;
      }
      return 0;
    });
    return out;
  }
}
