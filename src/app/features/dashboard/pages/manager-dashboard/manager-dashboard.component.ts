import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrentUserService } from '../../../../core/services/current-user.service';
import { UserProfile, RequestTrendData } from '../../../../types/dashboard.types';
import { Router } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { SignalRService } from '../../../../core/services/signalr.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TwoFactorModalComponent } from '../../components/two-factor-modal/two-factor-modal.component';
import { EditProfileModalComponent } from '../../components/edit-profile-modal/edit-profile-modal.component';
import {
  WorkflowService,
  ServiceRequest,
  NotificationMessage,
} from '../../../../core/services/workflow.service';
import { Subscription, forkJoin, of, take, finalize } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { EmployeesService } from '../../../../core/services/employees.service';
import { UsersService } from '../../../../core/services/users.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ServiceRequestService } from '../../../requisition/service-requests/services/service-request.service';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, PieChart, LineChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
  TitleComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

try { echarts.use([BarChart, PieChart, LineChart, TooltipComponent, GridComponent, LegendComponent, TitleComponent, CanvasRenderer]); } catch {};

type RequestStatus = 'Pending' | 'Approved' | 'Rejected';
type RequestFilter = 'All' | RequestStatus;
type OverviewPeriod = 'This Month' | 'This Week' | 'Today';

interface ManagerRequest {
  readonly id: string;
  readonly requestNumber: string;
  readonly employeeName: string;
  readonly itemName: string;
  readonly quantity: number;
  readonly date: string;
  readonly status: RequestStatus;
  readonly priority: string;
}

interface SummaryCard {
  readonly icon: string;
  readonly tone: 'warning' | 'success' | 'danger' | 'info';
  readonly title: string;
  readonly value: number;
  readonly description: string;
}

interface OverviewSlice {
  readonly label: string;
  readonly value: number;
  readonly percent: number;
  readonly color: string;
}

interface ActivityItem {
  readonly title: string;
  readonly detail: string;
  readonly time: string;
  readonly avatar: string;
}

interface ApprovalItem {
  readonly id: string;
  readonly employeeName: string;
  readonly itemName: string;
  readonly status: RequestStatus;
  readonly date: string;
}

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './manager-dashboard.component.html',
  styleUrl: './manager-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagerDashboardComponent implements OnInit, OnDestroy {
  private readonly signalRService = inject(SignalRService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly workflowService = inject(WorkflowService);
  private readonly serviceRequestService = inject(ServiceRequestService);
  private readonly modalService = inject(NgbModal);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  // Subscriptions for real-time updates
  private subscriptions: Subscription[] = [];

  // Current manager info
  private currentManagerId = 'mgr_001';

  // Workflow-related signals
  readonly workflowRequests = signal<ServiceRequest[]>([]);
  readonly workflowNotifications = signal<NotificationMessage[]>([]);

  readonly managerName = computed(() => this.userProfile().fullName);
  readonly userName = this.managerName;
  readonly userProfile = signal<UserProfile>({
    fullName: '',
    employeeCode: '',
    department: '',
    position: '',
    email: '',
    phone: '',
    joinDate: '',
  });

  private readonly employeesService = inject(EmployeesService);
  private readonly usersService = inject(UsersService);

  private setupProfileSubscription(): void {
    // 1. Instantly show what is in the stored session (no flicker)
    this.currentUserService.getCurrentUser().subscribe((user) => {
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
        if (user.photoUrl) {
          this.profilePhoto.set(this.sanitizer.bypassSecurityTrustUrl(user.photoUrl));
        }
        this.currentManagerId =
          user.id || this.workflowService.getManagerQueueIdForCurrentUser();
        this.loadWorkflowData();
      }
    });

    // 2. Fetch fresh profile data directly from the backend every time the dashboard loads.
    //    This ensures department / phone / employeeCode are always populated.
    const userId = this.currentUserService.getUserId();
    if (userId) {
      forkJoin({
        employee: this.employeesService.getByUserId(userId).pipe(catchError(() => of(null))),
        userDetail: this.usersService.getById(userId).pipe(catchError(() => of(null))),
      })
        .pipe(take(1))
        .subscribe(({ employee, userDetail }) => {
          const emp = employee?.data as any;
          const usr = userDetail?.data as any;

          const patch: Partial<UserProfile> = {};

          const department = emp?.department?.trim() || emp?.Department?.trim() || undefined;
          if (department) patch.department = department;

          const phone =
            emp?.phone?.trim() || emp?.Phone?.trim() || emp?.phoneNumber?.trim() || undefined;
          if (phone) patch.phone = phone;

          const position = emp?.position?.trim() || emp?.Position?.trim() || undefined;
          if (position) patch.position = position;

          const joinDate =
            emp?.joinDate?.trim() || emp?.hireDate?.trim() || emp?.JoinDate?.trim() || undefined;
          if (joinDate) patch.joinDate = joinDate;

          const employeeCode =
            emp?.employeeCode?.trim() ||
            emp?.EmployeeCode?.trim() ||
            usr?.employeeCode?.trim() ||
            undefined;
          if (employeeCode) patch.employeeCode = employeeCode;

          if (Object.keys(patch).length > 0) {
            this.userProfile.update((prev) => ({ ...prev, ...patch }));
            this.currentUserService.updateUser(patch as any);
          }
        });
    }
  }
  readonly filters: RequestFilter[] = ['All', 'Pending', 'Approved', 'Rejected'];
  readonly selectedFilter = signal<RequestFilter>('Pending');
  readonly selectedPeriod = signal<OverviewPeriod>('This Month');
  readonly currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  readonly greeting = this.getGreeting();
  readonly currentTime = signal<string>(this.getCurrentTime());
  readonly currentLocation = signal<string>('Addis Ababa, Ethiopia');
  private clockInterval?: any;

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  // Profile photo
  readonly profilePhoto = signal<SafeUrl | string | null>(null);
  readonly isSelectingPhoto = signal(false);
  readonly isCameraActive = signal(false);
  readonly cameraStream = signal<MediaStream | null>(null);
  readonly isValidatingPhoto = signal(false);

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  // Two-Factor Authentication settings
  protected readonly twoFactorEnabled = signal(false);
  protected readonly twoFactorMethod = signal<'email'>('email');
  protected readonly twoFactorPhone = signal('');
  protected readonly twoFactorVerificationSent = signal(false);
  protected readonly twoFactorVerificationCode = signal('');
  protected readonly twoFactorSetupComplete = signal(false);
  protected readonly twoFactorSending = signal(false);
  private currentCode = '';

  readonly requests = signal<ManagerRequest[]>([]);

  readonly currentView = signal<'home' | 'profile'>('home');

  readonly recentActivity = signal<ActivityItem[]>([]);

  readonly approvals = computed<ApprovalItem[]>(() =>
    this.requests()
      .map((request) => ({
        id: request.requestNumber,
        employeeName: request.employeeName,
        itemName: request.itemName,
        status: request.status,
        date: request.date,
      }))
      .slice(0, 5),
  );

  readonly summaryCards = computed<SummaryCard[]>(() => {
    const requests = this.requests();

    return [
      {
        icon: 'bi bi-clock-history',
        tone: 'warning',
        title: 'Pending Requests',
        value: requests.filter((item) => item.status === 'Pending').length,
        description: 'Needs your action',
      },
      {
        icon: 'bi bi-check-circle',
        tone: 'success',
        title: 'Approved Requests',
        value: requests.filter((item) => item.status === 'Approved').length,
        description: 'This month',
      },
      {
        icon: 'bi bi-x-circle',
        tone: 'danger',
        title: 'Rejected Requests',
        value: requests.filter((item) => item.status === 'Rejected').length,
        description: 'This month',
      },
      {
        icon: 'bi bi-file-earmark-text',
        tone: 'info',
        title: 'Total Requests',
        value: requests.length,
        description: 'This month',
      },
    ];
  });

  readonly pendingCount = computed(() =>
    this.requests().filter((r) => r.status === 'Pending').length,
  );

  readonly monthlyTrendData = computed(() => {
    const requests = this.workflowRequests();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const submitted = new Array(12).fill(0);
    const approved = new Array(12).fill(0);
    const rejected = new Array(12).fill(0);

    requests.forEach((req) => {
      const d = new Date(req.submittedDate);
      const m = d.getMonth();
      if (m >= 0 && m <= 11) {
        submitted[m]++;
        if (['Manager Approved', 'Admin Approved', 'Compliance Review', 'Completed'].includes(req.status)) {
          approved[m]++;
        } else if (['Manager Rejected', 'Admin Rejected'].includes(req.status)) {
          rejected[m]++;
        }
      }
    });

    return { months, submitted, approved, rejected };
  });

  readonly trendChartOptions = computed(() => {
    const data = this.monthlyTrendData();
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
      },
      legend: {
        data: ['Submitted', 'Approved', 'Rejected'],
        bottom: 0,
        textStyle: { color: '#64748b', fontSize: 12 },
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
      },
      grid: { left: '3%', right: '3%', bottom: '22%', top: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: data.months,
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#94a3b8', fontWeight: 500, fontSize: 11 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
      },
      series: [
        {
          name: 'Submitted',
          type: 'bar',
          stack: 'total',
          data: data.submitted,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#818cf8' },
              { offset: 1, color: '#6366f1' },
            ]),
            borderRadius: [2, 2, 0, 0],
          },
          emphasis: { itemStyle: { color: '#4f46e5' } },
        },
        {
          name: 'Approved',
          type: 'bar',
          stack: 'total',
          data: data.approved,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#4ade80' },
              { offset: 1, color: '#22c55e' },
            ]),
            borderRadius: [2, 2, 0, 0],
          },
          emphasis: { itemStyle: { color: '#16a34a' } },
        },
        {
          name: 'Rejected',
          type: 'bar',
          stack: 'total',
          data: data.rejected,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#f87171' },
              { offset: 1, color: '#ef4444' },
            ]),
            borderRadius: [2, 2, 0, 0],
          },
          emphasis: { itemStyle: { color: '#dc2626' } },
        },
      ],
    };
  });

  readonly statusChartOptions = computed(() => {
    const slices = this.overviewSlices();
    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#334155', fontSize: 12 },
        formatter: (params: any) =>
          `${params.name}: <strong>${params.value}</strong> (${params.percent}%)`,
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        textStyle: { color: '#64748b', fontSize: 12 },
        icon: 'circle',
        itemWidth: 10,
        itemHeight: 10,
      },
      series: [
        {
          type: 'pie',
          radius: ['45%', '72%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: true,
          padAngle: 2,
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 14, fontWeight: 'bold' },
            itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.15)' },
          },
          labelLine: { show: false },
          data: slices.map((s) => ({
            value: s.value,
            name: s.label,
            itemStyle: { color: s.color },
          })),
        },
      ],
    };
  });

  readonly requestTrendData = computed<RequestTrendData[]>(() => {
    const data = this.monthlyTrendData();
    return data.months.map((month, i) => ({
      month,
      submitted: data.submitted[i],
      approved: data.approved[i],
      completed: 0,
      rejected: data.rejected[i],
    }));
  });

  readonly overviewSlices = computed<OverviewSlice[]>(() => {
    const requests = this.requests();
    const total = Math.max(requests.length, 1);
    const pending = requests.filter((item) => item.status === 'Pending').length;
    const approved = requests.filter((item) => item.status === 'Approved').length;
    const rejected = requests.filter((item) => item.status === 'Rejected').length;

    return [
      {
        label: 'Pending',
        value: pending,
        percent: Math.round((pending / total) * 100),
        color: '#fbbf24',
      },
      {
        label: 'Approved',
        value: approved,
        percent: Math.round((approved / total) * 100),
        color: '#16a34a',
      },
      {
        label: 'Rejected',
        value: rejected,
        percent: Math.round((rejected / total) * 100),
        color: '#ef4444',
      },
    ];
  });

  readonly overviewConicGradient = computed(() => {
    const slices = this.overviewSlices();
    const total = slices.reduce((sum, item) => sum + item.value, 0) || 1;
    let accumulated = 0;

    return slices
      .map((slice) => {
        const start = accumulated;
        const end = accumulated + (slice.value / total) * 100;
        accumulated = end;
        return `${slice.color} ${start}% ${end}%`;
      })
      .join(', ');
  });

  readonly filteredRequests = computed(() => {
    const activeFilter = this.selectedFilter();
    const requests = this.requests();

    if (activeFilter === 'All') {
      return requests;
    }

    return requests.filter((item) => item.status === activeFilter);
  });

  setFilter(filter: RequestFilter): void {
    this.selectedFilter.set(filter);
  }

  setPeriod(period: OverviewPeriod): void {
    this.selectedPeriod.set(period);
  }

  togglePeriod(): void {
    const periods: OverviewPeriod[] = ['This Month', 'This Week', 'Today'];
    const current = this.selectedPeriod();
    const nextIndex = (periods.indexOf(current) + 1) % periods.length;
    this.selectedPeriod.set(periods[nextIndex]);
  }

  refresh(): void {
    this.syncServiceRequestsFromApi();
  }

  viewAllRequests(): void {
    void this.router.navigate(['/manager/requests/all']);
  }

  viewAllActivity(): void {
    void this.router.navigate(['/manager/notifications']);
  }

  viewAllApprovals(): void {
    void this.router.navigate(['/manager/approvals/pending']);
  }

  approveRequest(id: string): void {
    const workflowRequest = this.workflowRequests().find((req) => req.id === id);

    if (workflowRequest) {
      this.workflowService.managerReviewRequest(
        workflowRequest.id,
        'approve',
        'Request approved by manager',
        this.currentManagerId,
        this.managerName(),
      );

      this.prependActivity(
        `You approved request ${workflowRequest.srNumber}`,
        'Approval completed successfully',
        'YM',
      );
      this.signalRService.pushNotification({
        id: crypto.randomUUID(),
        message: `Request ${workflowRequest.srNumber} was approved`,
        type: 'success',
        isRead: false,
        sentDate: new Date(),
      });
    }
  }

  rejectRequest(id: string): void {
    const workflowRequest = this.workflowRequests().find((req) => req.id === id);

    if (workflowRequest) {
      this.workflowService.managerReviewRequest(
        workflowRequest.id,
        'reject',
        'Request rejected by manager',
        this.currentManagerId,
        this.managerName(),
      );

      this.prependActivity(
        `You rejected request ${workflowRequest.srNumber}`,
        'Request moved to rejected',
        'YM',
      );
      this.signalRService.pushNotification({
        id: crypto.randomUUID(),
        message: `Request ${workflowRequest.srNumber} was rejected`,
        type: 'error',
        isRead: false,
        sentDate: new Date(),
      });
      this.serviceRequestService
        .reject({ id: workflowRequest.id, reason: 'Request rejected by manager' })
        .pipe(take(1))
        .subscribe({
          next: () => this.syncServiceRequestsFromApi(),
          error: () => {},
        });

      // Force reload of workflow data to refresh the UI
      setTimeout(() => {
        this.loadWorkflowData();
        this.cdr.markForCheck();
      }, 100);
    }
  }

  private updateRequestStatus(id: string, status: RequestStatus): void {
    this.requests.update((items) =>
      items.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  }

  private prependActivity(title: string, detail: string, avatar: string): void {
    this.recentActivity.update((items) =>
      [
        {
          title,
          detail,
          time: this.formatActivityTime(),
          avatar,
        },
        ...items,
      ].slice(0, 8),
    );
  }

  private formatActivityTime(): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());
  }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }

  ngOnInit(): void {
    this.setupProfileSubscription();
    this.clockInterval = setInterval(() => {
      this.currentTime.set(this.getCurrentTime());
    }, 1000);
    this.setupWorkflowSubscriptions();
    this.syncServiceRequestsFromApi();
    this.loadWorkflowData();
  }

  private syncServiceRequestsFromApi(): void {
    this.serviceRequestService
      .getServiceRequests()
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          const items = this.workflowService.extractApiServiceRequestRows(res);
          this.workflowService.mergeApiServiceRequests(items, {
            managerQueueId: this.workflowService.getManagerQueueIdForCurrentUser(),
          });
          this.loadWorkflowData();
          this.cdr.markForCheck();
        },
        error: () => {},
      });
  }

  private setupWorkflowSubscriptions(): void {
    // Subscribe to real-time request updates
    const requestSub = this.workflowService.getRequestUpdates().subscribe((request) => {
      if (request) {
        this.loadWorkflowData();
        this.cdr.markForCheck();
      }
    });

    // Subscribe to real-time notification updates
    const notificationSub = this.workflowService
      .getNotificationUpdates()
      .subscribe((notification) => {
        if (notification && notification.recipientRole === 'Manager') {
          this.loadWorkflowData();
          this.cdr.markForCheck();
        }
      });

    this.subscriptions.push(requestSub, notificationSub);
  }

  private readonly cdr = inject(ChangeDetectorRef);

  private loadWorkflowData(): void {
    // Load ALL requests for current manager
    const requests = this.workflowService.getRequestsForManagerAll(this.currentManagerId);
    this.workflowRequests.set(requests);

    // Load notifications for current manager
    const notifications = this.workflowService.getNotificationsForUser(
      this.currentManagerId,
      'Manager',
    );
    this.workflowNotifications.set(notifications);

    // Update requests signal with workflow data
    this.updateRequestsFromWorkflow();
    this.updateActivityFromWorkflow();
  }

  private updateRequestsFromWorkflow(): void {
    const workflowRequests = this.workflowRequests();
    const managerRequests: ManagerRequest[] = workflowRequests.map((req) => ({
      id: req.id,
      requestNumber: req.srNumber,
      employeeName: req.employeeName,
      itemName: req.items[0]?.name || 'Multiple Items',
      quantity: req.items.reduce((sum, item) => sum + item.quantity, 0),
      date: this.formatDate(req.submittedDate),
      status: this.mapWorkflowStatusToManagerStatus(req.status),
      priority: req.priority,
    }));

    this.requests.set(managerRequests);
  }

  private updateActivityFromWorkflow(): void {
    const workflowActivity = this.workflowRequests()
      .flatMap((request) =>
        request.workflowHistory.map((step) => ({
          title: `${step.action} - ${request.srNumber}`,
          detail: `${request.employeeName} • ${request.items[0]?.name || 'Service request'}`,
          time: new Date(step.timestamp).toLocaleString(),
          avatar: this.initials(step.performedBy || request.employeeName),
          timestamp: new Date(step.timestamp).getTime(),
        })),
      )
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 8)
      .map(({ timestamp, ...activity }) => activity);

    this.recentActivity.set(workflowActivity);
  }

  private initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U';
  }

  private mapWorkflowStatusToManagerStatus(status: string): RequestStatus {
    switch (status) {
      case 'Submitted':
      case 'Under Review':
        return 'Pending';
      case 'Manager Approved':
      case 'Admin Approved':
      case 'Compliance Review':
      case 'Completed':
        return 'Approved';
      case 'Manager Rejected':
      case 'Admin Rejected':
        return 'Rejected';
      default:
        return 'Pending';
    }
  }

  private formatDate(date: Date): string {
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  ngOnDestroy(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
    this.stopCamera();

    // Clean up subscriptions
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  // Photo upload methods
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleFile(input.files[0]);
    }
  }

  private handleFile(file: File): void {
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Max 5MB.');
      return;
    }

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    this.resizeImage(file).then((resizedFile) => {
      const imageUrl = URL.createObjectURL(resizedFile);
      this.profilePhoto.set(this.sanitizer.bypassSecurityTrustUrl(imageUrl));
      this.isSelectingPhoto.set(false);
    });
  }

  private async resizeImage(file: File): Promise<File> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 400;

        if (width > height) {
          if (width > maxDimension) {
            height *= maxDimension / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width *= maxDimension / height;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(resizedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.9,
        );
      };
      img.src = URL.createObjectURL(file);
    });
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
      console.error('Camera error:', err);
      alert('Could not access camera.');
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
          const resizedFile = await this.resizeImage(file);
          const photoUrl = URL.createObjectURL(resizedFile);
          this.profilePhoto.set(this.sanitizer.bypassSecurityTrustUrl(photoUrl));
          this.stopCamera();
        }
      }, 'image/jpeg');
    }
  }

  stopCamera(): void {
    this.cameraStream()
      ?.getTracks()
      .forEach((t) => t.stop());
    this.cameraStream.set(null);
    this.isCameraActive.set(false);
  }

  cancelUpload(): void {
    this.stopCamera();
    this.isSelectingPhoto.set(false);
  }

  changePhoto(): void {
    this.isSelectingPhoto.set(true);
  }

  // Two-Factor Authentication methods
  enable2FA(): void {
    this.twoFactorEnabled.set(true);
    this.twoFactorVerificationSent.set(false);
    this.twoFactorSetupComplete.set(false);
    this.twoFactorVerificationCode.set('');
    this.twoFactorPhone.set('');
    this.toastService.info('Fill in your contact info and click Send Code to enable 2FA.');
  }

  disable2FA(): void {
    this.authService.disable2FA().subscribe({
      next: (res) => {
        this.twoFactorEnabled.set(false);
        this.twoFactorMethod.set('email');
        this.twoFactorPhone.set('');
        this.twoFactorVerificationSent.set(false);
        this.twoFactorVerificationCode.set('');
        this.twoFactorSetupComplete.set(false);
        if (res.succeeded) {
          this.toastService.success('Two-Factor Authentication has been disabled.');
        } else {
          this.toastService.error(res.message || 'Failed to disable 2FA.');
        }
      },
      error: () => this.toastService.error('Unable to disable 2FA. Please try again.'),
    });
  }

  showProfile(): void {
    this.currentView.set('profile');
  }

  hideProfile(): void {
    this.currentView.set('home');
  }

  editProfile(): void {
    const modalRef = this.modalService.open(EditProfileModalComponent, {
      fullscreen: true,
      backdrop: 'static',
    });

    modalRef.result.then(
      (result) => {
        if (result && result.profile) {
          this.cdr.markForCheck();
        }
      },
      () => {},
    );
  }

  updateTwoFactorMethod(event: Event): void {
    this.twoFactorMethod.set('email');
    if (this.twoFactorSetupComplete()) {
      this.twoFactorSetupComplete.set(false);
      this.twoFactorVerificationSent.set(false);
      this.twoFactorVerificationCode.set('');
    }
  }

  updateTwoFactorPhone(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.twoFactorPhone.set(target.value);
  }

  saveTwoFactorPhone(): void {
    const contact = this.userProfile().email;
    if (!contact) {
      alert('Please enter a valid email address.');
      return;
    }
    this.twoFactorSending.set(true);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.currentCode = code;
    this.authService.sendVerificationCode(contact, code).pipe(finalize(() => this.twoFactorSending.set(false))).subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.twoFactorVerificationSent.set(true);
          this.toastService.success('Verification code sent! Check your inbox.');
        } else {
          alert(res.message || 'Failed to send verification code.');
        }
      },
      error: () => {
        alert('Unable to send verification code. Please try again.');
      },
    });
  }

  updateTwoFactorVerificationCode(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.twoFactorVerificationCode.set(target.value);
  }

  verifyTwoFactorCode(): void {
    if (this.twoFactorVerificationCode() !== this.currentCode) {
      alert('Invalid verification code. Please check the code sent to your email and try again.');
      return;
    }
    const contact = this.userProfile().email;
    this.twoFactorSending.set(true);
    this.authService.enable2FA('email', contact).pipe(finalize(() => this.twoFactorSending.set(false))).subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.twoFactorSetupComplete.set(true);
          this.toastService.success(res.message || '2FA enabled successfully!');
        } else {
          alert(res.message || 'Failed to enable 2FA.');
        }
      },
      error: () => {
        alert('Unable to enable 2FA. Please try again.');
      },
    });
  }

  resendVerificationCode(): void {
    this.twoFactorVerificationCode.set('');
    this.saveTwoFactorPhone();
  }
}
