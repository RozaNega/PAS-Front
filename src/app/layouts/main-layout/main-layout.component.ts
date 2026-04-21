import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SignalRService } from '../../core/services/signalr.service';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { LayoutShellService } from '../layout-shell.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, SidebarComponent, FooterComponent],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent implements OnInit {
  private readonly signalRService = inject(SignalRService);
  protected readonly layoutShellService = inject(LayoutShellService);

  protected sidebarSearchTerm = '';

  ngOnInit(): void {
    this.signalRService.startConnection();
    this.layoutShellService.initialize();
  }

  protected updateSearchTerm(term: string): void {
    this.sidebarSearchTerm = term;
  }

  protected onSidebarItemClick(): void {
    this.layoutShellService.closeMenu();
  }

  protected closeSidebar(): void {
    this.layoutShellService.closeMenu();
  }
}
