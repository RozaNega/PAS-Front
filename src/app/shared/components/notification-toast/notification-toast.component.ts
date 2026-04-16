import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-notification-toast',
  standalone: false,
  templateUrl: './notification-toast.component.html',
  styleUrls: ['./notification-toast.component.scss'],
})
export class NotificationToastComponent {
  @Input() title = '';
  @Input() message = '';
  @Input() type: 'success' | 'error' | 'warning' | 'info' = 'info';
  @Input() duration = 5000;

  visible = true;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    if (this.duration > 0) {
      this.timeoutId = setTimeout(() => this.close(), this.duration);
    }
  }

  close(): void {
    this.visible = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  getIconClass(): string {
    switch (this.type) {
      case 'success':
        return 'fas fa-check-circle';
      case 'error':
        return 'fas fa-exclamation-circle';
      case 'warning':
        return 'fas fa-exclamation-triangle';
      default:
        return 'fas fa-info-circle';
    }
  }

  getToastClass(): string {
    switch (this.type) {
      case 'success':
        return 'toast-success';
      case 'error':
        return 'toast-error';
      case 'warning':
        return 'toast-warning';
      default:
        return 'toast-info';
    }
  }
}
