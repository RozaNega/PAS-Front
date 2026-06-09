export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  statusCode: number;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface ErrorResponse {
  statusCode: number;
  message: string;
  errors: string[];
  timestamp: string;
}

export interface ValidationError {
  propertyName: string;
  errorMessage: string;
}