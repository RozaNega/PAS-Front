import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams, HttpEvent } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiResponse } from '../../types/api-response.type';

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

function toApiResponse<T>(res: PasResponse<T>): ApiResponse<T> {
  const r = res as unknown as Record<string, unknown>;
  const success = r['success'];
  if (success === true) {
    return {
      success: true,
      message: (r['message'] as string) ?? '',
      data: r['data'] as T,
      statusCode: (r['statusCode'] as number) ?? 200,
    };
  }
  if (success === false) {
    return {
      success: false,
      message: (r['message'] as string) ?? (r['title'] as string) ?? '',
      data: undefined as unknown as T,
      statusCode: (r['statusCode'] as number) ?? 500,
    };
  }
  return {
    success: true,
    message: '',
    data: res as unknown as T,
    statusCode: 200,
  };
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = '/api';
  }

  private buildUrl(path: string): string {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${normalized}`;
  }

  get<T>(path: string, params?: HttpParams | Record<string, unknown>): Observable<ApiResponse<T>> {
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

  post<T>(path: string, body?: unknown): Observable<ApiResponse<T>> {
    const url = this.buildUrl(path);
    return this.http.post<PasResponse<T>>(url, body ?? {}).pipe(
      map(res => toApiResponse<T>(res)),
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }

  put<T>(path: string, body?: unknown): Observable<ApiResponse<T>> {
    const url = this.buildUrl(path);
    return this.http.put<PasResponse<T>>(url, body ?? {}).pipe(
      map(res => toApiResponse<T>(res)),
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }

  delete<T>(path: string): Observable<ApiResponse<T>> {
    const url = this.buildUrl(path);
    return this.http.delete<PasResponse<T>>(url).pipe(
      map(res => toApiResponse<T>(res)),
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }

  deleteProfilePhoto(id: string): Observable<ApiResponse<void>> {
    return this.delete<void>(`User/delete-profile-photo/${id}`);
  }

  uploadProfilePhoto(userId: string, file: File): Observable<ApiResponse<{ photoUrl: string }>> {
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
