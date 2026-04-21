import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { menuConfig } from '../../../config/menu.config';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="sidebar" [class.closed]="!isOpen()">
      <div class="sidebar-brand">
        <img src="/assets/images/ecx-logo.jpg" alt="ECX logo" />
        <div>
          <strong>PAS</strong>
          <small>ECX Operations</small>
        </div>
      </div>

      <p class="sidebar-section-label">Main Navigation</p>

      <nav class="sidebar-nav">
        @for (item of filteredMenuItems(); track item.label) {
          <a
            [routerLink]="item.route"
            routerLinkActive="active"
            (click)="onMenuItemClick()"
            class="nav-link"
          >
            <i class="nav-icon" [class]="item.icon"></i>
            <span class="nav-label">{{ item.label }}</span>
          </a>
        }

        @if (filteredMenuItems().length === 0) {
          <p class="empty-state">No menu match</p>
        }
      </nav>
    </div>
  `,
  styleUrls: ['./sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);

  readonly searchTerm = input('');
  readonly isOpen = input(true);
  readonly menuItemClick = output<void>();

  private readonly menuItems = menuConfig.some((item) => item.label === 'User Profile')
    ? menuConfig
    : [
        ...menuConfig,
        { label: 'User Profile', route: '/dashboard/profile', icon: 'bi bi-person-circle' },
      ];

  protected readonly filteredMenuItems = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();

    return this.menuItems
      .filter((item) => !item.permission || this.hasPermission(item.permission))
      .filter((item) => !term || item.label.toLowerCase().includes(term));
  });

  protected onMenuItemClick(): void {
    this.menuItemClick.emit();
  }

  private hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }
}
