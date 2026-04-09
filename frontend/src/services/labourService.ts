import { createCrudService } from "./crudService";
import { apiClient } from "../api/client";
import type {
  DateRangeFilters,
  Labour,
  LabourFormValues,
  LabourReportData,
  LabourPaymentLedger,
} from "../types/erp.types";
import { downloadBlob } from "../utils/download";

export const labourService = createCrudService<Labour, LabourFormValues>(
  "/labour/",
);

export const labourReportsService = {
  async getPaymentLedger(labourId: number, filters?: DateRangeFilters) {
    const response = await apiClient.get<LabourPaymentLedger>(
      `/labour/${labourId}/payment-ledger/`,
      {
        params: {
          date_from: filters?.dateFrom || undefined,
          date_to: filters?.dateTo || undefined,
        },
      },
    );

    return response.data;
  },

  async getLabourReport(labourId: number, labourName: string, filters?: DateRangeFilters) {
    const ledger = await this.getPaymentLedger(labourId, filters);

    const summary = {
      labourId,
      labourName,
      paidAmount: ledger.totals.paid_amount,
      pendingAmount: ledger.totals.pending_amount,
      totalAmount: ledger.totals.total_amount,
    };

    return {
      ledger,
      summary,
    } satisfies LabourReportData;
  },

  async exportLedger(labourId: number, format: "excel" | "pdf") {
    const endpoint =
      format === "excel"
        ? `/labour/${labourId}/payment-ledger/export/`
        : `/labour/${labourId}/payment-ledger/pdf/`;
    const response = await apiClient.get(endpoint, {
      responseType: "blob",
    });

    downloadBlob(response.data, `labour-${labourId}-ledger.${format === "excel" ? "xlsx" : "pdf"}`);
  },
};
