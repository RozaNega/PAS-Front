import { environment } from '../../../environments/environment';

export function resolveApiBaseUrl(): string {
  return (environment.apiUrl || '/api').replace(/\/+$/, '');
}

export function pasApiUrlHint(): string {
  return `If the API is not reachable, set the base URL then reload: localStorage.setItem('${PAS_API_URL_STORAGE_KEY}', 'http://localhost:5028/api')`;
}

