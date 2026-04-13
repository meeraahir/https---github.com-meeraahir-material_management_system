import { apiClient } from "../api/client";
import { createCrudService } from "./crudService";
import type {
  Material,
  MaterialFormValues,
  MaterialUsage,
  PaginatedResponse,
} from "../types/erp.types";
import { ensurePaginatedResponse } from "../utils/pagination";

export const materialsService = createCrudService<Material, MaterialFormValues>(
  "/materials/",
);

interface MaterialUsageListParams {
  date?: string;
  material?: number;
  page?: number;
  receipt?: number;
  site?: number;
}

export const materialUsageService = {
  async list(params?: MaterialUsageListParams) {
    const response = await apiClient.get<PaginatedResponse<MaterialUsage>>(
      "/materials/usages/",
      {
        params: {
          date: params?.date || undefined,
          material: params?.material || undefined,
          page: params?.page ?? 1,
          receipt: params?.receipt || undefined,
          site: params?.site || undefined,
        },
      },
    );

    return ensurePaginatedResponse(response.data);
  },
};
