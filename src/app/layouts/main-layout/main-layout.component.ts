import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SignalRService } from '../../core/services/signalr.service';
import { SharedModule } from '../../shared/shared.module';
import { filter } from 'rxjs';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterModule, SharedModule],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent implements OnInit {
  isSidebarCollapsed = false;
  sidebarSearchTerm = '';
  user: any;
  showListBackButton = false;

  constructor(
    private authService: AuthService,
    private signalRService: SignalRService,
    private router: Router,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    this.signalRService.startConnection();
    this.isSidebarCollapsed = false;
    this.updateListBackButton(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.updateListBackButton(event.urlAfterRedirects));
  }

  goBackFromList(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigateByUrl('/dashboard');
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = false;
  }

  updateSearchTerm(term: string): void {
    this.sidebarSearchTerm = term;
  }

  onSidebarItemClick(): void {
    this.isSidebarCollapsed = false;
  }

  closeSidebar(): void {
    this.isSidebarCollapsed = false;
  }

  logout(): void {
    this.authService.logout();
  }

  private updateListBackButton(url: string): void {
    const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
    this.showListBackButton = cleanUrl.includes('/list');
  }
}


