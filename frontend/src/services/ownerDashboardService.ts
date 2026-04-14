import { apiClient } from "../api/client";
import type { OwnerDashboardData } from "../types/erp.types";

export const ownerDashboardService = {
  async getDashboard(date?: string) {
    const response = await apiClient.get<OwnerDashboardData>("/core/dashboard/owner/", {
      params: {
        date: date || undefined,
      },
    });

    return response.data;
  },
};
