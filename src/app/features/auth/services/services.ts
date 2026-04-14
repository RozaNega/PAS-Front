import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthApi } from './auth-api';

interface ServiceStep {
  title: string;
  description: string;
}

@Component({
  selector: 'app-services',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './services.html',
  styleUrl: './services.css',
})
export class Services {
  protected readonly authApi = inject(AuthApi);

  protected readonly serviceSteps: readonly ServiceStep[] = [
    {
      title: 'Login',
      description: 'Checks the stored credentials, creates a session, and persists it locally.',
    },
    {
      title: 'Register',
      description:
        'Adds a new local profile and makes it available to the login screen immediately.',
    },
    {
      title: 'Forgot password',
      description:
        'Generates a reset token that can be passed to the reset form through the route.',
    },
    {
      title: 'Reset password',
      description: 'Validates the token and updates the saved password for the matching account.',
    },
  ];

  protected readonly currentSession = this.authApi.session;

  protected signOut(): void {
    this.authApi.logout();
  }
}
