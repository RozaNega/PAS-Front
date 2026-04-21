import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthApi } from '../services/auth-api';

interface ModelCard {
  name: string;
  summary: string;
  fields: readonly string[];
}

@Component({
  selector: 'app-models',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './models.html',
  styleUrl: './models.css',
})
export class Models {
  protected readonly authApi = inject(AuthApi);

  protected readonly modelCards: readonly ModelCard[] = [
    {
      name: 'AuthUser',
      summary: 'Public user profile data shared with the UI and session state.',
      fields: ['id', 'displayName', 'email'],
    },
    {
      name: 'AuthSession',
      summary: 'The active signed-in state including the token and expiry time.',
      fields: ['user', 'token', 'expiresAt', 'rememberMe'],
    },
    {
      name: 'AuthResult',
      summary: 'The result returned by each auth workflow action.',
      fields: ['success', 'message', 'session?', 'resetToken?'],
    },
  ];

  protected readonly seedCards: readonly ModelCard[] = [
    {
      name: 'Demo account',
      summary: 'The service seeds a working account if no storage is present.',
      fields: ['demo@africom.local', 'Password123!'],
    },
    {
      name: 'Local persistence',
      summary: 'Users, sessions, and reset tokens are stored in browser storage.',
      fields: ['users', 'session', 'reset tokens'],
    },
  ];

  protected readonly currentUser = this.authApi.activeUser;
}

