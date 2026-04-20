import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { menuConfig } from '../../../config/menu.config';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="sidebar" [class.closed]="!isOpen">
      <div class="sidebar-brand">
        <img src="/assets/images/ecx-logo.jpg" alt="ECX logo" />
        <span>EXC</span>
      </div>

      <nav class="sidebar-nav">
        @for (item of filteredMenuItems; track item.label) {
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

        @if (filteredMenuItems.length === 0) {
          <p class="empty-state">No menu match</p>
        }
      </nav>
    </div>
  `,
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent {
  @Input() searchTerm = '';
  @Input() isOpen = true;
  @Output() menuItemClick = new EventEmitter<void>();

  menuItems = menuConfig.some((item) => item.label === 'User Profile')
    ? menuConfig
    : [
        ...menuConfig,
        { label: 'User Profile', route: '/dashboard/profile', icon: 'bi bi-person-circle' },
      ];

  get filteredMenuItems() {
    const term = this.searchTerm.trim().toLowerCase();

    return this.menuItems
      .filter((item) => !item.permission || this.hasPermission(item.permission))
      .filter((item) => !term || item.label.toLowerCase().includes(term));
  }

  constructor(public authService: AuthService) {}

  onMenuItemClick(): void {
    this.menuItemClick.emit();
  }

  hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }

  hasRole(role: string): boolean {
    return this.authService.hasRole(role);
  }
}
