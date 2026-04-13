import { useMemo } from "react";

import type { Labour } from "../../types/erp.types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

interface LabourFilterProps {
  dateFrom: string;
  dateTo: string;
  isLoading?: boolean;
  labourId?: number;
  labourRecords: Labour[];
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onLabourIdChange: (value?: number) => void;
  onSubmit: () => void;
}

export function LabourFilter({
  dateFrom,
  dateTo,
  isLoading = false,
  labourId,
  labourRecords,
  onDateFromChange,
  onDateToChange,
  onLabourIdChange,
  onSubmit,
}: LabourFilterProps) {
  const filteredOptions = useMemo(
    () =>
      labourRecords
        .map((labour) => ({
          label: `${labour.name} (#${labour.id})`,
          value: labour.id,
        })),
    [labourRecords],
  );

  return (
    <section className="grid gap-4 rounded-2xl border border-blue-100/90 bg-white/94 p-4 shadow-md shadow-blue-950/5 dark:border-blue-100/90 dark:bg-white/94 lg:grid-cols-4">
      <Select
        description="Select a labour record to fetch the payment ledger report."
        label="Labour"
        options={filteredOptions}
        requiredIndicator
        value={labourId ?? ""}
        onChange={(event) =>
          onLabourIdChange(
            event.target.value ? Number(event.target.value) : undefined,
          )
        }
      />
      <Input
        label="Date From"
        type="date"
        value={dateFrom}
        onChange={(event) => onDateFromChange(event.target.value)}
      />
      <Input
        label="Date To"
        type="date"
        value={dateTo}
        onChange={(event) => onDateToChange(event.target.value)}
      />
      <div className="flex items-end">
        <Button className="w-full" isLoading={isLoading} onClick={onSubmit} type="button">
          Fetch Labour Report
        </Button>
      </div>
    </section>
  );
}
