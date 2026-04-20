export interface PaginationParams {
  pageNumber: number;
  pageSize: number;
  searchTerm?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface FilterParams {
  fromDate?: Date;
  toDate?: Date;
  status?: string;
  locationId?: string;
  categoryId?: string;
  propertyTypeId?: string;
}