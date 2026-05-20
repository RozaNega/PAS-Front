import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
  OnInit,
  OnDestroy,
  inject,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PasApiService } from '../../../../shared/services/pas-api.service';
import { CurrentUserService, CurrentUser } from '../../../../core/services/current-user.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserProfile } from '../../../../types/dashboard.types';
import { EditProfileModalComponent } from '../../components/edit-profile-modal/edit-profile-modal.component';
import { ChangePasswordModalComponent } from '../../components/change-password-modal/change-password-modal.component';
import { FaceDetectionService } from '../../../../core/services/face-detection.service';
import { ProfileService } from '../../../../core/services/profile.service';
import { initDashboardProfilePhoto } from '../../../../core/utils/dashboard-profile-photo.util';
import { Subscription } from 'rxjs';

type ActivityAction = 'Created' | 'Approved' | 'Rejected' | 'Deleted';
type ActivityStatus = 'Normal' | 'Flagged';
type ActivityFilter =
  | 'All Activities'
  | 'Suspicious / Flagged'
  | 'Access Control'
  | 'Policy Violations';

interface ActivityLogEntry {
  readonly id: number;
  readonly userName: string;
  readonly action: ActivityAction;
  readonly module: string;
  readonly dateTime: string;
  readonly status: ActivityStatus;
  // extra detail fields
  readonly ipAddress?: string;
  readonly device?: string;
  readonly riskLevel?: string;
  readonly location?: string;
  readonly sessionId?: string;
  readonly notes?: string;
}

interface SummaryCard {
  readonly title: string;
  readonly value: number;
}

interface AlertItem {
  readonly id: number;
  readonly title: string;
  readonly description: string;
  readonly severity: 'High' | 'Medium' | 'Low';
  // extra detail fields
  readonly detectedAt?: string;
  readonly affectedUser?: string;
  readonly affectedModule?: string;
  readonly resolutionSteps?: string[];
  readonly status?: 'Open' | 'Under Review' | 'Resolved';
  readonly assignedTo?: string;
}

@Component({
  selector: 'app-compliance-officer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './compliance-officer-dashboard.component.html',
  styleUrl: './compliance-officer-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComplianceOfficerDashboardComponent implements OnInit, OnDestroy {
  private readonly modalService = inject(NgbModal);
  private readonly pasApi = inject(PasApiService);
  private readonly authService = inject(AuthService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly profileService = inject(ProfileService);

  private profileSubscriptions: Subscription[] = [];

  readonly currentView = signal<'home' | 'profile'>('home');

  readonly officerName = computed(() => this.userProfile().fullName || 'Compliance Officer');
  readonly userName = this.officerName;

  readonly userProfile = signal<UserProfile>({
    fullName: '',
    employeeCode: '',
    department: '',
    position: '',
    email: '',
    phone: '',
    joinDate: '',
  });

  readonly profilePhoto = signal<SafeUrl | string | null>(null);
  readonly isSelectingPhoto = signal(false);
  readonly isCameraActive = signal(false);
  readonly isValidatingPhoto = signal(false);
  readonly cameraStream = signal<MediaStream | null>(null);

  private readonly faceDetectionService = inject(FaceDetectionService);

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  // Notification settings
  protected readonly notificationSettings = signal({
    emailOnApproval: true,
    emailOnRejection: true,
    emailOnReady: true,
    weeklySummary: false,
    monthlyDigest: false,
  });

  // Two-Factor Authentication settings
  protected readonly twoFactorEnabled = signal(false);
  protected readonly twoFactorMethod = signal<'sms' | 'email' | 'app'>('sms');
  protected readonly twoFactorPhone = signal('');
  protected readonly twoFactorVerificationSent = signal(false);
  protected readonly twoFactorVerificationCode = signal('');
  protected readonly twoFactorSetupComplete = signal(false);
  readonly filters: ActivityFilter[] = [
    'All Activities',
    'Access Control',
    'Policy Violations',
    'Suspicious / Flagged',
  ];
  readonly selectedFilter = signal<ActivityFilter>('All Activities');
  readonly currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  readonly greeting = this.getGreeting();
  readonly currentTime = signal<string>(this.getCurrentTime());
  readonly currentLocation = signal<string>('Addis Ababa, Ethiopia');
  private clockInterval?: any;

  // Detail drawer state
  readonly selectedLog = signal<ActivityLogEntry | null>(null);
  readonly selectedAlert = signal<AlertItem | null>(null);
  readonly detailDrawerOpen = signal<'log' | 'alert' | null>(null);

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  readonly activityLogs = signal<ActivityLogEntry[]>([
    {
      id: 1, userName: 'Abebe Kebede', action: 'Created', module: 'AuditTrail',
      dateTime: '2026-05-19 08:14:22', status: 'Normal',
      ipAddress: '192.168.1.45', device: 'Windows 11 / Chrome 124', riskLevel: 'Low',
      location: 'Addis Ababa, ET', sessionId: 'SID-8821-A', notes: 'Routine audit log creation by system admin.'
    },
    {
      id: 2, userName: 'Tigist Alemu', action: 'Approved', module: 'AccessControl',
      dateTime: '2026-05-19 09:05:11', status: 'Normal',
      ipAddress: '10.0.0.12', device: 'macOS Ventura / Safari 17', riskLevel: 'Low',
      location: 'Addis Ababa, ET', sessionId: 'SID-2230-B', notes: 'Access request for finance module approved.'
    },
    {
      id: 3, userName: 'Dawit Tesfaye', action: 'Deleted', module: 'Policy',
      dateTime: '2026-05-19 10:33:47', status: 'Flagged',
      ipAddress: '172.16.0.88', device: 'Ubuntu 22.04 / Firefox 125', riskLevel: 'High',
      location: 'Dire Dawa, ET', sessionId: 'SID-0091-C', notes: 'Policy record deleted outside business hours. Immediate review required.'
    },
    {
      id: 4, userName: 'Selamawit Girma', action: 'Rejected', module: 'AccessControl',
      dateTime: '2026-05-19 11:02:00', status: 'Normal',
      ipAddress: '192.168.2.10', device: 'Windows 10 / Edge 123', riskLevel: 'Low',
      location: 'Addis Ababa, ET', sessionId: 'SID-4451-D', notes: 'Unauthorised access attempt rejected by system.'
    },
    {
      id: 5, userName: 'Yonas Haile', action: 'Created', module: 'Policy',
      dateTime: '2026-05-19 13:18:09', status: 'Flagged',
      ipAddress: '10.0.1.55', device: 'Android 14 / Chrome Mobile', riskLevel: 'Medium',
      location: 'Hawassa, ET', sessionId: 'SID-6610-E', notes: 'New policy created from unrecognised device.'
    },
    {
      id: 6, userName: 'Hana Bekele', action: 'Approved', module: 'AuditTrail',
      dateTime: '2026-05-19 14:45:33', status: 'Normal',
      ipAddress: '192.168.1.78', device: 'Windows 11 / Chrome 124', riskLevel: 'Low',
      location: 'Addis Ababa, ET', sessionId: 'SID-7720-F', notes: 'Audit trail review approved by compliance officer.'
    },
  ]);

  readonly alerts = signal<AlertItem[]>([
    {
      id: 1, title: 'Unauthorised Access Attempt', severity: 'High',
      description: 'Multiple failed login attempts detected on the Finance module from an unrecognised IP address.',
      detectedAt: '2026-05-19 10:45:00', affectedUser: 'Dawit Tesfaye',
      affectedModule: 'Finance / AccessControl', status: 'Open',
      assignedTo: 'Security Team',
      resolutionSteps: [
        'Block the suspicious IP address immediately.',
        'Force-reset the affected user account credentials.',
        'Review all recent access logs for the Finance module.',
        'Notify the user and their department head.',
      ],
    },
    {
      id: 2, title: 'Policy Record Deleted', severity: 'High',
      description: 'A critical policy record was deleted outside of normal business hours by user Dawit Tesfaye.',
      detectedAt: '2026-05-19 10:33:47', affectedUser: 'Dawit Tesfaye',
      affectedModule: 'Policy Management', status: 'Under Review',
      assignedTo: 'Compliance Officer',
      resolutionSteps: [
        'Restore deleted policy from backup.',
        'Investigate the reason for after-hours deletion.',
        'Suspend user pending investigation outcome.',
      ],
    },
    {
      id: 3, title: 'New Policy from Unknown Device', severity: 'Medium',
      description: 'A new compliance policy was created from an unrecognised mobile device in Hawassa.',
      detectedAt: '2026-05-19 13:18:09', affectedUser: 'Yonas Haile',
      affectedModule: 'Policy Management', status: 'Open',
      assignedTo: 'IT Security',
      resolutionSteps: [
        'Verify the policy content for accuracy.',
        'Confirm with Yonas Haile that the action was intentional.',
        'Register the device or flag for review.',
      ],
    },
    {
      id: 4, title: 'Data Export Without Approval', severity: 'Low',
      description: 'A bulk data export was initiated without a formal approval workflow in the HR module.',
      detectedAt: '2026-05-18 16:22:00', affectedUser: 'Tigist Alemu',
      affectedModule: 'HR / Data Export', status: 'Resolved',
      assignedTo: 'HR Compliance',
      resolutionSteps: [
        'Review exported data contents.',
        'Enforce approval gates for future exports.',
        'Log incident in compliance record.',
      ],
    },
  ]);

  readonly summaryCards = computed<SummaryCard[]>(() => {
    const logs = this.activityLogs();

    return [
      { title: 'Total Activities', value: logs.length },
      {
        title: 'Suspicious Actions',
        value: logs.filter((item) => item.status === 'Flagged').length,
      },
      {
        title: 'Violations Detected',
        value: logs.filter((item) => item.module === 'Policy').length,
      },
      {
        title: 'Audit Logs Reviewed',
        value: logs.filter((item) => item.module === 'AuditTrail').length,
      },
    ];
  });

  readonly filteredLogs = computed(() => {
    const filter = this.selectedFilter();
    const logs = this.activityLogs();

    if (filter === 'All Activities') {
      return logs;
    }

    if (filter === 'Access Control') {
      return logs.filter((item) => item.module === 'AccessControl');
    }

    if (filter === 'Policy Violations') {
      return logs.filter((item) => item.module === 'Policy' || item.status === 'Flagged');
    }

    return logs.filter((item) => item.status === 'Flagged');
  });

  readonly dailyActivityOverview = computed(() => {
    const logs = this.activityLogs();

    return [
      { label: 'AuditTrail', value: logs.filter((item) => item.module === 'AuditTrail').length },
      {
        label: 'AccessControl',
        value: logs.filter((item) => item.module === 'AccessControl').length,
      },
      { label: 'Policy', value: logs.filter((item) => item.module === 'Policy').length },
      {
        label: 'Flagged',
        value: logs.filter((item) => item.status === 'Flagged').length,
      },
    ];
  });

  setFilter(filter: ActivityFilter): void {
    this.selectedFilter.set(filter);
  }

  viewLog(entry: ActivityLogEntry): void {
    this.selectedLog.set(entry);
    this.selectedAlert.set(null);
    this.detailDrawerOpen.set('log');
  }

  viewAlert(alert: AlertItem): void {
    this.selectedAlert.set(alert);
    this.selectedLog.set(null);
    this.detailDrawerOpen.set('alert');
  }

  closeDetail(): void {
    this.detailDrawerOpen.set(null);
    this.selectedLog.set(null);
    this.selectedAlert.set(null);
  }

  private setupProfileSubscription(): void {
    const photoSub = initDashboardProfilePhoto(
      this.currentUserService,
      this.sanitizer,
      this.profilePhoto,
    );

    const userSub = this.currentUserService.getCurrentUser().subscribe((user: CurrentUser | null) => {
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
      }
    });

    this.profileSubscriptions.push(photoSub, userSub);
  }

  changePhoto(): void {
    this.isSelectingPhoto.set(true);
  }

  cancelUpload(): void {
    this.isSelectingPhoto.set(false);
    this.stopCamera();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleFile(input.files[0]);
    }
  }

  private async handleFile(file: File): Promise<void> {
    if (file.size > 20 * 1024 * 1024) {
      alert('File too large. Max 20MB.');
      return;
    }

    this.isValidatingPhoto.set(true);

    try {
      const result = await this.faceDetectionService.validateProfilePhoto(file);

      await new Promise(resolve => setTimeout(resolve, 1500));

      this.isValidatingPhoto.set(false);

      if (!result.valid) {
        alert(`Security Alert: ${result.message}`);
        return;
      }

      this.profileService.applyLocalProfileImageFromFile(file).subscribe({
        next: () => {
          this.isSelectingPhoto.set(false);
          this.profileService.uploadProfileImage(file).subscribe({
            next: () => alert('Face verified! Profile photo updated.'),
            error: (err) => {
              console.warn('Server sync failed (photo saved locally):', err);
              alert('Face verified! Profile photo saved on this device.');
            },
          });
        },
        error: () => alert('Could not process image. Please try a smaller photo.'),
      });
    } catch (error) {
      console.error('Photo validation error:', error);
      this.isValidatingPhoto.set(false);
      alert('Failed to analyze photo. Please try again.');
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
      console.error('Camera error:', err);
      alert('Could not access camera.');
    }
  }

  stopCamera(): void {
    const stream = this.cameraStream();
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      this.cameraStream.set(null);
    }
    this.isCameraActive.set(false);
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
          const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
          await this.handleFile(file);
          this.stopCamera();
        }
      }, 'image/jpeg');
    }
  }

  editProfile(): void {
    const modalRef = this.modalService.open(EditProfileModalComponent, {
      fullscreen: true,
      backdrop: 'static',
    });

    modalRef.result.then(
      (result) => {
        if (result && result.profile) {
          this.userProfile.set({ ...result.profile });
        }
        alert('Profile updated successfully!');
      },
      () => {},
    );
  }

  changePassword(): void {
    const modalRef = this.modalService.open(ChangePasswordModalComponent, {
      centered: true,
      size: 'md',
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
            },
          });
        }
      },
      () => {},
    );
  }

  saveNotificationSettings(): void {
    alert('Notification settings saved!');
  }

  enable2FA(): void {
    this.twoFactorEnabled.set(true);
    alert('Two-Factor Authentication has been enabled!');
  }

  disable2FA(): void {
    this.twoFactorEnabled.set(false);
    this.twoFactorMethod.set('sms');
    this.twoFactorPhone.set('');
    alert('Two-Factor Authentication has been disabled!');
  }

  updateTwoFactorMethod(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.twoFactorMethod.set(target.value as any);
  }

  updateTwoFactorPhone(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.twoFactorPhone.set(target.value);
  }

  saveTwoFactorPhone(): void {
    if (this.twoFactorPhone()) {
      this.twoFactorVerificationSent.set(true);
      alert(`Verification code sent to ${this.twoFactorPhone()}.`);
    }
  }

  updateTwoFactorVerificationCode(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.twoFactorVerificationCode.set(target.value);
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
    alert('New code sent!');
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
    this.profileSubscriptions.forEach((sub) => sub.unsubscribe());
    this.stopCamera();
  }
}
