import { environment } from '../../../environments/environment';

/** Browser override when `/api` proxy is unavailable (e.g. API on another host). */
export const PAS_API_URL_STORAGE_KEY = 'pas.apiUrl';

/**
 * Base URL for REST calls (no trailing slash). Default `/api` works with `ng serve` proxy
 * and with the Node SSR `/api` forwarder in `server.ts`.
 */
export function resolveApiBaseUrl(): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const v = window.localStorage.getItem(PAS_API_URL_STORAGE_KEY)?.trim();
      if (v) {
        return v.replace(/\/+$/, '');
      }
    }
  } catch {
    /* private mode or no localStorage */
  }
  return (environment.apiUrl || '/api').replace(/\/+$/, '');
}

export function pasApiUrlHint(): string {
  return `If the API is not reachable, set the base URL then reload: localStorage.setItem('${PAS_API_URL_STORAGE_KEY}', 'http://localhost:5028/api')`;
}
