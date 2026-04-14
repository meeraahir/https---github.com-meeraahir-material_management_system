import { z } from "zod";
import { useState } from "react";

import { CrudModulePage } from "../../components/forms/CrudModulePage";
import { ReceivePaymentModal } from "../../components/forms/ReceivePaymentModal";
import { useToast } from "../../components/feedback/useToast";
import { useAuth } from "../../hooks/useAuth";
import { useReferenceData } from "../../hooks/useReferenceData";
import { receivablesService } from "../../services/receivablesService";
import type { Receivable, ReceivableFormValues } from "../../types/erp.types";
import { getCrudPermissions } from "../../utils/permissions";

const receivableSchema = z.object({
  amount: z.number().gt(0, "Amount must be greater than zero."),
  date: z.string().min(1, "Date is required."),
  description: z.string().max(1000, "Description must be 1000 characters or fewer."),
  party: z.number().min(1, "Party is required."),
  phase_name: z.string().max(255, "Phase name must be 255 characters or fewer."),
  receipt_cheque_number: z.string().max(50, "Cheque number must be 50 characters or fewer.").optional().or(z.literal("")),
  receipt_payment_mode: z.enum(["cash", "check", "bank_transfer", "upi", "other"]).optional(),
  receipt_receiver_name: z.string().max(255, "Receiver name must be 255 characters or fewer.").optional().or(z.literal("")),
  receipt_sender_name: z.string().max(255, "Sender name must be 255 characters or fewer.").optional().or(z.literal("")),
  received_amount: z.number().min(0, "Received amount must be zero or more.").optional(),
  site: z.number().min(1, "Site is required."),
}).superRefine((value, context) => {
  if ((value.received_amount ?? 0) > value.amount) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Received amount cannot exceed total amount.",
      path: ["received_amount"],
    });
  }

  if ((value.received_amount ?? 0) > 0 && value.receipt_payment_mode === "cash") {
    if (!value.receipt_sender_name?.trim() && !value.receipt_receiver_name?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Sender name or receiver name is required for cash receipts.",
        path: ["receipt_sender_name"],
      });
    }
  }

  if ((value.received_amount ?? 0) > 0 && value.receipt_payment_mode === "check" && !value.receipt_cheque_number?.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Cheque number is required for check receipts.",
      path: ["receipt_cheque_number"],
    });
  }
});

function getReceivableStatus(row: Receivable) {
  const pendingAmount = row.pending_amount ?? row.amount;
  const receivedAmount = row.current_received_amount ?? 0;

  if (pendingAmount <= 0) {
    return "Received";
  }

  if (receivedAmount > 0) {
    return "Partial";
  }

  return "Pending";
}

export function ReceivablesPage() {
  const { showError } = useToast();
  const { user } = useAuth();
  const references = useReferenceData();
  const permissions = getCrudPermissions(user);
  const [paymentTarget, setPaymentTarget] = useState<Receivable | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const partyNameMap = new Map(
    references.parties.map((party) => [party.id, party.name]),
  );
  const siteNameMap = new Map(references.sites.map((site) => [site.id, site.name]));

  return (
    <>
      <CrudModulePage<Receivable, ReceivableFormValues>
        canCreate={permissions.canCreate}
        canDelete={permissions.canDelete}
        canEdit={permissions.canEdit}
        columns={[
          {
            key: "party",
            header: "Party",
            accessor: (row) => partyNameMap.get(row.party) || row.party,
            sortValue: (row) => partyNameMap.get(row.party) || row.party,
          },
          {
            key: "site",
            header: "Site",
            accessor: (row) => siteNameMap.get(row.site) || row.site,
            sortValue: (row) => siteNameMap.get(row.site) || row.site,
          },
          {
            key: "phase_name",
            header: "Phase",
            accessor: (row) => row.phase_name || "-",
            sortValue: (row) => row.phase_name || "",
          },
          { key: "amount", header: "Amount", accessor: (row) => row.amount, sortValue: (row) => row.amount },
          {
            key: "received_amount",
            header: "Received Amount",
            accessor: (row) => row.current_received_amount ?? 0,
            sortValue: (row) => row.current_received_amount ?? 0,
          },
          {
            key: "pending",
            header: "Pending Amount",
            accessor: (row) => row.pending_amount ?? row.amount,
            sortValue: (row) => row.pending_amount ?? row.amount,
          },
          {
            key: "status",
            header: "Status",
            accessor: (row) => getReceivableStatus(row),
            sortValue: (row) => getReceivableStatus(row),
          },
          { key: "date", header: "Date", accessor: (row) => row.date, sortValue: (row) => row.date },
        ]}
        createLabel="Add Receivable"
        defaultValues={{
          amount: 0,
          date: new Date().toISOString().slice(0, 10),
          description: "",
          party: 0,
          phase_name: "",
          receipt_cheque_number: "",
          receipt_payment_mode: "cash",
          receipt_receiver_name: "",
          receipt_sender_name: "",
          received_amount: 0,
          site: 0,
        }}
        description="Track client receivables with partial receipt amounts and real pending balances."
        emptyDescription="No receivables have been recorded."
        emptyTitle="No receivables found"
        externalError={references.error}
        extraActions={[
          {
            disabled: (row) => (row.pending_amount ?? row.amount) <= 0,
            label: "Receive",
            onClick: (row: Receivable) => {
              if ((row.pending_amount ?? row.amount) <= 0) {
                showError(
                  "Payment already received",
                  "This receivable is already fully collected.",
                );
                return;
              }

              setPaymentTarget(row);
            },
            variant: "secondary",
          },
        ]}
        fields={[
          {
            kind: "select",
            label: "Party",
            name: "party",
            options: references.parties.map((party) => ({ label: party.name, value: party.id })),
            required: true,
            valueType: "number",
          },
          {
            kind: "select",
            label: "Site",
            name: "site",
            options: references.sites.map((site) => ({ label: site.name, value: site.id })),
            required: true,
            valueType: "number",
          },
          {
            kind: "number",
            description: "Total amount raised to the party.",
            label: "Amount",
            min: 0,
            name: "amount",
            required: true,
            valueType: "number",
          },
          {
            kind: "text",
            label: "Phase Name",
            maxLength: 255,
            name: "phase_name",
            placeholder: "Plaster Work, Slab, Brickwork...",
          },
          { kind: "date", label: "Date", name: "date", required: true },
          {
            kind: "number",
            description: "Enter amount received so far. Leave 0 if nothing has been collected yet.",
            label: "Received Amount",
            min: 0,
            name: "received_amount",
            required: true,
            valueType: "number",
          },
          {
            kind: "select",
            label: "Receipt Payment Mode",
            name: "receipt_payment_mode",
            options: [
              { label: "Cash", value: "cash" },
              { label: "Check", value: "check" },
              { label: "Bank Transfer", value: "bank_transfer" },
              { label: "UPI", value: "upi" },
              { label: "Other", value: "other" },
            ],
          },
          {
            kind: "text",
            label: "Receipt Sender Name",
            maxLength: 255,
            name: "receipt_sender_name",
            placeholder: "Who sent the receipt payment",
          },
          {
            kind: "text",
            label: "Receipt Receiver Name",
            maxLength: 255,
            name: "receipt_receiver_name",
            placeholder: "Who received the receipt payment",
          },
          {
            kind: "text",
            label: "Receipt Cheque Number",
            maxLength: 50,
            name: "receipt_cheque_number",
            placeholder: "Required for check receipts",
          },
          {
            kind: "textarea",
            label: "Description",
            name: "description",
            placeholder: "Work description",
            rows: 4,
            wrapperClassName: "md:col-span-2",
          },
        ]}
        getEditValues={(entity) => ({
          amount: entity.amount,
          date: entity.date,
          description: entity.description || "",
          party: entity.party,
          phase_name: entity.phase_name || "",
          receipt_cheque_number: "",
          receipt_payment_mode: "cash",
          receipt_receiver_name: "",
          receipt_sender_name: "",
          received_amount: entity.current_received_amount ?? 0,
          site: entity.site,
        })}
        getId={(entity) => entity.id}
        refreshKey={refreshKey}
        schema={receivableSchema}
        searchPlaceholder="Search receivables"
        service={receivablesService}
        title="Receivables"
        viewFields={[
          { label: "Record ID", value: (row) => row.id, highlight: true },
          {
            label: "Party",
            value: (row) => partyNameMap.get(row.party),
            highlight: true,
          },
          {
            label: "Site",
            value: (row) => siteNameMap.get(row.site),
            highlight: true,
          },
          { label: "Amount", value: (row) => row.amount, highlight: true },
          { label: "Phase Name", value: (row) => row.phase_name },
          { label: "Description", value: (row) => row.description, span: "full" },
          { label: "Received", value: (row) => row.received },
          { label: "Date", value: (row) => row.date },
          { label: "Current Received Amount", value: (row) => row.current_received_amount },
          { label: "Pending Amount", value: (row) => row.pending_amount, highlight: true },
          {
            label: "Status",
            value: (row) => getReceivableStatus(row),
          },
          { label: "Receipt ID", value: (row) => row.receipt_id },
        ]}
      />

      <ReceivePaymentModal
        item={paymentTarget}
        onClose={() => setPaymentTarget(null)}
        onSubmit={async (values) => {
          if (!paymentTarget) {
            return;
          }

          await receivablesService.receivePayment(paymentTarget.id, values);
          setPaymentTarget(null);
          setRefreshKey((currentValue) => currentValue + 1);
        }}
        open={Boolean(paymentTarget)}
      />
    </>
  );
}
