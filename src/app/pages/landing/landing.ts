import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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

type FeatureId = 'live-dashboard' | 'scan-first-inventory' | 'audit-ready-controls';

interface FeatureItem {
  readonly id: FeatureId;
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

interface ApiResponse<T> {
  readonly success: boolean;
  readonly message?: string;
  readonly data: T;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Landing implements OnInit, OnDestroy {
  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly authService = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

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
      id: 'live-dashboard',
      icon: 'bi bi-speedometer2',
      title: 'Live Command Dashboard',
      description: 'Monitor inventory, transfers, and approvals in one real-time command center.',
    },
    {
      id: 'scan-first-inventory',
      icon: 'bi bi-qr-code-scan',
      title: 'Scan-First Inventory',
      description:
        'Use QR workflows for rapid receiving, issue, transfer, and verification cycles.',
    },
    {
      id: 'audit-ready-controls',
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

  private readonly roleBaseRoute = computed(() => {
    const parts = this.dashboardRoute()
      .split('/')
      .filter(Boolean);
    return parts.length ? `/${parts[0]}` : '';
  });

  protected readonly inventoryRoute = computed(() => {
    // Only some roles expose inventory pages directly.
    switch (this.roleBaseRoute()) {
      case '/admin':
        return '/admin/inventory';
      case '/storekeeper':
        return '/storekeeper/inventory';
      case '/manager':
        return '/manager/inventory';
      default:
        return this.dashboardRoute();
    }
  });

  protected readonly auditControlsRoute = computed(() => {
    // Audit/compliance pages differ per role.
    switch (this.roleBaseRoute()) {
      case '/admin':
        return '/admin/reports/audit';
      case '/manager':
        return '/manager/audit-trail';
      case '/compliance-officer':
        return '/compliance-officer/audit-trail';
      default:
        return this.dashboardRoute();
    }
  });

  protected readonly contactForm = new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    message: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10)],
    }),
  });

  protected readonly contactSubmitting = signal(false);
  protected readonly contactSuccess = signal<string | null>(null);
  protected readonly contactError = signal<string | null>(null);

  constructor() {
    this.restoreTheme();
    this.applyTheme();
  }

  ngOnInit(): void {
    // Keep landing page visible - don't auto-redirect
    // Users can click login button if they want to authenticate
    if (isPlatformBrowser(this.platformId)) {
      console.log('📄 Landing page loaded - waiting for user action');
      
      // Programmatically prevent overscroll
      this.preventOverscroll();
    }
  }

  ngOnDestroy(): void {
    // Reset body background when leaving landing page
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.background = '';
      document.documentElement.style.background = '';
    }
    console.log('🔄 Landing page destroyed - user navigated away');
  }

  private preventOverscroll(): void {
    // Set body background to match landing page
    document.body.style.background = '#f8fafc';
    document.documentElement.style.background = '#f8fafc';
    
    // Prevent overscroll behavior
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';
    
    // Webkit overscroll behavior (for Safari)
    (document.body.style as any).webkitOverscrollBehavior = 'none';
    (document.documentElement.style as any).webkitOverscrollBehavior = 'none';
    
    // Additional prevention for touch devices
    document.addEventListener('touchmove', (e) => {
      // Allow scrolling within the page content
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
      const clientHeight = document.documentElement.clientHeight || window.innerHeight;
      
      // Prevent overscroll at top and bottom
      if ((scrollTop <= 0 && e.touches[0].clientY > e.touches[0].clientY) ||
          (scrollTop + clientHeight >= scrollHeight && e.touches[0].clientY < e.touches[0].clientY)) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
    this.themePanelOpen.set(false);
  }

  protected goToSignup(): void {
    this.closeMenu();
    void this.router.navigate(['/auth/register']);
  }

  protected goToLogin(): void {
    this.closeMenu();
    void this.router.navigate(['/auth/login']);
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

  protected submitContact(): void {
    this.contactSuccess.set(null);
    this.contactError.set(null);

    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      this.contactError.set('Please provide a valid email and a message.');
      return;
    }

    this.contactSubmitting.set(true);
    const payload = this.contactForm.getRawValue();

    this.http.post<ApiResponse<{ id: string }>>('/api/landing/contact', payload).subscribe({
      next: (res: ApiResponse<{ id: string }>) => {
        this.contactSubmitting.set(false);
        this.contactSuccess.set(res?.message ?? 'Thanks — we received your message.');
        this.contactForm.reset();
      },
      error: (err: unknown) => {
        console.error('Contact submission failed', err);
        this.contactSubmitting.set(false);
        this.contactError.set('Something went wrong. Please try again in a moment.');
      },
    });
  }
}
