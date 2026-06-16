import { Component, inject, signal, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { EditProfileModalComponent } from '../../components/edit-profile-modal/edit-profile-modal.component';
import { ChangePasswordModalComponent } from '../../components/change-password-modal/change-password-modal.component';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { CurrentUserService } from '../../../../core/services/current-user.service';
import { FaceDetectionService } from '../../../../core/services/face-detection.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-decision-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './decision-profile-page.component.html',
  styleUrl: './decision-profile-page.component.scss',
})
export class DecisionProfilePageComponent implements OnDestroy {
  private readonly modalService = inject(NgbModal);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly currentUserService = inject(CurrentUserService);

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  profilePhoto = signal<SafeUrl | string | null>(null);
  isSelectingPhoto = signal(false);
  isCameraActive = signal(false);
  isValidatingPhoto = signal(false);
  cameraStream = signal<MediaStream | null>(null);

  private readonly faceDetectionService = inject(FaceDetectionService);

  profile = {
    name: 'Sarah Smith',
    title: 'IT Department Manager',
    employeeCode: 'EMP-002',
    department: 'IT Department',
    email: 'sarah.smith@afrocom.com',
    phone: '+251-912-345678',
    joinDate: 'Mar 01, 2019',
  };

  twoFactorEnabled = signal(false);
  twoFactorMethod = signal<'email'>('email');
  twoFactorSetupComplete = signal(false);
  twoFactorVerificationSent = signal(false);
  twoFactorVerificationCode = signal('');
  twoFactorSending = signal(false);
  private currentCode = '';

  approvalLimits = {
    singleRequestLimit: '$10,000',
    monthlyDepartmentLimit: '$50,000',
    requireEscalationAbove: '$10,000',
    escalationApprover: 'Director of Operations',
  };

  departmentScope = {
    department: 'IT Department',
    staffCount: 12,
    subDepartments: 'None',
    approvalAuthority: 'All requests from IT Department',
  };

  delegation = {
    delegateTo: '',
    startDate: '',
    endDate: '',
    reason: '',
  };

  notificationPreferences = {
    emailEveryApproval: true,
    smsUrgent: true,
    dailySummary: true,
    weeklyReport: true,
    budgetAlerts: false,
  };

  editProfile(): void {
    const modalRef = this.modalService.open(EditProfileModalComponent, {
      centered: true,
      backdrop: 'static',
    });

    modalRef.result
      .then(() => {
        const user = this.currentUserService.getCurrentUserValue();
        if (user) {
          this.profile.name = user.fullName || this.profile.name;
          this.profile.email = user.email || this.profile.email;
          this.profile.phone = user.phone || this.profile.phone;
          this.profile.department = user.department || this.profile.department;
          this.profile.title = user.position || this.profile.title;
        }
      })
      .catch(() => {});
  }

  changePhoto(): void {
    this.isSelectingPhoto.set(true);
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

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    this.isValidatingPhoto.set(true);

    try {
      const result = await this.faceDetectionService.validateProfilePhoto(file);

      // Delay for premium feel
      await new Promise((resolve) => setTimeout(resolve, 1500));

      this.isValidatingPhoto.set(false);

      if (!result.valid) {
        alert(`Security Alert: ${result.message}`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const base64 = e.target?.result as string;
        this.profilePhoto.set(this.sanitizer.bypassSecurityTrustUrl(base64));
        this.isSelectingPhoto.set(false);
        alert('Face verified! Profile photo updated.');
      };
      reader.readAsDataURL(file);
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

  ngOnDestroy(): void {
    this.stopCamera();
  }

  changePassword(): void {
    const modalRef = this.modalService.open(ChangePasswordModalComponent, {
      centered: true,
      backdrop: 'static',
      scrollable: true,
    });

    modalRef.result
      .then((result) => {
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
      })
      .catch(() => {});
  }

  toggle2FA(): void {
    if (this.twoFactorEnabled()) {
      this.authService.disable2FA().subscribe({
        next: (res) => {
          this.twoFactorEnabled.set(false);
          this.twoFactorMethod.set('email');
          this.twoFactorVerificationSent.set(false);
          this.twoFactorVerificationCode.set('');
          this.twoFactorSetupComplete.set(false);
          if (res.succeeded) {
            this.toastService.success('2FA has been disabled.');
          } else {
            this.toastService.error(res.message || 'Failed to disable 2FA.');
          }
        },
        error: () => this.toastService.error('Unable to disable 2FA. Please try again.'),
      });
    } else {
      this.twoFactorEnabled.set(true);
      this.toastService.info('Fill in your contact info and click Send Code to enable 2FA.');
    }
  }

  enable2FA(): void {
    this.twoFactorEnabled.set(true);
    this.toastService.info('Fill in your contact info and click Send Code to enable 2FA.');
  }

  disable2FA(): void {
    this.authService.disable2FA().subscribe({
      next: (res) => {
        this.twoFactorEnabled.set(false);
        this.twoFactorMethod.set('email');
        this.twoFactorVerificationSent.set(false);
        this.twoFactorVerificationCode.set('');
        this.twoFactorSetupComplete.set(false);
        if (res.succeeded) {
          this.toastService.success('2FA has been disabled.');
        } else {
          this.toastService.error(res.message || 'Failed to disable 2FA.');
        }
      },
      error: () => this.toastService.error('Unable to disable 2FA. Please try again.'),
    });
  }

  updateTwoFactorMethod(event: any): void {
    const newMethod = event.target?.value ?? 'email';
    this.twoFactorMethod.set(newMethod);
    if (this.twoFactorSetupComplete()) {
      this.twoFactorSetupComplete.set(false);
      this.twoFactorVerificationSent.set(false);
      this.twoFactorVerificationCode.set('');
    }
  }

  saveTwoFactorPhone(): void {
    const contact = this.profile.email;
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

  updateTwoFactorVerificationCode(event: any): void {
    this.twoFactorVerificationCode.set(event.target?.value ?? '');
  }

  verifyTwoFactorCode(): void {
    if (this.twoFactorVerificationCode() !== this.currentCode) {
      alert('Invalid verification code. Please check the code sent to your email and try again.');
      return;
    }
    const contact = this.profile.email;
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

  savePreferences(): void {
    console.log('Saving preferences:', this.notificationPreferences);
    alert('Preferences saved successfully!');
  }

  setDelegation(): void {
    console.log('Setting delegation:', this.delegation);
    alert('Delegation set successfully!');
  }
}
