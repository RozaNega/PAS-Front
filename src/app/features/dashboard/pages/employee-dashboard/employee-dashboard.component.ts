import { ChangeDetectionStrategy, Component, inject, signal, OnInit, OnDestroy, ViewChild, ElementRef, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PasApiService } from '../../../../shared/services/pas-api.service';
import { CurrentUserService } from '../../../../core/services/current-user.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  RequestSummaryCard,
  PendingRequest,
  RecentActivity,
  RequestTrendData,
  QuickLink,
  ServiceRequest,
  CatalogItem,
  UserProfile,
} from '../../../../types/dashboard.types';
import { TrackRequestModalComponent } from '../../components/track-request-modal/track-request-modal.component';
import { CancelRequestModalComponent } from '../../components/cancel-request-modal/cancel-request-modal.component';
import { CreateRequestModalComponent } from '../../components/create-request-modal/create-request-modal.component';
import { EditProfileModalComponent } from '../../components/edit-profile-modal/edit-profile-modal.component';
import { PhotoUploadModalComponent } from '../../components/photo-upload-modal/photo-upload-modal.component';
import { ChangePasswordModalComponent } from '../../components/change-password-modal/change-password-modal.component';
import { TwoFactorModalComponent } from '../../components/two-factor-modal/two-factor-modal.component';

type DashboardView =
  | 'home'
  | 'new-request'
  | 'my-requests'
  | 'my-requests-summary'
  | 'my-activity'
  | 'profile'
  | 'notifications'
  | 'catalog-items';

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

  ngOnInit(): void {
    this.setupProfileSubscription();
    this.startClock();
  }

  private startClock(): void {
    this.clockInterval = setInterval(() => {
      this.currentTime.set(this.getCurrentTime());
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  readonly userName = computed(() => this.userProfile().fullName);
  readonly currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  readonly greeting = this.getGreeting();
  readonly profilePhoto = signal<SafeUrl | string | null>(null);
  readonly currentTime = signal<string>(this.getCurrentTime());
  readonly currentLocation = signal<string>('Addis Ababa, Ethiopia');
  private clockInterval?: any;

  // Inline Photo
  readonly isSelectingPhoto = signal(false);
  readonly isCameraActive = signal(false);
  readonly cameraStream = signal<MediaStream | null>(null);

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  // Notification settings
  readonly notificationSettings = signal({
    emailOnApproval: true,
    emailOnRejection: true,
    emailOnReady: true,
    weeklySummary: false,
    monthlyDigest: false,
  });

  // Notifications data structure
  readonly notifications = signal([
    {
      id: '1',
      type: 'approved',
      requestId: 'SR-2024-1234',
      message: 'Your request SR-2024-1234 has been approved',
      date: 'Dec 15, 2024 10:30 AM',
      read: false,
    },
    {
      id: '2',
      type: 'completed',
      requestId: 'SR-2024-1198',
      sivId: 'SIV-045',
      message: 'Your request SR-2024-1198 has been completed',
      date: 'Dec 14, 2024 03:45 PM',
      read: false,
    },
    {
      id: '3',
      type: 'submitted',
      requestId: 'SR-2024-1250',
      message: 'Your request SR-2024-1250 has been submitted',
      date: 'Dec 13, 2024 09:15 AM',
      read: false,
    },
  ]);

  readonly summaryCards: RequestSummaryCard[] = [
    {
      title: 'Total Requests',
      value: 5,
      subtitle: 'This Month',
      trend: '▲ +2 from last month',
      icon: 'bi-clipboard2-data',
      tone: 'blue',
    },
    {
      title: 'Pending',
      value: 2,
      subtitle: 'Approval',
      trend: '🔴 Urgent: 1',
      icon: 'bi-clock-history',
      tone: 'amber',
    },
    {
      title: 'Approved',
      value: 2,
      subtitle: '',
      trend: '🟢 Ready',
      icon: 'bi-check-circle',
      tone: 'green',
    },
    {
      title: 'Rejected',
      value: 0,
      subtitle: '',
      trend: '● Same',
      icon: 'bi-x-circle',
      tone: 'rose',
    },
    {
      title: 'Completed',
      value: 1,
      subtitle: '',
      trend: '✅ Done',
      icon: 'bi-check2-all',
      tone: 'green',
    },
  ];

  pendingRequests: PendingRequest[] = [
    {
      srNumber: 'SR-2024-123',
      priority: 'Urgent',
      requestedDate: 'Dec 15, 2024',
      waitingTime: '2 hours',
      requiredDate: 'Dec 18, 2024',
      items: ['Dell XPS Laptop (2)', 'HP Monitor (1)'],
      status: 'Pending',
    },
    {
      srNumber: 'SR-2024-122',
      priority: 'Medium',
      requestedDate: 'Dec 14, 2024',
      waitingTime: '1 day',
      requiredDate: 'Dec 20, 2024',
      items: ['Office Chair (2)', 'Desk (1)'],
      status: 'Pending',
    },
  ];

  readonly recentActivity: RecentActivity[] = [
    {
      date: 'Dec 14, 2024',
      description: 'Your request SR-2024-121 was approved',
      type: 'approved',
    },
    {
      date: 'Dec 13, 2024',
      description: 'Your request SR-2024-120 was completed (SIV-045 issued)',
      type: 'completed',
    },
    {
      date: 'Dec 12, 2024',
      description: 'Your request SR-2024-119 was submitted for approval',
      type: 'submitted',
    },
    {
      date: 'Dec 10, 2024',
      description: 'Your request SR-2024-118 was approved',
      type: 'approved',
    },
    {
      date: 'Dec 08, 2024',
      description: 'Your request SR-2024-117 was rejected (Reason: Budget constraints)',
      type: 'rejected',
    },
  ];

  readonly requestTrendData: RequestTrendData[] = [
    { month: 'Jul', submitted: 3, approved: 2, completed: 2, rejected: 0 },
    { month: 'Aug', submitted: 4, approved: 3, completed: 3, rejected: 1 },
    { month: 'Sep', submitted: 5, approved: 4, completed: 4, rejected: 0 },
    { month: 'Oct', submitted: 6, approved: 5, completed: 5, rejected: 1 },
    { month: 'Nov', submitted: 7, approved: 6, completed: 6, rejected: 0 },
    { month: 'Dec', submitted: 5, approved: 2, completed: 1, rejected: 0 },
  ];

  readonly quickLinks: QuickLink[] = [
    { label: 'Create New Request', icon: 'bi-plus-lg', route: '/employee/dashboard/new-request' },
    { label: 'My Requests', icon: 'bi-clipboard-list', route: '/employee/dashboard/my-requests' },
    { label: 'Available Items', icon: 'bi-box-seam', route: '/employee/dashboard/catalog-items' },
    { label: 'My Profile', icon: 'bi-person', route: '/employee/dashboard/profile' },
  ];

  myRequests: ServiceRequest[] = [
    {
      srNumber: 'SR-2024-123',
      date: 'Dec 15',
      items: 3,
      priority: 'Urgent',
      status: 'Pending',
      requiredBy: 'Dec 18, 2024',
      requester: 'John Doe',
      department: 'IT Department',
      justification: 'New equipment for project',
    },
    {
      srNumber: 'SR-2024-122',
      date: 'Dec 14',
      items: 2,
      priority: 'Medium',
      status: 'Pending',
      requiredBy: 'Dec 20, 2024',
      requester: 'John Doe',
      department: 'IT Department',
      justification: 'Office furniture',
    },
    {
      srNumber: 'SR-2024-121',
      date: 'Dec 13',
      items: 1,
      priority: 'Normal',
      status: 'Approved',
      requiredBy: 'Dec 19, 2024',
      requester: 'John Doe',
      department: 'IT Department',
      justification: 'New equipment for intern',
    },
    {
      srNumber: 'SR-2024-120',
      date: 'Dec 12',
      items: 2,
      priority: 'Medium',
      status: 'Completed',
      requiredBy: 'Dec 15, 2024',
      requester: 'John Doe',
      department: 'IT Department',
      justification: 'Monitor upgrade',
    },
    {
      srNumber: 'SR-2024-119',
      date: 'Dec 10',
      items: 3,
      priority: 'Normal',
      status: 'Rejected',
      requiredBy: 'Dec 14, 2024',
      requester: 'John Doe',
      department: 'IT Department',
      justification: 'Additional supplies',
    },
    {
      srNumber: 'SR-2024-118',
      date: 'Dec 08',
      items: 1,
      priority: 'Normal',
      status: 'Approved',
      requiredBy: 'Dec 12, 2024',
      requester: 'John Doe',
      department: 'IT Department',
      justification: 'Laptop replacement',
    },
  ];

  readonly catalogItems: CatalogItem[] = [
    {
      sku: 'LAP-001',
      name: 'Dell XPS Laptop',
      category: 'Electronics',
      available: 45,
      status: 'Good',
      lastRestocked: 'Dec 15, 2024',
      uom: 'PCS',
      location: 'Warehouse A',
    },
    {
      sku: 'MON-002',
      name: 'HP 27" Monitor',
      category: 'Electronics',
      available: 67,
      status: 'Good',
      lastRestocked: 'Dec 14, 2024',
      uom: 'PCS',
      location: 'Warehouse A',
    },
    {
      sku: 'CHR-003',
      name: 'Office Chair',
      category: 'Furniture',
      available: 23,
      status: 'Low',
      lastRestocked: 'Dec 10, 2024',
      uom: 'PCS',
      location: 'Warehouse B',
    },
    {
      sku: 'CAB-004',
      name: 'USB Cables (10-pack)',
      category: 'Supplies',
      available: 55,
      status: 'Good',
      lastRestocked: 'Dec 12, 2024',
      uom: 'PCS',
      location: 'Warehouse A',
    },
    {
      sku: 'PAP-005',
      name: 'A4 Paper',
      category: 'Stationery',
      available: 120,
      status: 'Good',
      lastRestocked: 'Dec 08, 2024',
      uom: 'PCS',
      location: 'Warehouse A',
    },
  ];

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



  get currentView(): DashboardView {
    if (this.router.url.includes('/employee/dashboard/new-request')) {
      return 'new-request';
    }

    if (this.router.url.includes('/employee/dashboard/my-requests-summary')) {
      return 'my-requests-summary';
    }

    if (this.router.url.includes('/employee/dashboard/my-activity')) {
      return 'my-activity';
    }

    if (this.router.url.includes('/employee/dashboard/my-requests')) {
      return 'my-requests';
    }

    if (this.router.url.includes('/employee/dashboard/profile')) {
      return 'profile';
    }

    if (this.router.url.includes('/employee/dashboard/notifications')) {
      return 'notifications';
    }

    if (this.router.url.includes('/employee/dashboard/catalog-items')) {
      return 'catalog-items';
    }

    return 'home';
  }

  get pageTitle(): string {
    if (this.currentView === 'my-requests-summary') {
      return 'My Requests Summary';
    }

    if (this.currentView === 'my-activity') {
      return 'My Activity';
    }

    if (this.currentView === 'new-request') {
      return 'Create New Request';
    }

    if (this.currentView === 'my-requests') {
      return 'My Requisitions';
    }

    if (this.currentView === 'profile') {
      return 'My Profile';
    }

    if (this.currentView === 'notifications') {
      return 'Notifications';
    }

    if (this.currentView === 'catalog-items') {
      return 'Available Items';
    }

    return 'Employee Dashboard';
  }

  get pageSubtitle(): string {
    if (this.currentView === 'home') {
      return 'My request summary and recent activity';
    }

    if (this.currentView === 'my-requests') {
      return 'View and manage all my service requests';
    }

    if (this.currentView === 'catalog-items') {
      return 'Browse all items and check availability';
    }

    if (this.currentView === 'profile') {
      return 'Personal information and request history';
    }

    return '';
  }

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

  getActivityIcon(type: string): string {
    switch (type) {
      case 'approved':
        return '🟢';
      case 'rejected':
        return '🔴';
      case 'completed':
        return '🔵';
      case 'submitted':
      default:
        return '🟡';
    }
  }

  openCreateRequestModal(): void {
    const modalRef = this.modalService.open(CreateRequestModalComponent, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    });

    modalRef.result.then(
      (result) => {
        console.log('Modal closed with result:', result);
      },
      (reason) => {
        console.log('Modal dismissed');
      },
    );
  }

  trackRequest(srNumber: string, forceStatus?: string): void {
    const request = this.pendingRequests.find(r => r.srNumber === srNumber) || 
                    this.myRequests.find(r => r.srNumber === srNumber);
    
    const modalRef = this.modalService.open(TrackRequestModalComponent, {
      size: 'lg',
      backdrop: 'static'
    });

    modalRef.componentInstance.srNumber = srNumber;
    
    if (request) {
      modalRef.componentInstance.priority = request.priority;
      modalRef.componentInstance.items = Array.isArray(request.items) ? request.items : [`${request.items} items`];
      modalRef.componentInstance.requestedDate = (request as any).requestedDate || (request as any).date || 'Today';
      
      const requiredDate = 'requiredBy' in request ? request.requiredBy : (request as any).requiredDate || 'Next week';
      modalRef.componentInstance.requiredDate = requiredDate;
      modalRef.componentInstance.status = forceStatus || request.status;
    } else {
      // Fallback for notifications that might not have a local object yet
      modalRef.componentInstance.status = forceStatus || 'Pending';
      modalRef.componentInstance.priority = 'Medium';
      modalRef.componentInstance.items = ['Loading items...'];
      modalRef.componentInstance.requestedDate = 'Recent';
      modalRef.componentInstance.requiredDate = 'TBD';
    }
  }

  cancelRequest(srNumber: string): void {
    const request = this.pendingRequests.find(r => r.srNumber === srNumber) || 
                    this.myRequests.find(r => r.srNumber === srNumber);
                    
    if (!request) return;

    const modalRef = this.modalService.open(CancelRequestModalComponent, {
      centered: true,
      size: 'md'
    });

    modalRef.componentInstance.srNumber = srNumber;
    modalRef.componentInstance.items = Array.isArray(request.items) ? request.items : [`${request.items} items`];

    modalRef.result.then((result) => {
      if (result) {
        console.log('Cancelling request:', srNumber, 'Reason:', result.reason);
        // Update local state (demo)
        this.pendingRequests = this.pendingRequests.filter(r => r.srNumber !== srNumber);
        this.myRequests = this.myRequests.filter(r => r.srNumber !== srNumber);
        this.cdr.markForCheck();
        alert(`Request ${srNumber} has been successfully cancelled.`);
      }
    }).catch(() => {
      // Dismissed
    });
  }

  editRequest(srNumber: string): void {
    this.router.navigate(['/employee/requests/create'], { queryParams: { edit: srNumber } });
  }

  emailSIV(sivId: string): void {
    const subject = encodeURIComponent(`Store Issue Voucher ${sivId}`);
    const body = encodeURIComponent(`Please find attached the Store Issue Voucher ${sivId}.`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
  }

  viewCatalogItem(sku: string): void {
    this.router.navigate(['/employee/dashboard/catalog-items'], { queryParams: { sku } });
  }

  viewRequest(srNumber: string): void {
    const notif = this.notifications().find(n => n.requestId === srNumber);
    let forceStatus: any = undefined;
    
    if (notif) {
      if (notif.type === 'approved') forceStatus = 'Approved';
      if (notif.type === 'completed') forceStatus = 'Completed';
    }

    this.trackRequest(srNumber, forceStatus);
  }

  viewSIV(sivId: string): void {
    console.log('Viewing SIV:', sivId);
    alert(`Viewing Store Issue Voucher: ${sivId}`);
  }

  downloadPDF(id: string): void {
    console.log('Downloading PDF:', id);
    alert(`Downloading document: ${id}.pdf`);
  }

  editProfile(): void {
    const modalRef = this.modalService.open(EditProfileModalComponent, {
      fullscreen: true,
      backdrop: 'static',
      windowClass: 'edit-profile-modal-fullscreen',
    });

    modalRef.result.then(
      (result) => {
        if (result && result.profile) {
          this.userProfile.set({ ...result.profile });
          
          if (result.photo instanceof File) {
            const photoUrl = URL.createObjectURL(result.photo);
            this.profilePhoto.set(this.sanitizer.bypassSecurityTrustUrl(photoUrl));
          }
        }
        alert('Profile updated successfully!');
      },
      () => {}
    );
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleFile(input.files[0]);
    }
  }

  onFileDropped(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      this.handleFile(event.dataTransfer.files[0]);
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
      this.currentUserService.updatePhoto(base64);
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

  submitRequest(): void {
    console.log('Submitting request');
    alert('Request submitted successfully!');
  }

  changePassword(): void {
    const modalRef = this.modalService.open(ChangePasswordModalComponent, {
      size: 'sm',
      centered: true,
      backdrop: 'static',
      scrollable: true
    });

    modalRef.result.then(
      (result) => {
        if (result && result.currentPassword && result.newPassword) {
          this.authService.changePassword(result).subscribe({
            next: (res) => {
              if (res.succeeded) {
                alert('Password changed successfully!');
              } else {
                alert('Failed to change password: ' + res.message);
              }
            },
            error: (err) => {
              console.error('Password change error', err);
              alert('An error occurred while changing your password.');
            }
          });
        }
      },
      (reason) => {
        console.log('Modal dismissed');
      },
    );
  }

  enable2FA(): void {
    const modalRef = this.modalService.open(TwoFactorModalComponent, {
      centered: true,
      backdrop: 'static',
      size: 'md'
    });

    modalRef.result.then((result) => {
      if (result) {
        this.authService.enable2FA(result.method, result.contactInfo).subscribe({
          next: (res) => {
            if (res.succeeded) {
              alert('Two-Factor Authentication has been enabled successfully!');
              // In a real app, we would update the user profile state here
            } else {
              alert('Failed to enable 2FA: ' + res.message);
            }
          },
          error: (err) => {
            console.error('2FA error', err);
            alert('An error occurred while enabling 2FA.');
          }
        });
      }
    }).catch(() => {});
  }

  saveNotificationSettings(): void {
    console.log('Saving notifications:', this.notificationSettings());
    alert('Notification settings saved!');
  }

  dismissNotification(id: string): void {
    this.notifications.set(this.notifications().filter(n => n.id !== id));
  }

  markAsRead(id: string): void {
    this.notifications.set(this.notifications().map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  }

  markAllAsRead(): void {
    this.notifications.set(this.notifications().map(n => ({ ...n, read: true })));
  }
}
