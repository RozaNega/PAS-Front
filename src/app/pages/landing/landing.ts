import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, NgOptimizedImage, isPlatformBrowser } from '@angular/common';
import { RouterLink, Router, NavigationStart } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ApiService } from '../../core/services/api.service';
import { environment } from '../../../environments/environment';
import { filter } from 'rxjs/operators';

type ModuleId = 'property' | 'storage' | 'workflow';

interface ThemeOption {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly accent?: string;
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
  imports: [CommonModule, NgOptimizedImage, RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Landing implements OnInit, OnDestroy {
  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);

  private countdownInterval?: ReturnType<typeof setInterval>;
  private liveUpdateInterval?: ReturnType<typeof setInterval>;
  private simulationInterval?: ReturnType<typeof setInterval>;

  protected readonly menuOpen = signal(false);

  protected readonly activeModule = signal<ModuleId>('property');

  protected readonly themePanelOpen = signal(false);

  protected readonly darkMode = signal(false);

  protected readonly selectedPrimary = signal('africom-blue');

  protected readonly snapshotLoading = signal(true);

  protected readonly countdownDays = signal('20');
  protected readonly countdownHours = signal('14');
  protected readonly countdownMinutes = signal('06');
  protected readonly countdownSeconds = signal('37');

  protected readonly liveTotal = signal(14666);
  protected readonly formattedLiveTotal = computed(() =>
    new Intl.NumberFormat().format(this.liveTotal()),
  );

  protected readonly primaryOptions: readonly ThemeOption[] = [
    { id: 'africom-blue', label: 'Africom Blue', value: '#1147b8', accent: '#12a150' },
    { id: 'africom-green', label: 'Africom Green', value: '#12a150', accent: '#1147b8' },
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
    'Command Center',
    'Supply Chain',
    'Asset Registry',
    'Warehouse Ops',
    'Audit Trail',
    'Onboarding',
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
      description: 'Monitor inventory, transfers, and approvals in one polished command center.',
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

  // Contact form state
  protected readonly contactName = signal('');
  protected readonly contactEmail = signal('');
  protected readonly contactPhone = signal('');
  protected readonly contactMessage = signal('');
  protected readonly contactSubmitting = signal(false);
  protected readonly contactSuccess = signal<string | null>(null);
  protected readonly contactError = signal<string | null>(null);

  constructor() {
    this.restoreTheme();
    this.applyTheme();

    // Log any navigation attempts (for debugging)
    if (isPlatformBrowser(this.platformId)) {
      this.router.events
        .pipe(filter((event) => event instanceof NavigationStart))
        .subscribe((event: any) => {
          console.log('🔄 Navigation detected:', event.url);
          if (event.url !== '/landing' && event.url !== '/') {
            console.log('➡️ User is navigating away from landing page to:', event.url);
          }
        });
    }
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.startCountdown();
      this.fetchDashboardStatistics();
      
      // Log when landing page is loaded
      console.log('✅ Landing page loaded and will stay visible until user navigates away');
    }
  }

  ngOnDestroy(): void {
    // Clean up intervals when component is destroyed
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    if (this.liveUpdateInterval) {
      clearInterval(this.liveUpdateInterval);
    }
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }
    console.log('🔄 Landing page destroyed - user navigated away');
  }

  private fetchDashboardStatistics(): void {
    // Add header to suppress error toasts for landing page API calls
    const headers = { 'X-Suppress-Error-Toast': 'true' };
    
    this.api.get<any>('Dashboard/statistics', { headers }).subscribe(
      (resp) => {
        try {
          const live = resp?.data?.liveAttendees?.total;
          if (typeof live === 'number') {
            this.liveTotal.set(live);
          }

          const countdown = resp?.data?.liveAttendees?.countdown;
          if (countdown) {
            this.countdownDays.set(String(countdown.days).padStart(2, '0'));
            this.countdownHours.set(String(countdown.hours).padStart(2, '0'));
            this.countdownMinutes.set(String(countdown.minutes).padStart(2, '0'));
            this.countdownSeconds.set(String(countdown.seconds).padStart(2, '0'));
          }

          this.snapshotLoading.set(false);

          // Poll for updates every 15 seconds
          this.liveUpdateInterval = setInterval(
            () =>
              this.api.get<any>('Dashboard/statistics', { headers }).subscribe(
                (r) => {
                  const updated = r?.data?.liveAttendees?.total;
                  if (typeof updated === 'number') {
                    this.liveTotal.set(updated);
                  }
                },
                () => {
                  // ignore polling errors - backend might be down
                },
              ),
            15000,
          );
        } catch (e) {
          console.warn('⚠️ Failed to parse dashboard statistics (backend might be down):', e);
          this.snapshotLoading.set(false);
          this.startLiveSimulation();
        }
      },
      (err) => {
        console.warn('⚠️ Dashboard statistics unavailable (backend might be down), using simulation:', err?.status);
        this.snapshotLoading.set(false);
        this.startLiveSimulation();
      },
    );
  }

  private startLiveSimulation(): void {
    // Simulate live attendees increasing over time while landing page is open.
    const increment = () => {
      const delta =
        Math.random() < 0.2 ? Math.floor(Math.random() * 20) : Math.floor(Math.random() * 5);
      this.liveTotal.update((v) => v + delta);
    };

    // Start with a short random interval to feel organic
    this.snapshotLoading.set(false);
    this.simulationInterval = setInterval(increment, 1500 + Math.floor(Math.random() * 2500));
  }

  private startCountdown(): void {
    const targetDate = new Date('2026-12-15T00:00:00').getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance < 0) {
        this.countdownDays.set('0');
        this.countdownHours.set('0');
        this.countdownMinutes.set('0');
        this.countdownSeconds.set('0');
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      this.countdownDays.set(String(days).padStart(2, '0'));
      this.countdownHours.set(String(hours).padStart(2, '0'));
      this.countdownMinutes.set(String(minutes).padStart(2, '0'));
      this.countdownSeconds.set(String(seconds).padStart(2, '0'));
    };

    updateCountdown();
    this.countdownInterval = setInterval(updateCountdown, 1000);
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

  protected scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.closeMenu();
    }
  }

  private applyTheme(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;
    const body = document.body;
    const host = this.hostElement.nativeElement;
    const selectedTheme = this.primaryOptions.find((item) => item.id === this.selectedPrimary());
    const primary = selectedTheme?.value ?? '#1147b8';
    const accent = selectedTheme?.accent ?? '#12a150';
    const primarySoft = this.hexToSoft(primary);
    const primaryStrong = this.hexToStrong(primary);
    const accentSoft = this.hexToSoft(accent);
    const accentStrong = this.hexToStrong(accent);

    host.style.setProperty('--landing-primary', primary);
    host.style.setProperty('--landing-primary-soft', primarySoft);
    host.style.setProperty('--landing-primary-strong', primaryStrong);
    host.style.setProperty('--landing-accent', accent);
    host.style.setProperty('--landing-accent-soft', accentSoft);
    host.style.setProperty('--landing-accent-strong', accentStrong);

    root.style.setProperty('--landing-primary', primary);
    root.style.setProperty('--landing-primary-soft', primarySoft);
    root.style.setProperty('--landing-primary-strong', primaryStrong);
    root.style.setProperty('--landing-accent', accent);
    root.style.setProperty('--landing-accent-soft', accentSoft);
    root.style.setProperty('--landing-accent-strong', accentStrong);
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

    const name = this.contactName().trim();
    const email = this.contactEmail().trim();
    const message = this.contactMessage().trim();

    if (!name || !email || !message) {
      this.contactError.set('Please fill in all fields.');
      return;
    }

    // basic email pattern
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      this.contactError.set('Please provide a valid email address.');
      return;
    }

    this.contactSubmitting.set(true);

    const payload = { name, email, phone: this.contactPhone().trim(), message };
    
    // Use HttpClient directly with headers to suppress error toasts
    const headers = new HttpHeaders({ 'X-Suppress-Error-Toast': 'true' });
    const url = `${environment.apiUrl}/Contact`;

    this.http.post<any>(url, payload, { headers }).subscribe(
      (resp) => {
        this.contactSuccess.set('Message sent — we will get back to you shortly.');
        this.contactName.set('');
        this.contactEmail.set('');
        this.contactPhone.set('');
        this.contactMessage.set('');
        this.contactSubmitting.set(false);
      },
      (err) => {
        console.warn('⚠️ Contact submit failed (backend might be down):', err?.status);
        if (err.status === 0 || err.status >= 500) {
          this.contactError.set('Backend is currently unavailable. Please try again later or contact us directly.');
        } else {
          this.contactError.set('Failed to send message. Please try again later.');
        }
        this.contactSubmitting.set(false);
      },
    );
  }
}
