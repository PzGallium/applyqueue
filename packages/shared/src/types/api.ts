export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  error: ApiError;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface KeyStatusResponse {
  provider: string;
  configured: boolean;
  updatedAt: string | null;
}

export interface KeyValidateResponse {
  provider: string;
  valid: boolean;
  model?: string;
  message: string;
}
