import { apiClient } from "../api/client";
import { createCrudService } from "./crudService";
import type {
  DateRangeFilters,
  Site,
  SiteDashboardData,
  SiteDashboardFinanceSummary,
  SiteDashboardLabourSummary,
  SiteDashboardMaterialSummary,
  SiteDashboardVendorSummary,
  SiteFormValues,
} from "../types/erp.types";
import { downloadBlob } from "../utils/download";

export const sitesService = createCrudService<Site, SiteFormValues>("/sites/");

function toNumber(value: unknown) {
  return typeof value === "number"
    ? value
    : Number.isFinite(Number(value))
      ? Number(value)
      : 0;
}

function normalizeMaterialSummary(
  rows: unknown,
): SiteDashboardMaterialSummary[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row, index) => {
    const source =
      row && typeof row === "object" ? (row as Record<string, unknown>) : {};

    return {
      material__id: toNumber(
        source.material__id ?? source.material_id ?? index + 1,
      ),
      material__name: String(
        source.material__name ?? source.material_name ?? "Unknown Material",
      ),
      remaining_stock: toNumber(source.remaining_stock),
      total_cost: toNumber(source.total_cost),
      total_received: toNumber(
        source.total_received ?? source.total_quantity_received,
      ),
      total_used: toNumber(source.total_used ?? source.total_quantity_used),
    };
  });
}

function normalizeVendorSummary(rows: unknown): SiteDashboardVendorSummary[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row, index) => {
    const source =
      row && typeof row === "object" ? (row as Record<string, unknown>) : {};

    return {
      paid_amount: toNumber(source.paid_amount),
      pending_amount: toNumber(source.pending_amount),
      total_amount: toNumber(source.total_amount),
      vendor_id: toNumber(source.vendor_id ?? source.id ?? index + 1),
      vendor_name: String(source.vendor_name ?? source.vendor ?? "Unknown Vendor"),
    };
  });
}

function normalizeLabourSummary(rows: unknown): SiteDashboardLabourSummary[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row, index) => {
    const source =
      row && typeof row === "object" ? (row as Record<string, unknown>) : {};

    return {
      absent_count: toNumber(source.absent_count),
      labour_id: toNumber(source.labour_id ?? index + 1),
      labour_name: String(source.labour_name ?? "Unknown Labour"),
      paid_amount: toNumber(source.paid_amount),
      pending_amount: toNumber(source.pending_amount),
      present_count: toNumber(source.present_count),
      total_days: toNumber(source.total_days),
      total_wage: toNumber(source.total_wage),
    };
  });
}

function normalizeFinanceSummary(rows: unknown): SiteDashboardFinanceSummary[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row, index) => {
    const source =
      row && typeof row === "object" ? (row as Record<string, unknown>) : {};

    return {
      party__id: toNumber(source.party__id ?? source.party_id ?? index + 1),
      party__name: String(source.party__name ?? source.party_name ?? "Unknown Party"),
      pending_amount: toNumber(source.pending_amount),
      received_amount: toNumber(source.received_amount),
      total_amount: toNumber(source.total_amount),
    };
  });
}

function normalizeDashboardData(siteId: number, payload: unknown): SiteDashboardData {
  const source =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const siteSource =
    source.site && typeof source.site === "object"
      ? (source.site as Record<string, unknown>)
      : {};

  return {
    finance_summary: normalizeFinanceSummary(source.finance_summary),
    labour_summary: normalizeLabourSummary(source.labour_summary),
    material_summary: normalizeMaterialSummary(source.material_summary),
    site: {
      description: String(siteSource.description ?? ""),
      id: toNumber(siteSource.id ?? siteId),
      location: String(siteSource.location ?? "-"),
      name: String(siteSource.name ?? `Site ${siteId}`),
    },
    vendor_summary: normalizeVendorSummary(source.vendor_summary),
  };
}

async function fetchFallbackDashboardData(
  siteId: number,
  filters?: DateRangeFilters,
) {
  const params = {
    date_from: filters?.dateFrom || undefined,
    date_to: filters?.dateTo || undefined,
  };

  const [
    siteResponse,
    materialResponse,
    vendorResponse,
    labourResponse,
    financeResponse,
  ] = await Promise.allSettled([
    apiClient.get<unknown>(`/sites/${siteId}/`),
    apiClient.get<unknown>(`/materials/reports/site/${siteId}/`, { params }),
    apiClient.get<unknown>(`/vendors/reports/site/${siteId}/`, { params }),
    apiClient.get<unknown>(`/labour/reports/site/${siteId}/`, { params }),
    apiClient.get<unknown>(`/finance/reports/site/${siteId}/`, { params }),
  ]);

  const hasSuccessfulFallback =
    siteResponse.status === "fulfilled" ||
    materialResponse.status === "fulfilled" ||
    vendorResponse.status === "fulfilled" ||
    labourResponse.status === "fulfilled" ||
    financeResponse.status === "fulfilled";

  if (!hasSuccessfulFallback) {
    throw new Error("Unable to load site dashboard data.");
  }

  const fallbackPayload = {
    finance_summary:
      financeResponse.status === "fulfilled" ? financeResponse.value.data : [],
    labour_summary:
      labourResponse.status === "fulfilled" ? labourResponse.value.data : [],
    material_summary:
      materialResponse.status === "fulfilled" ? materialResponse.value.data : [],
    site:
      siteResponse.status === "fulfilled"
        ? siteResponse.value.data
        : {
            description: "",
            id: siteId,
            location: "-",
            name: `Site ${siteId}`,
          },
    vendor_summary:
      vendorResponse.status === "fulfilled" ? vendorResponse.value.data : [],
  };

  return normalizeDashboardData(siteId, fallbackPayload);
}

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
    try {
      const response = await apiClient.get<unknown>(
        `/sites/${siteId}/dashboard/`,
        {
          params: {
            date_from: filters?.dateFrom || undefined,
            date_to: filters?.dateTo || undefined,
          },
        },
      );

      return normalizeDashboardData(siteId, response.data);
    } catch (primaryError) {
      try {
        return await fetchFallbackDashboardData(siteId, filters);
      } catch {
        throw primaryError;
      }
    }
  },
};

export const siteLabourReportsService = {
  async getLabourSummary(siteId: number, filters?: DateRangeFilters) {
    const response = await apiClient.get<unknown>(`/labour/reports/site/${siteId}/`, {
      params: {
        date_from: filters?.dateFrom || undefined,
        date_to: filters?.dateTo || undefined,
      },
    });

    return normalizeLabourSummary(response.data);
  },
};
