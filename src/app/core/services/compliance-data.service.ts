import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { DashboardService, DashboardStatistics } from './dashboard.service';
import { InspectionsService, InspectionDto } from './inspections.service';
import { NotificationService } from './notification.service';
import { ReportsService, DisposalReportDto, RequisitionHistoryReportDto } from './reports.service';
import { RequisitionsService, ServiceRequestDto } from './requisitions.service';

@Injectable({ providedIn: 'root' })
export class ComplianceDataService {
  private readonly dashboardService = inject(DashboardService);
  private readonly inspectionsService = inject(InspectionsService);
  private readonly notificationService = inject(NotificationService);
  private readonly reportsService = inject(ReportsService);
  private readonly requisitionsService = inject(RequisitionsService);

  getDashboardStatistics(): Observable<DashboardStatistics | null> {
    return this.dashboardService.getStatistics().pipe(
      map((response) => response.data ?? null),
      catchError(() => of(null)),
    );
  }

  getServiceRequests(): Observable<ServiceRequestDto[]> {
    return this.requisitionsService.getAllServiceRequests().pipe(
      map((response) => this.asArray<ServiceRequestDto>(response.data)),
      catchError(() => of([])),
    );
  }

  getInspections(): Observable<InspectionDto[]> {
    return this.inspectionsService.getAll({ pageNumber: 1, pageSize: 1000 }).pipe(
      map((response) => response.data?.items ?? []),
      catchError(() => of([])),
    );
  }

  getRequisitionHistory(): Observable<RequisitionHistoryReportDto | null> {
    return this.reportsService.getRequisitionHistory().pipe(
      map((response) => response.data ?? null),
      catchError(() => of(null)),
    );
  }

  getDisposalReport(): Observable<DisposalReportDto | null> {
    return this.reportsService.getDisposalReport().pipe(
      map((response) => response.data ?? null),
      catchError(() => of(null)),
    );
  }

  getUnreadNotificationCount(): Observable<number> {
    return this.notificationService.getUnreadCount().pipe(
      map((response) => response.data ?? 0),
      catchError(() => of(0)),
    );
  }

  private asArray<T>(value: unknown): T[] {
    if (Array.isArray(value)) {
      return value as T[];
    }

    if (value && typeof value === 'object') {
      const maybeItems = (value as { items?: unknown }).items;
      if (Array.isArray(maybeItems)) {
        return maybeItems as T[];
      }
    }

    return [];
  }
}
