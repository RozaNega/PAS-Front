import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  OnInit,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

type ModuleId = 'property' | 'storage' | 'workflow';

interface ThemeOption {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

interface StatItem {
  readonly value: string;
  readonly label: string;
}

interface FeatureItem {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
}

interface ModuleItem {
  readonly id: ModuleId;
  readonly title: string;
  readonly description: string;
  readonly points: readonly string[];
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Landing implements OnInit {
  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly menuOpen = signal(false);

  protected readonly activeModule = signal<ModuleId>('property');

  protected readonly themePanelOpen = signal(false);

  protected readonly darkMode = signal(false);

  protected readonly selectedPrimary = signal('sky');

  protected readonly primaryOptions: readonly ThemeOption[] = [
    { id: 'slate', label: 'Slate', value: '#334155' },
    { id: 'zinc', label: 'Zinc', value: '#71717a' },
    { id: 'stone', label: 'Stone', value: '#78716c' },
    { id: 'emerald', label: 'Emerald', value: '#10b981' },
    { id: 'green', label: 'Green', value: '#22c55e' },
    { id: 'lime', label: 'Lime', value: '#84cc16' },
    { id: 'orange', label: 'Orange', value: '#f97316' },
    { id: 'amber', label: 'Amber', value: '#f59e0b' },
    { id: 'yellow', label: 'Yellow', value: '#eab308' },
    { id: 'teal', label: 'Teal', value: '#14b8a6' },
    { id: 'cyan', label: 'Cyan', value: '#06b6d4' },
    { id: 'sky', label: 'Sky', value: '#0ea5e9' },
    { id: 'blue', label: 'Blue', value: '#3b82f6' },
    { id: 'violet', label: 'Violet', value: '#8b5cf6' },
    { id: 'indigo', label: 'Indigo', value: '#6366f1' },
    { id: 'purple', label: 'Purple', value: '#a855f7' },
    { id: 'fuchsia', label: 'Fuchsia', value: '#d946ef' },
    { id: 'pink', label: 'Pink', value: '#ec4899' },
    { id: 'rose', label: 'Rose', value: '#f43f5e' },
  ];

  protected readonly logoItems: readonly string[] = [
    'Headquarters',
    'Supply Command',
    'Logistics Unit',
    'Finance Desk',
    'Audit Control',
    'Regional Hubs',
  ];

  protected readonly year = computed(() => new Date().getFullYear());

  protected readonly stats: readonly StatItem[] = [
    { value: '500+', label: 'Active Sites' },
    { value: '99.9%', label: 'Data Accuracy' },
    { value: '24/7', label: 'Operations Visibility' },
  ];

  protected readonly features: readonly FeatureItem[] = [
    {
      icon: 'bi bi-speedometer2',
      title: 'Live Command Dashboard',
      description: 'Monitor inventory, transfers, and approvals in one real-time command center.',
    },
    {
      icon: 'bi bi-qr-code-scan',
      title: 'Scan-First Inventory',
      description:
        'Use QR workflows for rapid receiving, issue, transfer, and verification cycles.',
    },
    {
      icon: 'bi bi-shield-check',
      title: 'Audit-Ready Controls',
      description:
        'Track every movement with role-aware approvals, signatures, and traceable logs.',
    },
  ];

  protected readonly modules: readonly ModuleItem[] = [
    {
      id: 'property',
      title: 'Property Management',
      description: 'Register, classify, and track assets with full lifecycle ownership.',
      points: [
        'Asset tags and location history',
        'Depreciation and valuation snapshots',
        'Transfer and disposal governance',
      ],
    },
    {
      id: 'storage',
      title: 'Storage and Inventory',
      description:
        'Coordinate multi-store stock operations with threshold alerts and movement logs.',
      points: [
        'Warehouse and shelf structure',
        'Low-stock and reorder signals',
        'Fast receiving and issue flows',
      ],
    },
    {
      id: 'workflow',
      title: 'Workflow Automation',
      description: 'Route requisitions and approvals with configurable policies and notifications.',
      points: [
        'Multi-stage request approvals',
        'Role-based action constraints',
        'Alerting for pending decisions',
      ],
    },
  ];

  protected readonly dashboardRoute = computed(() => {
    if (this.authService.isAuthenticated()) {
      const user = this.authService.getCurrentUser();
      return this.authService.getDashboardRouteForUser(user);
    }
    return '/auth/login';
  });

  constructor() {
    this.restoreTheme();
    this.applyTheme();
  }

  ngOnInit(): void {
    // Keep landing page visible - don't auto-redirect
    // Users can click login button if they want to authenticate
    if (isPlatformBrowser(this.platformId)) {
      console.log('📄 Landing page loaded - waiting for user action');
    }
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
    this.themePanelOpen.set(false);
  }

  protected toggleThemePanel(): void {
    this.themePanelOpen.update((open) => !open);
  }

  protected closeThemePanel(): void {
    this.themePanelOpen.set(false);
  }

  protected selectModule(moduleId: ModuleId): void {
    this.activeModule.set(moduleId);
  }

  protected toggleDarkMode(): void {
    this.darkMode.update((mode) => !mode);
    this.applyTheme();
    this.persistTheme();
  }

  protected setPrimary(optionId: string): void {
    this.selectedPrimary.set(optionId);
    this.applyTheme();
    this.persistTheme();
    this.themePanelOpen.set(false);
  }

  private applyTheme(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;
    const body = document.body;
    const host = this.hostElement.nativeElement;
    const primary =
      this.primaryOptions.find((item) => item.id === this.selectedPrimary())?.value ?? '#0ea5e9';
    const primarySoft = this.hexToSoft(primary);
    const primaryStrong = this.hexToStrong(primary);

    host.style.setProperty('--landing-primary', primary);
    host.style.setProperty('--landing-primary-soft', primarySoft);
    host.style.setProperty('--landing-primary-strong', primaryStrong);

    root.style.setProperty('--landing-primary', primary);
    root.style.setProperty('--landing-primary-soft', primarySoft);
    root.style.setProperty('--landing-primary-strong', primaryStrong);
    root.style.setProperty('--primary-color', primary);
    root.style.setProperty('--primary-color-soft', primarySoft);

    body.classList.toggle('landing-dark', this.darkMode());
  }

  private persistTheme(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem('africom-landing-dark', String(this.darkMode()));
    localStorage.setItem('africom-landing-primary', this.selectedPrimary());
  }

  private restoreTheme(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    this.darkMode.set(localStorage.getItem('africom-landing-dark') === 'true');

    const savedPrimary = localStorage.getItem('africom-landing-primary');

    if (savedPrimary && this.primaryOptions.some((item) => item.id === savedPrimary)) {
      this.selectedPrimary.set(savedPrimary);
    }
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

  protected resetFirstVisit(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('pas_has_visited');
      console.log('🔄 First visit flag reset. Refresh the page to see the landing page again.');
      alert('First visit flag has been reset. Refresh the page to test the first-time experience.');
    }
  }

  private hexToStrong(hex: string): string {
    const normalized = hex.replace('#', '');

    if (normalized.length !== 6) {
      return '#0369a1';
    }

    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);
    const mix = (value: number) => Math.round(value * 0.68);
    const toHex = (value: number) => value.toString(16).padStart(2, '0');

    return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
  }
}
