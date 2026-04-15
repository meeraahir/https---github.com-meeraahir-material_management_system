import { useEffect, useMemo, useState } from "react";

import { useToast } from "../../components/feedback/useToast";
import { Modal } from "../../components/modal/Modal";
import { Button } from "../../components/ui/Button";
import { FormError } from "../../components/ui/FormError";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { attendanceService } from "../../services/attendanceService";
import { labourService } from "../../services/labourService";
import { sitesService } from "../../services/sitesService";
import type { Attendance, AttendanceFormValues, Labour, Site } from "../../types/erp.types";
import { emitAttendanceUpdated } from "../../utils/attendance";
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

function isRegularLabour(labour: Labour) {
  return !/casual/i.test((labour.labour_type || "").trim());
}

function buildAttendanceRows({
  labours,
  selectedRowKeys,
  siteId,
}: {
  labours: Labour[];
  selectedRowKeys: Set<string>;
  siteId: number;
}) {
  if (!siteId) {
    return [];
  }

  return [...labours]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((labour) => {
      const rowKey = `regular-${siteId}-${labour.id}`;

      return {
        isPresent: selectedRowKeys.has(rowKey),
        key: rowKey,
        labourId: labour.id,
        labourName: labour.name,
        siteId,
      } satisfies LabourAttendanceRow;
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
  const [labours, setLabours] = useState<Labour[]>([]);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState(fixedSiteId ?? 0);
  const [siteOptions, setSiteOptions] = useState<Site[]>([]);
  const [formError, setFormError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hasFixedSite = Boolean(fixedSiteId);
  const rows = useMemo(
    () =>
      buildAttendanceRows({
        labours,
        selectedRowKeys: new Set(selectedRowKeys),
        siteId: selectedSiteId,
      }),
    [labours, selectedRowKeys, selectedSiteId],
  );
  const canSave =
    selectedDate.length > 0 &&
    selectedSiteId > 0 &&
    rows.length > 0 &&
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
    if (!open) {
      return;
    }

    let isMounted = true;

    async function loadReferenceData() {
      try {
        setIsLoading(true);
        setFormError("");

        const [loadedSites, loadedLabours] = await Promise.all([
          hasFixedSite
            ? Promise.resolve<Site[]>([
                {
                  description: "",
                  id: fixedSiteId || 0,
                  location: "",
                  name: fixedSiteName || `Site ${fixedSiteId}`,
                },
              ])
            : sitesService.getOptions(),
          labourService.getOptions(),
        ]);

        if (!isMounted) {
          return;
        }

        const sortedSites = [...loadedSites].sort((left, right) =>
          left.name.localeCompare(right.name),
        );
        const regularLabours = loadedLabours.filter(isRegularLabour);

        setSiteOptions(sortedSites);
        setLabours(regularLabours);
        setSelectedSiteId((currentValue) => {
          if (hasFixedSite) {
            return fixedSiteId || 0;
          }

          if (currentValue && sortedSites.some((site) => site.id === currentValue)) {
            return currentValue;
          }

          return sortedSites[0]?.id ?? 0;
        });
      } catch (error) {
        const message = getErrorMessage(error);

        if (!isMounted) {
          return;
        }

        setFormError(message);
        setAttendanceRows([]);
        setLabours([]);
        setSelectedRowKeys([]);
        setSiteOptions([]);
        showError("Unable to load attendance", message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadReferenceData();

    return () => {
      isMounted = false;
    };
  }, [fixedSiteId, fixedSiteName, hasFixedSite, open, showError]);

  useEffect(() => {
    if (!open || !selectedDate || !selectedSiteId) {
      return;
    }

    let isMounted = true;

    async function loadAttendanceScope() {
      try {
        setIsLoading(true);
        setFormError("");

        const loadedAttendance = await attendanceService.getBySiteAndDate(
          selectedSiteId,
          selectedDate,
        );

        if (!isMounted) {
          return;
        }

        setAttendanceRows(loadedAttendance);
        setSelectedRowKeys(
          loadedAttendance
            .filter((row) => row.present)
            .map((row) => `regular-${row.site}-${row.labour}`),
        );
      } catch (error) {
        const message = getErrorMessage(error);

        if (!isMounted) {
          return;
        }

        setFormError(message);
        setAttendanceRows([]);
        setSelectedRowKeys([]);
        showError("Unable to load attendance", message);
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
  }, [open, selectedDate, selectedSiteId, showError]);

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

    if (!selectedSiteId) {
      setFormError("Site is required.");
      return;
    }

    if (rows.length === 0) {
      setFormError("No regular labour rows are available for attendance.");
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

        console.log("Attendance Payload:", payload);

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
      const refreshedAttendance = await attendanceService.getBySiteAndDate(
        selectedSiteId,
        selectedDate,
      );

      setAttendanceRows(refreshedAttendance);
      setSelectedRowKeys(
        refreshedAttendance
          .filter((row) => row.present)
          .map((row) => `regular-${row.site}-${row.labour}`),
      );
      emitAttendanceUpdated({
        date: selectedDate,
        labourIds: rows.map((row) => row.labourId),
        siteId: selectedSiteId,
      });
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
          <Select
            clearable={false}
            disabled={hasFixedSite || isSaving}
            label="Site"
            options={siteOptions.map((site) => ({ label: site.name, value: site.id }))}
            placeholder="Select a site"
            requiredIndicator
            value={selectedSiteId || ""}
            onChange={(event) => {
              setSelectedSiteId(Number(event.target.value) || 0);
            }}
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
