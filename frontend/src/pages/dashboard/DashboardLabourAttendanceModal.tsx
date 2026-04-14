import { useEffect, useMemo, useState } from "react";

import { useToast } from "../../components/feedback/useToast";
import { Modal } from "../../components/modal/Modal";
import { Button } from "../../components/ui/Button";
import { FormError } from "../../components/ui/FormError";
import { Input } from "../../components/ui/Input";
import { attendanceService } from "../../services/attendanceService";
import { siteLabourReportsService, sitesService } from "../../services/sitesService";
import type { Attendance, AttendanceFormValues, SiteDashboardLabourSummary } from "../../types/erp.types";
import { getErrorMessage } from "../../utils/apiError";
import { LabourAttendanceList, type LabourAttendanceRow } from "./LabourAttendanceList";

const today = new Date().toISOString().slice(0, 10);

interface DashboardLabourAttendanceModalProps {
  fixedSiteId?: number;
  fixedSiteName?: string;
  initialDate?: string;
  onClose: () => void;
  onSaved?: () => Promise<void> | void;
  open: boolean;
}

interface AttendanceScopeData {
  attendanceRows: Attendance[];
  siteSummaries: Array<{
    siteId: number;
    siteName: string;
    summaryRows: SiteDashboardLabourSummary[];
  }>;
}

async function loadSiteScopedAttendanceData(siteId: number, date: string, siteName?: string): Promise<AttendanceScopeData> {
  const [summaryRows, attendanceRows] = await Promise.all([
    siteLabourReportsService.getLabourSummary(siteId),
    attendanceService.getBySiteAndDate(siteId, date),
  ]);

  return {
    attendanceRows,
    siteSummaries: [
      {
        siteId,
        siteName: siteName || `Site ${siteId}`,
        summaryRows,
      },
    ],
  };
}

async function loadAllAttendanceData(date: string): Promise<AttendanceScopeData> {
  const sites = await sitesService.getOptions();
  const sortedSites = [...sites].sort((left, right) => left.name.localeCompare(right.name));
  const scopedResults = await Promise.all(
    sortedSites.map(async (site) => {
      const [summaryRows, attendanceRows] = await Promise.all([
        siteLabourReportsService.getLabourSummary(site.id),
        attendanceService.getBySiteAndDate(site.id, date),
      ]);

      return {
        attendanceRows,
        siteId: site.id,
        siteName: site.name,
        summaryRows,
      };
    }),
  );

  return {
    attendanceRows: scopedResults.flatMap((result) => result.attendanceRows),
    siteSummaries: scopedResults.map((result) => ({
      siteId: result.siteId,
      siteName: result.siteName,
      summaryRows: result.summaryRows,
    })),
  };
}

function buildAttendanceRows({
  attendanceRows,
  selectedRowKeys,
  siteSummaries,
}: {
  attendanceRows: Attendance[];
  selectedRowKeys: Set<string>;
  siteSummaries: AttendanceScopeData["siteSummaries"];
}) {
  const existingAttendanceBySiteAndLabour = new Map(
    attendanceRows.map((row) => [`${row.site}-${row.labour}`, row] as const),
  );

  return siteSummaries
    .flatMap((siteSummary) =>
      siteSummary.summaryRows.map((summaryRow) => {
        const rowKey = `regular-${siteSummary.siteId}-${summaryRow.labour_id}`;
        const existingAttendance = existingAttendanceBySiteAndLabour.get(`${siteSummary.siteId}-${summaryRow.labour_id}`);

        return {
          isPresent: selectedRowKeys.has(rowKey) || Boolean(existingAttendance?.present),
          key: rowKey,
          labourId: summaryRow.labour_id,
          labourName: summaryRow.labour_name,
          siteId: siteSummary.siteId,
        } satisfies LabourAttendanceRow;
      }),
    )
    .sort((left, right) => left.labourName.localeCompare(right.labourName));
}

export function DashboardLabourAttendanceModal({
  fixedSiteId,
  fixedSiteName,
  initialDate = today,
  onClose,
  onSaved,
  open,
}: DashboardLabourAttendanceModalProps) {
  const { showError, showSuccess } = useToast();
  const [attendanceRows, setAttendanceRows] = useState<Attendance[]>([]);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [siteSummaries, setSiteSummaries] = useState<AttendanceScopeData["siteSummaries"]>([]);
  const [formError, setFormError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hasFixedSite = Boolean(fixedSiteId && fixedSiteName);
  const rows = useMemo(
    () =>
      buildAttendanceRows({
        attendanceRows,
        selectedRowKeys: new Set(selectedRowKeys),
        siteSummaries,
      }),
    [attendanceRows, selectedRowKeys, siteSummaries],
  );

  const canSave = selectedDate.length > 0 && rows.length > 0 && !isLoading && !isSaving;

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedDate(initialDate);
    setFormError("");
  }, [initialDate, open]);

  useEffect(() => {
    if (!open || !selectedDate) {
      return;
    }

    let isMounted = true;

    async function loadAttendanceScope() {
      try {
        setIsLoading(true);
        setFormError("");

        const data = fixedSiteId
          ? await loadSiteScopedAttendanceData(fixedSiteId, selectedDate, fixedSiteName)
          : await loadAllAttendanceData(selectedDate);

        if (!isMounted) {
          return;
        }

        setAttendanceRows(data.attendanceRows);
        setSiteSummaries(data.siteSummaries);
        setSelectedRowKeys(
          data.attendanceRows
            .filter((row) => row.present)
            .map((row) => `regular-${row.site}-${row.labour}`),
        );
      } catch (error) {
        const message = getErrorMessage(error);

        if (!isMounted) {
          return;
        }

        setFormError(message);
        showError("Unable to load attendance", message);
        setAttendanceRows([]);
        setSiteSummaries([]);
        setSelectedRowKeys([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadAttendanceScope();

    return () => {
      isMounted = false;
    };
  }, [fixedSiteId, fixedSiteName, open, selectedDate, showError]);

  function handleClose() {
    if (isSaving) {
      return;
    }

    setFormError("");
    onClose();
  }

  function handleToggle(rowKey: string) {
    if (isSaving || isLoading) {
      return;
    }

    setSelectedRowKeys((currentValue) =>
      currentValue.includes(rowKey)
        ? currentValue.filter((currentKey) => currentKey !== rowKey)
        : [...currentValue, rowKey],
    );
  }

  function handleSelectAllPresent() {
    if (isSaving || isLoading) {
      return;
    }

    if (rows.every((row) => row.isPresent)) {
      setSelectedRowKeys([]);
      return;
    }

    setSelectedRowKeys(rows.map((row) => row.key));
  }

  async function handleSave() {
    if (!selectedDate) {
      setFormError("Date is required.");
      return;
    }

    if (rows.length === 0) {
      setFormError("No labour rows are available for attendance.");
      return;
    }

    try {
      setIsSaving(true);
      setFormError("");

      const selectedKeySet = new Set(selectedRowKeys);
      const existingAttendanceById = new Map<string, Attendance>(
        attendanceRows.map((row) => [`regular-${row.site}-${row.labour}`, row]),
      );
      const requests: Promise<unknown>[] = [];

      for (const row of rows) {
        const present = selectedKeySet.has(row.key);
        const existingAttendance = existingAttendanceById.get(row.key);
        const payload: AttendanceFormValues = {
          date: selectedDate,
          labour: row.labourId,
          present,
          site: row.siteId,
        };

        if (existingAttendance) {
          if (existingAttendance.present === present) {
            continue;
          }

          requests.push(attendanceService.update(existingAttendance.id, payload));
          continue;
        }

        requests.push(attendanceService.create(payload));
      }

      await Promise.all(requests);
      showSuccess("Attendance saved", "Attendance updated successfully.");
      await onSaved?.();
      onClose();
    } catch (error) {
      const message = getErrorMessage(error);
      setFormError(message);
      showError("Unable to save attendance", message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      footer={
        <div className="flex justify-end gap-3">
          <Button onClick={handleClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={!canSave}
            isLoading={isSaving}
            onClick={() => {
              void handleSave();
            }}
            type="button"
          >
            Save
          </Button>
        </div>
      }
      onClose={handleClose}
      open={open}
      size="lg"
      title="Labour Attendance"
    >
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            disabled
            label="Site Name"
            readOnly
            value={hasFixedSite ? fixedSiteName : "All Sites"}
          />
          <Input
            disabled={isSaving}
            label="Selected Date"
            max={today}
            type="date"
            value={selectedDate}
            onChange={(event) => {
              setSelectedDate(event.target.value);
            }}
          />
        </div>

        <FormError message={formError} />

        <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
          <LabourAttendanceList
            isLoading={isLoading}
            onSelectAllPresent={handleSelectAllPresent}
            onToggle={handleToggle}
            rows={rows}
          />
        </div>
      </div>
    </Modal>
  );
}
