import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  WorkflowService,
  ServiceRequest,
  NotificationMessage,
} from '../../../../core/services/workflow.service';
import { CrossRoleService } from '../../../../core/services/cross-role.service';
import { DisposalRecordsService } from '../../../../core/services/disposal-records.service';
import { Subscription } from 'rxjs';

interface AdminSummaryCard {
  title: string;
  value: number;
  icon: string;
  tone: 'blue' | 'green' | 'amber' | 'red';
  description: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="admin-dashboard" aria-label="Admin dashboard">
      <header class="dashboard-header">
        <div class="header-content">
          <div class="header-text">
            <p class="header-eyebrow">Admin Dashboard</p>
            <h1>System Administration</h1>
            <p class="header-description">
              Manage and oversee all service requests across the organization
            </p>
          </div>
          <div class="header-info">
            <div class="info-item">
              <i class="bi bi-clock info-icon"></i>
              <span class="info-text">{{ currentTime() }}</span>
            </div>
            <div class="info-item">
              <i class="bi bi-shield-check info-icon"></i>
              <span class="info-text">Admin Access</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Summary Cards -->
      <section class="summary-section" aria-label="Summary metrics">
        <div class="summary-grid">
          @for (card of summaryCards(); track card.title) {
            <article class="summary-card summary-card--{{ card.tone }}">
              <div class="card-icon">
                <i class="bi {{ card.icon }}"></i>
              </div>
              <div class="card-content">
                <h3 class="card-title">{{ card.title }}</h3>
                <p class="card-value">{{ card.value }}</p>
                <p class="card-description">{{ card.description }}</p>
              </div>
            </article>
          }
        </div>
      </section>

      <!-- Main Content Grid -->
      <section class="content-grid">
        <!-- Pending Requests Table -->
        <div class="panel requests-panel">
          <header class="panel-header">
            <div class="panel-title">
              <h2>Requests Awaiting Admin Review</h2>
              <span class="request-count">{{ recentRequests().length }} pending</span>
            </div>
            <div class="panel-actions">
              <button class="btn btn--secondary" type="button">
                <i class="bi bi-funnel"></i> Filter
              </button>
              <button class="btn btn--primary" type="button">
                <i class="bi bi-arrow-clockwise"></i> Refresh
              </button>
            </div>
          </header>

          <div class="table-container">
            @if (recentRequests().length > 0) {
              <table class="requests-table">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Items</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Est. Cost</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (request of recentRequests(); track request.id) {
                    <tr class="request-row">
                      <td class="request-id">
                        <strong>{{ request.srNumber }}</strong>
                      </td>
                      <td class="employee-info">
                        <div class="employee-name">{{ request.employeeName }}</div>
                        <div class="employee-email">{{ request.employeeEmail }}</div>
                      </td>
                      <td class="department">{{ request.department }}</td>
                      <td class="items-info">
                        <div class="items-count">{{ request.totalItems }} items</div>
                        <div class="items-preview">
                          {{ request.items[0]?.name }}
                          @if (request.items.length > 1) {
                            +{{ request.items.length - 1 }} more
                          }
                        </div>
                      </td>
                      <td class="priority">
                        <span class="priority-badge" [class]="getPriorityClass(request.priority)">
                          {{ request.priority }}
                        </span>
                      </td>
                      <td class="status">
                        <span [class]="getStatusBadgeClass(request.status)">
                          {{ request.status }}
                        </span>
                      </td>
                      <td class="cost">
                        @if (request.totalCost) {
                          <span class="cost-amount">\${{ request.totalCost }}</span>
                        } @else {
                          <span class="cost-pending">Pending</span>
                        }
                      </td>
                      <td class="date">{{ request.formattedDate }}</td>
                      <td class="actions">
                        <div class="action-buttons">
                          <button
                            class="action-btn action-btn--approve"
                            (click)="approveRequest(request.id)"
                            title="Approve request"
                          >
                            <i class="bi bi-check-lg"></i>
                          </button>
                          <button
                            class="action-btn action-btn--reject"
                            (click)="rejectRequest(request.id)"
                            title="Reject request"
                          >
                            <i class="bi bi-x-lg"></i>
                          </button>
                          <button
                            class="action-btn action-btn--view"
                            (click)="viewRequestDetails(request.id)"
                            title="View details"
                          >
                            <i class="bi bi-eye"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            } @else {
              <div class="empty-state">
                <div class="empty-icon">
                  <i class="bi bi-inbox"></i>
                </div>
                <h3>No Pending Requests</h3>
                <p>All requests have been processed. Great job!</p>
              </div>
            }
          </div>
        </div>

        <!-- Pending Disposals Panel -->
        <div class="panel disposals-panel">
          <header class="panel-header">
            <div class="panel-title">
              <h2>Pending Disposals</h2>
              <span class="request-count">{{ pendingDisposals().length }} pending</span>
            </div>
          </header>

          <div class="disposals-list">
            @if (pendingDisposals().length > 0) {
              @for (d of pendingDisposals(); track d.id) {
                <div class="disposal-item">
                  <div class="disposal-icon">
                    <i class="bi bi-trash3"></i>
                  </div>
                  <div class="disposal-content">
                    <div class="disposal-info">
                      <strong>{{ d.disposalNumber || d.id }}</strong>
                      <span class="disposal-reason">{{ d.reason || 'No reason' }}</span>
                    </div>
                    <div class="disposal-meta">
                      <span>{{ d.totalQuantity || d.quantity || 0 }} items</span>
                      <span>Value: {{ d.totalValue || 0 }}</span>
                    </div>
                  </div>
                  <div class="disposal-actions">
                    <button class="action-btn action-btn--approve" title="Approve disposal" (click)="approveDisposal(d.id)">
                      <i class="bi bi-check-lg"></i>
                    </button>
                    <button class="action-btn action-btn--reject" title="Reject disposal" (click)="rejectDisposal(d.id)">
                      <i class="bi bi-x-lg"></i>
                    </button>
                  </div>
                </div>
              }
            } @else {
              <div class="empty-notifications">
                <i class="bi bi-check-circle"></i>
                <p>No pending disposals</p>
              </div>
            }
          </div>
        </div>

        <!-- Notifications Panel -->
        <div class="panel notifications-panel">
          <header class="panel-header">
            <h2>Recent Notifications</h2>
            <button class="btn btn--text" type="button">View All</button>
          </header>

          <div class="notifications-list">
            @for (notification of workflowNotifications().slice(0, 5); track notification.id) {
              <div class="notification-item" [class.unread]="!notification.isRead">
                <div class="notification-icon" [class]="'notification-icon--' + notification.type">
                  <i
                    class="bi"
                    [class]="
                      notification.type === 'success'
                        ? 'bi-check-circle'
                        : notification.type === 'error'
                          ? 'bi-x-circle'
                          : notification.type === 'warning'
                            ? 'bi-exclamation-triangle'
                            : 'bi-info-circle'
                    "
                  ></i>
                </div>
                <div class="notification-content">
                  <h4 class="notification-title">{{ notification.title }}</h4>
                  <p class="notification-message">{{ notification.message }}</p>
                  <time class="notification-time">{{
                    notification.createdDate | date: 'short'
                  }}</time>
                </div>
                @if (notification.actionRequired) {
                  <div class="notification-action">
                    <button class="btn btn--small btn--primary" type="button"
                      (click)="takeNotificationAction(notification)">
                      Action Required
                    </button>
                  </div>
                }
              </div>
            } @empty {
              <div class="empty-notifications">
                <i class="bi bi-bell-slash"></i>
                <p>No recent notifications</p>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- Quick Actions -->
      <section class="quick-actions-section">
        <h2>Quick Actions</h2>
        <div class="quick-actions-grid">
          <button class="quick-action-card" type="button">
            <i class="bi bi-plus-circle"></i>
            <span>Create System Request</span>
          </button>
          <button class="quick-action-card" type="button">
            <i class="bi bi-graph-up"></i>
            <span>View Reports</span>
          </button>
          <button class="quick-action-card" type="button">
            <i class="bi bi-people"></i>
            <span>Manage Users</span>
          </button>
          <button class="quick-action-card" type="button">
            <i class="bi bi-gear"></i>
            <span>System Settings</span>
          </button>
        </div>
      </section>
    </section>
  `,
  styles: [
    `
      .admin-dashboard {
        display: grid;
        gap: 1.5rem;
        padding: 1rem;
        min-height: 100vh;
        background: #f8fafc;
      }

      .dashboard-header {
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
        border-radius: 16px;
        padding: 2rem;
        color: white;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      }

      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 2rem;
      }

      .header-text .header-eyebrow {
        margin: 0 0 0.5rem 0;
        font-size: 0.875rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        opacity: 0.8;
      }

      .header-text h1 {
        margin: 0 0 0.5rem 0;
        font-size: 2.25rem;
        font-weight: 800;
        line-height: 1.2;
      }

      .header-text .header-description {
        margin: 0;
        font-size: 1rem;
        opacity: 0.9;
      }

      .header-info {
        display: flex;
        gap: 1.5rem;
      }

      .info-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        backdrop-filter: blur(10px);
      }

      .info-icon {
        font-size: 1.125rem;
      }

      .info-text {
        font-size: 0.875rem;
        font-weight: 600;
      }

      .summary-section .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.25rem;
      }

      .summary-card {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1.5rem;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        transition: all 0.2s ease;
      }

      .summary-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
      }

      .card-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 3rem;
        height: 3rem;
        border-radius: 12px;
        font-size: 1.5rem;
      }

      .summary-card--blue .card-icon {
        background: #dbeafe;
        color: #1d4ed8;
      }

      .summary-card--green .card-icon {
        background: #d1fae5;
        color: #059669;
      }

.summary-card--amber .card-icon {
  background: #fef3c7;
  color: #d97706;
}

.summary-card--red .card-icon {
  background: #fee2e2;
  color: #dc2626;
}

      .card-content {
        flex: 1;
      }

      .card-title {
        margin: 0 0 0.25rem 0;
        font-size: 0.875rem;
        font-weight: 600;
        color: #6b7280;
      }

      .card-value {
        margin: 0 0 0.25rem 0;
        font-size: 2rem;
        font-weight: 800;
        color: #111827;
      }

      .card-description {
        margin: 0;
        font-size: 0.75rem;
        color: #9ca3af;
      }

      .content-grid {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 1.5rem;
      }

      .panel {
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      }

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        border-bottom: 1px solid #e5e7eb;
      }

      .panel-title {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .panel-title h2 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 700;
        color: #111827;
      }

      .request-count {
        padding: 0.25rem 0.75rem;
        background: #f3f4f6;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
        color: #6b7280;
      }

      .panel-actions {
        display: flex;
        gap: 0.5rem;
      }

      .btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .btn--primary {
        background: #3b82f6;
        color: white;
      }

      .btn--primary:hover {
        background: #2563eb;
      }

      .btn--secondary {
        background: #f3f4f6;
        color: #374151;
      }

      .btn--secondary:hover {
        background: #e5e7eb;
      }

      .btn--text {
        background: none;
        color: #3b82f6;
        padding: 0.5rem;
      }

      .btn--text:hover {
        color: #2563eb;
        background: #f0f9ff;
      }

      .btn--small {
        padding: 0.375rem 0.75rem;
        font-size: 0.75rem;
      }

      .table-container {
        overflow-x: auto;
      }

      .requests-table {
        width: 100%;
        border-collapse: collapse;
      }

      .requests-table th {
        padding: 1rem;
        text-align: left;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #6b7280;
        background: #f9fafb;
        border-bottom: 1px solid #e5e7eb;
      }

      .requests-table td {
        padding: 1rem;
        border-bottom: 1px solid #f3f4f6;
        vertical-align: top;
      }

      .request-row:hover {
        background: #f9fafb;
      }

      .request-id strong {
        color: #3b82f6;
        font-weight: 700;
      }

      .employee-name {
        font-weight: 600;
        color: #111827;
      }

      .employee-email {
        font-size: 0.75rem;
        color: #6b7280;
        margin-top: 0.25rem;
      }

      .items-count {
        font-weight: 600;
        color: #111827;
      }

      .items-preview {
        font-size: 0.75rem;
        color: #6b7280;
        margin-top: 0.25rem;
      }

      .cost-amount {
        font-weight: 700;
        color: #059669;
      }

      .cost-pending {
        color: #6b7280;
        font-style: italic;
      }

      .priority-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
      }

      .priority-urgent {
        background: #fee2e2;
        color: #dc2626;
      }

      .priority-high {
        background: #fef3c7;
        color: #d97706;
      }

      .priority-medium {
        background: #dbeafe;
        color: #2563eb;
      }

      .priority-low {
        background: #f3f4f6;
        color: #6b7280;
      }

      .status-badge--pending {
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
        background: #fef3c7;
        color: #d97706;
      }

      .status-badge--success {
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
        background: #d1fae5;
        color: #059669;
      }

      .action-buttons {
        display: flex;
        gap: 0.25rem;
      }

      .action-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .action-btn--approve {
        background: #d1fae5;
        color: #059669;
      }

      .action-btn--approve:hover {
        background: #a7f3d0;
      }

      .action-btn--reject {
        background: #fee2e2;
        color: #dc2626;
      }

      .action-btn--reject:hover {
        background: #fecaca;
      }

      .action-btn--view {
        background: #f3f4f6;
        color: #6b7280;
      }

      .action-btn--view:hover {
        background: #e5e7eb;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem;
        text-align: center;
      }

      .empty-icon {
        font-size: 3rem;
        color: #d1d5db;
        margin-bottom: 1rem;
      }

      .empty-state h3 {
        margin: 0 0 0.5rem 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: #374151;
      }

      .empty-state p {
        margin: 0;
        color: #6b7280;
      }

      .notifications-list {
        padding: 1rem;
      }

      .notification-item {
        display: flex;
        gap: 0.75rem;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 0.75rem;
        transition: all 0.2s ease;
      }

      .notification-item:last-child {
        margin-bottom: 0;
      }

      .notification-item.unread {
        background: #f0f9ff;
        border-left: 3px solid #3b82f6;
      }

      .notification-item:hover {
        background: #f9fafb;
      }

      .notification-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .notification-icon--success {
        background: #d1fae5;
        color: #059669;
      }

      .notification-icon--error {
        background: #fee2e2;
        color: #dc2626;
      }

      .notification-icon--info {
        background: #dbeafe;
        color: #2563eb;
      }

      .notification-content {
        flex: 1;
      }

      .notification-title {
        margin: 0 0 0.25rem 0;
        font-size: 0.875rem;
        font-weight: 600;
        color: #111827;
      }

      .notification-message {
        margin: 0 0 0.5rem 0;
        font-size: 0.75rem;
        color: #6b7280;
        line-height: 1.4;
      }

      .notification-time {
        font-size: 0.625rem;
        color: #9ca3af;
      }

      .empty-notifications {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 2rem;
        color: #9ca3af;
      }

      .empty-notifications i {
        font-size: 2rem;
        margin-bottom: 0.5rem;
      }

      .quick-actions-section h2 {
        margin: 0 0 1rem 0;
        font-size: 1.25rem;
        font-weight: 700;
        color: #111827;
      }

      .quick-actions-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
      }

      .quick-action-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        padding: 1.5rem;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .quick-action-card:hover {
        border-color: #3b82f6;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        transform: translateY(-2px);
      }

      .quick-action-card i {
        font-size: 1.5rem;
        color: #3b82f6;
      }

      .quick-action-card span {
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
      }

      @media (max-width: 1024px) {
        .content-grid {
          grid-template-columns: 1fr;
        }

        .header-content {
          flex-direction: column;
          align-items: flex-start;
          gap: 1rem;
        }
      }

      @media (max-width: 768px) {
        .admin-dashboard {
          padding: 0.5rem;
        }

        .dashboard-header {
          padding: 1.5rem;
        }

        .summary-grid {
          grid-template-columns: 1fr;
        }

        .panel-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 1rem;
        }

        .quick-actions-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      .disposals-panel {
        grid-column: 1 / -1;
      }
      .disposals-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .disposal-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
      }
      .disposal-icon {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        background: #fee2e2;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #dc2626;
        font-size: 1rem;
      }
      .disposal-content {
        flex: 1;
      }
      .disposal-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.15rem;
      }
      .disposal-info strong {
        font-size: 0.85rem;
        color: #1e293b;
      }
      .disposal-reason {
        font-size: 0.75rem;
        color: #64748b;
      }
      .disposal-meta {
        display: flex;
        gap: 1rem;
        font-size: 0.7rem;
        color: #94a3b8;
      }
      .disposal-actions {
        display: flex;
        gap: 0.35rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly workflowService = inject(WorkflowService);
  private readonly crossRoleService = inject(CrossRoleService);
  private readonly disposalService = inject(DisposalRecordsService);

  // Subscriptions for real-time updates
  private subscriptions: Subscription[] = [];

  // Current admin info
  private currentAdminId = 'admin_001';

  // Workflow-related signals
  readonly workflowRequests = signal<ServiceRequest[]>([]);

  // Disposal signals
  readonly pendingDisposals = signal<any[]>([]);
  readonly workflowNotifications = signal<NotificationMessage[]>([]);
  readonly currentTime = signal<string>(this.getCurrentTime());
  private clockInterval?: any;

  readonly summaryCards = computed<AdminSummaryCard[]>(() => {
    const requests = this.workflowRequests();
    const allRequests = this.workflowService.getAllRequests();

    return [
      {
        title: 'Pending Admin Review',
        value: requests.filter((r) => r.status === 'Manager Approved').length,
        icon: 'bi-clock-history',
        tone: 'amber',
        description: 'Awaiting your approval',
      },
      {
        title: 'Compliance Review',
        value: requests.filter((r) => r.status === 'Compliance Review').length,
        icon: 'bi-shield-check',
        tone: 'blue',
        description: 'Under compliance review',
      },
      {
        title: 'Completed Today',
        value: requests.filter((r) => r.status === 'Completed' && this.isToday(r.completedDate))
          .length,
        icon: 'bi-check-circle',
        tone: 'green',
        description: 'Processed successfully',
      },
      {
        title: 'Pending Disposals',
        value: this.pendingDisposals().length,
        icon: 'bi-trash3',
        tone: 'red',
        description: 'Awaiting approval',
      },
      {
        title: 'Total Requests',
        value: allRequests.length,
        icon: 'bi-file-earmark-text',
        tone: 'blue',
        description: 'All time',
      },
    ];
  });

  readonly recentRequests = computed(() => {
    return this.workflowRequests()
      .filter((req) => ['Manager Approved', 'Compliance Review'].includes(req.status))
      .slice(0, 10)
      .map((req) => ({
        ...req,
        formattedDate: this.formatDate(req.submittedDate),
        totalItems: req.items.reduce((sum, item) => sum + item.quantity, 0),
        totalCost: req.estimatedCost || 0,
      }));
  });

  ngOnInit(): void {
    this.setupWorkflowSubscriptions();
    this.syncFromBackend();
    this.loadWorkflowData();
    this.loadPendingDisposals();
    this.startClock();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  private syncFromBackend(): void {
    this.crossRoleService.getAllRequests().subscribe({
      next: (requests) => {
        this.crossRoleService.syncToWorkflow(requests);
        this.loadWorkflowData();
      },
      error: (err: unknown) => {
        console.error('[AdminDashboardComponent] Backend sync failed:', err);
      },
    });
  }

  private setupWorkflowSubscriptions(): void {
    const requestSub = this.workflowService.getRequestUpdates().subscribe((request) => {
      if (request) {
        this.loadWorkflowData();
      }
    });

    const notificationSub = this.workflowService
      .getNotificationUpdates()
      .subscribe((notification) => {
        if (notification && notification.recipientRole === 'Admin') {
          this.loadWorkflowData();
        }
      });

    this.subscriptions.push(requestSub, notificationSub);
  }

  private loadWorkflowData(): void {
    const requests = this.workflowService.getRequestsForAdmin();
    this.workflowRequests.set(requests);

    const notifications = this.workflowService.getNotificationsForUser(
      this.currentAdminId,
      'Admin',
    );
    this.workflowNotifications.set(notifications);
  }

  private startClock(): void {
    this.clockInterval = setInterval(() => {
      this.currentTime.set(this.getCurrentTime());
    }, 1000);
  }

  private getCurrentTime(): string {
    return new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }

  private formatDate(date: Date): string {
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private isToday(date?: Date): boolean {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  approveRequest(requestId: string): void {
    this.workflowService.adminReviewRequest(
      requestId,
      'approve',
      'Request approved by admin',
      this.currentAdminId,
      'Admin User',
    );
  }

  rejectRequest(requestId: string): void {
    this.workflowService.adminReviewRequest(
      requestId,
      'reject',
      'Request rejected by admin',
      this.currentAdminId,
      'Admin User',
    );
  }

  viewRequestDetails(requestId: string): void {
    this.router.navigate(['/admin/requisitions', requestId]);
  }

  takeNotificationAction(notification: NotificationMessage): void {
    if (notification.requestId) {
      this.router.navigate(['/admin/requisitions', notification.requestId]);
    } else if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl]);
    }
  }

  private loadPendingDisposals(): void {
    this.disposalService.getAll({ status: 'Pending', pageSize: 50 }).subscribe({
      next: (res) => {
        this.pendingDisposals.set((res.data as any)?.items || []);
      },
      error: () => {},
    });
  }

  approveDisposal(id: string): void {
    this.disposalService.approve(id, { id, isApproved: true, remarks: 'Approved by admin', approvedBy: 'Admin User' } as any).subscribe({
      next: () => {
        this.loadPendingDisposals();
        this.showNotification('Disposal approved. Stock has been deducted.', 'success');
      },
      error: () => {
        this.showNotification('Failed to approve disposal', 'error');
      },
    });
  }

  rejectDisposal(id: string): void {
    this.disposalService.approve(id, { id, isApproved: false, remarks: 'Rejected by admin' } as any).subscribe({
      next: () => {
        this.loadPendingDisposals();
        this.showNotification('Disposal rejected.', 'success');
      },
      error: () => {
        this.showNotification('Failed to reject disposal', 'error');
      },
    });
  }

  private showNotification(message: string, type: 'success' | 'error'): void {
    const banner = document.createElement('div');
    banner.className = `notification-banner ${type}`;
    banner.textContent = message;
    banner.style.cssText = 'position:fixed;top:1rem;right:1rem;padding:0.75rem 1rem;border-radius:8px;z-index:9999;font-size:0.875rem;' +
      (type === 'success' ? 'background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;' : 'background:#fef2f2;color:#991b1b;border:1px solid #fecaca;');
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 4000);
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Manager Approved':
        return 'status-badge status-badge--pending';
      case 'Compliance Review':
        return 'status-badge status-badge--warning';
      case 'Admin Approved':
        return 'status-badge status-badge--success';
      case 'Admin Rejected':
        return 'status-badge status-badge--danger';
      default:
        return 'status-badge status-badge--neutral';
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'Urgent':
        return 'priority-urgent';
      case 'High':
        return 'priority-high';
      case 'Medium':
        return 'priority-medium';
      default:
        return 'priority-low';
    }
  }
}
