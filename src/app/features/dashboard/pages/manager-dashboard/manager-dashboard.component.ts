import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CurrentUserService } from '../../../../core/services/current-user.service';
import { UserProfile } from '../../../../types/dashboard.types';
import { Router } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { SignalRService } from '../../../../core/services/signalr.service';

type RequestStatus = 'Pending' | 'Approved' | 'Rejected';
type RequestFilter = 'All' | RequestStatus;
type OverviewPeriod = 'This Month' | 'This Week' | 'Today';

interface ManagerRequest {
  readonly id: number;
  readonly employeeName: string;
  readonly itemName: string;
  readonly quantity: number;
  readonly date: string;
  readonly status: RequestStatus;
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
  templateUrl: './manager-dashboard.component.html',
  styleUrl: './manager-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagerDashboardComponent implements OnInit, OnDestroy {
  private readonly signalRService = inject(SignalRService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly currentUserService = inject(CurrentUserService);

  readonly managerName = computed(() => this.userProfile().fullName);
  readonly userProfile = signal<UserProfile>({
    fullName: '',
    employeeCode: '',
    department: '',
    position: '',
    email: '',
    phone: '',
    joinDate: '',
  });

  private setupProfileSubscription(): void {
    this.currentUserService.getCurrentUser().subscribe(user => {
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
      }
    });
  }
  readonly filters: RequestFilter[] = ['All', 'Pending', 'Approved', 'Rejected'];
  readonly selectedFilter = signal<RequestFilter>('Pending');
  readonly selectedPeriod = signal<OverviewPeriod>('This Month');
  readonly currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  readonly currentTime = signal<string>(this.getCurrentTime());
  readonly currentLocation = signal<string>('Addis Ababa, Ethiopia');
  private clockInterval?: any;

  // Profile photo
  readonly profilePhoto = signal<SafeUrl | string | null>(null);
  readonly isSelectingPhoto = signal(false);
  readonly isCameraActive = signal(false);
  readonly cameraStream = signal<MediaStream | null>(null);

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  readonly requests = signal<ManagerRequest[]>([
    {
      id: 123,
      employeeName: 'Emma Collins',
      itemName: 'Laptop',
      quantity: 1,
      date: 'Today',
      status: 'Pending',
    },
    {
      id: 124,
      employeeName: 'David Miles',
      itemName: 'Printer',
      quantity: 2,
      date: 'Apr 24, 2026',
      status: 'Rejected',
    },
    {
      id: 125,
      employeeName: 'Sophia Reed',
      itemName: 'Office Chair',
      quantity: 4,
      date: 'Today',
      status: 'Approved',
    },
    {
      id: 126,
      employeeName: 'Noah Bright',
      itemName: 'Monitor',
      quantity: 2,
      date: 'Apr 23, 2026',
      status: 'Pending',
    },
  ]);

  readonly recentActivity = signal<ActivityItem[]>([
    {
      title: 'Emma Collins submitted a request for Laptop',
      detail: 'Pending manager review',
      time: 'Apr 25, 2026 08:15 AM',
      avatar: 'EC',
    },
    {
      title: 'John Smith submitted a request for Office Chair',
      detail: 'Waiting in the approval queue',
      time: 'Apr 25, 2026 09:10 AM',
      avatar: 'JS',
    },
    {
      title: 'You approved request REQ-123',
      detail: 'Approval completed successfully',
      time: 'Apr 24, 2026 04:45 PM',
      avatar: 'YM',
    },
  ]);

  readonly approvals = signal<ApprovalItem[]>([
    {
      id: 'REQ-123',
      employeeName: 'Emma Collins',
      itemName: 'Laptop',
      status: 'Approved',
      date: 'Apr 24',
    },
    {
      id: 'REQ-124',
      employeeName: 'John Smith',
      itemName: 'Monitor',
      status: 'Rejected',
      date: 'Apr 24',
    },
    {
      id: 'REQ-125',
      employeeName: 'Emma Collins',
      itemName: 'Laptop',
      status: 'Pending',
      date: 'Apr 25',
    },
  ]);

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
    this.prependActivity('You refreshed the approval queue', 'Queue refreshed', 'YM');
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

  approveRequest(id: number): void {
    this.updateRequestStatus(id, 'Approved');
    this.prependActivity(`You approved request #${id}`, 'Approval completed successfully', 'YM');
    this.signalRService.pushNotification({
      id: crypto.randomUUID(),
      message: `Request #${id} was approved`,
      type: 'success',
      isRead: false,
      sentDate: new Date(),
    });
  }

  rejectRequest(id: number): void {
    this.updateRequestStatus(id, 'Rejected');
    this.prependActivity(`You rejected request #${id}`, 'Request moved to rejected', 'YM');
    this.signalRService.pushNotification({
      id: crypto.randomUUID(),
      message: `Request #${id} was rejected`,
      type: 'error',
      isRead: false,
      sentDate: new Date(),
    });
  }

  private updateRequestStatus(id: number, status: RequestStatus): void {
    this.requests.update((items) =>
      items.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  }

  private prependActivity(title: string, detail: string, avatar: string): void {
    this.recentActivity.update((items) => [
      {
        title,
        detail,
        time: this.formatActivityTime(),
        avatar,
      },
      ...items,
    ]);
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
  }

  ngOnDestroy(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
    this.stopCamera();
  }

  // Photo upload methods
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleFile(input.files[0]);
    }
  }

  private handleFile(file: File): void {
    if (file.size > 2 * 1024 * 1024) {
      alert('File too large. Max 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const base64 = e.target?.result as string;
      this.profilePhoto.set(this.sanitizer.bypassSecurityTrustUrl(base64));
      this.isSelectingPhoto.set(false);
    };
    reader.readAsDataURL(file);
  }

  async startCamera(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 400, height: 400 }
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
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
          const photoUrl = URL.createObjectURL(file);
          this.profilePhoto.set(this.sanitizer.bypassSecurityTrustUrl(photoUrl));
          this.stopCamera();
        }
      }, 'image/jpeg');
    }
  }

  stopCamera(): void {
    this.cameraStream()?.getTracks().forEach(t => t.stop());
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
}
