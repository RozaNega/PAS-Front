import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { UserProfile } from '../../../../types/dashboard.types';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { PhotoUploadModalComponent } from '../photo-upload-modal/photo-upload-modal.component';
import { CurrentUserService, CurrentUser } from '../../../../core/services/current-user.service';
import { ProfileService } from '../../../../core/services/profile.service';
import { PasApiService } from '../../../../shared/services/pas-api.service';
import { OnInit } from '@angular/core';
import { FaceDetectionService } from '../../../../core/services/face-detection.service';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';

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
  private profileService = inject(ProfileService);
  private pasApi = inject(PasApiService);
  private authService = inject(AuthService);

  protected readonly loading = signal(false);

  constructor() {
    const user = this.currentUserService.getCurrentUserValue();
    const imageUrl = user?.profileImageUrl ?? user?.photoUrl;
    if (imageUrl) {
      this.photoPreview.set(
        this.sanitizer.bypassSecurityTrustUrl(this.profileService.getDisplayUrl(imageUrl)),
      );
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
  readonly isValidatingPhoto = signal(false);
  readonly cameraStream = signal<MediaStream | null>(null);
  readonly showPassword = signal(false);
  readonly isUploadingPhoto = signal(false);
  currentPassword = '';

  private readonly faceDetectionService = inject(FaceDetectionService);

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
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

  private async handleFile(file: File): Promise<void> {
    if (file.size > 20 * 1024 * 1024) {
      alert('File too large. Max 20MB.');
      return;
    }

    this.isValidatingPhoto.set(true);

    try {
      const result = await this.faceDetectionService.validateProfilePhoto(file);
      this.isValidatingPhoto.set(false);

      if (!result.valid) {
        alert(`Security Alert: ${result.message}`);
        return;
      }

      this.selectedFile.set(file);

      this.profileService.applyLocalProfileImageFromFile(file).subscribe({
        next: (compressed) => {
          this.photoPreview.set(this.sanitizer.bypassSecurityTrustUrl(compressed));
          this.isSelectingPhoto.set(false);
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
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } },
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
          void this.handleFile(file).finally(() => this.stopCamera());
        }
      }, 'image/jpeg', 0.95);
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

  // Notification settings
  readonly notificationSettings = signal({
    emailOnApproval: true,
    emailOnRejection: true,
    emailOnReady: true,
    weeklySummary: false,
    monthlyDigest: false,
  });

  async save(): Promise<void> {
    if (!confirm('Are you sure you want to save these profile changes?')) return;

    if (this.profile.password && !this.currentPassword.trim()) {
      alert('Enter your current password before changing to a new password.');
      return;
    }

    this.loading.set(true);
    const userId = this.currentUserService.getUserId();

    if (!userId) {
      alert('User ID not found. Cannot update profile.');
      this.loading.set(false);
      return;
    }

    const userObj = this.currentUserService.getCurrentUserValue();
    let photoUrl = userObj?.profileImageUrl ?? userObj?.photoUrl;

    if (this.selectedFile()) {
      this.isUploadingPhoto.set(true);
      try {
        photoUrl = await firstValueFrom(
          this.profileService.uploadProfileImage(this.selectedFile()!, userId),
        );
      } catch (err) {
        console.warn('Photo upload failed. Saving profile fields without updating the photo.', err);
        alert('Profile photo could not be uploaded. Saving the other profile changes now.');
      } finally {
        this.isUploadingPhoto.set(false);
      }
    }

    const payload = {
      ...userObj,
      id: userId,
      fullName: this.profile.fullName,
      name: this.profile.fullName,
      email: this.profile.email,
      username: this.profile.username || userObj?.username,
      department: this.profile.department,
      employeeCode: this.profile.employeeCode,
      phoneNumber: this.profile.phone,
      phone: this.profile.phone,
      position: this.profile.position || userObj?.position,
      joinDate: this.profile.joinDate || userObj?.joinDate,
      isActive: true,
      profileImageUrl: photoUrl || undefined,
      photoUrl: photoUrl || undefined,
      profilePicture: photoUrl || undefined,
    };

    this.pasApi.updateProfile(userId, payload).subscribe({
      next: async () => {
        try {
          if (this.profile.password) {
            await firstValueFrom(
              this.authService.changePassword({
                currentPassword: this.currentPassword.trim(),
                newPassword: this.profile.password,
              }),
            );
          }

          this.currentUserService.updateUser({
            fullName: this.profile.fullName,
            username: this.profile.username || userObj?.username || '',
            email: this.profile.email,
            employeeCode: this.profile.employeeCode,
            department: this.profile.department,
            position: this.profile.position || userObj?.position || '',
            phone: this.profile.phone,
            joinDate: this.profile.joinDate || userObj?.joinDate || '',
            profileImageUrl: photoUrl || undefined,
            photoUrl: photoUrl || undefined,
          });

          this.loading.set(false);
          this.isSelectingPhoto.set(false);
          this.selectedFile.set(null);
          this.profile.password = '';
          this.currentPassword = '';
          alert('Profile updated successfully in the database!');

          const resultObj = {
            ...this.profile,
            profile: this.profile,
          };
          this.modal.close(resultObj);
        } catch (passwordErr) {
          this.loading.set(false);
          console.error('Password change error:', passwordErr);
          const errorMsg = (passwordErr as any).message || 'Unknown error';
          alert(
            `Profile was saved, but the password could not be updated. Please verify your current password and try again. ${errorMsg}`,
          );
        }
      },
      error: (err) => {
        this.loading.set(false);
        console.error('Error updating profile:', err);
        const errorMsg = (err as any).message || 'Unknown error';
        alert(`Failed to update profile in backend: ${errorMsg}`);
      },
    });
  }

  cancel(): void {
    this.modal.dismiss();
  }
}
