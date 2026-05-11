import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface ApproverDto {
  id: string;
  workflowId: string;
  userId: string;
  userName?: string;
  sequence: number;
}

export interface AssignApproverCommand {
  workflowId: string;
  userId: string;
  sequence: number;
}

@Injectable({ providedIn: 'root' })
export class ApproversService {
  constructor(private apiService: ApiService) {}

  getByWorkflow(workflowId: string): Observable<ApiResponseModel<ApproverDto[]>> {
    return this.apiService.get<ApiResponseModel<ApproverDto[]>>(`Approvers/by-workflow/${workflowId}`);
  }

  assign(data: AssignApproverCommand): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('Approvers/assign', data);
  }

  delete(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<ApiResponseModel<any>>(`Approvers/${id}`);
  }
}
