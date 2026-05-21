import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { resolveApiBaseUrl } from '../config/api-base';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  private base(): string {
    return resolveApiBaseUrl();
  }

  get<T>(endpoint: string, params?: any, options?: any): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<T>(`${this.base()}/${endpoint}`, {
      params: httpParams,
      ...(options || {}),
    }) as unknown as Observable<T>;
  }

  post<T>(endpoint: string, data: any): Observable<T> {
    return this.http.post<T>(`${this.base()}/${endpoint}`, data);
  }

  put<T>(endpoint: string, data: any): Observable<T> {
    return this.http.put<T>(`${this.base()}/${endpoint}`, data);
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.base()}/${endpoint}`);
  }

  patch<T>(endpoint: string, data: any): Observable<T> {
    return this.http.patch<T>(`${this.base()}/${endpoint}`, data);
  }

  uploadFile<T>(endpoint: string, file: File): Observable<T> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<T>(`${this.base()}/${endpoint}`, formData);
  }

  uploadProfilePhoto<T>(userId: string, file: File): Observable<T> {
    const formData = new FormData();
    formData.append('photo', file, file.name);
    return this.http.post<T>(`${this.base()}/Users/${userId}/upload-photo`, formData);
  }

  deleteProfilePhoto<T>(userId: string): Observable<T> {
    return this.http.delete<T>(`${this.base()}/Users/${userId}/photo`);
  }
}


