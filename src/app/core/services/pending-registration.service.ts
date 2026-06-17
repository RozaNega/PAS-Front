import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface PendingRegistration {
  id: string;
  username: string;
  fullName: string;
  email: string;
  roleName: string;
  department: string;
  employeeCode: string;
  phoneNumber?: string;
  submittedAt: string;
}

@Injectable({ providedIn: 'root' })
export class PendingRegistrationService {
  private countSubject = new BehaviorSubject<number>(0);
  readonly count$ = this.countSubject.asObservable();

  constructor(private apiService: ApiService) {}

  refreshCount(): void {
    this.getCount().subscribe({
      next: (res) => this.countSubject.next(res.data ?? 0),
    });
  }

  getAll(): Observable<ApiResponseModel<PendingRegistration[]>> {
    return this.apiService.get<PendingRegistration[]>('Auth/pending-registrations');
  }

  approve(id: string): Observable<ApiResponseModel<unknown>> {
    return this.apiService.post<unknown>(`Auth/pending-registrations/${id}/approve`);
  }

  reject(id: string): Observable<ApiResponseModel<unknown>> {
    return this.apiService.post<unknown>(`Auth/pending-registrations/${id}/reject`);
  }

  getCount(): Observable<ApiResponseModel<number>> {
    return this.apiService.get<number>('Auth/pending-registrations/count');
  }
}
