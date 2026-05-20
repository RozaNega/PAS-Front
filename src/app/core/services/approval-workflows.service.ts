import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface ApprovalWorkflowDto {
  id: string;
  workflowName?: string;
  description?: string;
  approversCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ApprovalWorkflowDetailDto extends ApprovalWorkflowDto {
  approvers: WorkflowApproverDto[];
}

export interface WorkflowApproverDto {
  id: string;
  userId: string;
  userName?: string;
  approvalLevel: number;
  assignedAt: string;
}

export interface CreateWorkflowCommand {
  workflowName: string;
  description?: string;
}

export interface UpdateWorkflowCommand {
  id: string;
  workflowName?: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class ApprovalWorkflowsService {
  constructor(private apiService: ApiService) {}

  getAll(params?: { searchTerm?: string }): Observable<ApiResponseModel<ApprovalWorkflowDto[]>> {
    return this.apiService.get<ApiResponseModel<ApprovalWorkflowDto[]>>('ApprovalWorkflows', params);
  }

  getById(id: string): Observable<ApiResponseModel<ApprovalWorkflowDetailDto>> {
    return this.apiService.get<ApiResponseModel<ApprovalWorkflowDetailDto>>(`ApprovalWorkflows/${id}`);
  }

  create(data: CreateWorkflowCommand): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('ApprovalWorkflows', data);
  }

  update(data: UpdateWorkflowCommand): Observable<ApiResponseModel<any>> {
    return this.apiService.put<ApiResponseModel<any>>(`ApprovalWorkflows/${data.id}`, data);
  }

  delete(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<ApiResponseModel<any>>(`ApprovalWorkflows/${id}`);
  }
}
