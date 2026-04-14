import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { SignalRService } from '../../core/services/signalr.service';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent implements OnInit {
  isSidebarCollapsed = false;
  user: any;

  constructor(
    private authService: AuthService,
    private signalRService: SignalRService
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    this.signalRService.startConnection();
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  logout(): void {
    this.authService.logout();
  }
}


