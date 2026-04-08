import { apiClient } from "../api/client";
import type { ReportFilters, ReportModuleKey } from "../types/erp.types";
import { downloadBlob } from "../utils/download";

const previewEndpointMap: Record<ReportModuleKey, string> = {
  dashboard: "/core/dashboard/chart/",
  labour: "/labour/reports/wage/",
  materials: "/materials/reports/material-wise/",
  receivables: "/finance/parties/reports/receivables/",
  vendors: "/vendors/reports/summary/",
};

const exportEndpointMap: Record<ReportModuleKey, { excel: string; pdf: string }> = {
  dashboard: {
    excel: "/core/dashboard/export/",
    pdf: "/core/dashboard/export/pdf/",
  },
  labour: {
    excel: "/labour/reports/wage/export/",
    pdf: "/labour/reports/wage/pdf/",
  },
  materials: {
    excel: "/materials/reports/material-wise/export/",
    pdf: "/materials/reports/material-wise/pdf/",
  },
  receivables: {
    excel: "/finance/parties/reports/receivables/export/",
    pdf: "/finance/parties/reports/receivables/pdf/",
  },
  vendors: {
    excel: "/vendors/reports/summary/export/",
    pdf: "/vendors/reports/summary/pdf/",
  },
};

function filterByDateRange<T>(rows: T[], filters: ReportFilters): T[] {
  if (!filters.dateFrom && !filters.dateTo) {
    return rows;
  }

  return rows.filter((row) => {
    if (!row || typeof row !== "object" || !("date" in row)) {
      return true;
    }

    const rawValue = row.date;
    if (typeof rawValue !== "string") {
      return true;
    }

    const rowDate = new Date(rawValue);

    if (Number.isNaN(rowDate.getTime())) {
      return true;
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      if (rowDate < fromDate) {
        return false;
      }
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      if (rowDate > toDate) {
        return false;
      }
    }

    return true;
  });
}

export const reportsService = {
  async exportExcel(module: ReportModuleKey) {
    const response = await apiClient.get(exportEndpointMap[module].excel, {
      responseType: "blob",
    });

    downloadBlob(response.data, `${module}-report.xlsx`);
  },

  async exportPdf(module: ReportModuleKey) {
    const response = await apiClient.get(exportEndpointMap[module].pdf, {
      responseType: "blob",
    });

    downloadBlob(response.data, `${module}-report.pdf`);
  },

  async getPreview(filters: ReportFilters) {
    const response = await apiClient.get(previewEndpointMap[filters.module]);
    const payload = response.data;

    if (Array.isArray(payload)) {
      return filterByDateRange(payload, filters);
    }

    return payload;
  },
};
