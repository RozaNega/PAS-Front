import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../../config/api.config';
import { ApiResponse, PaginatedResult } from '../../../../types/api-response.type';
import {
  ServiceRequest,
  ServiceRequestDetail,
  CreateServiceRequestRequest,
  ApproveServiceRequestRequest,
  RejectServiceRequestRequest,
  IssueServiceRequestRequest,
  ServiceRequestTimeline,
  ServiceRequestActivity,
  CancelServiceRequestRequest,
} from '../models/service-request.model';

@Injectable({
  providedIn: 'root',
})
export class ServiceRequestService {
  constructor(private apiService: ApiService) {}

  getServiceRequests(
    params?: any,
    options?: any,
  ): Observable<ApiResponse<PaginatedResult<ServiceRequest>>> {
    return this.apiService.get<ApiResponse<PaginatedResult<ServiceRequest>>>(
      API_ENDPOINTS.SERVICE_REQUESTS.GET_ALL,
      params,
      options,
    );
  }

  getServiceRequestById(id: string): Observable<ApiResponse<ServiceRequestDetail>> {
    return this.apiService.get<ApiResponse<ServiceRequestDetail>>(
      API_ENDPOINTS.SERVICE_REQUESTS.GET_BY_ID(id),
    );
  }

  createServiceRequest(request: CreateServiceRequestRequest): Observable<ApiResponse<string>> {
    return this.apiService.post<ApiResponse<string>>(
      API_ENDPOINTS.SERVICE_REQUESTS.CREATE,
      request,
    );
  }

  approveServiceRequest(request: ApproveServiceRequestRequest): Observable<ApiResponse<object>> {
    return this.apiService.post<ApiResponse<object>>(
      API_ENDPOINTS.SERVICE_REQUESTS.APPROVE(request.id),
      request,
    );
  }

  rejectServiceRequest(request: RejectServiceRequestRequest): Observable<ApiResponse<object>> {
    return this.apiService.post<ApiResponse<object>>(
      API_ENDPOINTS.SERVICE_REQUESTS.REJECT(request.id),
      request,
    );
  }

  issueServiceRequest(request: IssueServiceRequestRequest): Observable<ApiResponse<string>> {
    return this.apiService.post<ApiResponse<string>>(
      API_ENDPOINTS.SERVICE_REQUESTS.ISSUE(request.id),
      request,
    );
  }

  deleteServiceRequest(id: string): Observable<ApiResponse<object>> {
    return this.apiService.delete<ApiResponse<object>>(API_ENDPOINTS.SERVICE_REQUESTS.DELETE(id));
  }

  getServiceRequestTimeline(id: string): Observable<ApiResponse<ServiceRequestTimeline>> {
    return this.apiService.get<ApiResponse<ServiceRequestTimeline>>(
      API_ENDPOINTS.SERVICE_REQUESTS.TIMELINE(id),
    );
  }

  getServiceRequestActivity(id: string): Observable<ApiResponse<ServiceRequestActivity[]>> {
    return this.apiService.get<ApiResponse<ServiceRequestActivity[]>>(
      `ServiceRequests/${id}/activity`,
    );
  }

  cancelServiceRequest(request: CancelServiceRequestRequest): Observable<ApiResponse<object>> {
    return this.apiService.post<ApiResponse<object>>(
      API_ENDPOINTS.SERVICE_REQUESTS.CANCEL(request.id),
      request,
    );
  }

  addServiceRequestComment(id: string, comment: string): Observable<ApiResponse<object>> {
    return this.apiService.post<ApiResponse<object>>(`ServiceRequests/${id}/comments`, { comment });
  }
}
