import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Employee {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  department: string;
  designation: string;
  dateOfBirth: string;
  dateOfJoining: string;
  employmentType: string;
  status: string;
  isActive: boolean;
  fullName?: string;
  employeeCode?: string;
  employeeName?: string;
}

export interface EmployeePaginatedResponse {
  items: Employee[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface EmployeeApiResponse {
  success: boolean;
  message: string;
  data: EmployeePaginatedResponse | Employee | null;
  statusCode: number;
}

@Injectable({
  providedIn: 'root'
})
export class EmployeesService {
  private baseUrl = '/api/employees';

  constructor(private http: HttpClient) {}

  getByUserId(userId: string): Observable<EmployeeApiResponse> {
    return this.http.get<EmployeeApiResponse>(`${this.baseUrl}/by-user/${userId}`);
  }

  getEmployees(pageNumber: number = 1, pageSize: number = 10): Observable<EmployeeApiResponse> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<EmployeeApiResponse>(this.baseUrl, { params });
  }

  getEmployee(id: number): Observable<EmployeeApiResponse> {
    return this.http.get<EmployeeApiResponse>(`${this.baseUrl}/${id}`);
  }

  createEmployee(employee: Partial<Employee>): Observable<EmployeeApiResponse> {
    return this.http.post<EmployeeApiResponse>(this.baseUrl, employee);
  }

  updateEmployee(id: number, employee: Partial<Employee>): Observable<EmployeeApiResponse> {
    return this.http.put<EmployeeApiResponse>(`${this.baseUrl}/${id}`, employee);
  }

  deleteEmployee(id: number): Observable<EmployeeApiResponse> {
    return this.http.delete<EmployeeApiResponse>(`${this.baseUrl}/${id}`);
  }
}
