import { ChangeDetectionStrategy, Component, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { UserProfile } from '../../../../types/dashboard.types';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { PhotoUploadModalComponent } from '../photo-upload-modal/photo-upload-modal.component';
import { CurrentUserService, CurrentUser } from '../../../../core/services/current-user.service';
import { PasApiService } from '../../../../shared/services/pas-api.service';
import { OnInit } from '@angular/core';

@Component({
  selector: 'app-edit-profile-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-profile-modal.component.html',
  styleUrl: './edit-profile-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditProfileModalComponent {
  readonly modal = inject(NgbActiveModal);
  private readonly modalService = inject(NgbModal);
  private sanitizer = inject(DomSanitizer);
  private currentUserService = inject(CurrentUserService);
  private pasApi = inject(PasApiService);

  protected readonly loading = signal(false);

  constructor() {
    const user = this.currentUserService.getCurrentUserValue();
    if (user?.photoUrl) {
      this.photoPreview.set(this.sanitizer.bypassSecurityTrustUrl(user.photoUrl));
    }
  }

  activeTab = signal<'personal' | 'notifications'>('personal');

  profile: UserProfile = {
    fullName: '',
    employeeCode: '',
    department: '',
    position: '',
    email: '',
    phone: '',
    joinDate: '',
    username: '',
    password: '',
  };

  ngOnInit(): void {
    const user = this.currentUserService.getCurrentUserValue();
    if (user) {
      this.profile = {
        fullName: user.fullName || user.username || '',
        employeeCode: user.employeeCode || '',
        department: user.department || '',
        position: user.position || '',
        email: user.email || '',
        phone: user.phone || '',
        joinDate: user.joinDate || '',
        username: user.username || '',
        password: '', // Keep empty for security
      };
    }
  }

  // Photo
  readonly photoPreview = signal<SafeUrl | string | null>(null);
  readonly selectedFile = signal<File | null>(null);
  readonly isSelectingPhoto = signal(false);
  readonly isCameraActive = signal(false);
  readonly cameraStream = signal<MediaStream | null>(null);
  readonly showPassword = signal(false);

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

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
      this.selectedFile.set(file);
      this.photoPreview.set(this.sanitizer.bypassSecurityTrustUrl(base64));
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
          this.selectedFile.set(file);
          this.photoPreview.set(this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(file)));
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

  // Notification settings
  readonly notificationSettings = signal({
    emailOnApproval: true,
    emailOnRejection: true,
    emailOnReady: true,
    weeklySummary: false,
    monthlyDigest: false
  });



  save(): void {
    if (!confirm('Are you sure you want to save these profile changes?')) return;

    this.loading.set(true);
    const userId = this.currentUserService.getUserId();
    
    if (!userId) {
      alert('User ID not found. Cannot update profile.');
      this.loading.set(false);
      return;
    }

    this.pasApi.updateProfile(userId, {
      id: userId,
      fullName: this.profile.fullName,
      name: this.profile.fullName, // Provide both for compatibility
      email: this.profile.email,
      username: this.profile.username,
      password: this.profile.password || undefined,
      department: this.profile.department,
      employeeCode: this.profile.employeeCode,
      phoneNumber: this.profile.phone, 
      phone: this.profile.phone, // Provide both for compatibility
      position: this.profile.position,
      joinDate: this.profile.joinDate
    }).subscribe({
      next: () => {
        this.currentUserService.updateUser(this.profile);
        this.loading.set(false);
        alert('Profile updated successfully in the database!');
        this.modal.close(this.profile);
      },
      error: (err) => {
        this.loading.set(false);
        console.error('Error updating profile:', err);
        const errorMsg = (err as any).message || 'Unknown error';
        alert(`Failed to update profile in backend: ${errorMsg}`);
      }
    });
  }

  cancel(): void {
    this.modal.dismiss();
  }
}
