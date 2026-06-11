import { environment } from '../../../environments/environment';

export function resolveApiBaseUrl(): string {
  return (environment.apiUrl || '/api').replace(/\/+$/, '');
}
