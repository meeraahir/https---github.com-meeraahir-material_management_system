import { z } from "zod";

import { CrudModulePage } from "../../components/forms/CrudModulePage";
import { useReferenceData } from "../../hooks/useReferenceData";
import { paymentsService } from "../../services/paymentsService";
import type { Payment, PaymentFormValues } from "../../types/erp.types";

const paymentSchema = z
  .object({
    labour: z.number().min(1, "Labour is required."),
    paid_amount: z.number().min(0, "Paid amount must be zero or more."),
    total_amount: z.number().min(0, "Total amount must be zero or more."),
  })
  .refine((value) => value.paid_amount <= value.total_amount, {
    message: "Paid amount cannot exceed total amount.",
    path: ["paid_amount"],
  });

export function PaymentsPage() {
  const references = useReferenceData();
  const labourNameMap = new Map(
    references.labour.map((labour) => [labour.id, labour.name]),
  );

  return (
    <CrudModulePage<Payment, PaymentFormValues>
      canManage
      columns={[
        {
          key: "labour",
          header: "Labour",
          accessor: (row) => labourNameMap.get(row.labour) || row.labour,
          sortValue: (row) => labourNameMap.get(row.labour) || row.labour,
        },
        { key: "total", header: "Total Amount", accessor: (row) => row.total_amount, sortValue: (row) => row.total_amount },
        { key: "paid", header: "Paid Amount", accessor: (row) => row.paid_amount, sortValue: (row) => row.paid_amount },
        { key: "pending", header: "Pending", accessor: (row) => row.pending_amount, sortValue: (row) => row.pending_amount },
      ]}
      createLabel="Record Payment"
      defaultValues={{ labour: 0, paid_amount: 0, total_amount: 0 }}
      description="Track labour payment entries and pending balances."
      emptyDescription="No labour payments are available."
      emptyTitle="No payments found"
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
          kind: "number",
          label: "Total Amount",
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
      ]}
      getEditValues={(entity) => ({
        labour: entity.labour,
        paid_amount: entity.paid_amount,
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
