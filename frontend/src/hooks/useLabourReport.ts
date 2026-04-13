import { useState } from "react";

import { useToast } from "../components/feedback/useToast";
import { labourReportsService } from "../services/labourService";
import type { Labour, LabourReportData } from "../types/erp.types";
import { getErrorMessage } from "../utils/apiError";

interface LoadLabourReportParams {
  dateFrom?: string;
  dateTo?: string;
  labourId?: number;
  labourRecords: Labour[];
}

export function useLabourReport() {
  const { showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<LabourReportData | null>(null);

  async function loadLabourReport({
    dateFrom,
    dateTo,
    labourId,
    labourRecords,
  }: LoadLabourReportParams) {
    if (!labourId) {
      const message = "Select a labour record to preview the report.";
      setError(message);
      setReport(null);
      return;
    }

    const selectedLabour = labourRecords.find((labour) => labour.id === labourId);

    if (!selectedLabour) {
      const message = "The selected labour record is unavailable.";
      setError(message);
      setReport(null);
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const response = await labourReportsService.getLabourReport(
        labourId,
        selectedLabour.name,
        {
          dateFrom,
          dateTo,
        },
      );

      setReport(response);
    } catch (loadError) {
      const message = getErrorMessage(loadError);
      setError(message);
      setReport(null);
      showError("Unable to load labour report", message);
    } finally {
      setIsLoading(false);
    }
  }

  function reset() {
    setError("");
    setReport(null);
  }

  return {
    error,
    isLoading,
    loadLabourReport,
    report,
    reset,
  };
}
