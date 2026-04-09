import { z } from "zod";

import { CrudModulePage } from "../../components/forms/CrudModulePage";
import { useAuth } from "../../hooks/useAuth";
import { useReferenceData } from "../../hooks/useReferenceData";
import { paymentsService } from "../../services/paymentsService";
import type { Payment, PaymentFormValues } from "../../types/erp.types";
import { getCrudPermissions } from "../../utils/permissions";

const paymentSchema = z
  .object({
    auto_calculate_total: z.boolean(),
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
    if (!value.auto_calculate_total && value.total_amount <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Total amount must be greater than zero when auto calculation is off.",
        path: ["total_amount"],
      });
    }

    if (!value.auto_calculate_total && value.paid_amount > value.total_amount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Paid amount cannot exceed total amount.",
        path: ["paid_amount"],
      });
    }

    if (value.period_start && value.period_end && value.period_end < value.period_start) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Period end must be on or after period start.",
        path: ["period_end"],
      });
    }
  });

export function PaymentsPage() {
  const { user } = useAuth();
  const references = useReferenceData();
  const permissions = getCrudPermissions(user);
  const labourNameMap = new Map(
    references.labour.map((labour) => [labour.id, labour.name]),
  );
  const siteNameMap = new Map(references.sites.map((site) => [site.id, site.name]));

  return (
    <CrudModulePage<Payment, PaymentFormValues>
      canCreate={permissions.canCreate}
      canDelete={permissions.canDelete}
      canEdit={permissions.canEdit}
      columns={[
        {
          key: "labour",
          header: "Labour",
          accessor: (row) => labourNameMap.get(row.labour) || row.labour,
          sortValue: (row) => labourNameMap.get(row.labour) || row.labour,
        },
        {
          key: "site",
          header: "Site",
          accessor: (row) => (row.site ? siteNameMap.get(row.site) || row.site : "-"),
          sortValue: (row) => (row.site ? siteNameMap.get(row.site) || row.site : ""),
        },
        { key: "date", header: "Date", accessor: (row) => row.date || "-", sortValue: (row) => row.date || "" },
        { key: "total", header: "Total Amount", accessor: (row) => row.total_amount, sortValue: (row) => row.total_amount },
        { key: "paid", header: "Paid Amount", accessor: (row) => row.paid_amount, sortValue: (row) => row.paid_amount },
        { key: "pending", header: "Pending", accessor: (row) => row.pending_amount, sortValue: (row) => row.pending_amount },
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
          options: references.labour.map((labour) => ({ label: labour.name, value: labour.id })),
          required: true,
          valueType: "number",
        },
        {
          kind: "select",
          label: "Site",
          name: "site",
          options: references.sites.map((site) => ({ label: site.name, value: site.id })),
          description: "Optional. Leave blank to record a non-site-specific payment.",
          valueType: "number",
        },
        { kind: "date", label: "Payment Date", name: "date", required: true },
        {
          kind: "date",
          label: "Period Start",
          name: "period_start",
          description: "Used with attendance-based auto calculation.",
        },
        {
          kind: "date",
          label: "Period End",
          name: "period_end",
          description: "Used with attendance-based auto calculation.",
        },
        {
          kind: "checkbox",
          label: "Auto Calculate Total",
          name: "auto_calculate_total",
        },
        {
          kind: "number",
          label: "Total Amount",
          description: "Fill this manually only when auto calculation is off.",
          min: 0,
          name: "total_amount",
          required: true,
          valueType: "number",
        },
        {
          kind: "number",
          label: "Paid Amount",
          min: 0,
          name: "paid_amount",
          required: true,
          valueType: "number",
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
        auto_calculate_total: false,
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
      schema={paymentSchema}
      searchPlaceholder="Search payments"
      service={paymentsService}
      title="Payments"
    />
  );
}
