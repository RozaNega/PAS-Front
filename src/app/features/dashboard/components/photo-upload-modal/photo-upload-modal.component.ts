import { ChangeDetectionStrategy, Component, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ApiService } from '../../../../core/services/api.service';
import { CurrentUserService } from '../../../../core/services/current-user.service';

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
  private sanitizer = inject(DomSanitizer);
  private apiService = inject(ApiService);
  private currentUserService = inject(CurrentUserService);

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  readonly selectedFile = signal<File | null>(null);
  readonly photoPreview = signal<SafeUrl | null>(null);
  readonly isUploading = signal(false);
  readonly isCameraActive = signal(false);
  readonly cameraStream = signal<MediaStream | null>(null);

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (this.validateFile(file)) {
        this.selectedFile.set(file);
        this.photoPreview.set(this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(file)));
      }
    }
  }

  onFileDropped(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      const file = event.dataTransfer.files[0];
      if (this.validateFile(file)) {
        this.selectedFile.set(file);
        this.photoPreview.set(this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(file)));
      }
    }
  }

  private validateFile(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const maxSize = 2 * 1024 * 1024; // 2MB
    
    if (!validTypes.includes(file.type)) {
      alert('Please upload a JPG, PNG, or GIF image.');
      return false;
    }
    
    if (file.size > maxSize) {
      alert('File size must be less than 5MB.');
      return false;
    }
    
    return true;
  }

  removePhoto(): void {
    this.selectedFile.set(null);
    this.photoPreview.set(null);
  }

  async startCamera(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 640 } 
      });
      this.cameraStream.set(stream);
      this.isCameraActive.set(true);
      
      setTimeout(() => {
        if (this.videoElement && this.videoElement.nativeElement) {
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
      stream.getTracks().forEach(track => track.stop());
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
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
          this.selectedFile.set(file);
          this.photoPreview.set(this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(file)));
          this.stopCamera();
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

    this.isUploading.set(true);

    if (this.selectedFile()) {
      // Handle Upload
      this.apiService.uploadProfilePhoto<any>(userId, this.selectedFile()!).subscribe({
        next: (response) => {
          this.isUploading.set(false);
          console.log('Photo uploaded successfully:', response);
          this.modal.close(this.selectedFile());
          alert('Profile photo updated successfully!');
        },
        error: (error) => {
          this.isUploading.set(false);
          console.error('Error uploading photo:', error);
          const errorMessage = error.error?.message || error.message || 'Failed to upload photo.';
          alert(`${errorMessage} Please try again.`);
        }
      });
    } else {
      // Handle Removal (if user clicked remove but didn't pick a new one)
      this.apiService.deleteProfilePhoto<any>(userId).subscribe({
        next: (response) => {
          this.isUploading.set(false);
          console.log('Photo removed successfully:', response);
          this.modal.close('deleted');
          alert('Profile photo removed successfully!');
        },
        error: (error) => {
          this.isUploading.set(false);
          console.error('Error removing photo:', error);
          alert('Failed to remove photo. Please try again.');
        }
      });
    }
  }

  cancel(): void {
    this.stopCamera();
    this.modal.dismiss();
  }
}
