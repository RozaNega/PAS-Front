import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.html',
  styleUrl: './profile.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile {
  private readonly authService = inject(AuthService);

  get profileName(): string {
    const user = this.authService.getCurrentUser();
    return user?.fullName || user?.username || 'User';
  }

  get profileEmail(): string {
    const user = this.authService.getCurrentUser();
    return user?.email || 'No email available';
  }

  get profileRoles(): string {
    const user = this.authService.getCurrentUser();
    return user?.roles?.length ? user.roles.join(', ') : 'No roles assigned';
  }
}
