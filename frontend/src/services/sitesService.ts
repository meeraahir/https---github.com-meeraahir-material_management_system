import { apiClient } from "../api/client";
import { createCrudService } from "./crudService";
import type {
  DateRangeFilters,
  Site,
  SiteDashboardData,
  SiteFormValues,
} from "../types/erp.types";
import { downloadBlob } from "../utils/download";

export const sitesService = createCrudService<Site, SiteFormValues>("/sites/");

export const siteDashboardService = {
  async exportDashboard(
    siteId: number,
    format: "excel" | "pdf",
    filters?: DateRangeFilters,
  ) {
    const endpoint =
      format === "excel"
        ? `/sites/${siteId}/dashboard/export/`
        : `/sites/${siteId}/dashboard/export/pdf/`;
    const response = await apiClient.get(endpoint, {
      params: {
        date_from: filters?.dateFrom || undefined,
        date_to: filters?.dateTo || undefined,
      },
      responseType: "blob",
    });

    downloadBlob(
      response.data,
      `site-${siteId}-dashboard.${format === "excel" ? "xlsx" : "pdf"}`,
    );
  },

  async getDashboard(siteId: number, filters?: DateRangeFilters) {
    const response = await apiClient.get<SiteDashboardData>(
      `/sites/${siteId}/dashboard/`,
      {
        params: {
          date_from: filters?.dateFrom || undefined,
          date_to: filters?.dateTo || undefined,
        },
      },
    );

    return response.data;
  },
};
