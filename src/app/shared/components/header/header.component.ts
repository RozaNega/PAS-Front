import { Component, Output, EventEmitter } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { SignalRService } from '../../../core/services/signalr.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  showUserMenu = false;

  constructor(
    public authService: AuthService,
    public signalRService: SignalRService
  ) {}

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  logout(): void {
    this.authService.logout();
  }
}


