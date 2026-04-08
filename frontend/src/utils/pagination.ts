import type { PaginatedResponse } from "../types/erp.types";

export function ensurePaginatedResponse<T>(
  payload: PaginatedResponse<T> | T[],
): PaginatedResponse<T> {
  if (Array.isArray(payload)) {
    return {
      count: payload.length,
      next: null,
      previous: null,
      results: payload,
    };
  }

  return payload;
}
