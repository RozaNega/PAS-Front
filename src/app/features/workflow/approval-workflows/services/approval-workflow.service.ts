import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../../../core/services/api.service';
import { ApiResponseModel } from '../../../../core/models/api-response.model';

export interface CreateWorkflowRequest {
  workflowName: string;  // Changed from 'name' to 'workflowName' to match backend
  description: string;
}

export interface WorkflowResponse {
  id: string;
  workflowName: string;  // Changed from 'name' to match backend
  description: string;
  createdAt: string;
  createdBy: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApprovalWorkflowService {
  private readonly apiService = inject(ApiService);
  private workflowEndpoint: string | null = null;

  createWorkflow(request: CreateWorkflowRequest): Observable<{ succeeded: boolean; message: string; data?: WorkflowResponse }> {
    // If we already found the working endpoint, use it
    if (this.workflowEndpoint) {
      return this.tryCreateWorkflow(this.workflowEndpoint, request);
    }

    // Try different endpoint patterns
    const endpoints = ['Workflows', 'Workflow', 'ApprovalWorkflows', 'ApprovalWorkflow'];
    
    return this.tryEndpoints(endpoints, request, 0);
  }

  private tryEndpoints(endpoints: string[], request: CreateWorkflowRequest, index: number): Observable<{ succeeded: boolean; message: string; data?: WorkflowResponse }> {
    if (index >= endpoints.length) {
      return of({
        succeeded: false,
        message: 'Workflow endpoint not found. Tried: ' + endpoints.join(', ') + '. Please check your backend Swagger documentation.'
      });
    }

    const endpoint = endpoints[index];
    console.log(`🔄 Trying endpoint [${index + 1}/${endpoints.length}]: ${endpoint}`);

    return this.tryCreateWorkflow(endpoint, request).pipe(
      map((response) => {
        if (response.succeeded) {
          this.workflowEndpoint = endpoint; // Cache the working endpoint
          console.log(`✅ Found working endpoint: ${endpoint}`);
        }
        return response;
      }),
      catchError((error) => {
        if (error.status === 404) {
          console.log(`❌ ${endpoint} returned 404, trying next...`);
          return this.tryEndpoints(endpoints, request, index + 1);
        }
        // For other errors (400, 500, etc.), don't try other endpoints
        return throwError(() => error);
      })
    );
  }

  private tryCreateWorkflow(endpoint: string, request: CreateWorkflowRequest): Observable<{ succeeded: boolean; message: string; data?: WorkflowResponse }> {
    return this.apiService.post<WorkflowResponse>(endpoint, request).pipe(
      map((response) => ({
        succeeded: response.success,
        message: response.message || (response.success ? 'Workflow created successfully' : 'Failed to create workflow'),
        data: 'data' in response ? response.data : undefined
      }))
    );
  }

  getAllWorkflows(): Observable<{ succeeded: boolean; data: WorkflowResponse[] }> {
    const endpoint = this.workflowEndpoint || 'Workflows';
    return this.apiService.get<WorkflowResponse[]>(endpoint).pipe(
      map((response) => ({
        succeeded: response.success,
        data: 'data' in response ? (response.data || []) : []
      }))
    );
  }

  getWorkflowById(id: string): Observable<{ succeeded: boolean; data?: WorkflowResponse }> {
    const endpoint = this.workflowEndpoint || 'Workflows';
    return this.apiService.get<WorkflowResponse>(`${endpoint}/${id}`).pipe(
      map((response) => ({
        succeeded: response.success,
        data: 'data' in response ? response.data : undefined
      }))
    );
  }

  updateWorkflow(id: string, request: CreateWorkflowRequest): Observable<{ succeeded: boolean; message: string }> {
    const endpoint = this.workflowEndpoint || 'Workflows';
    return this.apiService.put<any>(`${endpoint}/${id}`, request).pipe(
      map((response) => ({
        succeeded: response.success,
        message: response.message || (response.success ? 'Workflow updated successfully' : 'Failed to update workflow')
      }))
    );
  }

  deleteWorkflow(id: string): Observable<{ succeeded: boolean; message: string }> {
    const endpoint = this.workflowEndpoint || 'Workflows';
    return this.apiService.delete<any>(`${endpoint}/${id}`).pipe(
      map((response) => ({
        succeeded: response.success,
        message: response.message || (response.success ? 'Workflow deleted successfully' : 'Failed to delete workflow')
      }))
    );
  }
}
