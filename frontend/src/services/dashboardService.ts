import { apiClient } from "../api/client";
import type {
  DashboardStats,
  DateRangeFilters,
  MaterialWiseReportRow,
  SiteWiseMaterialReportRow,
} from "../types/erp.types";

export const dashboardService = {
  async getStats() {
    const response = await apiClient.get<DashboardStats>("/core/dashboard/");
    return response.data;
  },

  async getMaterialUsageReport(filters?: DateRangeFilters) {
    const response = await apiClient.get<MaterialWiseReportRow[]>(
      "/materials/reports/material-wise/",
      {
        params: {
          date_from: filters?.dateFrom || undefined,
          date_to: filters?.dateTo || undefined,
        },
      },
    );

    return response.data;
  },

  async getSiteDistributionReport(filters?: DateRangeFilters) {
    const response = await apiClient.get<SiteWiseMaterialReportRow[]>(
      "/materials/reports/site-wise/",
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
