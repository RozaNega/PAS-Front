import { Component, EventEmitter, Output } from '@angular/core';
import { Location } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SignalRService } from '../../../core/services/signalr.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() searchChange = new EventEmitter<string>();
  showUserMenu = false;
  canGoBack = false;

  constructor(
    public authService: AuthService,
    public signalRService: SignalRService,
    private router: Router,
    private location: Location
  ) {
    this.updateBackButtonState(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.updateBackButtonState(event.urlAfterRedirects));
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchChange.emit(target.value);
  }

  get displayName(): string {
    const user = this.authService.getCurrentUser();
    return user?.fullName || user?.username || 'User';
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigateByUrl('/dashboard');
  }

  private updateBackButtonState(url: string): void {
    this.canGoBack = this.shouldShowBackButton(url);
  }

  private shouldShowBackButton(url: string): boolean {
    const cleanUrl = url.split('?')[0].split('#')[0];

    if (cleanUrl === '/' || cleanUrl === '/dashboard') {
      return false;
    }

    if (cleanUrl.startsWith('/auth')) {
      return false;
    }

    return true;
  }

  logout(): void {
    this.authService.logout();
  }
}
