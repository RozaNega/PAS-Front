import { Component, inject, signal, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../../../core/services/auth.service';
import { CurrentUserService } from '../../../../core/services/current-user.service';
import { EditProfileModalComponent } from '../../../dashboard/components/edit-profile-modal/edit-profile-modal.component';
import { ChangePasswordModalComponent } from '../../../dashboard/components/change-password-modal/change-password-modal.component';
import { UserProfile } from '../../../../types/dashboard.types';
import { FaceDetectionService } from '../../../../core/services/face-detection.service';
import { ProfileService } from '../../../../core/services/profile.service';
import { initDashboardProfilePhoto } from '../../../../core/utils/dashboard-profile-photo.util';
import { Subscription } from 'rxjs';

export interface Investigation {
  caseId: string;
  violationType: string;
  assignedTo: string;
  status: string;
  date: string;
}

export interface Certification {
  name: string;
  year: string;
}

@Component({
  selector: 'app-officer-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './officer-profile-page.component.html',
  styleUrl: './officer-profile-page.component.scss',
})
export class OfficerProfilePageComponent implements OnInit, OnDestroy {
  private readonly modalService = inject(NgbModal);
  private readonly authService = inject(AuthService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly profileService = inject(ProfileService);

  private profileSubscriptions: Subscription[] = [];

  readonly profilePhoto = signal<SafeUrl | string | null>(null);
  readonly isSelectingPhoto = signal(false);
  readonly isCameraActive = signal(false);
  readonly isAnalyzing = signal(false);
  readonly isValidatingPhoto = signal(false);
  readonly faceDetected = signal<boolean | null>(null);
  readonly cameraStream = signal<MediaStream | null>(null);

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  // Two-Factor Authentication settings
  protected readonly twoFactorEnabled = signal(false);
  protected readonly twoFactorMethod = signal<'sms' | 'email' | 'app'>('sms');
  protected readonly twoFactorPhone = signal('');
  protected readonly twoFactorVerificationSent = signal(false);
  protected readonly twoFactorVerificationCode = signal('');
  protected readonly twoFactorSetupComplete = signal(false);

  userProfile = signal<UserProfile>({
    fullName: 'Mike Wilson',
    employeeCode: 'EMP-005',
    department: 'Audit & Compliance',
    position: 'Compliance Officer',
    email: 'mike.wilson@afrocom.com',
    phone: '+251-913-456789',
    joinDate: 'Jan 10, 2021',
  });
  ngOnInit(): void {
    this.setupProfileSubscription();
  }

  ngOnDestroy(): void {
    this.profileSubscriptions.forEach((sub) => sub.unsubscribe());
    this.stopCamera();
  }

  private setupProfileSubscription(): void {
    // 1. Sync User Details
    const userSub = this.currentUserService.currentUser$.subscribe((user) => {
      if (user) {
        this.userProfile.set({
          fullName: user.fullName || 'User',
          employeeCode: user.employeeCode || 'N/A',
          department: user.department || 'N/A',
          position: user.position || 'N/A',
          email: user.email || 'N/A',
          phone: user.phone || 'N/A',
          joinDate: user.joinDate || 'N/A',
        });
      }
    });

    const photoSub = initDashboardProfilePhoto(
      this.currentUserService,
      this.sanitizer,
      this.profilePhoto,
    );

    this.profileSubscriptions.push(userSub, photoSub);
  }

  // Legacy property for template compatibility if needed
  get profile() {
    const up = this.userProfile();
    return {
      name: up.fullName,
      employeeCode: up.employeeCode,
      email: up.email,
      phone: up.phone,
      title: up.position,
      department: up.department,
      joinDate: up.joinDate,
      status: 'Active'
    };
  }

  auditScope = {
    auditScope: 'Full System Access',
    modulesCovered: 'All Modules (Property, Inventory, Requisition, Receiving, Users)',
    readOnlyAccess: 'Yes - Cannot modify any data',
    exportPermissions: 'Full export capabilities',
  };

  notificationSettings = [
    { label: 'Alert me for critical violations', checked: true },
    { label: 'Daily risk summary email', checked: true },
    { label: 'Weekly compliance report', checked: true },
    { label: 'Notify when violations are resolved', checked: true },
    { label: 'Monthly audit digest', checked: false },
  ];

  investigations: Investigation[] = [
    { caseId: 'INV-001', violationType: 'Missing Documentation', assignedTo: 'John Doe', status: 'Open', date: 'Dec 14' },
    { caseId: 'INV-002', violationType: 'Approval Chain', assignedTo: 'Sarah Smith', status: 'Open', date: 'Dec 13' },
    { caseId: 'INV-003', violationType: 'Incomplete Audit Trail', assignedTo: 'Store Team', status: 'Open', date: 'Dec 11' },
    { caseId: 'INV-004', violationType: 'Unauthorized Access', assignedTo: 'IT Team', status: 'Closed', date: 'Dec 12' },
  ];

  certifications: Certification[] = [
    { name: 'Certified Internal Auditor (CIA)', year: '2023' },
    { name: 'ISO 27001 Lead Auditor', year: '2022' },
    { name: 'GDPR Compliance Specialist', year: '2024' },
  ];

  newCertificationName = '';
  newCertificationYear = '';
  showAddCertificationForm = false;

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
            next: (res: { succeeded: boolean; message: string }) => {
              if (res.succeeded) {
                alert('Password changed successfully!');
              } else {
                alert('Failed to change password: ' + res.message);
              }
            },
            error: (err: any) => {
              console.error('Password change error', err);
              alert('An error occurred while changing your password.');
            },
          });
        }
      },
      () => {},
    );
  }

  changePhoto(): void {
    this.isSelectingPhoto.set(true);
  }

  cancelUpload(): void {
    this.isSelectingPhoto.set(false);
    this.stopCamera();
    this.isAnalyzing.set(false);
    this.faceDetected.set(null);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleFile(input.files[0]);
    }
  }

  private faceDetectionService = inject(FaceDetectionService);

  private async handleFile(file: File): Promise<void> {
    if (file.size > 20 * 1024 * 1024) {
      alert('File too large. Max 20MB.');
      return;
    }

    this.isAnalyzing.set(true);
    this.faceDetected.set(null);

    try {
      const result = await this.faceDetectionService.validateProfilePhoto(file);
      
      // Delay for premium feel
      await new Promise(resolve => setTimeout(resolve, 800));
      
      this.isAnalyzing.set(false);
      this.faceDetected.set(result.valid);

      if (result.valid) {
        this.isValidatingPhoto.set(true);

        this.profileService.applyLocalProfileImageFromFile(file).subscribe({
          next: () => {
            this.isValidatingPhoto.set(false);
            this.isSelectingPhoto.set(false);
            this.profileService.uploadProfileImage(file).subscribe({
              next: () => alert('Face verified! Profile photo updated.'),
              error: (err) => {
                console.warn('Server sync failed (photo saved locally):', err);
                alert('Face verified! Profile photo saved on this device.');
              },
            });
          },
          error: () => {
            this.isValidatingPhoto.set(false);
            alert('Could not process image. Please try a smaller photo.');
          },
        });
      } else {
        alert(`Security Alert: ${result.message}`);
      }
    } catch (error) {
      console.error('Photo analysis error:', error);
      this.isAnalyzing.set(false);
      alert('Security Alert: Failed to analyze photo. Please try again.');
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
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
          this.handleFile(file);
          this.stopCamera();
        }
      }, 'image/jpeg');
    }
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
}
