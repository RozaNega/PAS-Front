import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface ApproverDto {
  id: string;
  workflowId: string;
  workflowName?: string;
  userId: string;
  userName?: string;
  approvalLevel: number;
  createdAt: string;
}

export interface AssignApproverCommand {
  workflowId: string;
  userId: string;
  approvalLevel: number;
}

@Injectable({ providedIn: 'root' })
export class ApproversService {
  constructor(private apiService: ApiService) {}

  getByWorkflow(workflowId: string): Observable<ApiResponseModel<ApproverDto[]>> {
    return this.apiService.get<ApproverDto[]>(`Approvers/by-workflow/${workflowId}`);
  }

  assign(data: AssignApproverCommand): Observable<ApiResponseModel<string>> {
    return this.apiService.post<string>('Approvers/assign', data);
  }

  remove(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<any>(`Approvers/${id}`);
  }
}
