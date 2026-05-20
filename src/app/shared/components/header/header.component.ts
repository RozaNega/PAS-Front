import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Output,
  inject,
  signal,
} from '@angular/core';
import { Location } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { LayoutShellService } from '../../../layouts/layout-shell.service';
import { CurrentUserService } from '../../../core/services/current-user.service';

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);
  private readonly layoutShellService = inject(LayoutShellService);
  private readonly currentUserService = inject(CurrentUserService);
  
  @Output() searchChange = new EventEmitter<string>();
  public isBackVisible = signal(false);
  public profileImageUrl = signal<string | null>(null);

  constructor() {
    this.currentUserService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(user => {
        this.profileImageUrl.set(this.currentUserService.getDisplayUrl(user?.profileImageUrl || user?.photoUrl));
      });
    this.updateBackButtonState(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.updateBackButtonState(event.urlAfterRedirects));
  }

  protected onToggleSidebar(): void {
    this.layoutShellService.onMenuToggle();
  }

  protected onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchChange.emit(target.value);
  }

  protected get displayName(): string {
    const user = this.authService.getCurrentUser();
    return user?.fullName || user?.username || 'User';
  }

  protected goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigateByUrl('/dashboard');
  }

  private updateBackButtonState(url: string): void {
    this.isBackVisible.set(this.shouldShowBackButton(url));
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

  protected logout(): void {
    this.authService.logout();
  }
}
