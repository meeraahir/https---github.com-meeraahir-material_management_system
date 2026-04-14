import { useEffect, useMemo, useState } from "react";

import { apiClient } from "../../api/client";
import { useToast } from "../../components/feedback/useToast";
import { Modal } from "../../components/modal/Modal";
import { Button } from "../../components/ui/Button";
import { FormError } from "../../components/ui/FormError";
import { Input } from "../../components/ui/Input";
import { attendanceService } from "../../services/attendanceService";
import { labourService } from "../../services/labourService";
import { siteLabourReportsService, sitesService } from "../../services/sitesService";
import type {
  Attendance,
  AttendanceFormValues,
  CasualLabourEntry,
  Labour,
  PaginatedResponse,
  SiteDashboardLabourSummary,
} from "../../types/erp.types";
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
  casualEntries: CasualLabourEntry[];
  labourMaster: Labour[];
  siteSummaries: Array<{
    siteId: number;
    siteName: string;
    summaryRows: SiteDashboardLabourSummary[];
  }>;
}

async function fetchAllPaginatedResults<TEntity>(
  path: string,
  params?: Record<string, number | string | undefined>,
) {
  const items: TEntity[] = [];
  let nextUrl: string | null = path;
  let nextParams = params;

  while (nextUrl) {
    const response: { data: PaginatedResponse<TEntity> } = await apiClient.get<PaginatedResponse<TEntity>>(nextUrl, {
      params: nextParams,
    });
    items.push(...response.data.results);
    nextUrl = response.data.next;
    nextParams = undefined;
  }

  return items;
}

async function loadSiteScopedAttendanceData(siteId: number, date: string, siteName?: string): Promise<AttendanceScopeData> {
  const [labourMaster, summaryRows, attendanceRows, casualEntries] = await Promise.all([
    labourService.getOptions(),
    siteLabourReportsService.getLabourSummary(siteId),
    attendanceService.getBySiteAndDate(siteId, date),
    fetchAllPaginatedResults<CasualLabourEntry>("/labour/casual-labour/", {
      date,
      site: siteId,
    }),
  ]);

  return {
    attendanceRows,
    casualEntries,
    labourMaster,
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
  const [labourMaster, scopedResults] = await Promise.all([
    labourService.getOptions(),
    Promise.all(
      sortedSites.map(async (site) => {
        const [summaryRows, attendanceRows, casualEntries] = await Promise.all([
          siteLabourReportsService.getLabourSummary(site.id),
          attendanceService.getBySiteAndDate(site.id, date),
          fetchAllPaginatedResults<CasualLabourEntry>("/labour/casual-labour/", {
            date,
            site: site.id,
          }),
        ]);

        return {
          attendanceRows,
          casualEntries,
          siteId: site.id,
          siteName: site.name,
          summaryRows,
        };
      }),
    ),
  ]);

  return {
    attendanceRows: scopedResults.flatMap((result) => result.attendanceRows),
    casualEntries: scopedResults.flatMap((result) => result.casualEntries),
    labourMaster,
    siteSummaries: scopedResults.map((result) => ({
      siteId: result.siteId,
      siteName: result.siteName,
      summaryRows: result.summaryRows,
    })),
  };
}

function buildAttendanceRows({
  attendanceRows,
  casualEntries,
  labourMaster,
  selectedRowKeys,
  siteSummaries,
}: {
  attendanceRows: Attendance[];
  casualEntries: CasualLabourEntry[];
  labourMaster: Labour[];
  selectedRowKeys: Set<string>;
  siteSummaries: AttendanceScopeData["siteSummaries"];
}) {
  const labourMap = new Map(labourMaster.map((labour) => [labour.id, labour]));
  const existingAttendanceBySiteAndLabour = new Map(
    attendanceRows.map((row) => [`${row.site}-${row.labour}`, row] as const),
  );

  const regularRows: LabourAttendanceRow[] = siteSummaries.flatMap((siteSummary) =>
    siteSummary.summaryRows.map((summaryRow) => {
      const rowKey = `regular-${siteSummary.siteId}-${summaryRow.labour_id}`;
      const masterLabour = labourMap.get(summaryRow.labour_id);
      const existingAttendance = existingAttendanceBySiteAndLabour.get(`${siteSummary.siteId}-${summaryRow.labour_id}`);

      return {
        attendanceId: existingAttendance?.id,
        isPresent: selectedRowKeys.has(rowKey),
        isSelectable: true,
        key: rowKey,
        labourId: summaryRow.labour_id,
        labourName: summaryRow.labour_name,
        role: masterLabour?.labour_type || null,
        siteId: siteSummary.siteId,
        siteName: siteSummary.siteName,
        type: "Regular",
      } satisfies LabourAttendanceRow;
    }),
  );

  const casualRows: LabourAttendanceRow[] = casualEntries.map((entry) => ({
    disabledReason: "Casual labour entries do not expose a labour ID in the current API, so attendance cannot be saved for them here.",
    isPresent: false,
    isSelectable: false,
    key: `casual-${entry.site}-${entry.id}`,
    labourId: null,
    labourName: entry.labour_name,
    role: entry.labour_type || null,
    siteId: entry.site,
    siteName: entry.site_name,
    type: "Casual",
  }));

  return [...regularRows, ...casualRows].sort((left, right) => {
    const siteCompare = left.siteName.localeCompare(right.siteName);

    if (siteCompare !== 0) {
      return siteCompare;
    }

    if (left.type !== right.type) {
      return left.type === "Regular" ? -1 : 1;
    }

    return left.labourName.localeCompare(right.labourName);
  });
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
  const [casualEntries, setCasualEntries] = useState<CasualLabourEntry[]>([]);
  const [labourMaster, setLabourMaster] = useState<Labour[]>([]);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [siteSummaries, setSiteSummaries] = useState<AttendanceScopeData["siteSummaries"]>([]);
  const [formError, setFormError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hasFixedSite = Boolean(fixedSiteId && fixedSiteName);
  const title = hasFixedSite ? "Labour Attendance" : "Main Dashboard Labour Attendance";

  const rows = useMemo(
    () =>
      buildAttendanceRows({
        attendanceRows,
        casualEntries,
        labourMaster,
        selectedRowKeys: new Set(selectedRowKeys),
        siteSummaries,
      }),
    [attendanceRows, casualEntries, labourMaster, selectedRowKeys, siteSummaries],
  );

  const selectableRows = useMemo(
    () => rows.filter((row) => row.isSelectable),
    [rows],
  );

  const canSave =
    selectedDate.length > 0 &&
    selectableRows.length > 0 &&
    !isLoading &&
    !isSaving;

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
        setCasualEntries(data.casualEntries);
        setLabourMaster(data.labourMaster);
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
        setCasualEntries([]);
        setLabourMaster([]);
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
    const targetRow = rows.find((row) => row.key === rowKey);

    if (!targetRow?.isSelectable || isSaving || isLoading) {
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

    setSelectedRowKeys(selectableRows.map((row) => row.key));
  }

  async function handleSave() {
    if (!selectedDate) {
      setFormError("Date is required.");
      return;
    }

    if (selectableRows.length === 0) {
      setFormError("No eligible labour rows are available for attendance.");
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

      for (const row of selectableRows) {
        if (!row.labourId) {
          continue;
        }

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
      showSuccess("Attendance saved", "Labour attendance has been updated successfully.");
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-500">
            Attendance is saved using the existing labour attendance API. Casual labour rows are shown for visibility, but only rows with a real labour ID can be submitted.
          </p>
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
              Save Attendance
            </Button>
          </div>
        </div>
      }
      onClose={handleClose}
      open={open}
      size="xl"
      title={title}
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {hasFixedSite ? (
            <Input disabled label="Site" readOnly value={fixedSiteName} />
          ) : (
            <Input
              disabled
              label="Scope"
              readOnly
              value="All Sites"
            />
          )}
          <Input
            disabled={isSaving}
            hint="Future dates are not allowed."
            label="Date"
            max={today}
            requiredIndicator
            type="date"
            value={selectedDate}
            onChange={(event) => {
              setSelectedDate(event.target.value);
            }}
          />
        </div>

        <FormError message={formError} />

        <div className="rounded-2xl border border-blue-100 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-blue-100 px-4 py-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Attendance List</h3>
              <p className="text-xs leading-5 text-slate-500">
                {hasFixedSite
                  ? "Regular and casual labour rows for the selected site and date."
                  : "Regular labour across all sites, with same-date casual labour rows shown for reference."}
              </p>
            </div>
            {isLoading ? (
              <span className="text-xs font-medium text-slate-500">Loading attendance...</span>
            ) : null}
          </div>

          <LabourAttendanceList
            isLoading={isLoading}
            onSelectAllPresent={handleSelectAllPresent}
            onToggle={handleToggle}
            rows={rows}
            showSiteColumn={!hasFixedSite}
          />
        </div>
      </div>
    </Modal>
  );
}
