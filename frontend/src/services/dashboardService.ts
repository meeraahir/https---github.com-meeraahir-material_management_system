import { apiClient } from "../api/client";
import type { DashboardStats } from "../types/erp.types";

export const dashboardService = {
  async getStats() {
    const response = await apiClient.get<DashboardStats>("/core/dashboard/");
    return response.data;
  },
};
