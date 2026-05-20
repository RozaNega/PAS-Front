import { Component, inject, signal, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { EditProfileModalComponent } from '../../components/edit-profile-modal/edit-profile-modal.component';
import { ChangePasswordModalComponent } from '../../components/change-password-modal/change-password-modal.component';
import { AuthService } from '../../../../core/services/auth.service';
import { FaceDetectionService } from '../../../../core/services/face-detection.service';

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
  twoFactorMethod = signal<'sms' | 'email' | 'app'>('sms');
  phoneNumber = signal('');
  twoFactorSetupComplete = signal(false);
  twoFactorVerificationSent = signal(false);
  twoFactorVerificationCode = signal('');

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
      .then((result) => {
        if (result) {
          this.profile.name = result.fullName;
          this.profile.email = result.email;
          this.profile.phone = result.phone;
          this.profile.department = result.department;
          this.profile.title = result.position;
          alert('Profile updated successfully!');
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
      this.twoFactorEnabled.set(false);
      alert('2FA has been disabled.');
    } else {
      if (this.twoFactorMethod() === 'sms' && !this.phoneNumber()) {
        alert('Please enter a phone number to enable SMS 2FA.');
        return;
      }
      this.twoFactorEnabled.set(true);
      alert('2FA has been enabled successfully!');
    }
  }

  enable2FA(): void {
    if (this.twoFactorMethod() === 'sms' && !this.phoneNumber()) {
      alert('Please enter a phone number to enable SMS 2FA.');
      return;
    }
    // Send code / initiate setup
    this.twoFactorVerificationSent.set(true);
    alert('Verification code sent. Please enter the code to complete setup.');
  }

  disable2FA(): void {
    this.twoFactorEnabled.set(false);
    this.twoFactorMethod.set('sms');
    this.phoneNumber.set('');
    this.twoFactorVerificationSent.set(false);
    this.twoFactorVerificationCode.set('');
    this.twoFactorSetupComplete.set(false);
    alert('2FA has been disabled.');
  }

  updateTwoFactorMethod(event: any): void {
    this.twoFactorMethod.set(event.target?.value ?? 'sms');
  }

  twoFactorPhone(): string {
    return this.phoneNumber();
  }

  updateTwoFactorPhone(event: any): void {
    this.phoneNumber.set(event.target?.value ?? '');
  }

  saveTwoFactorPhone(): void {
    if (this.phoneNumber()) {
      this.twoFactorVerificationSent.set(true);
      alert('Verification code sent to ' + this.phoneNumber());
    } else {
      alert('Please enter a valid phone number.');
    }
  }

  updateTwoFactorVerificationCode(event: any): void {
    this.twoFactorVerificationCode.set(event.target?.value ?? '');
  }

  verifyTwoFactorCode(): void {
    // Simple local check for demo purposes
    if (this.twoFactorVerificationCode() === '123456') {
      this.twoFactorSetupComplete.set(true);
      this.twoFactorVerificationSent.set(false);
      alert('2FA setup completed successfully!');
    } else {
      alert('Invalid code.');
    }
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
