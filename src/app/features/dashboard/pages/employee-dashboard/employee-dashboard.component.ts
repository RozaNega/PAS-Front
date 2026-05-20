import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  computed,
  ChangeDetectorRef,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PasApiService } from '../../../../shared/services/pas-api.service';
import { CurrentUserService, CurrentUser } from '../../../../core/services/current-user.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  WorkflowService,
  ServiceRequest,
  NotificationMessage,
  ApiServiceRequestRow,
} from '../../../../core/services/workflow.service';
import { Subscription, take, filter } from 'rxjs';
import { ServiceRequestService } from '../../../requisition/service-requests/services/service-request.service';
import {
  RequisitionsService,
  StoreIssueVoucherDto,
} from '../../../../core/services/requisitions.service';
import {
  RequestSummaryCard,
  PendingRequest,
  RecentActivity,
  RequestTrendData,
  QuickLink,
  ServiceRequest as DashboardServiceRequest,
  CatalogItem,
  UserProfile,
} from '../../../../types/dashboard.types';
import { TrackRequestModalComponent } from '../../components/track-request-modal/track-request-modal.component';
import { CancelRequestModalComponent } from '../../components/cancel-request-modal/cancel-request-modal.component';
import { CreateRequestModalComponent } from '../../components/create-request-modal/create-request-modal.component';
import { EditProfileModalComponent } from '../../components/edit-profile-modal/edit-profile-modal.component';
import { ChangePasswordModalComponent } from '../../components/change-password-modal/change-password-modal.component';
import { TwoFactorModalComponent } from '../../components/two-factor-modal/two-factor-modal.component';
import { FaceDetectionService } from '../../../../core/services/face-detection.service';
import { ProfileService } from '../../../../core/services/profile.service';
import { PhotoPersistenceService } from '../../../../core/services/photo-persistence.service';
import { ToastService } from '../../../../core/services/toast.service';
import { PhotoDebugUtil } from '../../../../core/utils/photo-debug.util';

type DashboardView =
  | 'home'
  | 'new-request'
  | 'my-requests'
  | 'my-requests-summary'
  | 'my-activity'
  | 'profile'
  | 'notifications'
  | 'catalog-items';

interface RequestHistoryRow {
  year: number;
  totalRequests: number;
  approved: number;
  rejected: number;
  completed: number;
  approvalRate: number;
}

interface EmployeeSivRow {
  id: string;
  sivNumber: string;
  date: string;
  items: string;
  status: string;
  requestId: string;
}

interface CompletedRequestRow {
  id: string;
  srNumber: string;
  completedOn: string;
  items: string;
  status: string;
}

interface RequestSummarySnapshot {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  completed: number;
  latestRequestNumber: string | null;
  latestRequestDate: string | null;
}

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './employee-dashboard.component.html',
  styleUrl: './employee-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeDashboardComponent implements OnInit, OnDestroy {
  readonly router = inject(Router);
  readonly modalService = inject(NgbModal);
  readonly pasApi = inject(PasApiService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private sanitizer = inject(DomSanitizer);
  private currentUserService = inject(CurrentUserService);
  private workflowService = inject(WorkflowService);
  private readonly serviceRequestService = inject(ServiceRequestService);
  private readonly requisitionsService = inject(RequisitionsService);
  private faceDetectionService = inject(FaceDetectionService);
  private profileService = inject(ProfileService);
  private photoPersistenceService = inject(PhotoPersistenceService);
  private toastService = inject(ToastService);

  // Subscriptions for real-time updates
  private subscriptions: Subscription[] = [];
  private clockInterval?: any;
  private pollingInterval?: any;
  private currentUserId = 'emp_001';

  // State signals
  readonly workflowRequests = signal<ServiceRequest[]>([]);
  readonly workflowNotifications = signal<NotificationMessage[]>([]);
  readonly userProfile = signal<UserProfile>({
    fullName: '',
    employeeCode: '',
    department: '',
    position: '',
    email: '',
    phone: '',
    joinDate: '',
  });
  private readonly profilePhotoUrl = toSignal(this.currentUserService.profileImageUrl$, {
    initialValue: this.currentUserService.getProfileImageUrl(),
  });

  readonly profilePhoto = computed(() => {
    const url = this.profilePhotoUrl();
    if (!url?.trim()) {
      return null;
    }
    return this.sanitizer.bypassSecurityTrustUrl(this.currentUserService.getDisplayUrl(url));
  });
  readonly currentTime = signal<string>(this.getCurrentTime());
  readonly currentLocation = signal<string>('Addis Ababa, Ethiopia');
  readonly isSelectingPhoto = signal(false);
  readonly isCameraActive = signal(false);
  readonly cameraStream = signal<MediaStream | null>(null);
  readonly isValidatingPhoto = signal(false);
  readonly isUploadingPhoto = signal(false);
  readonly employeeSivs = signal<EmployeeSivRow[]>([]);

  private static readonly APPROVED_STATUSES: ServiceRequest['status'][] = [
    'Manager Approved',
    'Admin Approved',
    'Compliance Review',
    'Completed',
  ];

  private static readonly REJECTED_STATUSES: ServiceRequest['status'][] = [
    'Manager Rejected',
    'Admin Rejected',
  ];

  private static readonly PENDING_STATUSES: ServiceRequest['status'][] = [
    'Submitted',
    'Under Review',
  ];

  readonly requestSummary = computed<RequestSummarySnapshot>(() => {
    const requests = this.workflowRequests();
    const pending = requests.filter((request) =>
      EmployeeDashboardComponent.PENDING_STATUSES.includes(request.status),
    ).length;
    const approved = requests.filter((request) =>
      EmployeeDashboardComponent.APPROVED_STATUSES.includes(request.status),
    ).length;
    const rejected = requests.filter((request) =>
      EmployeeDashboardComponent.REJECTED_STATUSES.includes(request.status),
    ).length;
    const completed = requests.filter((request) => request.status === 'Completed').length;
    const latestRequest = [...requests].sort(
      (a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime(),
    )[0];

    return {
      total: requests.length,
      pending,
      approved,
      rejected,
      completed,
      latestRequestNumber: latestRequest?.srNumber ?? null,
      latestRequestDate: latestRequest
        ? new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }).format(new Date(latestRequest.submittedDate))
        : null,
    };
  });

  readonly requestSummaryLabel = computed(() => {
    const summary = this.requestSummary();
    if (!summary.latestRequestNumber || !summary.latestRequestDate) {
      return 'Live from My Requests: no requests have been submitted yet.';
    }

    return `Live from My Requests: latest request ${summary.latestRequestNumber} submitted on ${summary.latestRequestDate}.`;
  });

  readonly summaryCards = computed<RequestSummaryCard[]>(() => {
    const summary = this.requestSummary();
    const trendData = this.requestTrendData();
    const currentMonth = trendData.at(-1);
    const previousMonth = trendData.at(-2);
    const monthDelta =
      currentMonth && previousMonth ? currentMonth.submitted - previousMonth.submitted : 0;

    return [
      {
        title: 'Total Requests',
        value: summary.total,
        subtitle: 'Live total from My Requests',
        trend: this.formatTrendLabel(monthDelta, 'from last month'),
        icon: 'bi-clipboard2-data',
        tone: 'blue',
      },
      {
        title: 'Pending',
        value: summary.pending,
        subtitle: 'Awaiting review',
        trend: `${summary.pending} open requests`,
        icon: 'bi-clock-history',
        tone: 'amber',
      },
      {
        title: 'Approved',
        value: summary.approved,
        subtitle: 'Manager/Admin approved',
        trend: `${summary.approved} approved requests`,
        icon: 'bi-check-circle',
        tone: 'green',
      },
      {
        title: 'Rejected',
        value: summary.rejected,
        subtitle: 'Not approved',
        trend: `${summary.rejected} rejected requests`,
        icon: 'bi-x-circle',
        tone: 'rose',
      },
      {
        title: 'Completed',
        value: summary.completed,
        subtitle: 'Fully completed',
        trend: `${summary.completed} completed requests`,
        icon: 'bi-check2-all',
        tone: 'green',
      },
    ];
  });

  readonly requestHistoryRows = computed<RequestHistoryRow[]>(() => {
    const byYear = new Map<
      number,
      { totalRequests: number; approved: number; rejected: number; completed: number }
    >();

    this.workflowRequests().forEach((request) => {
      const year = new Date(request.submittedDate).getFullYear();
      const current = byYear.get(year) || {
        totalRequests: 0,
        approved: 0,
        rejected: 0,
        completed: 0,
      };

      current.totalRequests += 1;
      if (EmployeeDashboardComponent.APPROVED_STATUSES.includes(request.status)) {
        current.approved += 1;
      }
      if (EmployeeDashboardComponent.REJECTED_STATUSES.includes(request.status)) {
        current.rejected += 1;
      }
      if (request.status === 'Completed') {
        current.completed += 1;
      }

      byYear.set(year, current);
    });

    return Array.from(byYear.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, summary]) => {
        const approvalRate =
          summary.totalRequests > 0
            ? Math.round((summary.approved / summary.totalRequests) * 100)
            : 0;

        return {
          year,
          ...summary,
          approvalRate,
        };
      });
  });

  readonly requestTrendData = computed<RequestTrendData[]>(() => {
    const monthBuckets = new Map<
      string,
      { month: string; submitted: number; approved: number; completed: number; rejected: number }
    >();
    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
    const currentDate = new Date();

    for (let offset = 5; offset >= 0; offset--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - offset, 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      monthBuckets.set(key, {
        month: monthFormatter.format(date),
        submitted: 0,
        approved: 0,
        completed: 0,
        rejected: 0,
      });
    }

    this.workflowRequests().forEach((request) => {
      const submittedDate = new Date(request.submittedDate);
      const key = `${submittedDate.getFullYear()}-${submittedDate.getMonth()}`;
      const bucket = monthBuckets.get(key);
      if (!bucket) {
        return;
      }

      bucket.submitted += 1;

      if (EmployeeDashboardComponent.APPROVED_STATUSES.includes(request.status)) {
        bucket.approved += 1;
      }
      if (request.status === 'Completed') {
        bucket.completed += 1;
      }
      if (EmployeeDashboardComponent.REJECTED_STATUSES.includes(request.status)) {
        bucket.rejected += 1;
      }
    });

    return Array.from(monthBuckets.values());
  });

  readonly requestTrendMaxValue = computed(() => {
    const trendData = this.requestTrendData();
    return Math.max(
      1,
      ...trendData.flatMap((point) => [
        point.submitted,
        point.approved,
        point.completed,
        point.rejected,
      ]),
    );
  });

  readonly completedRequestRows = computed<CompletedRequestRow[]>(() => {
    return this.workflowRequests()
      .filter((request) => request.status === 'Completed')
      .map((request) => {
        const completedAt =
          request.completedDate ??
          request.adminReviewDate ??
          request.complianceReviewDate ??
          request.submittedDate;

        return {
          id: request.id,
          srNumber: request.srNumber,
          completedOn: new Date(completedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          items: request.items.map((item) => item.name).join(', '),
          status: request.status,
          completedAt: new Date(completedAt).getTime(),
        };
      })
      .sort((a, b) => b.completedAt - a.completedAt)
      .slice(0, 5)
      .map(({ completedAt, ...row }) => row);
  });

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  // Computed signals
  readonly userName = computed(() => this.userProfile().fullName);
  readonly currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  readonly greeting = this.getGreeting();

  readonly pendingRequests = computed(() => {
    return this.workflowRequests()
      .filter((r) => EmployeeDashboardComponent.PENDING_STATUSES.includes(r.status))
      .map((r) => ({
        srNumber: r.srNumber,
        priority: r.priority,
        requestedDate: new Date(r.submittedDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        waitingTime: this.calculateWaitingTime(r.submittedDate),
        requiredDate: new Date(r.requiredDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        items: r.items.map((i) => `${i.name} (${i.quantity})`),
        status: r.status,
      }));
  });

  readonly myRequestsList = computed(() => {
    return this.workflowRequests().map((r) => ({
      srNumber: r.srNumber,
      requestedDate: new Date(r.submittedDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      items: r.items.map((i) => `${i.name} (${i.quantity})`),
      priority: r.priority,
      status: r.status,
      requiredDate: new Date(r.requiredDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      requester: r.employeeName,
      department: r.department,
      justification: r.justification,
    }));
  });

  // My Requests Filter State
  readonly requestsSearch = signal('');
  readonly requestsDateFrom = signal('');
  readonly requestsDateTo = signal('');
  readonly requestsStatusFilter = signal('All');
  readonly requestsPriorityFilter = signal('All');

  readonly filteredWorkflowRequests = computed(() => {
    let requests = this.workflowRequests();

    const search = this.requestsSearch().toLowerCase().trim();
    if (search) {
      requests = requests.filter(
        (r) =>
          r.srNumber.toLowerCase().includes(search) ||
          r.items.some((i) => i.name.toLowerCase().includes(search)),
      );
    }

    const dateFrom = this.requestsDateFrom();
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      requests = requests.filter((r) => new Date(r.submittedDate).getTime() >= from);
    }

    const dateTo = this.requestsDateTo();
    if (dateTo) {
      const to = new Date(dateTo).getTime();
      // Add 1 day to include the entire 'to' date
      requests = requests.filter((r) => new Date(r.submittedDate).getTime() <= to + 86400000);
    }

    const statusFilter = this.requestsStatusFilter();
    if (statusFilter !== 'All') {
      if (statusFilter === 'Pending') {
        requests = requests.filter((r) => ['Submitted', 'Under Review'].includes(r.status));
      } else if (statusFilter === 'Approved') {
        requests = requests.filter((r) =>
          ['Manager Approved', 'Admin Approved', 'Compliance Review'].includes(r.status),
        );
      } else if (statusFilter === 'Rejected') {
        requests = requests.filter((r) =>
          ['Manager Rejected', 'Admin Rejected'].includes(r.status),
        );
      }
    }

    const priorityFilter = this.requestsPriorityFilter();
    if (priorityFilter !== 'All') {
      requests = requests.filter((r) => r.priority === priorityFilter);
    }

    return requests;
  });

  // Notification filter/search state
  protected readonly notificationSearch = signal('');
  protected readonly notificationFilter = signal<
    'all' | 'approved' | 'submitted' | 'completed' | 'rejected'
  >('all');

  protected readonly notifications = computed(() => {
    const all = this.workflowNotifications().map((n) => this.mapWorkflowNotification(n));
    const search = this.notificationSearch().toLowerCase().trim();
    const filter = this.notificationFilter();
    return all.filter((n) => {
      const matchesSearch =
        !search ||
        n.message.toLowerCase().includes(search) ||
        n.requestId.toLowerCase().includes(search);
      const matchesFilter = filter === 'all' || n.type === filter;
      return matchesSearch && matchesFilter;
    });
  });

  protected readonly unreadCount = computed(
    () => this.workflowNotifications().filter((n) => !n.isRead).length,
  );

  private mapWorkflowNotification(n: NotificationMessage) {
    return {
      id: n.id,
      type: this.mapNotificationType(n.type, n.title),
      requestId: n.requestId || 'N/A',
      message: n.message,
      date: new Date(n.createdDate).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      read: n.isRead,
      sivId: n.type === 'success' && n.title.includes('Completed') ? 'SIV-NEW' : undefined,
    };
  }

  // Settings Signals
  protected readonly notificationSettings = signal({
    emailOnApproval: true,
    emailOnRejection: true,
    emailOnReady: true,
    weeklySummary: false,
    monthlyDigest: false,
  });

  protected readonly twoFactorEnabled = signal(false);
  protected readonly twoFactorMethod = signal<'sms' | 'email' | 'app'>('sms');
  protected readonly twoFactorPhone = signal('');
  protected readonly twoFactorVerificationSent = signal(false);
  protected readonly twoFactorVerificationCode = signal('');
  protected readonly twoFactorSetupComplete = signal(false);

  ngOnInit(): void {
    this.toastService.clearAll();
    this.currentUserService.hydrateFromStorage();
    this.profileService.hydrateProfileFromStorage();
    this.setupProfileSubscription();
    this.cdr.markForCheck();
    this.startClock();

    const userId = this.currentUserService.getUserId();
    if (userId) {
      this.currentUserId = userId;
    }

    this.setupWorkflowSubscriptions();
    this.loadWorkflowData();
    this.loadEmployeeSivs();
    this.syncServiceRequestsFromApi();
    this.startApiPolling();

    // Make debug methods available globally for easier debugging
    if (typeof window !== 'undefined') {
      (window as any).employeeDashboardDebug = {
        reloadPhoto: () => this.reloadPhoto(),
        debugStorage: () => this.debugPhotoStorage(),
        logStorage: () => PhotoDebugUtil.logPhotoStorage(),
      };
    }
  }

  ngOnDestroy(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.stopCamera();
  }

  private startApiPolling(): void {
    this.pollingInterval = setInterval(() => {
      this.syncServiceRequestsFromApi();
    }, 5000);
  }

  private setupProfileSubscription(): void {
    // 1. Sync User Details reactively (Photo is now handled by toSignal)
    const userSub = this.currentUserService.currentUser$.subscribe((user: CurrentUser | null) => {
      if (user) {
        this.userProfile.set({
          fullName: user.fullName || user.username || 'N/A',
          employeeCode: user.employeeCode || 'N/A',
          department: user.department || 'N/A',
          position: user.position || 'N/A',
          email: user.email || 'N/A',
          phone: user.phone || 'N/A',
          joinDate: user.joinDate || 'N/A',
        });
        if (user.id) {
          this.currentUserId = user.id;
        }
        this.loadWorkflowData();
        this.loadEmployeeSivs();
        this.cdr.markForCheck();
      }
    });

    // 2. Reactively handle route navigation changes to force change detection
    const routeSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.cdr.markForCheck();
      });

    this.subscriptions.push(userSub, routeSub);
  }

  private setupWorkflowSubscriptions(): void {
    const requestSub = this.workflowService.getRequestUpdates().subscribe((request) => {
      if (request && this.isMyRequest(request)) {
        this.loadWorkflowData();
        this.loadEmployeeSivs();
        this.cdr.markForCheck();
      }
    });

    const notificationSub = this.workflowService
      .getNotificationUpdates()
      .subscribe((notification) => {
        if (!notification) return;
        const forMe =
          notification.recipientId === this.currentUserId ||
          (notification.recipientRole === 'Employee' &&
            (!notification.recipientId || notification.recipientId === this.currentUserId));
        if (forMe) {
          this.loadWorkflowData();
          this.loadEmployeeSivs();
          this.cdr.markForCheck();
        }
      });

    this.subscriptions.push(requestSub, notificationSub);
  }

  private syncServiceRequestsFromApi(): void {
    this.serviceRequestService
      .getServiceRequests(undefined, { headers: { 'X-Suppress-Error-Toast': 'true' } })
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          const items = (res as { data?: { items?: unknown[] } })?.data?.items ?? [];
          const user = this.currentUserService.getCurrentUserValue();
          this.workflowService.mergeApiServiceRequests(items as ApiServiceRequestRow[], {
            managerQueueId: this.workflowService.getAssignedManagerQueueId(),
            employeeIdFilter: this.currentUserId,
            employeeIdentity: {
              email: user?.email,
              fullName: user?.fullName,
              username: user?.username,
            },
          });
          this.loadWorkflowData();
          this.cdr.markForCheck();
        },
        error: () => {},
      });
  }

  private loadWorkflowData(): void {
    const user = this.currentUserService.getCurrentUserValue();
    const requests = this.workflowService.getRequestsForEmployee(this.currentUserId, {
      email: user?.email,
    });
    this.workflowRequests.set(requests);

    const notifications = this.workflowService.getNotificationsForUser(
      this.currentUserId,
      'Employee',
    );
    this.workflowNotifications.set(notifications);
  }

  private isMyRequest(request: ServiceRequest): boolean {
    if (request.employeeId === this.currentUserId) {
      return true;
    }
    const email = this.currentUserService.getCurrentUserValue()?.email?.trim().toLowerCase();
    return !!email && request.employeeEmail?.trim().toLowerCase() === email;
  }

  private loadEmployeeSivs(): void {
    this.requisitionsService
      .getAllSIVs()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const vouchers = response.data ?? [];
          const requestIndex = new Map(
            this.workflowRequests().map((request) => [request.id, request] as const),
          );
          const requestNumberIndex = new Map(
            this.workflowRequests().map((request) => [request.srNumber, request] as const),
          );

          const mapped = vouchers
            .map((voucher: StoreIssueVoucherDto) => {
              const relatedRequest =
                requestIndex.get(voucher.serviceRequestId) ||
                requestNumberIndex.get(voucher.serviceRequestId);

              if (!relatedRequest) {
                return null;
              }

              const itemNames = Array.isArray(voucher.items)
                ? voucher.items
                    .map((item: any) => item.name || item.itemName || item.description || 'Item')
                    .filter((itemName: string) => !!itemName)
                : [];

              return {
                id: voucher.id,
                sivNumber: voucher.voucherNumber,
                date: new Date(voucher.issueDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                }),
                items:
                  itemNames.length > 0
                    ? itemNames.join(', ')
                    : relatedRequest.items.map((item) => item.name).join(', '),
                status: voucher.status || 'Issued',
                requestId: relatedRequest.srNumber,
              } as EmployeeSivRow;
            })
            .filter((voucher): voucher is EmployeeSivRow => !!voucher)
            .sort((a, b) => b.date.localeCompare(a.date));

          this.employeeSivs.set(mapped);
        },
        error: () => {
          this.employeeSivs.set([]);
        },
      });
  }

  calculateWaitingTime(submittedDate: Date): string {
    const diffMs = Date.now() - new Date(submittedDate).getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours`;
    return `${Math.floor(diffHours / 24)} days`;
  }

  private formatTrendLabel(delta: number, suffix: string): string {
    if (delta === 0) {
      return `No change ${suffix}`;
    }

    return `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta)} ${suffix}`;
  }

  protected getTrendChartPoints(metric: keyof RequestTrendData): string {
    const data = this.requestTrendData();
    const max = this.requestTrendMaxValue();
    if (data.length === 0) {
      return '';
    }

    const left = 100;
    const width = 400;
    const bottom = 180;
    const height = 120;
    const step = data.length > 1 ? width / (data.length - 1) : 0;

    return data
      .map((point, index) => {
        const x = data.length > 1 ? left + index * step : left + width / 2;
        const value = point[metric] as number;
        const y = bottom - (value / max) * height;
        return `${x},${y}`;
      })
      .join(' ');
  }

  protected getTrendYAxisLabel(index: number): number {
    const max = this.requestTrendMaxValue();
    if (index === 4) {
      return 0;
    }

    const step = Math.ceil(max / 4);
    return Math.max(max - step * index, 0);
  }

  private mapNotificationType(type: string, title: string): string {
    if (title.includes('Approved')) return 'approved';
    if (title.includes('Completed')) return 'completed';
    if (title.includes('Submitted')) return 'submitted';
    if (type === 'error') return 'rejected';
    return 'submitted';
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }

  private startClock(): void {
    this.clockInterval = setInterval(() => {
      this.currentTime.set(this.getCurrentTime());
    }, 1000);
  }

  // UI Handlers
  getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'Urgent':
        return '🔴';
      case 'Medium':
        return '🟡';
      case 'Normal':
      default:
        return '🟢';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'Approved':
        return '🟢';
      case 'Rejected':
        return '🔴';
      case 'Completed':
        return '✅';
      case 'Pending':
      default:
        return '⏳';
    }
  }

  // Modal Handlers
  openCreateRequestModal(): void {
    const modalRef = this.modalService.open(CreateRequestModalComponent, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    });

    modalRef.result.then(
      (result) => {
        if (result) {
          this.createWorkflowRequest(result);
          this.syncServiceRequestsFromApi();
        }
      },
      () => {},
    );
  }

  submitRequest(): void {
    // Legacy support for mock form in template
    this.openCreateRequestModal();
  }

  private createWorkflowRequest(modalResult: any): void {
    const currentUser = this.userProfile();
    const newRequest = this.workflowService.submitRequest({
      employeeId: this.currentUserId,
      employeeName: currentUser.fullName || 'Employee',
      employeeEmail: currentUser.email || 'employee@africom.com',
      department: currentUser.department || 'IT Department',
      managerId: this.workflowService.getAssignedManagerQueueId(),
      managerName: 'Manager',
      items:
        modalResult.items?.map((item: any) => ({
          id: 'item_' + Math.random().toString(36).substr(2, 9),
          name: item.name,
          description: item.name,
          quantity: item.quantity || item.requestedQty || 1,
          unitCost: 0,
          totalCost: 0,
          category: 'General',
          specifications: item.notes || '',
        })) || [],
      priority: (modalResult.priority || 'Medium') as any,
      status: 'Draft' as any,
      justification: modalResult.remarks || modalResult.justification || 'Service request',
      requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      estimatedCost: 0,
    });
    this.loadWorkflowData();
    this.cdr.markForCheck();
    alert(`Request ${newRequest.srNumber} submitted successfully!`);
  }

  trackRequest(srNumber: string, forceStatus?: string): void {
    const request = this.workflowRequests().find((r) => r.srNumber === srNumber);
    const modalRef = this.modalService.open(TrackRequestModalComponent, {
      size: 'lg',
      backdrop: 'static',
    });
    modalRef.componentInstance.srNumber = srNumber;
    if (request) {
      modalRef.componentInstance.status = forceStatus || request.status;
      modalRef.componentInstance.priority = request.priority;
      modalRef.componentInstance.items = request.items.map((i) => i.name);
      modalRef.componentInstance.requestedDate = new Date(
        request.submittedDate,
      ).toLocaleDateString();
      modalRef.componentInstance.requiredDate = new Date(request.requiredDate).toLocaleDateString();
    }
  }

  cancelRequest(srNumber: string): void {
    const modalRef = this.modalService.open(CancelRequestModalComponent, {
      centered: true,
      size: 'md',
    });
    modalRef.componentInstance.srNumber = srNumber;
    modalRef.result.then(
      (result) => {
        if (result) {
          alert(`Request ${srNumber} cancellation request has been sent.`);
        }
      },
      () => {},
    );
  }

  editRequest(srNumber: string): void {
    alert(`Editing request ${srNumber} logic here.`);
  }

  editProfile(): void {
    const modalRef = this.modalService.open(EditProfileModalComponent, {
      fullscreen: true,
      backdrop: 'static',
    });
    modalRef.result.then(
      (result) => {
        if (result && result.profile) {
          // Merge the profile update into the global state
          this.currentUserService.updateUser(result.profile);
          alert('Profile updated successfully!');
        }
      },
      () => {},
    );
  }

  changePassword(): void {
    const modalRef = this.modalService.open(ChangePasswordModalComponent, { centered: true });

    modalRef.result.then(
      (result) => {
        if (result && result.currentPassword && result.newPassword) {
          this.authService.changePassword(result).subscribe({
            next: (res) => {
              if (res.succeeded) {
                alert('Password changed successfully! Please login again with your new password.');
                this.authService.logout();
              } else {
                alert('Failed to change password: ' + res.message);
              }
            },
            error: (err) => {
              console.error('Password change error', err);
              alert('An error occurred while changing your password.');
            },
          });
        }
      },
      () => {},
    );
  }

  // Notification Methods
  markAllAsRead(): void {
    this.workflowService.markAllNotificationsAsRead(this.currentUserId, 'Employee');
    this.loadWorkflowData();
    this.cdr.markForCheck();
  }

  markNotificationAsRead(id: string): void {
    this.workflowService.markNotificationAsRead(id);
    this.loadWorkflowData();
    this.cdr.markForCheck();
  }

  dismissNotification(id: string): void {
    this.workflowService.dismissNotification(id);
    this.loadWorkflowData();
  }

  saveNotificationSettings(): void {
    console.log('Notification settings saved:', this.notificationSettings());
  }

  // Photo Methods
  changePhoto(): void {
    this.isSelectingPhoto.set(true);
  }

  // Force reload photo from storage (useful for debugging)
  reloadPhoto(): void {
    const currentUser = this.currentUserService.getCurrentUserValue();
    if (currentUser) {
      const storedPhoto = this.photoPersistenceService.loadPhoto(
        currentUser.id,
        currentUser.username,
        currentUser.email,
      );

      if (storedPhoto) {
        this.profileService.applyLocalProfileImage(storedPhoto);
        console.log('Photo reloaded from persistence service and synced to global state');
      } else {
        // We don't manually set the signal anymore as it's reactive
        console.log('No photo found in persistence service');
      }
    }
  }

  // Debug method to check photo storage (can be called from browser console)
  debugPhotoStorage(): void {
    PhotoDebugUtil.logPhotoStorage();
    const currentUser = this.currentUserService.getCurrentUserValue();
    if (currentUser) {
      PhotoDebugUtil.testPhotoPersistence(currentUser.id, currentUser.username, currentUser.email);
    }
  }

  async startCamera(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 400, height: 400 },
      });
      this.cameraStream.set(stream);
      this.isCameraActive.set(true);
      setTimeout(() => {
        if (this.videoElement?.nativeElement) {
          this.videoElement.nativeElement.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      alert('Could not access camera.');
    }
  }

  stopCamera(): void {
    if (this.cameraStream()) {
      this.cameraStream()
        ?.getTracks()
        .forEach((t) => t.stop());
      this.cameraStream.set(null);
    }
    this.isCameraActive.set(false);
  }

  async handleFile(file: File): Promise<void> {
    if (!file) return;

    try {
      // 1. Face Detection Phase
      this.isValidatingPhoto.set(true);
      const validation = await this.faceDetectionService.validateProfilePhoto(file);
      this.isValidatingPhoto.set(false);

      if (!validation.valid) {
        alert(`Security Alert: ${validation.message}`);
        return;
      }

      // 2. Read file and apply locally immediately — this is instant feedback
      this.profileService.applyLocalProfileImageFromFile(file).subscribe({
        next: () => {
          this.isSelectingPhoto.set(false);
          this.cdr.markForCheck();
          this.profileService.uploadProfileImage(file).subscribe({
            error: (err) => console.warn('Server sync failed (photo saved locally):', err),
          });
        },
        error: () => alert('Could not process image. Please try a smaller photo.'),
      });
    } catch (err) {
      this.isValidatingPhoto.set(false);
      this.isUploadingPhoto.set(false);
      console.error('Photo processing error:', err);
      alert('An error occurred during photo processing.');
    }
  }

  capturePhoto(): void {
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
          await this.handleFile(file);
          this.stopCamera();
        }
      }, 'image/jpeg');
    }
  }

  // 2FA Methods
  enable2FA(): void {
    this.twoFactorEnabled.set(true);
    alert('Two-Factor Authentication configuration initiated!');
  }

  disable2FA(): void {
    this.twoFactorEnabled.set(false);
    this.twoFactorMethod.set('sms');
    this.twoFactorPhone.set('');
    this.twoFactorVerificationSent.set(false);
    this.twoFactorVerificationCode.set('');
    this.twoFactorSetupComplete.set(false);
    alert('Two-Factor Authentication has been disabled!');
  }

  updateTwoFactorMethod(event: any): void {
    this.twoFactorMethod.set(event.target.value);
  }

  updateTwoFactorPhone(event: any): void {
    this.twoFactorPhone.set(event.target.value);
  }

  saveTwoFactorPhone(): void {
    if (this.twoFactorPhone()) {
      this.twoFactorVerificationSent.set(true);
      alert('Verification code sent to ' + this.twoFactorPhone());
    } else {
      alert('Please enter a valid phone number.');
    }
  }

  updateTwoFactorVerificationCode(event: any): void {
    this.twoFactorVerificationCode.set(event.target.value);
  }

  verifyTwoFactorCode(): void {
    if (this.twoFactorVerificationCode() === '123456') {
      this.twoFactorSetupComplete.set(true);
      alert('2FA setup completed successfully!');
    } else {
      alert('Invalid code.');
    }
  }

  resendVerificationCode(): void {
    alert('New code sent to ' + this.twoFactorPhone());
  }

  // SIV Methods
  viewRequest(srNumber: string): void {
    this.trackRequest(srNumber);
  }

  viewSIV(sivId: string): void {
    alert(`Viewing Store Issue Voucher: ${sivId}`);
  }

  downloadPDF(id: string): void {
    alert(`Downloading document: ${id}.pdf`);
  }

  emailSIV(sivId: string): void {
    const subject = encodeURIComponent(`Store Issue Voucher ${sivId}`);
    const body = encodeURIComponent(`Please find attached the Store Issue Voucher ${sivId}.`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
  }

  // Template Helpers
  get currentView(): DashboardView {
    const url = this.router.url;
    if (url.includes('/new-request')) return 'new-request';
    if (url.includes('/my-requests-summary')) return 'my-requests-summary';
    if (url.includes('/my-activity')) return 'my-activity';
    if (url.includes('/my-requests')) return 'my-requests';
    if (url.includes('/profile')) return 'profile';
    if (url.includes('/notifications')) return 'notifications';
    if (url.includes('/catalog-items')) return 'catalog-items';
    return 'home';
  }

  get pageTitle(): string {
    const titles: Record<DashboardView, string> = {
      home: 'Employee Dashboard',
      'new-request': 'Create New Request',
      'my-requests': 'My Requisitions',
      'my-requests-summary': 'My Requests Summary',
      'my-activity': 'My Activity',
      profile: 'My Profile',
      notifications: 'Notifications',
      'catalog-items': 'Available Items',
    };
    return titles[this.currentView];
  }

  get pageSubtitle(): string {
    const subtitles: Record<DashboardView, string> = {
      home: 'My request summary and recent activity',
      'my-requests': 'View and manage all my service requests',
      'catalog-items': 'Browse all items and check availability',
      profile: 'Personal information and request history',
      'new-request': '',
      'my-requests-summary': '',
      'my-activity': '',
      notifications: '',
    };
    return subtitles[this.currentView];
  }

  viewCatalogItem(sku: string): void {
    alert(`Viewing details for SKU: ${sku}`);
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) this.handleFile(file);
  }

  cancelUpload(): void {
    this.isSelectingPhoto.set(false);
    this.stopCamera();
  }

  // Catalog Filter State
  readonly catalogSearch = signal('');
  readonly catalogCategoryFilter = signal('All');
  readonly catalogStatusFilter = signal('All');

  readonly baseCatalogItems = signal<CatalogItem[]>([
    {
      sku: 'SKU-001',
      name: 'Dell Latitude 5420 Laptop',
      category: 'Electronics',
      available: 15,
      status: 'Good',
      lastRestocked: '2026-05-10',
      uom: 'pcs',
    },
    {
      sku: 'SKU-002',
      name: 'Ergonomic Mesh Office Chair',
      category: 'Furniture',
      available: 8,
      status: 'Good',
      lastRestocked: '2026-04-15',
      uom: 'pcs',
    },
    {
      sku: 'SKU-003',
      name: 'Apple iPad Air (64GB)',
      category: 'Electronics',
      available: 2,
      status: 'Low',
      lastRestocked: '2026-03-20',
      uom: 'pcs',
    },
    {
      sku: 'SKU-004',
      name: 'Standard A4 Copy Paper (Ream)',
      category: 'Supplies',
      available: 50,
      status: 'Good',
      lastRestocked: '2026-05-14',
      uom: 'reams',
    },
    {
      sku: 'SKU-005',
      name: 'Wireless Keyboard & Mouse Combo',
      category: 'Electronics',
      available: 0,
      status: 'Out of Stock',
      lastRestocked: '2026-02-10',
      uom: 'set',
    },
    {
      sku: 'SKU-006',
      name: 'Standing Desk (Dual Motor)',
      category: 'Furniture',
      available: 1,
      status: 'Low',
      lastRestocked: '2026-04-01',
      uom: 'pcs',
    },
    {
      sku: 'SKU-007',
      name: 'Blue Ballpoint Pens (Pack of 50)',
      category: 'Supplies',
      available: 35,
      status: 'Good',
      lastRestocked: '2026-05-08',
      uom: 'pack',
    },
  ]);

  readonly filteredCatalogItems = computed(() => {
    let items = this.baseCatalogItems();

    const search = this.catalogSearch().toLowerCase().trim();
    if (search) {
      items = items.filter(
        (item) =>
          item.sku.toLowerCase().includes(search) ||
          item.name.toLowerCase().includes(search) ||
          item.category.toLowerCase().includes(search),
      );
    }

    const category = this.catalogCategoryFilter();
    if (category !== 'All') {
      items = items.filter((item) => item.category === category);
    }

    const status = this.catalogStatusFilter();
    if (status !== 'All') {
      items = items.filter((item) => item.status === status);
    }

    return items;
  });
  readonly catalogItems = computed(() => this.filteredCatalogItems());
  readonly quickLinks: QuickLink[] = [
    { label: 'Return Materials', icon: '📦', route: '/employee/returns' },
    { label: 'Available Items', icon: '🔍', route: '/employee/dashboard/catalog-items' },
  ];
}
