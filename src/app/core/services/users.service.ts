import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface User {
  id: number;
  userId: string;
  username: string;
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  role: string;
  roles: string[];
  isActive: boolean;
  phoneNumber?: string;
  profilePhotoUrl?: string;
  lastLogin?: string;
  employeeName?: string;
  employeeCode?: string;
  roleName?: string;
  roleId?: string;
}

export interface UserPaginatedResponse {
  items: User[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface UserApiResponse {
  success: boolean;
  message: string;
  data: UserPaginatedResponse | User | null;
  statusCode: number;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private baseUrl = '/api/users';

  constructor(private http: HttpClient) {}

  getAll(params?: { searchTerm?: string }): Observable<UserApiResponse> {
    return this.getUsers(1, 1000);
  }

  getById(id: string | number): Observable<UserApiResponse> {
    return this.http.get<UserApiResponse>(`${this.baseUrl}/${id}`);
  }

  activate(id: number): Observable<UserApiResponse> {
    return this.toggleUserStatus(id);
  }

  getUsers(pageNumber: number = 1, pageSize: number = 10): Observable<UserApiResponse> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<UserApiResponse>(this.baseUrl, { params });
  }

  getUser(id: number): Observable<UserApiResponse> {
    return this.http.get<UserApiResponse>(`${this.baseUrl}/${id}`);
  }

  createUser(user: Partial<User>): Observable<UserApiResponse> {
    return this.http.post<UserApiResponse>(this.baseUrl, user);
  }

  updateUser(id: number, user: Partial<User>): Observable<UserApiResponse> {
    return this.http.put<UserApiResponse>(`${this.baseUrl}/${id}`, user);
  }

  deleteUser(id: number): Observable<UserApiResponse> {
    return this.http.delete<UserApiResponse>(`${this.baseUrl}/${id}`);
  }

  toggleUserStatus(id: number): Observable<UserApiResponse> {
    return this.http.patch<UserApiResponse>(`${this.baseUrl}/${id}/toggle-status`, {});
  }

  /**
   * Send a password-reset email to a user.
   * Uses the existing /api/Auth/forgot-password endpoint which generates a
   * reset token and emails it. In dev, the token is returned in the response
   * and shown in the API logs.
   */
  resetUserPassword(payload: { email: string; userId?: string | number; username?: string }): Observable<UserApiResponse> {
    return this.http.post<UserApiResponse>('/api/Auth/forgot-password', { email: payload.email });
  }

  uploadProfilePhoto(userId: string, file: File): Observable<UserApiResponse> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<UserApiResponse>(`${this.baseUrl}/${userId}/photo`, formData);
  }
}
