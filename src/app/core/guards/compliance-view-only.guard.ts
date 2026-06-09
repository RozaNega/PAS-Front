import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AuditLogService } from '../services/audit-log.service';

export type WriteAction =
  | 'create'
  | 'edit'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'adjust'
  | 'receive'
  | 'issue';

@Injectable({ providedIn: 'root' })
export class ComplianceViewOnlyGuard implements CanActivate {
  private readonly authService = inject(AuthService);
  private readonly auditLog = inject(AuditLogService);
  private readonly router = inject(Router);

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/auth/login']);
      return false;
    }

    const isCompliance = user.roles.some(
      (r) => r.toLowerCase().includes('compliance') || r.toLowerCase().includes('auditor'),
    );

    if (!isCompliance) {
      return true;
    }

    const action = route.data['writeAction'] as WriteAction | undefined;
    const allowedViewOnlyPermissions = [
      'view_dashboard',
      'view_reports',
      'view_audit_log',
      'view_notifications',
      'view_goods_inspection',
      'compliance_dashboard',
    ];

    if (action) {
      this.auditLog.createAuditLog(
        'POLICY_VIOLATION',
        'Compliance',
        `Compliance Officer attempted blocked ${action} action on ${route.url.toString()}`,
        { severity: 'critical', details: `Blocked write action: ${action} at ${route.url.join('/')}` },
      );
      this.router.navigateByUrl('/compliance-officer/dashboard');
      return false;
    }

    const permissions = route.data['permissions'] as string[] | undefined;
    if (permissions && permissions.length > 0) {
      const allViewOnly = permissions.every((p) =>
        allowedViewOnlyPermissions.some((vp) => p.includes(vp.replace(/_/g, ''))),
      );
      if (!allViewOnly) {
        this.auditLog.createAuditLog(
          'POLICY_VIOLATION',
          'Compliance',
          `Compliance Officer attempted access to restricted route: ${route.url.toString()}`,
          { severity: 'warning', details: `Blocked route access to: ${route.url.join('/')}` },
        );
        this.router.navigateByUrl('/compliance-officer/dashboard');
        return false;
      }
    }

    return true;
  }
}

export function complianceViewOnlyGuard(action: WriteAction) {
  const guard = inject(ComplianceViewOnlyGuard);
  const authService = inject(AuthService);
  const auditLog = inject(AuditLogService);
  const router = inject(Router);

  return () => {
    const user = authService.getCurrentUser();
    if (!user) {
      router.navigate(['/auth/login']);
      return false;
    }

    const isCompliance = user.roles.some(
      (r) => r.toLowerCase().includes('compliance') || r.toLowerCase().includes('auditor'),
    );

    if (!isCompliance) {
      return true;
    }

    auditLog.createAuditLog(
      'POLICY_VIOLATION',
      'Compliance',
      `Compliance Officer attempted blocked ${action} action`,
      { severity: 'critical' },
    );
    router.navigateByUrl('/compliance-officer/dashboard');
    return false;
  };
}
