import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../../config/api.config';
import { ApiResponseModel } from '../../../../core/models/api-response.model';
import { PaginatedResult } from '../../../../types/api-response.type';
import { Property, PropertyDetail, CreatePropertyRequest, UpdatePropertyRequest, TransferPropertyRequest } from '../models/property.model';

@Injectable({
  providedIn: 'root'
})
export class PropertyService {
  constructor(private apiService: ApiService) {}

  getProperties(params?: any): Observable<ApiResponseModel<PaginatedResult<Property>>> {
    return this.apiService.get<PaginatedResult<Property>>(API_ENDPOINTS.PROPERTIES.GET_ALL, params);
  }

  getPropertyById(id: string): Observable<ApiResponseModel<PropertyDetail>> {
    return this.apiService.get<PropertyDetail>(API_ENDPOINTS.PROPERTIES.GET_BY_ID(id));
  }

  createProperty(request: CreatePropertyRequest): Observable<ApiResponseModel<string>> {
    return this.apiService.post<string>(API_ENDPOINTS.PROPERTIES.CREATE, request);
  }

  updateProperty(request: UpdatePropertyRequest): Observable<ApiResponseModel<object>> {
    return this.apiService.put<object>(API_ENDPOINTS.PROPERTIES.UPDATE(request.id), request);
  }

  deleteProperty(id: string): Observable<ApiResponseModel<object>> {
    return this.apiService.delete<object>(API_ENDPOINTS.PROPERTIES.DELETE(id));
  }

  transferProperty(request: TransferPropertyRequest): Observable<ApiResponseModel<object>> {
    return this.apiService.post<object>(API_ENDPOINTS.PROPERTIES.TRANSFER(request.id), request);
  }

  getPropertiesByLocation(locationId: string): Observable<ApiResponseModel<Property[]>> {
    return this.apiService.get<Property[]>(API_ENDPOINTS.PROPERTIES.BY_LOCATION(locationId));
  }
}
