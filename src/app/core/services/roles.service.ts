import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions?: string[];
  isActive?: boolean;
}

export interface RolesApiResponse {
  success: boolean;
  message: string;
  data: Role[] | Role | null;
  statusCode: number;
}

@Injectable({
  providedIn: 'root'
})
export class RolesService {
  private baseUrl = '/api/Roles';

  constructor(private http: HttpClient) {}

  getRoles(): Observable<RolesApiResponse> {
    return this.http.get<RolesApiResponse>(this.baseUrl);
  }

  getRole(id: string): Observable<RolesApiResponse> {
    return this.http.get<RolesApiResponse>(`${this.baseUrl}/${id}`);
  }

  createRole(role: Partial<Role>): Observable<RolesApiResponse> {
    return this.http.post<RolesApiResponse>(this.baseUrl, role);
  }

  updateRole(id: string, role: Partial<Role>): Observable<RolesApiResponse> {
    return this.http.put<RolesApiResponse>(`${this.baseUrl}/${id}`, role);
  }

  deleteRole(id: string): Observable<RolesApiResponse> {
    return this.http.delete<RolesApiResponse>(`${this.baseUrl}/${id}`);
  }
}
