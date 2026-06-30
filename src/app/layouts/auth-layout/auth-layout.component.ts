import { AfterViewInit, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthThemeService } from '../../features/auth/services/auth-theme.service';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './auth-layout.component.html',
  styleUrls: ['./auth-layout.component.scss'],
})
export class AuthLayoutComponent implements AfterViewInit {
  protected readonly theme = inject(AuthThemeService);

  ngAfterViewInit(): void {
    this.theme.applyTheme();
  }

  protected toggleDarkMode(): void {
    this.theme.toggleDarkMode();
  }

  protected toggleThemePanel(): void {
    this.themePanelOpen = !this.themePanelOpen;
  }

  protected closeThemePanel(): void {
    this.themePanelOpen = false;
  }

  protected setPrimary(optionId: string): void {
    this.theme.setPrimary(optionId);
    this.themePanelOpen = false;
  }

  protected themePanelOpen = false;
}
