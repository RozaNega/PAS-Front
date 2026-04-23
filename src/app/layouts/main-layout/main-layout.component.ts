import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SignalRService } from '../../core/services/signalr.service';
import { filter } from 'rxjs';
import { MenuItem, menuConfig } from '../../config/menu.config';
import { User } from '../../core/services/auth.service';

interface ThemeOption {
  id: string;
  label: string;
  value: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
})
export class MainLayoutComponent implements OnInit {
  protected readonly menuItems: MenuItem[] = menuConfig;
  protected user: User | null = null;
  protected sidebarOpen = false;
  protected configOpen = false;
  protected darkTheme = false;
  protected menuMode: 'static' | 'overlay' = 'static';
  protected selectedPrimary = 'violet';
  protected selectedSurface = 'slate';

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

  constructor(
    private authService: AuthService,
    private signalRService: SignalRService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    this.signalRService.startConnection();
    this.restoreTheme();
    this.applyTheme();

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.user = this.authService.getCurrentUser();
      });
  }

  protected toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  protected toggleConfig(): void {
    this.configOpen = !this.configOpen;
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
    this.sidebarOpen = false;
    this.persistTheme();
  }

  protected closeSidebar(): void {
    this.sidebarOpen = false;
  }

  protected onSidebarItemClick(): void {
    this.sidebarOpen = false;
  }

  protected dashboardHomeRoute(): string {
    return this.authService.getDashboardRouteForUser(this.user);
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
    root.style.setProperty('--surface-ground', this.darkTheme ? '#0b1220' : surface);
    root.style.setProperty('--surface-card', this.darkTheme ? '#111827' : '#ffffff');
    root.style.setProperty('--surface-border', this.darkTheme ? '#334155' : '#e2e8f0');
    root.style.setProperty('--text-color', this.darkTheme ? '#dbe7fb' : '#334155');
    root.style.setProperty('--text-color-muted', this.darkTheme ? '#94a3b8' : '#64748b');

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
}
