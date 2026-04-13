import { useEffect, useState } from "react";

import { useToast } from "../../components/feedback/useToast";
import { Modal } from "../../components/modal/Modal";
import { Button } from "../../components/ui/Button";
import { FormError } from "../../components/ui/FormError";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { attendanceService } from "../../services/attendanceService";
import { siteLabourReportsService, sitesService } from "../../services/sitesService";
import type {
  Attendance,
  AttendanceFormValues,
  Site,
  SiteDashboardLabourSummary,
} from "../../types/erp.types";
import { getErrorMessage } from "../../utils/apiError";

const today = new Date().toISOString().slice(0, 10);

interface DashboardLabourAttendanceModalProps {
  fixedSiteId?: number;
  fixedSiteName?: string;
  initialDate?: string;
  onClose: () => void;
  onSaved?: () => Promise<void> | void;
  open: boolean;
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
  const [sites, setSites] = useState<Site[]>([]);
  const [labours, setLabours] = useState<SiteDashboardLabourSummary[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<Attendance[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState(0);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedLabourIds, setSelectedLabourIds] = useState<number[]>([]);
  const [formError, setFormError] = useState("");
  const [isSitesLoading, setIsSitesLoading] = useState(false);
  const [isLaboursLoading, setIsLaboursLoading] = useState(false);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hasFixedSite = Boolean(fixedSiteId && fixedSiteName);
  const isSiteSelected = selectedSiteId > 0;
  const isDateSelected = selectedDate.length > 0;
  const canSave =
    isSiteSelected &&
    isDateSelected &&
    labours.length > 0 &&
    !isSitesLoading &&
    !isLaboursLoading &&
    !isAttendanceLoading &&
    !isSaving;

  useEffect(() => {
    if (!open) {
      return;
    }

    if (fixedSiteId) {
      setFormError("");
      setSites([]);
      setSelectedSiteId(fixedSiteId);
      setSelectedDate(initialDate);
      setLabours([]);
      setAttendanceRows([]);
      setSelectedLabourIds([]);
      return;
    }

    let isMounted = true;

    async function loadSites() {
      try {
        setIsSitesLoading(true);
        setFormError("");
        setSelectedSiteId(0);
        setSelectedDate(initialDate);
        setSites([]);
        setLabours([]);
        setAttendanceRows([]);
        setSelectedLabourIds([]);

        const siteOptions = await sitesService.getOptions();

        if (!isMounted) {
          return;
        }

        setSites(
          [...siteOptions].sort((left, right) =>
            left.name.localeCompare(right.name),
          ),
        );
      } catch (error) {
        const message = getErrorMessage(error);

        if (!isMounted) {
          return;
        }

        setFormError(message);
        showError("Unable to load sites", message);
      } finally {
        if (isMounted) {
          setIsSitesLoading(false);
        }
      }
    }

    void loadSites();

    return () => {
      isMounted = false;
    };
  }, [fixedSiteId, initialDate, open, showError]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!isSiteSelected) {
      setLabours([]);
      setAttendanceRows([]);
      setSelectedLabourIds([]);
      return;
    }

    let isMounted = true;

    async function loadLabours() {
      try {
        setIsLaboursLoading(true);
        setFormError("");
        setLabours([]);
        setAttendanceRows([]);
        setSelectedLabourIds([]);

        const rows = await siteLabourReportsService.getLabourSummary(selectedSiteId);

        if (!isMounted) {
          return;
        }

        setLabours(
          [...rows].sort((left, right) =>
            left.labour_name.localeCompare(right.labour_name),
          ),
        );
      } catch (error) {
        const message = getErrorMessage(error);

        if (!isMounted) {
          return;
        }

        setFormError(message);
        showError("Unable to load site labour", message);
      } finally {
        if (isMounted) {
          setIsLaboursLoading(false);
        }
      }
    }

    void loadLabours();

    return () => {
      isMounted = false;
    };
  }, [isSiteSelected, open, selectedSiteId, showError]);

  useEffect(() => {
    if (!open || !isSiteSelected || !isDateSelected) {
      setAttendanceRows([]);
      setSelectedLabourIds([]);
      return;
    }

    let isMounted = true;

    async function loadAttendance() {
      try {
        setIsAttendanceLoading(true);
        setFormError("");

        const rows = await attendanceService.getBySiteAndDate(
          selectedSiteId,
          selectedDate,
        );

        if (!isMounted) {
          return;
        }

        setAttendanceRows(rows);
        setSelectedLabourIds(
          rows.filter((row) => row.present).map((row) => row.labour),
        );
      } catch (error) {
        const message = getErrorMessage(error);

        if (!isMounted) {
          return;
        }

        setFormError(message);
        showError("Unable to load attendance", message);
      } finally {
        if (isMounted) {
          setIsAttendanceLoading(false);
        }
      }
    }

    void loadAttendance();

    return () => {
      isMounted = false;
    };
  }, [isDateSelected, isSiteSelected, open, selectedDate, selectedSiteId, showError]);

  function handleClose() {
    if (isSaving) {
      return;
    }

    setFormError("");
    onClose();
  }

  function toggleLabourSelection(labourId: number) {
    if (!isDateSelected || isAttendanceLoading || isSaving) {
      return;
    }

    setSelectedLabourIds((currentValue) =>
      currentValue.includes(labourId)
        ? currentValue.filter((currentId) => currentId !== labourId)
        : [...currentValue, labourId],
    );
  }

  async function handleSave() {
    if (!isSiteSelected) {
      setFormError("Site is required.");
      return;
    }

    if (!isDateSelected) {
      setFormError("Date is required.");
      return;
    }

    if (labours.length === 0) {
      setFormError("No labour records are available for the selected site.");
      return;
    }

    try {
      setIsSaving(true);
      setFormError("");

      const selectedIds = new Set(selectedLabourIds);
      const existingAttendanceByLabour = new Map(
        attendanceRows.map((row) => [row.labour, row]),
      );
      const requests: Promise<unknown>[] = [];

      for (const labour of labours) {
        const labourId = labour.labour_id;
        const existingAttendance = existingAttendanceByLabour.get(labourId);
        const present = selectedIds.has(labourId);

        if (existingAttendance) {
          if (existingAttendance.present === present) {
            continue;
          }

          const payload: AttendanceFormValues = {
            date: selectedDate,
            labour: labourId,
            present,
            site: selectedSiteId,
          };

          requests.push(attendanceService.update(existingAttendance.id, payload));
          continue;
        }

        if (!present) {
          continue;
        }

        const payload: AttendanceFormValues = {
          date: selectedDate,
          labour: labourId,
          present: true,
          site: selectedSiteId,
        };

        requests.push(attendanceService.create(payload));
      }

      await Promise.all(requests);
      showSuccess(
        "Attendance saved",
        "Labour attendance has been updated successfully.",
      );
      await onSaved?.();
      setFormError("");
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
            Attendance is saved through the current attendance module flow for the
            selected site and date.
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
              Save
            </Button>
          </div>
        </div>
      }
      onClose={handleClose}
      open={open}
      size="xl"
      title="Labour Attendance"
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          {hasFixedSite ? (
            <Input
              disabled
              label="Site"
              readOnly
              value={fixedSiteName}
            />
          ) : (
            <Select
              clearable={false}
              disabled={isSitesLoading || isSaving}
              label="Site"
              options={sites.map((site) => ({ label: site.name, value: site.id }))}
              placeholder={isSitesLoading ? "Loading sites..." : "Select site"}
              requiredIndicator
              value={selectedSiteId || ""}
              onChange={(event) => {
                setSelectedSiteId(event.target.value ? Number(event.target.value) : 0);
              }}
            />
          )}
          <Input
            disabled={isSaving}
            hint={!isDateSelected ? "Date is required before attendance can be marked." : undefined}
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
              <h3 className="text-sm font-bold text-slate-900">Labour List</h3>
              <p className="text-xs leading-5 text-slate-500">
                {isSiteSelected
                  ? "Only labour linked to the selected site is shown here."
                  : "Select a site to load labour for attendance."}
              </p>
            </div>
            {isAttendanceLoading ? (
              <span className="text-xs font-medium text-slate-500">
                Loading attendance...
              </span>
            ) : null}
          </div>

          {!isSiteSelected ? (
            <div className="px-4 py-5 text-sm text-slate-500">
              Choose a site to view labour rows.
            </div>
          ) : isLaboursLoading ? (
            <div className="px-4 py-5 text-sm text-slate-500">
              Loading labour rows...
            </div>
          ) : labours.length === 0 ? (
            <div className="px-4 py-5 text-sm text-slate-500">
              No labour records are available for the selected site.
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto">
              {labours.map((labour, index) => {
                const isChecked = selectedLabourIds.includes(labour.labour_id);

                return (
                  <label
                    className="flex items-center justify-between gap-4 px-4 py-3 text-sm text-slate-700 odd:bg-slate-50/50"
                    key={labour.labour_id}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                        {index + 1}
                      </span>
                      <span className="truncate font-medium text-slate-900">
                        {labour.labour_name}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Present
                      <input
                        checked={isChecked}
                        className="h-4 w-4 rounded border-blue-200 text-blue-600 focus:ring-blue-500"
                        disabled={!isDateSelected || isAttendanceLoading || isSaving}
                        type="checkbox"
                        onChange={() => {
                          toggleLabourSelection(labour.labour_id);
                        }}
                      />
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
