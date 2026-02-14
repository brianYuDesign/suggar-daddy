export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  cursor?: string;
  hasMore: boolean;
}
