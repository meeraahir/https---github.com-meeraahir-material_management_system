import { useCallback, useMemo, useRef } from "react";
import type { UseFormSetValue } from "react-hook-form";
import { z } from "zod";

import { CrudModulePage } from "../../components/forms/CrudModulePage";
import { useAuth } from "../../hooks/useAuth";
import { useReferenceData } from "../../hooks/useReferenceData";
import { attendanceReportsService } from "../../services/attendanceService";
import { paymentsService } from "../../services/paymentsService";
import type { Payment, PaymentFormValues } from "../../types/erp.types";
import { formatDate } from "../../utils/format";
import { getCrudPermissions } from "../../utils/permissions";

const paymentSchema = z
  .object({
    auto_calculate_total: z.boolean().optional().default(true),
    date: z.string().min(1, "Payment date is required."),
    labour: z.number().min(1, "Labour is required."),
    notes: z
      .string()
      .max(600, "Notes must be 600 characters or fewer.")
      .optional()
      .or(z.literal("")),
    paid_amount: z.number().min(0, "Paid amount must be zero or more."),
    period_end: z.string().optional(),
    period_start: z.string().optional(),
    site: z.number().min(0, "Site is invalid.").optional(),
    total_amount: z.number().min(0, "Total amount must be zero or more."),
  })
  .superRefine((value, context) => {
    const isAutoCalculateEnabled = value.auto_calculate_total ?? true;

    if (!isAutoCalculateEnabled && value.total_amount <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Total amount must be greater than zero when auto calculation is off.",
        path: ["total_amount"],
      });
    }

    if (!isAutoCalculateEnabled && value.paid_amount > value.total_amount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Paid amount cannot exceed total amount.",
        path: ["paid_amount"],
      });
    }

    if (
      value.period_start &&
      value.period_end &&
      value.period_end < value.period_start
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Period end must be on or after period start.",
        path: ["period_end"],
      });
    }
  });

function getPaymentStatus(row: Payment) {
  if (row.pending_amount <= 0) {
    return "Paid";
  }

  if (row.paid_amount > 0) {
    return "Partial";
  }

  return "Pending";
}

export function PaymentsPage() {
  const { user } = useAuth();
  const references = useReferenceData();
  const permissions = getCrudPermissions(user);
  const calculationRequestRef = useRef(0);
  const lastCalculationKeyRef = useRef("");
  const labourNameMap = new Map(
    references.labour.map((labour) => [labour.id, labour.name]),
  );
  const siteNameMap = new Map(
    references.sites.map((site) => [site.id, site.name]),
  );
  const labourWageMap = useMemo(
    () =>
      new Map(
        references.labour.map((labour) => [labour.id, labour.per_day_wage]),
      ),
    [references.labour],
  );

  const syncAutoCalculatedTotal = useCallback(
    async ({
      setValue,
      values,
    }: {
      setValue: UseFormSetValue<PaymentFormValues>;
      values: Partial<PaymentFormValues>;
    }) => {
      const labourId = Number(values.labour) || 0;
      const periodStart = values.period_start || "";
      const periodEnd = values.period_end || "";
      const siteId = Number(values.site) || 0;
      const currentTotal = Number(values.total_amount) || 0;
      const calculationKey = `${labourId}|${siteId}|${periodStart}|${periodEnd}`;

      if (!labourId || !periodStart || !periodEnd || periodEnd < periodStart) {
        if (lastCalculationKeyRef.current === calculationKey && currentTotal === 0) {
          return;
        }

        lastCalculationKeyRef.current = calculationKey;

        if (currentTotal !== 0) {
          setValue("total_amount", 0, {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: true,
          });
        }

        return;
      }

      if (lastCalculationKeyRef.current === calculationKey) {
        return;
      }

      lastCalculationKeyRef.current = calculationKey;

      const requestId = ++calculationRequestRef.current;

      try {
        const attendance = await attendanceReportsService.getLabourAttendance(
          labourId,
          {
            dateFrom: periodStart,
            dateTo: periodEnd,
          },
        );

        if (requestId !== calculationRequestRef.current) {
          return;
        }

        const presentDays = attendance.filter(
          (row) => row.present && (!siteId || row.site === siteId),
        ).length;
        const totalAmount = Number(
          (presentDays * (labourWageMap.get(labourId) || 0)).toFixed(2),
        );

        if (currentTotal !== totalAmount) {
          setValue("total_amount", totalAmount, {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: true,
          });
        }
      } catch {
        if (requestId !== calculationRequestRef.current) {
          return;
        }

        if (currentTotal !== 0) {
          setValue("total_amount", 0, {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: true,
          });
        }
      }
    },
    [labourWageMap],
  );

  return (
    <CrudModulePage<Payment, PaymentFormValues>
      canCreate={permissions.canCreate}
      canDelete={permissions.canDelete}
      canEdit={permissions.canEdit}
      columns={[
        {
          key: "labour",
          header: "Labour",
          accessor: (row) =>
            row.labour_name || labourNameMap.get(row.labour) || row.labour,
          sortValue: (row) =>
            row.labour_name || labourNameMap.get(row.labour) || row.labour,
        },
        {
          key: "site",
          header: "Site",
          accessor: (row) =>
            row.site_name ||
            (row.site ? siteNameMap.get(row.site) || row.site : "-"),
          sortValue: (row) =>
            row.site_name ||
            (row.site ? siteNameMap.get(row.site) || row.site : ""),
        },
        {
          key: "date",
          header: "Date",
          accessor: (row) => formatDate(row.date),
          sortValue: (row) => row.date || "",
        },
        {
          key: "total",
          header: "Total Amount",
          accessor: (row) => row.total_amount,
          sortValue: (row) => row.total_amount,
        },
        {
          key: "paid",
          header: "Paid Amount",
          accessor: (row) => row.paid_amount,
          sortValue: (row) => row.paid_amount,
        },
        {
          key: "pending",
          header: "Pending",
          accessor: (row) => row.pending_amount,
          sortValue: (row) => row.pending_amount,
        },
        {
          key: "period",
          header: "Period",
          accessor: (row) =>
            row.period_start || row.period_end
              ? `${formatDate(row.period_start)} to ${formatDate(row.period_end)}`
              : "-",
          sortValue: (row) => row.period_start || row.period_end || "",
        },
        {
          key: "status",
          header: "Status",
          accessor: (row) => getPaymentStatus(row),
          sortValue: (row) => getPaymentStatus(row),
        },
        {
          key: "attendance",
          header: "Attendance Days",
          accessor: (row) => row.attendance_days ?? "-",
          sortValue: (row) => row.attendance_days ?? -1,
        },
      ]}
      createLabel="Record Payment"
      defaultValues={{
        auto_calculate_total: true,
        date: new Date().toISOString().slice(0, 10),
        labour: 0,
        notes: "",
        paid_amount: 0,
        period_end: "",
        period_start: "",
        site: 0,
        total_amount: 0,
      }}
      description="Record labour wage entries with site, period, and optional auto-calculated totals."
      emptyDescription="No labour payments are available."
      emptyTitle="No payments found"
      externalError={references.error}
      fields={[
        {
          kind: "select",
          label: "Labour",
          name: "labour",
          options: references.labour.map((labour) => ({
            label: labour.name,
            value: labour.id,
          })),
          required: true,
          valueType: "number",
          wrapperClassName: "md:col-span-1",
        },
        {
          kind: "select",
          label: "Site",
          name: "site",
          options: references.sites.map((site) => ({
            label: site.name,
            value: site.id,
          })),
          valueType: "number",
          wrapperClassName: "md:col-span-1",
        },
        {
          kind: "date",
          label: "Payment Date",
          name: "date",
          required: true,
          wrapperClassName: "md:col-span-1",
        },
        {
          kind: "date",
          label: "Period Start",
          name: "period_start",
          wrapperClassName: "md:col-span-1",
        },
        {
          kind: "date",
          label: "Period End",
          name: "period_end",
          wrapperClassName: "md:col-span-1",
        },
        {
          kind: "number",
          description: "Auto-filled from selected labour attendance and period.",
          label: "Total Amount",
          min: 0,
          name: "total_amount",
          required: true,
          readOnly: true,
          valueType: "number",
          wrapperClassName: "md:col-span-1",
        },
        {
          kind: "number",
          description: "Enter the amount actually paid now. Pending is calculated automatically.",
          label: "Paid Amount",
          min: 0,
          name: "paid_amount",
          required: true,
          valueType: "number",
          wrapperClassName: "md:col-span-1",
        },
        {
          kind: "textarea",
          label: "Notes",
          name: "notes",
          placeholder: "Optional payment notes",
          rows: 4,
          wrapperClassName: "md:col-span-2",
        },
      ]}
      getEditValues={(entity) => ({
        auto_calculate_total: true,
        date: entity.date || new Date().toISOString().slice(0, 10),
        labour: entity.labour,
        notes: entity.notes || "",
        paid_amount: entity.paid_amount,
        period_end: entity.period_end || "",
        period_start: entity.period_start || "",
        site: entity.site || 0,
        total_amount: entity.total_amount,
      })}
      getId={(entity) => entity.id}
      onFormValuesChange={syncAutoCalculatedTotal}
      schema={paymentSchema}
      searchPlaceholder="Search payments"
      service={paymentsService}
      title="Payments"
      viewFields={[
        { label: "Record ID", value: (row) => row.id, highlight: true },
        {
          label: "Labour",
          value: (row) => row.labour_name || labourNameMap.get(row.labour),
          highlight: true,
        },
        {
          label: "Site",
          value: (row) =>
            row.site_name || (row.site ? siteNameMap.get(row.site) : ""),
          highlight: true,
        },
        { label: "Payment Date", value: (row) => formatDate(row.date) },
        { label: "Period Start", value: (row) => formatDate(row.period_start) },
        { label: "Period End", value: (row) => formatDate(row.period_end) },
        {
          label: "Total Amount",
          value: (row) => row.total_amount,
          highlight: true,
        },
        {
          label: "Paid Amount",
          value: (row) => row.paid_amount,
          highlight: true,
        },
        {
          label: "Pending Amount",
          value: (row) => row.pending_amount,
          highlight: true,
        },
        { label: "Payment Status", value: (row) => getPaymentStatus(row), highlight: true },
        {
          label: "Calculated Total Amount",
          value: (row) => row.calculated_total_amount,
        },
        { label: "Attendance Days", value: (row) => row.attendance_days },
        { label: "Notes", value: (row) => row.notes, span: "full" },
      ]}
    />
  );
}
