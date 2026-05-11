import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface StockLedgerDto {
  id: string;
  itemId: string;
  itemName?: string;
  movementType: string;
  quantity: number;
  referenceNumber?: string;
  movementDate: string;
  userId: string;
  userName?: string;
}

export interface StockMovementDto {
  id: string;
  itemId: string;
  itemName?: string;
  movementType: string;
  quantity: number;
  referenceNumber?: string;
  movementDate: string;
  userId: string;
  userName?: string;
}

@Injectable({ providedIn: 'root' })
export class StockLedgerService {
  constructor(private apiService: ApiService) {}

  getAll(params?: any): Observable<ApiResponseModel<StockLedgerDto[]>> {
    return this.apiService.get<ApiResponseModel<StockLedgerDto[]>>('StockLedger', params);
  }

  getById(id: string): Observable<ApiResponseModel<StockLedgerDto>> {
    return this.apiService.get<ApiResponseModel<StockLedgerDto>>(`StockLedger/${id}`);
  }

  getMovements(params?: any): Observable<ApiResponseModel<StockMovementDto[]>> {
    return this.apiService.get<ApiResponseModel<StockMovementDto[]>>('StockLedger/movements', params);
  }
}
