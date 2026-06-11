import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CurrentUserService } from '../../core/services/current-user.service';
import { ProfileService } from '../../core/services/profile.service';
import { SignalRService } from '../../core/services/signalr.service';
import { filter, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { getMenuConfigByRole as getMenuConfigForRole, MenuItem } from '../../config/menu.config';
import { User } from '../../core/services/auth.service';
import { DEFAULT_AVATAR_PATH } from '../../core/models/stored-user.model';
import {
  WorkflowService,
  UserRole,
  WORKFLOW_PENDING_STATUSES,
} from '../../core/services/workflow.service';
import { ComplianceDataService } from '../../core/services/compliance-data.service';
import { ManagerDataService } from '../../core/services/manager-data.service';

interface ThemeOption {
  id: string;
  label: string;
  value: string;
}

interface PopoverNotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
  host: {
    '(document:click)': 'onDocumentClick()',
    '(document:keydown.escape)': 'closePopovers()',
  },
})
export class MainLayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly profileService = inject(ProfileService);
  private readonly signalRService = inject(SignalRService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly router = inject(Router);
  private readonly workflowService = inject(WorkflowService);
  private readonly complianceData = inject(ComplianceDataService);
  private readonly managerData = inject(ManagerDataService);

  protected menuItems: MenuItem[] = [];
  private readonly workflowNotificationTick = signal(0);
  protected user: User | null = null;
  protected readonly defaultAvatar = DEFAULT_AVATAR_PATH;

  private readonly rawProfileImageUrl = toSignal(this.currentUserService.profileImageUrl$, {
    initialValue: this.currentUserService.getProfileImageUrl(),
  });
  protected readonly profileImageUrl = computed(() => {
    const url = this.rawProfileImageUrl();
    return this.sanitizer.bypassSecurityTrustUrl(
      url ? this.currentUserService.getDisplayUrl(url) : DEFAULT_AVATAR_PATH,
    );
  });
  protected sidebarOpen = true;
  protected configOpen = false;
  protected darkTheme = false;
  protected menuMode: 'static' | 'overlay' = 'static';
  protected selectedPrimary = 'violet';
  protected selectedSurface = 'slate';
  protected notificationsOpen = false;
  protected openMenuGroups: Set<string> = new Set();
  protected readonly notifications = toSignal(
    this.signalRService.notifications$.pipe(
      map((items) =>
        items
          .filter((item) => !item.isRead)
          .map<PopoverNotificationItem>((item) => ({
            id: item.id || Math.random().toString(36).substr(2, 9),
            type: item.type || 'info',
            title: item.type === 'error' ? 'Error' : item.type === 'success' ? 'Success' : 'Info',
            message: item.message,
            time: this.formatNotificationTime(item.sentDate),
          })),
      ),
    ),
    { initialValue: [] as PopoverNotificationItem[] },
  );

  protected readonly quickNotifications = computed<PopoverNotificationItem[]>(() => {
    const workflowItems = this.getWorkflowPopoverItems();
    if (workflowItems.length > 0) {
      return workflowItems;
    }

    const notifications = this.notifications();

    if (notifications.length > 0) {
      return notifications;
    }

    // Fallback: empty notifications (no hardcoded items)
    return [];
  });

  protected readonly primaryOptions: ThemeOption[] = [
    { id: 'emerald', label: 'Emerald', value: '#10b981' },
    { id: 'teal', label: 'Teal', value: '#14b8a6' },
    { id: 'cyan', label: 'Cyan', value: '#06b6d4' },
    { id: 'sky', label: 'Sky', value: '#0ea5e9' },
    { id: 'blue', label: 'Blue', value: '#3b82f6' },
    { id: 'indigo', label: 'Indigo', value: '#6366f1' },
    { id: 'violet', label: 'Violet', value: '#8b5cf6' },
    { id: 'fuchsia', label: 'Fuchsia', value: '#d946ef' },
  ];

  protected readonly surfaceOptions: ThemeOption[] = [
    { id: 'slate', label: 'Slate', value: '#f3f6fb' },
    { id: 'zinc', label: 'Zinc', value: '#f4f4f5' },
    { id: 'stone', label: 'Stone', value: '#f5f5f4' },
    { id: 'gray', label: 'Gray', value: '#f3f4f6' },
  ];

  constructor() {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    this.updateMenuItems();
    this.signalRService.startConnection();
    this.restoreTheme();
    this.applyTheme();

    this.workflowService.getNotificationUpdates().subscribe(() => {
      this.workflowNotificationTick.update((v) => v + 1);
    });
    this.workflowService.getRequestUpdates().subscribe(() => {
      this.workflowNotificationTick.update((v) => v + 1);
    });

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.user = this.authService.getCurrentUser();
        this.updateMenuItems();
        this.closePopovers();
      });
  }

  protected toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  protected toggleConfig(): void {
    this.configOpen = !this.configOpen;
    if (this.configOpen) {
      this.notificationsOpen = false;
    }
  }

  protected toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.notificationsOpen = !this.notificationsOpen;
    if (this.notificationsOpen) {
      this.configOpen = false;
    }
  }

  protected onDocumentClick(): void {
    this.closePopovers();
  }

  protected closePopovers(): void {
    this.notificationsOpen = false;
    this.configOpen = false;
  }

  protected keepPopoverOpen(event: Event): void {
    event.stopPropagation();
  }

  protected closeNotifications(event: Event): void {
    event.stopPropagation();
    this.notificationsOpen = false;
  }

  protected markWorkflowNotificationAsRead(id: string): void {
    if (!id) return;
    this.workflowService.markNotificationAsRead(id);
    this.signalRService.markNotificationAsRead(id);
    this.workflowNotificationTick.update((v) => v + 1);
  }

  protected dismissWorkflowNotification(id: string): void {
    if (!id) return;
    this.workflowService.dismissNotification(id);
    this.signalRService.dismissNotification(id);
    this.workflowNotificationTick.update((v) => v + 1);
  }

  protected markAllWorkflowNotificationsAsRead(): void {
    const user = this.currentUserService.getCurrentUserValue();
    const role = this.getWorkflowRoleForRoute();
    if (user?.id && role) {
      this.workflowService.markAllNotificationsAsRead(user.id, role);
      this.workflowNotificationTick.update((v) => v + 1);
    }
    this.signalRService.markAllNotificationsAsRead();
  }

  protected toggleDarkMode(): void {
    this.darkTheme = !this.darkTheme;
    this.applyTheme();
    this.persistTheme();
  }

  protected setPrimary(optionId: string): void {
    this.selectedPrimary = optionId;
    this.applyTheme();
    this.persistTheme();
  }

  protected setSurface(optionId: string): void {
    this.selectedSurface = optionId;
    this.applyTheme();
    this.persistTheme();
  }

  protected setMenuMode(mode: 'static' | 'overlay'): void {
    this.menuMode = mode;
    this.sidebarOpen = mode === 'static';
    this.persistTheme();
  }

  protected closeSidebar(): void {
    this.sidebarOpen = false;
  }

  protected onSidebarItemClick(): void {
    if (
      this.menuMode === 'overlay' ||
      (typeof window !== 'undefined' && window.innerWidth <= 1024)
    ) {
      this.sidebarOpen = false;
    }
  }

  protected dashboardHomeRoute(): string {
    if (this.isManagerRoute()) {
      return '/manager/dashboard';
    }

    if (this.isComplianceOfficerRoute()) {
      return '/compliance-officer/dashboard';
    }

    return this.authService.getDashboardRouteForUser(this.user);
  }

  protected profileRoute(): string {
    if (this.router.url.startsWith('/admin')) {
      return '/admin/profile';
    }

    if (this.router.url.startsWith('/storekeeper')) {
      return '/storekeeper/profile';
    }

    if (this.isManagerRoute()) {
      return '/manager/profile';
    }

    if (this.isComplianceOfficerRoute()) {
      return '/compliance-officer/profile';
    }

    return '/employee/dashboard/profile';
  }

  protected notificationsRoute(): string {
    if (this.router.url.startsWith('/admin')) {
      return '/admin/notifications';
    }

    if (this.router.url.startsWith('/storekeeper')) {
      return '/storekeeper/notifications';
    }

    if (this.isManagerRoute()) {
      return '/manager/notifications';
    }

    if (this.isComplianceOfficerRoute()) {
      return '/compliance-officer/risk-alerts';
    }

    if (this.isEmployeeRoute()) {
      return '/employee/dashboard/notifications';
    }

    return '/notifications';
  }

  protected notificationsPopoverTitle(): string {
    return 'Notifications';
  }

  protected viewAllNotificationsLabel(): string {
    return 'View all notifications';
  }

  protected isManagerRoute(): boolean {
    return this.router.url.startsWith('/manager');
  }

  protected isComplianceOfficerRoute(): boolean {
    return this.router.url.startsWith('/compliance-officer');
  }

  protected isEmployeeRoute(): boolean {
    return this.router.url.startsWith('/employee');
  }

  protected toggleMenuGroup(label: string): void {
    if (this.openMenuGroups.has(label)) {
      this.openMenuGroups.delete(label);
    } else {
      this.openMenuGroups.add(label);
    }
  }

  protected isMenuGroupOpen(label: string): boolean {
    return this.openMenuGroups.has(label);
  }

  protected logout(): void {
    this.authService.logout();
  }

  protected initials(): string {
    const fullName = this.user?.fullName?.trim();

    if (!fullName) {
      return 'EC';
    }

    const parts = fullName.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const second = parts[1]?.[0] ?? '';
    return `${first}${second}`.toUpperCase();
  }

  protected currentYear(): number {
    return new Date().getFullYear();
  }

  protected activeTopbarLabel(): string {
    const url = this.router.url;
    const routeItems = this.menuItems.filter(
      (item): item is MenuItem & { route: string } => typeof item.route === 'string',
    );

    const match = routeItems
      .filter((item) => url === item.route || url.startsWith(`${item.route}/`))
      .sort((a, b) => b.route.length - a.route.length)[0];

    return match?.label ?? 'Dashboard';
  }

  private updateMenuItems(): void {
    if (this.router.url.startsWith('/admin')) {
      this.menuItems = getMenuConfigForRole('admin');
      return;
    }

    if (this.router.url.startsWith('/storekeeper')) {
      this.menuItems = getMenuConfigForRole('storekeeper');
      return;
    }

    if (this.isManagerRoute()) {
      this.menuItems = getMenuConfigForRole('manager');
      this.loadManagerMenuBadges();
      return;
    }

    if (this.isComplianceOfficerRoute()) {
      this.menuItems = getMenuConfigForRole('compliance-officer');
      this.loadComplianceMenuBadges();
      return;
    }

    if (this.router.url.startsWith('/employee')) {
      this.menuItems = getMenuConfigForRole('employee');
      this.loadEmployeeMenuBadges();
      return;
    }

    const role = this.authService.mapUserToDashboardRole(this.user);
    this.menuItems = getMenuConfigForRole(role);
  }

  private applyTheme(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;
    const body = document.body;
    const primary =
      this.primaryOptions.find((item) => item.id === this.selectedPrimary)?.value ?? '#8b5cf6';
    const surface =
      this.surfaceOptions.find((item) => item.id === this.selectedSurface)?.value ?? '#f3f6fb';

    root.style.setProperty('--primary-color', primary);
    root.style.setProperty('--primary-color-soft', this.hexToSoft(primary));
    root.style.setProperty('--primary-shadow-color', this.hexToRgba(primary, 0.35));
    root.style.setProperty('--primary-focus-ring', this.hexToRgba(primary, 0.25));
    root.style.setProperty('--surface-ground', this.darkTheme ? '#0a0a0a' : surface);
    root.style.setProperty('--surface-card', this.darkTheme ? '#111111' : '#ffffff');
    root.style.setProperty('--surface-border', this.darkTheme ? '#2f2f2f' : '#e2e8f0');
    root.style.setProperty('--surface-section', this.darkTheme ? '#171717' : '#f8fafc');
    root.style.setProperty('--text-color', this.darkTheme ? '#f5f5f5' : '#334155');
    root.style.setProperty('--text-color-muted', this.darkTheme ? '#c5c5c5' : '#64748b');
    root.style.setProperty(
      '--topbar-bg',
      this.darkTheme ? 'rgba(17, 17, 17, 0.92)' : 'rgba(255, 255, 255, 0.92)',
    );

    body.classList.toggle('app-dark', this.darkTheme);
  }

  private persistTheme(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem('africom-theme-dark', String(this.darkTheme));
    localStorage.setItem('africom-theme-primary', this.selectedPrimary);
    localStorage.setItem('africom-theme-surface', this.selectedSurface);
    localStorage.setItem('africom-menu-mode', this.menuMode);
  }

  private restoreTheme(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    this.darkTheme = localStorage.getItem('africom-theme-dark') === 'true';
    this.selectedPrimary = localStorage.getItem('africom-theme-primary') ?? this.selectedPrimary;
    this.selectedSurface = localStorage.getItem('africom-theme-surface') ?? this.selectedSurface;
    const storedMode = localStorage.getItem('africom-menu-mode');
    this.menuMode = storedMode === 'overlay' ? 'overlay' : 'static';
  }

  private hexToSoft(hex: string): string {
    const normalized = hex.replace('#', '');

    if (normalized.length !== 6) {
      return '#eef2ff';
    }

    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);
    const mix = (value: number) => Math.round(value + (255 - value) * 0.86);

    const toHex = (value: number) => value.toString(16).padStart(2, '0');

    return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
  }

  private hexToRgba(hex: string, alpha: number): string {
    const normalized = hex.replace('#', '');

    if (normalized.length !== 6) {
      return `rgba(99, 102, 241, ${alpha})`;
    }

    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private getWorkflowPopoverItems(): PopoverNotificationItem[] {
    this.workflowNotificationTick();
    const user = this.currentUserService.getCurrentUserValue();
    const role = this.getWorkflowRoleForRoute();
    if (!user?.id || !role) {
      return [];
    }

    return this.workflowService
      .getNotificationsForUser(user.id, role)
      .filter((n) => !n.isRead)
      .slice(-8)
      .reverse()
      .map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        time: this.formatNotificationTime(n.createdDate),
      }));
  }

  private getWorkflowRoleForRoute(): UserRole | null {
    if (this.isManagerRoute()) {
      return 'Manager';
    }
    if (this.isComplianceOfficerRoute()) {
      return 'Compliance';
    }
    if (this.isEmployeeRoute()) {
      return 'Employee';
    }
    if (this.router.url.startsWith('/admin')) {
      return 'Admin';
    }
    if (this.router.url.startsWith('/storekeeper')) {
      return 'Storekeeper';
    }
    return null;
  }

  private loadComplianceMenuBadges(): void {
    this.complianceData.getServiceRequests().subscribe((requests) => {
      const pendingCount = requests.filter((request) => {
        const status = request.status?.toLowerCase() ?? '';
        return (
          status.includes('pending') ||
          status.includes('submitted') ||
          status.includes('review') ||
          status.includes('awaiting')
        );
      }).length;

      this.menuItems = this.menuItems.map((item) => ({
        ...item,
        children: item.children?.map((child: MenuItem) =>
          child.route === '/compliance-officer/audits/pending'
            ? { ...child, badge: pendingCount || undefined }
            : child,
        ),
      }));
    });
  }

  private loadManagerMenuBadges(): void {
    this.managerData.menuBadgeCounts().subscribe((counts) => {
      this.menuItems = this.menuItems.map((item) => {
        if (item.label === 'Service Requests') {
          return {
            ...item,
            children: item.children?.map((child: MenuItem) => {
              return child;
            }),
          };
        }

        if (item.label === 'Store Issue Vouchers') {
          return {
            ...item,
            badge: counts.allSivs || undefined,
            children: item.children?.map((child: MenuItem) => {
              if (child.route === '/manager/sivs/all') {
                return { ...child, badge: counts.allSivs || undefined };
              }
              if (child.route === '/manager/sivs/issued') {
                return { ...child, badge: counts.issuedSivs || undefined };
              }
              return child;
            }),
          };
        }

        if (item.label === 'Inventory') {
          return {
            ...item,
            badge: counts.lowStockItems || undefined,
            children: item.children?.map((child: MenuItem) => {
              if (child.route === '/manager/inventory/low-stock') {
                return { ...child, badge: counts.lowStockItems || undefined };
              }
              return child;
            }),
          };
        }

        return item;
      });
    });
  }

  private loadEmployeeMenuBadges(): void {
    const user = this.currentUserService.getCurrentUserValue();
    const employeeId = this.currentUserService.getUserId();
    if (!employeeId) return;

    this.menuItems = this.menuItems.map((item) => {
      if (item.label !== 'My Requests') return item;

      return {
        ...item,
        children: item.children?.map((child: MenuItem) => {
          return child;
        })
      };
    });
  }

  private formatNotificationTime(date: Date): string {
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) {
      return 'just now';
    }

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);

    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }
}
