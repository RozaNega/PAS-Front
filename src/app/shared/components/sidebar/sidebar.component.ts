import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { getMenuConfigForRole, MenuItem } from '../../../config/menu.config';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="sidebar" [class.closed]="!isOpen">
      <div class="sidebar-brand">
        <img src="/assets/images/africom-logo.svg" alt="AFRICOM logo" />
        <span>AFRICOM</span>
      </div>

      <nav class="sidebar-nav">
        @for (item of filteredMenuItems; track item.label) {
          <a
            [routerLink]="item.route"
            routerLinkActive="active"
            (click)="onMenuItemClick()"
            class="nav-link"
            [class.nav-link--dashboard]="item.label === 'Dashboard'"
            [class.nav-link--profile]="item.label === 'User Profile'"
            [class.nav-link--notifications]="item.label === 'Notifications'"
            [class.nav-link--requests]="item.label === 'My Requests'"
            [class.nav-link--summary]="item.label === 'My Requests Summary'"
            [class.nav-link--activity]="item.label === 'My Activity'"
            [class.nav-link--catalog]="item.label === 'Catalog Items'"
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

  menuItems: MenuItem[] = this.createMenuItems();

  get filteredMenuItems() {
    const term = this.searchTerm.trim().toLowerCase();

    return this.menuItems
      .filter((item: MenuItem) => !item.permission || this.hasPermission(item.permission))
      .filter((item: MenuItem) => !term || item.label.toLowerCase().includes(term));
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

  private createMenuItems(): MenuItem[] {
    const role = this.authService.mapUserToDashboardRole(this.authService.getCurrentUser());
    const menuItems = getMenuConfigForRole(role);

    if (role !== 'employee') {
      return menuItems;
    }

    return menuItems.some((item: MenuItem) => item.label === 'User Profile')
      ? menuItems
      : [
          ...menuItems,
          {
            label: 'User Profile',
            route: '/employee/dashboard/profile',
            icon: 'bi bi-person-circle',
          },
        ];
  }
}
