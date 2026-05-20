import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  get<T>(endpoint: string, params?: any, options?: any): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<T>(`${this.baseUrl}/${endpoint}`, {
      params: httpParams,
      ...(options || {}),
    }) as unknown as Observable<T>;
  }

  post<T>(endpoint: string, data: any): Observable<T> {
    const fullUrl = `${this.baseUrl}/${endpoint}`;
    console.log('📤 [ApiService POST]', {
      endpoint,
      baseUrl: this.baseUrl,
      fullUrl,
      data: { ...data, password: data.password ? '[HIDDEN]' : undefined },
      timestamp: new Date().toISOString()
    });
    
    return this.http.post<T>(fullUrl, data).pipe(
      tap((response) => {
        console.log('✅ [ApiService POST] Success response:', {
          endpoint,
          responseType: typeof response,
          hasData: !!(response as any)?.data,
          success: (response as any)?.success
        });
      }),
      catchError((error) => {
        console.error('❌ [ApiService POST] Error:', {
          endpoint,
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: error.url
        });
        throw error;
      })
    );
  }

  put<T>(endpoint: string, data: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${endpoint}`, data);
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}/${endpoint}`);
  }

  patch<T>(endpoint: string, data: any): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}/${endpoint}`, data);
  }

  uploadFile<T>(endpoint: string, file: File): Observable<T> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<T>(`${this.baseUrl}/${endpoint}`, formData);
  }

  uploadProfilePhoto<T>(userId: string, file: File): Observable<T> {
    const formData = new FormData();
    // Matching the key 'Photo' found in UsersService
    formData.append('Photo', file, file.name);
    // Using the 'Auth' controller endpoint for profile photos
    return this.http.post<T>(`${this.baseUrl}/Auth/upload-profile-photo`, formData);
  }

  deleteProfilePhoto<T>(userId: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}/Users/${userId}/photo`);
  }
}


