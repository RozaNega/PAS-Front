import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface SafetyBoxDto {
  id: string;
  boxNumber?: string;
  totalShelves: number;
  locationId: string;
  locationName?: string;
  occupiedShelves: number;
  propertiesCount: number;
}

export interface SafetyBoxDetailDto extends SafetyBoxDto {
  shelves: SafetyBoxShelfDto[];
  properties: SafetyBoxPropertyDto[];
  createdAt: string;
  updatedAt?: string;
}

export interface SafetyBoxShelfDto {
  id: string;
  shelfNumber: number;
  propertiesCount: number;
}

export interface SafetyBoxPropertyDto {
  id: string;
  tagNumber?: string;
  name?: string;
  shelfNumber: number;
}

export interface CreateSafetyBoxCommand {
  boxNumber: string;
  totalShelves: number;
  locationId: string;
}

export interface UpdateSafetyBoxCommand {
  id: string;
  boxNumber?: string;
  totalShelves: number;
  locationId: string;
}

export interface AddShelfCommand {
  safetyBoxId: string;
  shelfNumber: number;
}

@Injectable({ providedIn: 'root' })
export class SafetyBoxesService {
  constructor(private apiService: ApiService) {}

  getAll(params?: { locationId?: string; searchTerm?: string }): Observable<ApiResponseModel<SafetyBoxDto[]>> {
    return this.apiService.get<SafetyBoxDto[]>('SafetyBoxes', params);
  }

  getById(id: string): Observable<ApiResponseModel<SafetyBoxDetailDto>> {
    return this.apiService.get<SafetyBoxDetailDto>(`SafetyBoxes/${id}`);
  }

  create(data: CreateSafetyBoxCommand): Observable<ApiResponseModel<string>> {
    return this.apiService.post<string>('SafetyBoxes', data);
  }

  update(data: UpdateSafetyBoxCommand): Observable<ApiResponseModel<any>> {
    return this.apiService.put<any>(`SafetyBoxes/${data.id}`, data);
  }

  delete(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<any>(`SafetyBoxes/${id}`);
  }

  addShelf(id: string, data: AddShelfCommand): Observable<ApiResponseModel<string>> {
    return this.apiService.post<string>(`SafetyBoxes/${id}/shelves`, data);
  }
}
