export interface ApiResponseModel<T> {
  success: boolean;
  succeeded?: boolean;
  message?: string;
  data?: T;
  statusCode: number;
}



