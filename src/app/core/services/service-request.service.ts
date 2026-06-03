import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService, PasResponse } from './api.service';
import { RequisitionsService } from './requisitions.service';

export interface ServiceRequest {
  id: number;
  requestNumber: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  requester: string;
  requesterId: string;
  department: string;
  submittedDate: string;
  approvedDate?: string;
  approvedBy?: string;
  amount?: number;
  comments?: string;
  approvalStages?: any[];
  items?: any[];
}

export interface ServiceRequestApiResponse {
  success: boolean;
  message: string;
  data: ServiceRequest[] | ServiceRequest | null;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ServiceRequestService {
  private baseUrl = '/api';

  constructor(
    private http: HttpClient,
    private api: ApiService,
  ) {}

  getRequests(pageNumber: number = 1, pageSize: number = 10): Observable<PasResponse<PaginatedResponse<ServiceRequest>>> {
    return this.api.get<PaginatedResponse<ServiceRequest>>(`/ServiceRequest?pageNumber=${pageNumber}&pageSize=${pageSize}`);
  }

  getRequest(id: number): Observable<ServiceRequestApiResponse> {
    return this.http.get<ServiceRequestApiResponse>(`${this.baseUrl}/ServiceRequest/${id}`);
  }

  createRequest(request: Partial<ServiceRequest>): Observable<ServiceRequestApiResponse> {
    return this.http.post<ServiceRequestApiResponse>(`${this.baseUrl}/ServiceRequest`, request);
  }

  updateRequest(id: number, request: Partial<ServiceRequest>): Observable<ServiceRequestApiResponse> {
    return this.http.put<ServiceRequestApiResponse>(`${this.baseUrl}/ServiceRequest/${id}`, request);
  }

  deleteRequest(id: number): Observable<ServiceRequestApiResponse> {
    return this.http.delete<ServiceRequestApiResponse>(`${this.baseUrl}/ServiceRequest/${id}`);
  }

  approveRequest(id: number): Observable<ServiceRequestApiResponse> {
    return this.http.post<ServiceRequestApiResponse>(`${this.baseUrl}/ServiceRequest/${id}/approve`, {});
  }

  rejectRequest(id: number): Observable<ServiceRequestApiResponse> {
    return this.http.post<ServiceRequestApiResponse>(`${this.baseUrl}/ServiceRequest/${id}/reject`, {});
  }

  getPendingRequests(): Observable<ServiceRequestApiResponse> {
    return this.http.get<ServiceRequestApiResponse>(`${this.baseUrl}/ServiceRequest/pending`);
  }

  getApprovedRequests(): Observable<ServiceRequestApiResponse> {
    return this.http.get<ServiceRequestApiResponse>(`${this.baseUrl}/ServiceRequest/approved`);
  }

  getRejectedRequests(): Observable<ServiceRequestApiResponse> {
    return this.http.get<ServiceRequestApiResponse>(`${this.baseUrl}/ServiceRequest/rejected`);
  }

  searchRequests(searchTerm: string): Observable<ServiceRequest[]> {
    let params = new HttpParams().set('searchTerm', searchTerm);
    return this.http.get<ServiceRequestApiResponse>(`${this.baseUrl}/ServiceRequest`, { params }).pipe(
      map(response => {
        if (response.success && response.data) {
          return Array.isArray(response.data) ? response.data : [];
        }
        return [];
      })
    );
  }
}
