import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../../config/api.config';
import { ApiResponse } from '../../../../types/api-response.type';
import { normalizeApiResponseModel, normalizePasListResponse } from '../../../../core/utils/pas-api-json.util';
import { SupplierModel, CreateSupplierRequest, UpdateSupplierRequest } from '../models/supplier.model';

/**
 * PAS.API CreateSupplierCommand (see Swagger): supplierName, tinNumber, contactPerson, email, phone, address, contacts.
 * `additionalProperties: false` — only these keys; `name` / `tin` are ignored by the API and TIN stays empty.
 */
function ensureNonEmptyTinNumber(raw: string | undefined | null): string {
  const t = String(raw ?? '').trim();
  if (t.length >= 3) {
    return t;
  }
  return `PAS-TIN-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

function toPasCreateSupplierCommand(data: CreateSupplierRequest): Record<string, unknown> {
  const supplierName = String(data.name ?? '').trim();
  const tinNumber = ensureNonEmptyTinNumber(data.tin);
  const body: Record<string, unknown> = {
    supplierName,
    tinNumber,
  };
  const cp = data.contactPerson?.trim();
  if (cp) {
    body['contactPerson'] = cp;
  }
  const em = data.email?.trim();
  if (em) {
    body['email'] = em;
  }
  const ph = data.phone?.trim();
  if (ph) {
    body['phone'] = ph;
  }
  const ad = data.address?.trim();
  if (ad) {
    body['address'] = ad;
  }
  return body;
}

function toPasUpdateSupplierCommand(id: string, data: UpdateSupplierRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    id,
  };
  const sn = data.name?.trim();
  if (sn) {
    body['supplierName'] = sn;
  }
  const cp = data.contactPerson?.trim();
  if (cp) {
    body['contactPerson'] = cp;
  }
  const em = data.email?.trim();
  if (em) {
    body['email'] = em;
  }
  const ph = data.phone?.trim();
  if (ph) {
    body['phone'] = ph;
  }
  const ad = data.address?.trim();
  if (ad) {
    body['address'] = ad;
  }
  if (data.tin !== undefined && data.tin !== null) {
    const t = String(data.tin).trim();
    if (t.length >= 3) {
      body['tinNumber'] = t;
    }
  }
  if (data.isActive !== undefined) {
    body['isActive'] = data.isActive !== false;
  }
  return body;
}

function mapSupplierRow(row: SupplierModel): SupplierModel {
  const r = row as unknown as Record<string, unknown>;
  const name =
    (typeof row.name === 'string' && row.name.trim() !== '' ? row.name : null) ??
    (typeof r['supplierName'] === 'string' ? (r['supplierName'] as string).trim() : null) ??
    (typeof r['companyName'] === 'string' ? (r['companyName'] as string).trim() : null) ??
    'Unknown';
  const tinRaw =
    (typeof row.tin === 'string' && row.tin.trim() !== '' ? row.tin.trim() : null) ??
    (typeof r['tinNumber'] === 'string' ? (r['tinNumber'] as string).trim() : null) ??
    (typeof r['tin'] === 'string' ? (r['tin'] as string).trim() : null) ??
    '';
  const tin = tinRaw || undefined;
  const isActive = row.isActive ?? (r['isActive'] as boolean | undefined) ?? true;
  return { ...row, name, tin, isActive };
}

@Injectable({
  providedIn: 'root',
})
export class SupplierService {
  constructor(private apiService: ApiService) {}

  getAll(params?: Record<string, string | number | boolean | readonly (string | number | boolean)[]>): Observable<ApiResponse<SupplierModel[]>> {
    return this.apiService.get<unknown>(API_ENDPOINTS.SUPPLIERS.GET_ALL, params).pipe(
      map((raw) => {
        const n = normalizePasListResponse<SupplierModel>(raw);
        return {
          success: n.success,
          message: n.message,
          data: n.data.map(mapSupplierRow),
          statusCode: n.statusCode,
        };
      }),
    );
  }

  getById(id: string): Observable<ApiResponse<SupplierModel>> {
    return this.apiService.get<unknown>(API_ENDPOINTS.SUPPLIERS.GET_BY_ID(id)).pipe(
      map((raw) => {
        const m = normalizeApiResponseModel<SupplierModel>(raw);
        if (m.data == null) {
          return {
            success: false,
            message: m.message || 'Not found',
            data: {} as SupplierModel,
            statusCode: m.statusCode,
          };
        }
        return {
          success: m.success,
          message: m.message ?? '',
          data: mapSupplierRow(m.data),
          statusCode: m.statusCode,
        };
      }),
    );
  }

  create(data: CreateSupplierRequest): Observable<ApiResponse<string>> {
    return this.apiService
      .post<unknown>(API_ENDPOINTS.SUPPLIERS.CREATE, toPasCreateSupplierCommand(data))
      .pipe(
        map((raw) => {
          const m = normalizeApiResponseModel<string>(raw);
          return {
            success: m.success,
            message: m.message ?? '',
            data: m.data as string,
            statusCode: m.statusCode,
          };
        }),
      );
  }

  update(id: string, data: UpdateSupplierRequest): Observable<ApiResponse<unknown>> {
    return this.apiService
      .put<unknown>(API_ENDPOINTS.SUPPLIERS.UPDATE(id), toPasUpdateSupplierCommand(id, data))
      .pipe(
        map((raw) => {
          const m = normalizeApiResponseModel<unknown>(raw);
          return {
            success: m.success,
            message: m.message ?? '',
            data: m.data as unknown,
            statusCode: m.statusCode,
          };
        }),
      );
  }

  delete(id: string): Observable<ApiResponse<unknown>> {
    return this.apiService.delete<unknown>(API_ENDPOINTS.SUPPLIERS.DELETE(id)).pipe(
      map((raw) => {
        const m = normalizeApiResponseModel<unknown>(raw);
        return {
          success: m.success,
          message: m.message ?? '',
          data: m.data as unknown,
          statusCode: m.statusCode,
        };
      }),
    );
  }
}
