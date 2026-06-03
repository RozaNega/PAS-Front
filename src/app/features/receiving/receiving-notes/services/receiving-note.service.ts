import { Injectable } from '@angular/core';
import { Observable, map, catchError, throwError, mergeMap, of } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../../../core/services/api.service';
import { ApiResponseModel } from '../../../../core/models/api-response.model';
import { normalizeApiResponseModel, normalizePasListResponse } from '../../../../core/utils/pas-api-json.util';

export interface ReceivingNoteDto {
  id: string;
  noteNumber?: string;
  grnNumber?: string;
  supplierId: string;
  supplierName?: string;
  receivingDate: string;
  receivedBy: string;
  items?: unknown[];
  totalQuantity?: number;
  status: string;
}

/** Some APIs bind `NoteNumber` / `GrnNumber` only; empty string hits unique index like ''. */
function normalizeReceivingNoteCreatePayload(data: unknown): Record<string, unknown> {
  const d =
    data && typeof data === 'object' && !Array.isArray(data)
      ? { ...(data as Record<string, unknown>) }
      : {};
  const candidates = [
    d['noteNumber'],
    d['NoteNumber'],
    d['grnNumber'],
    d['GrnNumber'],
    d['receivingNoteNumber'],
    d['ReceivingNoteNumber'],
  ];
  let nn = '';
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) {
      nn = c.trim();
      break;
    }
  }
  if (!nn) {
    nn = `GRN-${new Date().getFullYear()}-${Date.now()}`;
  }
  d['noteNumber'] = nn;
  d['NoteNumber'] = nn;
  d['grnNumber'] = nn;
  d['GrnNumber'] = nn;
  return d;
}

function guidKey(s: string): string {
  return s.replace(/-/g, '').toLowerCase();
}

function receivingNoteIdEquals(row: ReceivingNoteDto, idRaw: string): boolean {
  const rid = String(row?.id ?? '').trim();
  const want = idRaw.trim();
  if (!rid || !want) {
    return false;
  }
  return guidKey(rid) === guidKey(want);
}

@Injectable({
  providedIn: 'root',
})
export class ReceivingNoteService {
  constructor(private apiService: ApiService) {}

  getAll(params?: Record<string, string | number | boolean | readonly (string | number | boolean)[]>): Observable<ApiResponseModel<ReceivingNoteDto[]>> {
    return this.apiService.get<unknown>('ReceivingNotes', params).pipe(
      map((raw) => {
        const n = normalizePasListResponse<ReceivingNoteDto>(raw);
        return {
          success: n.success,
          message: n.message,
          data: n.data,
          statusCode: n.statusCode,
        } satisfies ApiResponseModel<ReceivingNoteDto[]>;
      }),
    );
  }

  getById(id: string): Observable<ApiResponseModel<ReceivingNoteDto>> {
    const trimmed = id.trim();
    const detailUrl = `ReceivingNotes/${encodeURIComponent(trimmed)}`;
    return this.apiService.get<unknown>(detailUrl).pipe(
      map((raw) => normalizeApiResponseModel<ReceivingNoteDto>(raw)),
      mergeMap((res) => {
        const row = res.data;
        if (res.success !== false && row && receivingNoteIdEquals(row, trimmed)) {
          return of(res);
        }
        return this.getByIdFromListFallback(trimmed, null);
      }),
      catchError((err: HttpErrorResponse) => this.getByIdFromListFallback(trimmed, err)),
    );
  }

  /**
   * Some APIs omit GET-by-id or return 404 until the list is indexed; the row may still appear on GET all.
   */
  private getByIdFromListFallback(
    id: string,
    originalErr: HttpErrorResponse | null,
  ): Observable<ApiResponseModel<ReceivingNoteDto>> {
    return this.getAll({ pageNumber: 1, pageSize: 500 }).pipe(
      mergeMap((listRes) => {
        const rows = listRes.data ?? [];
        const row = rows.find((r) => receivingNoteIdEquals(r, id));
        if (row) {
          return of({
            success: true,
            message: originalErr
              ? `GET ${originalErr.url || 'ReceivingNotes/{id}'} returned ${originalErr.status}; matched this note in the list response instead.`
              : (listRes.message ?? ''),
            data: row,
            statusCode: 200,
          });
        }
        return originalErr ? throwError(() => originalErr) : throwError(() => new HttpErrorResponse({ status: 404 }));
      }),
    );
  }

  create(data: unknown): Observable<ApiResponseModel<string>> {
    const mapRes = (raw: unknown) => normalizeApiResponseModel<string>(raw);
    const normalized = normalizeReceivingNoteCreatePayload(data);
    const post = (body: unknown) => this.apiService.post<unknown>('ReceivingNotes', body).pipe(map(mapRes));

    return post(normalized).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status !== 400) {
          return throwError(() => err);
        }
        const items = normalized['items'];
        if (!Array.isArray(items)) {
          return throwError(() => err);
        }
        const withLines = { ...normalized };
        delete withLines['items'];
        withLines['lines'] = items;
        return post(withLines).pipe(
          catchError((err2: HttpErrorResponse) => {
            if (err2.status !== 400) {
              return throwError(() => err2);
            }
            const withRnLines = { ...normalized };
            delete withRnLines['items'];
            withRnLines['receivingNoteLines'] = items;
            return post(withRnLines);
          }),
        );
      }),
    );
  }

  update(id: string, data: unknown): Observable<ApiResponseModel<unknown>> {
    return this.apiService.put<unknown>(`ReceivingNotes/${id}`, data).pipe(
      map((raw) => normalizeApiResponseModel<unknown>(raw)),
    );
  }

  delete(id: string): Observable<ApiResponseModel<unknown>> {
    return this.apiService.delete<unknown>(`ReceivingNotes/${id}`).pipe(
      map((raw) => normalizeApiResponseModel<unknown>(raw)),
    );
  }

  /** Release inspected goods to stock (backend contract from api.config). */
  approve(id: string): Observable<ApiResponseModel<unknown>> {
    return this.apiService.post<unknown>(`ReceivingNotes/${id}/approve`, {}).pipe(
      map((raw) => normalizeApiResponseModel<unknown>(raw)),
    );
  }

  /** Mark receiving note as returned to supplier (partial update; adjust if your API differs). */
  returnToSupplier(id: string): Observable<ApiResponseModel<unknown>> {
    return this.apiService.put<unknown>(`ReceivingNotes/${id}`, { status: 'ReturnedToSupplier' }).pipe(
      map((raw) => normalizeApiResponseModel<unknown>(raw)),
    );
  }
}
