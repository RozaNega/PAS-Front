import { Component, inject, signal, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { EditProfileModalComponent } from '../../components/edit-profile-modal/edit-profile-modal.component';
import { ChangePasswordModalComponent } from '../../components/change-password-modal/change-password-modal.component';
import { AuthService } from '../../../../core/services/auth.service';

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
  cameraStream = signal<MediaStream | null>(null);
  
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
    
    modalRef.result.then((result) => {
      if (result) {
        this.profile.name = result.fullName;
        this.profile.email = result.email;
        this.profile.phone = result.phone;
        this.profile.department = result.department;
        this.profile.title = result.position;
        alert('Profile updated successfully!');
      }
    }).catch(() => {});
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

  ngOnDestroy(): void {
    this.stopCamera();
  }

  changePassword(): void {
    const modalRef = this.modalService.open(ChangePasswordModalComponent, {
      centered: true,
      backdrop: 'static',
      scrollable: true,
    });
    
    modalRef.result.then((result) => {
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
    }).catch(() => {});
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

  savePreferences(): void {
    console.log('Saving preferences:', this.notificationPreferences);
    alert('Preferences saved successfully!');
  }

  setDelegation(): void {
    console.log('Setting delegation:', this.delegation);
    alert('Delegation set successfully!');
  }
}
