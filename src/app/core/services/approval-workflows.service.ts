import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface ApprovalWorkflowDto {
  id: string;
  name: string;
  description?: string;
  entityType: string;
  isActive: boolean;
}

export interface CreateWorkflowCommand {
  name: string;
  description?: string;
  entityType: string;
}

export interface UpdateWorkflowCommand {
  id: string;
  name?: string;
  description?: string;
  entityType?: string;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ApprovalWorkflowsService {
  constructor(private apiService: ApiService) {}

  getAll(params?: any): Observable<ApiResponseModel<ApprovalWorkflowDto[]>> {
    return this.apiService.get<ApiResponseModel<ApprovalWorkflowDto[]>>('ApprovalWorkflows', params);
  }

  getById(id: string): Observable<ApiResponseModel<ApprovalWorkflowDto>> {
    return this.apiService.get<ApiResponseModel<ApprovalWorkflowDto>>(`ApprovalWorkflows/${id}`);
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
