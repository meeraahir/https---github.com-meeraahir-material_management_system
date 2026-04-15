import { apiClient } from "../api/client";
import { triggerAppRefresh } from "../context/dataSyncStore";
import type { ListParams, PaginatedResponse } from "../types/erp.types";
import { ensurePaginatedResponse } from "../utils/pagination";

export interface CrudService<TEntity, TFormValues> {
  create: (payload: TFormValues) => Promise<TEntity>;
  getOptions: () => Promise<TEntity[]>;
  list: (params?: ListParams) => Promise<PaginatedResponse<TEntity>>;
  remove: (id: number) => Promise<void>;
  update: (id: number, payload: TFormValues) => Promise<TEntity>;
}

export function createCrudService<TEntity, TFormValues>(
  basePath: string,
): CrudService<TEntity, TFormValues> {
  return {
    async create(payload) {
      const response = await apiClient.post<TEntity>(basePath, payload);
      triggerAppRefresh();
      return response.data;
    },

    async getOptions() {
      const collected: TEntity[] = [];
      let nextUrl: string | null = `${basePath}?page=1`;

      while (nextUrl) {
        const response: { data: PaginatedResponse<TEntity> } = await apiClient.get<
          PaginatedResponse<TEntity>
        >(nextUrl);
        collected.push(...response.data.results);
        nextUrl = response.data.next;
      }

      return collected;
    },

    async list(params) {
      const response = await apiClient.get<PaginatedResponse<TEntity>>(basePath, {
        params: {
          page: params?.page ?? 1,
          search: params?.search || undefined,
        },
      });

      return ensurePaginatedResponse(response.data);
    },

    async remove(id) {
      await apiClient.delete(`${basePath}${id}/`);
      triggerAppRefresh();
    },

    async update(id, payload) {
      const response = await apiClient.put<TEntity>(`${basePath}${id}/`, payload);
      triggerAppRefresh();
      return response.data;
    },
  };
}
