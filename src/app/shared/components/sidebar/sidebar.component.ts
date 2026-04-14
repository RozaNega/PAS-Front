import { Component, Input } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { menuConfig } from '../../../config/menu.config';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  @Input() collapsed = false;
  menuItems = menuConfig;

  constructor(public authService: AuthService) {}

  hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }

  hasRole(role: string): boolean {
    return this.authService.hasRole(role);
  }
}


