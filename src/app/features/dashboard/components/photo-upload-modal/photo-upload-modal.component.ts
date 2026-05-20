import { ChangeDetectionStrategy, Component, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { CurrentUserService } from '../../../../core/services/current-user.service';
import { ProfileService } from '../../../../core/services/profile.service';
import { FaceDetectionService } from '../../../../core/services/face-detection.service';
import { DEFAULT_AVATAR_PATH } from '../../../../core/models/stored-user.model';

@Component({
  selector: 'app-photo-upload-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './photo-upload-modal.component.html',
  styleUrl: './photo-upload-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotoUploadModalComponent {
  readonly modal = inject(NgbActiveModal);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly profileService = inject(ProfileService);
  private readonly faceDetectionService = inject(FaceDetectionService);

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  readonly selectedFile = signal<File | null>(null);
  readonly photoPreview = signal<SafeUrl | null>(null);
  readonly isUploading = signal(false);
  readonly isAnalyzing = signal(false);
  readonly faceDetected = signal<boolean | null>(null);
  readonly isCameraActive = signal(false);
  readonly cameraStream = signal<MediaStream | null>(null);
  readonly defaultAvatar = DEFAULT_AVATAR_PATH;

  constructor() {
    const url = this.currentUserService.getProfileImageUrl();
    if (url) {
      this.photoPreview.set(
        this.sanitizer.bypassSecurityTrustUrl(this.profileService.getDisplayUrl(url)),
      );
    }
  }

  private validateFile(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const maxSize = 20 * 1024 * 1024;

    if (!validTypes.includes(file.type)) {
      alert('Please upload a JPG, PNG, or GIF image.');
      return false;
    }

    if (file.size > maxSize) {
      alert('File size must be less than 20MB.');
      return false;
    }

    return true;
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
        } else if (height > maxDimension) {
          width *= maxDimension / height;
          height = maxDimension;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(
                new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                }),
              );
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

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const file = input.files[0];
      if (this.validateFile(file)) {
        const resizedFile = await this.resizeImage(file);
        this.selectedFile.set(resizedFile);
        this.photoPreview.set(
          this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(resizedFile)),
        );
        await this.performFaceAnalysis(resizedFile);
      }
    }
  }

  async onFileDropped(event: DragEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files?.[0]) {
      const file = event.dataTransfer.files[0];
      if (this.validateFile(file)) {
        const resizedFile = await this.resizeImage(file);
        this.selectedFile.set(resizedFile);
        this.photoPreview.set(
          this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(resizedFile)),
        );
        await this.performFaceAnalysis(resizedFile);
      }
    }
  }

  private async performFaceAnalysis(file: File): Promise<void> {
    this.isAnalyzing.set(true);
    this.faceDetected.set(null);

    try {
      const result = await this.faceDetectionService.validateProfilePhoto(file);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      this.faceDetected.set(result.valid);
      this.isAnalyzing.set(false);

      if (!result.valid) {
        alert(`Security Alert: ${result.message}`);
        this.removePhoto();
      }
    } catch (error) {
      console.error('Face analysis failed:', error);
      this.isAnalyzing.set(false);
      alert('Security Alert: Failed to analyze photo. Please try a different image.');
      this.removePhoto();
    }
  }

  removePhoto(): void {
    this.selectedFile.set(null);
    this.photoPreview.set(null);
    this.faceDetected.set(null);
  }

  async startCamera(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 640 },
      });
      this.cameraStream.set(stream);
      this.isCameraActive.set(true);

      setTimeout(() => {
        if (this.videoElement?.nativeElement) {
          this.videoElement.nativeElement.srcObject = stream;
          this.videoElement.nativeElement.play();
        }
      }, 100);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check your permissions or use file upload instead.');
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
    if (!this.canvasElement || !this.videoElement) return;

    const canvas = this.canvasElement.nativeElement;
    const video = this.videoElement.nativeElement;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0);

      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
          const resizedFile = await this.resizeImage(file);
          this.selectedFile.set(resizedFile);
          this.photoPreview.set(
            this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(resizedFile)),
          );
          this.stopCamera();
          await this.performFaceAnalysis(resizedFile);
        }
      }, 'image/jpeg', 0.95);
    }
  }

  uploadPhoto(): void {
    const userId = this.currentUserService.getUserId();

    if (!userId) {
      alert('User not found. Please log in again.');
      return;
    }

    if (this.selectedFile() && this.faceDetected() !== true) {
      alert(
        'Security Protocol: Face verification required. Please provide a clear, centered photo of yourself to continue.',
      );
      return;
    }

    this.isUploading.set(true);

    if (this.selectedFile()) {
      const file = this.selectedFile()!;

      this.profileService.uploadProfileImage(file, userId).subscribe({
        next: (imageUrl) => {
          this.isUploading.set(false);
          this.modal.close(imageUrl);
        },
        error: (error) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            this.profileService.applyLocalProfileImage(base64);
            this.isUploading.set(false);
            this.modal.close(base64);
          };
          reader.onerror = () => {
            this.isUploading.set(false);
            const errorMessage =
              error?.error?.message || error?.message || 'Failed to upload photo.';
            alert(`${errorMessage} Please try again.`);
          };
          reader.readAsDataURL(file);
        },
      });
    } else {
      this.profileService.removeProfileImage(userId).subscribe({
        next: () => {
          this.isUploading.set(false);
          this.modal.close('deleted');
        },
        error: () => {
          this.currentUserService.updateProfileImage(null);
          this.isUploading.set(false);
          this.modal.close('deleted');
        },
      });
    }
  }

  cancel(): void {
    this.stopCamera();
    this.modal.dismiss();
  }
}
