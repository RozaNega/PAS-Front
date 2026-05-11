import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PasApiService } from '../../services/pas-api.service';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type:
    | 'info'
    | 'success'
    | 'warning'
    | 'error'
    | 'approved'
    | 'completed'
    | 'submitted'
    | 'rejected';
  timestamp: Date;
  read: boolean;
  requestId?: string;
  sivId?: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="app-header" [class.dark-theme]="isDarkTheme()">
      <div class="header-left">
        <div class="logo">
          <i class="bi bi-box-seam"></i>
          <span>PAS System</span>
        </div>
        <nav class="header-nav">
          <a routerLink="/dashboard" class="nav-link" [class.active]="isActive('/dashboard')"
            >Dashboard</a
          >
          <a routerLink="/catalog" class="nav-link" [class.active]="isActive('/catalog')"
            >Catalog</a
          >
          <a routerLink="/storage" class="nav-link" [class.active]="isActive('/storage')"
            >Storage</a
          >
          <a routerLink="/reports" class="nav-link" [class.active]="isActive('/reports')"
            >Reports</a
          >
        </nav>
      </div>

      <div class="header-right">
        <div class="header-actions">
          <div class="notification-wrapper" (click)="toggleNotifications()">
            <i class="bi bi-bell"></i>
            <span class="notification-badge" *ngIf="unreadCount() > 0">{{ unreadCount() }}</span>
          </div>

          <button
            class="theme-toggle"
            (click)="toggleTheme()"
            [title]="isDarkTheme() ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <i class="bi" [class.bi-sun]="!isDarkTheme()" [class.bi-moon]="isDarkTheme()"></i>
          </button>

          <div class="user-menu" (click)="toggleUserMenu()">
            <div class="user-avatar"><i class="bi bi-person-circle"></i></div>
            <span class="user-name">Admin User</span>
            <i class="bi bi-chevron-down"></i>
          </div>
        </div>

        <div
          class="notifications-dropdown"
          [class.show]="showNotifications()"
          [class.dark-theme]="isDarkTheme()"
        >
          <div class="notifications-header">
            <h3>Notifications</h3>
            <button class="mark-all-read" (click)="markAllAsRead()">Mark all as read</button>
          </div>
          <div class="notifications-list">
            @for (notification of notifications(); track notification.id) {
              <div
                class="notification-item"
                [class.unread]="!notification.read"
                [class]="notification.type"
              >
                <div class="notification-icon">
                  <i
                    class="bi"
                    [class.bi-info-circle]="notification.type === 'info'"
                    [class.bi-check-circle]="notification.type === 'success'"
                    [class.bi-exclamation-triangle]="notification.type === 'warning'"
                    [class.bi-x-circle]="notification.type === 'error'"
                  ></i>
                </div>
                <div class="notification-content">
                  <div class="notification-title">{{ notification.title }}</div>
                  <div class="notification-message">{{ notification.message }}</div>
                  <div class="notification-time">{{ formatTime(notification.timestamp) }}</div>
                </div>
                <div class="notification-actions">
                  <button
                    class="btn btn-sm btn-primary"
                    *ngIf="notification.requestId"
                    (click)="viewRequest(notification.requestId!); $event.stopPropagation()"
                  >
                    👁️ View Request
                  </button>
                  <button
                    class="btn btn-sm btn-secondary"
                    *ngIf="notification.sivId"
                    (click)="downloadPDF(notification.sivId!); $event.stopPropagation()"
                  >
                    📥 Download PDF
                  </button>
                  <button
                    class="btn btn-sm btn-danger"
                    (click)="dismissNotification(notification.id); $event.stopPropagation()"
                  >
                    ✕ Dismiss
                  </button>
                </div>
              </div>
            } @empty {
              <div class="no-notifications">
                <i class="bi bi-bell"></i>
                <p>No new notifications</p>
              </div>
            }
          </div>
        </div>

        <div class="user-dropdown" [class.show]="showUserMenu()" [class.dark-theme]="isDarkTheme()">
          <div class="user-dropdown-header">
            <div class="user-avatar-large"><i class="bi bi-person-circle"></i></div>
            <div class="user-info">
              <div class="user-name-large">Admin User</div>
              <div class="user-email">admin@pas-system.com</div>
              <div class="user-role">System Administrator</div>
            </div>
          </div>
          <div class="user-dropdown-actions">
            <a class="dropdown-item" href="#"><i class="bi bi-person"></i><span>Profile</span></a>
            <a class="dropdown-item" href="#"><i class="bi bi-gear"></i><span>Settings</span></a>
            <div class="dropdown-divider"></div>
            <a class="dropdown-item" href="#" (click)="signOut()"
              ><i class="bi bi-box-arrow-right"></i><span>Sign Out</span></a
            >
          </div>
        </div>
      </div>
    </header>
  `,
  styleUrls: ['./app-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppHeaderComponent {
  private readonly router = inject(Router);
  private readonly pasApi = inject(PasApiService);

  isDarkTheme = signal(false);
  showNotifications = signal(false);
  showUserMenu = signal(false);
  notifications = signal<NotificationItem[]>([]);

  private adminNotifications: NotificationItem[] = [
    {
      id: '1',
      title: 'New Property Added',
      message: 'Property "Sunset Villas" has been successfully added to the system.',
      type: 'success',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      read: false,
    },
    {
      id: '2',
      title: 'User Approval Request',
      message: '3 new users awaiting approval for admin access.',
      type: 'warning',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      read: false,
    },
    {
      id: '3',
      title: 'System Backup Completed',
      message: 'Daily backup completed successfully. Database size: 2.4GB',
      type: 'success',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      read: true,
    },
    {
      id: '4',
      title: 'Request Approved - SR-2024-121',
      message: 'Your request SR-2024-121 has been approved and forwarded to store for issue.',
      type: 'approved',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
      read: false,
      requestId: 'SR-2024-121',
    },
    {
      id: '5',
      title: 'Request Completed - SR-2024-120',
      message: 'Your request SR-2024-120 has been completed. SIV-045 issued.',
      type: 'completed',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
      read: false,
      requestId: 'SR-2024-120',
      sivId: 'SIV-045',
    },
  ];

  private storekeeperNotifications: NotificationItem[] = [
    {
      id: '1',
      title: 'Urgent: Stock Issuance Pending',
      message: '3 urgent stock issuance requests need immediate attention.',
      type: 'warning',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      read: false,
    },
    {
      id: '2',
      title: 'New GRN Received',
      message: 'GRN-2024-0456 received from Tech Supplies Ltd. Ready for inspection.',
      type: 'success',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      read: false,
    },
    {
      id: '3',
      title: 'Low Stock Alert',
      message: 'Laptop stock is critically low (5 units). Minimum threshold: 20 units.',
      type: 'error',
      timestamp: new Date(Date.now() - 1000 * 60 * 45),
      read: false,
    },
    {
      id: '4',
      title: 'Warehouse Transfer Completed',
      message: 'Transfer of 50 monitors from Warehouse A to Warehouse B completed.',
      type: 'success',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      read: true,
    },
    {
      id: '5',
      title: 'Shelf Maintenance Due',
      message: 'Shelf A-12-B in Warehouse A requires maintenance inspection.',
      type: 'info',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
      read: true,
    },
  ];

  constructor() {
    const savedTheme = localStorage.getItem('theme');
    this.isDarkTheme.set(savedTheme === 'dark');
    this.updateTheme();
    this.updateNotificationsBasedOnRole();
    this.router.events.subscribe(() => this.updateNotificationsBasedOnRole());
    document.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.notification-wrapper') && !target.closest('.notifications-dropdown'))
        this.showNotifications.set(false);
      if (!target.closest('.user-menu') && !target.closest('.user-dropdown'))
        this.showUserMenu.set(false);
    });
  }

  private updateNotificationsBasedOnRole(): void {
    const currentUrl = this.router.url;
    if (currentUrl.includes('/admin')) this.notifications.set(this.adminNotifications);
    else if (currentUrl.includes('/storekeeper'))
      this.notifications.set(this.storekeeperNotifications);
    else this.notifications.set(this.adminNotifications);
  }

  toggleTheme() {
    this.isDarkTheme.set(!this.isDarkTheme());
    localStorage.setItem('theme', this.isDarkTheme() ? 'dark' : 'light');
    this.updateTheme();
  }
  private updateTheme() {
    if (this.isDarkTheme()) document.documentElement.classList.add('dark-theme');
    else document.documentElement.classList.remove('dark-theme');
  }
  toggleNotifications() {
    this.showNotifications.set(!this.showNotifications());
    this.showUserMenu.set(false);
  }
  toggleUserMenu() {
    this.showUserMenu.set(!this.showUserMenu());
    this.showNotifications.set(false);
  }
  unreadCount(): number {
    return this.notifications().filter((n) => !n.read).length;
  }
  markAllAsRead() {
    const updated = this.notifications().map((n) => ({ ...n, read: true }));
    this.notifications.set(updated);
  }

  // Dismiss: call API then remove locally
  dismissNotification(id: string) {
    this.pasApi.markNotificationAsRead(id).subscribe({
      next: () => this.notifications.set(this.notifications().filter((n) => n.id !== id)),
      error: () => this.notifications.set(this.notifications().filter((n) => n.id !== id)),
    });
  }

  viewRequest(srNumber: string) {
    this.showNotifications.set(false);
    const currentUrl = this.router.url;
    if (currentUrl.startsWith('/employee') || currentUrl.includes('/employee'))
      this.router.navigate(['/employee/requests', srNumber]);
    else this.router.navigate(['/requisitions', srNumber]);
  }

  downloadPDF(sivId: string) {
    this.showNotifications.set(false);
    this.pasApi.downloadSivPdf(sivId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob as Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sivId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        // Fallback: navigate to SIV page
        this.router.navigate(['/requisitions/sivs', sivId]);
      },
    });
  }

  signOut() {
    this.router.navigate(['/login']);
  }
  isActive(path: string): boolean {
    return this.router.url === path;
  }

  formatTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
}
