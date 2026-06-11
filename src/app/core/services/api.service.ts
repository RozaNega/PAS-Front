import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams, HttpEvent } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiResponseModel } from '../models/api-response.model';
import { resolveApiBaseUrl } from '../config/api-base';

export interface PasSuccessResponse<T = unknown> {
  success: true;
  message: string | null;
  data: T;
  statusCode?: number;
}

export interface PasErrorResponse {
  success: false;
  message: string | null;
  errors?: string | string[] | Record<string, string[]>;
  statusCode?: number;
}

export type PasResponse<T = unknown> = PasSuccessResponse<T> | PasErrorResponse;

function toApiResponse<T>(res: PasResponse<T>): ApiResponseModel<T> {
  const r = res as unknown as Record<string, unknown>;
  const success = r['success'] ?? r['Success'];
  const message = (r['message'] ?? r['Message'] ?? r['title'] ?? r['Title']) as string | undefined;
  const statusCode = (r['statusCode'] ?? r['StatusCode']) as number | undefined;
  const data = r['data'] ?? r['Data'];
  const errors = r['errors'] ?? r['Errors'];

  if (success === true) {
    return {
      success: true,
      message: message ?? '',
      data: data as T,
      statusCode: statusCode ?? 200,
    };
  }
  if (success === false) {
    let errorMsg = message ?? '';
    if (!errorMsg && errors) {
      errorMsg = Array.isArray(errors) ? errors.join('; ') : typeof errors === 'string' ? errors : Object.values(errors).flat().join('; ');
    }
    return {
      success: false,
      message: errorMsg,
      data: undefined as unknown as T,
      statusCode: statusCode ?? 500,
    };
  }
  return {
    success: false,
    message: 'Unrecognized response format from server',
    data: undefined as unknown as T,
    statusCode: 500,
  };
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = resolveApiBaseUrl();
  }

  private buildUrl(path: string): string {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${normalized}`;
  }

  get<T>(path: string, params?: HttpParams | Record<string, unknown>): Observable<ApiResponseModel<T>> {
    const url = this.buildUrl(path);
    return this.http.get<PasResponse<T>>(url, { params: params as Record<string, string | number | boolean | readonly (string | number | boolean)[]> | HttpParams | undefined }).pipe(
      map(res => toApiResponse<T>(res)),
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }

  getBlob(path: string, params?: HttpParams | Record<string, unknown>): Observable<Blob> {
    const url = this.buildUrl(path);
    return this.http.get(url, { params: params as Record<string, string | number | boolean | readonly (string | number | boolean)[]> | HttpParams | undefined, responseType: 'blob' }).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }

  post<T>(path: string, body?: unknown): Observable<ApiResponseModel<T>> {
    const url = this.buildUrl(path);
    console.log('[ApiService] POST', url, 'body:', JSON.stringify(body));
    return this.http.post<PasResponse<T>>(url, body ?? {}).pipe(
      map(res => {
        console.log('[ApiService] POST raw response:', JSON.stringify(res));
        return toApiResponse<T>(res);
      }),
      catchError((err: HttpErrorResponse) => {
        console.error('[ApiService] POST error:', err.status, err.statusText, err.message);
        try {
          console.error('[ApiService] POST error body:', JSON.stringify(err.error));
        } catch { /* non-JSON */ }
        return throwError(() => err);
      })
    );
  }

  put<T>(path: string, body?: unknown): Observable<ApiResponseModel<T>> {
    const url = this.buildUrl(path);
    return this.http.put<PasResponse<T>>(url, body ?? {}).pipe(
      map(res => toApiResponse<T>(res)),
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }

  delete<T>(path: string): Observable<ApiResponseModel<T>> {
    const url = this.buildUrl(path);
    return this.http.delete<PasResponse<T>>(url).pipe(
      map(res => toApiResponse<T>(res)),
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }

  deleteProfilePhoto(id: string): Observable<ApiResponseModel<void>> {
    return this.delete<void>(`User/delete-profile-photo/${id}`);
  }

  uploadProfilePhoto(userId: string, file: File): Observable<ApiResponseModel<{ photoUrl: string }>> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    const url = this.buildUrl(`/User/upload-profile-photo/${userId}`);
    return this.http.post<PasResponse<{ photoUrl: string }>>(url, formData).pipe(
      map(res => toApiResponse<{ photoUrl: string }>(res)),
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }

  request<T>(method: string, path: string, body?: unknown, options?: {
    params?: HttpParams | Record<string, unknown>;
    reportProgress?: boolean;
    responseType?: 'json' | 'blob' | 'text';
  }): Observable<HttpEvent<T>> {
    const url = this.buildUrl(path);
    return this.http.request(method, url, {
      body,
      params: options?.params as HttpParams | undefined,
      reportProgress: options?.reportProgress,
    }) as Observable<HttpEvent<T>>;
  }
}
