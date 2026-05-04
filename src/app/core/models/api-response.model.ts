export interface ApiResponseModel<T> {
  success: boolean;
  message?: string;
  data?: T;
  statusCode: number;
}



