import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  success(message: string): void {
    console.log('✅ SUCCESS:', message);
    // You can integrate with a toast library here (e.g., ngx-toastr, primeng toast, etc.)
    this.showToast(message, 'success');
  }

  info(message: string, title?: string): void {
    const fullMessage = title ? `${title}: ${message}` : message;
    console.log('ℹ️ INFO:', fullMessage);
    this.showToast(fullMessage, 'info');
  }

  error(message: string): void {
    console.error('❌ ERROR:', message);
    this.showToast(message, 'error');
  }

  warning(message: string): void {
    console.warn('⚠️ WARNING:', message);
    this.showToast(message, 'warning');
  }

  clearAll(): void {
    const toasts = document.querySelectorAll('div[style*="position: fixed"][style*="top: 20px"]');
    toasts.forEach((toast) => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    });
  }

  private showToast(message: string, type: 'success' | 'error' | 'info' | 'warning'): void {
    // Simple browser notification for now
    // You can replace this with your preferred toast library
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`PAS ${type.toUpperCase()}`, {
        body: message,
        icon: '/assets/images/africom-logo.png',
      });
    } else {
      // Fallback to console and could add a simple DOM toast
      const toastElement = this.createSimpleToast(message, type);
      document.body.appendChild(toastElement);

      // Auto remove after 5 seconds
      setTimeout(() => {
        if (toastElement.parentNode) {
          toastElement.parentNode.removeChild(toastElement);
        }
      }, 5000);
    }
  }

  private createSimpleToast(message: string, type: string): HTMLElement {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 4px;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 10000;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      cursor: pointer;
      transition: opacity 0.3s ease;
    `;

    // Set background color based on type
    switch (type) {
      case 'success':
        toast.style.backgroundColor = '#28a745';
        break;
      case 'error':
        toast.style.backgroundColor = '#dc3545';
        break;
      case 'warning':
        toast.style.backgroundColor = '#ffc107';
        toast.style.color = '#212529';
        break;
      case 'info':
      default:
        toast.style.backgroundColor = '#17a2b8';
        break;
    }

    toast.textContent = message;

    // Click to dismiss
    toast.addEventListener('click', () => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    });

    return toast;
  }
}
