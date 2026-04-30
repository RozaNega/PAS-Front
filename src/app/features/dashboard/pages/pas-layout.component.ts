import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { PasRole } from '../../../shared/models/pas.models';

type NavItem = { label: string; route: string };
type RoleMenus = Record<PasRole, NavItem[]>;

@Component({
  selector: 'app-pas-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen bg-slate-100">
      <header class="sticky top-0 z-20 border-b border-white/40 bg-white/70 backdrop-blur-xl">
        <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <button class="rounded-lg border border-slate-300 px-3 py-1 text-sm md:hidden" (click)="menuOpen.update(v => !v)">Menu</button>
          <div>
            <p class="text-xs uppercase tracking-wider text-slate-500">PAS Enterprise</p>
            <h1 class="text-lg font-bold text-slate-800">Property Automation System</h1>
          </div>
          <div class="flex items-center gap-3">
            <span class="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">{{ role() }}</span>
            <button class="rounded-lg bg-slate-900 px-3 py-1 text-sm text-white" (click)="logout()">Logout</button>
          </div>
        </div>
      </header>

      <div class="mx-auto grid max-w-7xl gap-4 px-4 py-4 md:grid-cols-[260px_1fr]">
        <aside class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" [class.hidden]="!menuOpen()">
          <nav class="space-y-1">
            @for (item of activeMenu(); track item.route) {
              <a class="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700" [routerLink]="item.route" routerLinkActive="bg-indigo-100 text-indigo-700">
                {{ item.label }}
              </a>
            }
          </nav>
        </aside>

        <main class="space-y-4">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class PasLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly menuOpen = signal(true);
  protected readonly role = computed<PasRole>(() => this.normalizeRole(this.auth.getCurrentUser()?.roles?.[0]));
  protected readonly activeMenu = computed(() => this.menus[this.role()] ?? this.menus.Guest);

  private readonly menus: RoleMenus = {
    'Super Admin': [
      { label: 'Dashboard', route: '/app/dashboard' },
      { label: 'Properties', route: '/app/properties' },
      { label: 'Users', route: '/app/users' },
      { label: 'Leases', route: '/app/leases' },
      { label: 'Payments', route: '/app/payments' },
      { label: 'Maintenance', route: '/app/maintenance' },
    ],
    Admin: [
      { label: 'Dashboard', route: '/app/dashboard' },
      { label: 'Properties', route: '/app/properties' },
      { label: 'Users', route: '/app/users' },
      { label: 'Payments', route: '/app/payments' },
    ],
    'Property Manager': [
      { label: 'Dashboard', route: '/app/dashboard' },
      { label: 'Properties', route: '/app/properties' },
      { label: 'Leases', route: '/app/leases' },
      { label: 'Maintenance', route: '/app/maintenance' },
    ],
    Tenant: [
      { label: 'Dashboard', route: '/app/dashboard' },
      { label: 'Leases', route: '/app/leases' },
      { label: 'Payments', route: '/app/payments' },
      { label: 'Maintenance', route: '/app/maintenance' },
    ],
    Guest: [{ label: 'Dashboard', route: '/app/dashboard' }],
  };

  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/auth/login');
  }

  private normalizeRole(role: string | undefined): PasRole {
    const normalized = (role ?? '').toLowerCase();
    if (normalized.includes('super')) return 'Super Admin';
    if (normalized.includes('admin')) return 'Admin';
    if (normalized.includes('manager')) return 'Property Manager';
    if (normalized.includes('tenant') || normalized.includes('employee') || normalized.includes('user')) return 'Tenant';
    return 'Guest';
  }
}
