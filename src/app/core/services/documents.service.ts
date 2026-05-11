import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface DocumentAttachmentDto {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
  relatedEntityId: string;
  relatedEntityName: string;
}

@Injectable({ providedIn: 'root' })
export class DocumentsService {
  constructor(private apiService: ApiService) {}

  getByEntity(entityName: string, entityId: string): Observable<ApiResponseModel<DocumentAttachmentDto[]>> {
    return this.apiService.get<ApiResponseModel<DocumentAttachmentDto[]>>('Documents/by-entity', {
      entityName,
      entityId
    });
  }

  getById(id: string): Observable<ApiResponseModel<DocumentAttachmentDto>> {
    return this.apiService.get<ApiResponseModel<DocumentAttachmentDto>>(`Documents/${id}`);
  }

  upload(file: File, relatedEntityId: string, relatedEntityName: string): Observable<ApiResponseModel<string>> {
    const formData = new FormData();
    formData.append('File', file);
    formData.append('RelatedEntityId', relatedEntityId);
    formData.append('RelatedEntityName', relatedEntityName);
    return this.apiService.post<ApiResponseModel<string>>('Documents/upload', formData);
  }

  delete(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<ApiResponseModel<any>>(`Documents/${id}`);
  }

  download(id: string): Observable<Blob> {
    return this.apiService.get<Blob>(`Documents/${id}/download`, {}, { responseType: 'blob' });
  }
}
