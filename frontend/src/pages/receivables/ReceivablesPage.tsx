import { z } from "zod";

import { CrudModulePage } from "../../components/forms/CrudModulePage";
import { useAuth } from "../../hooks/useAuth";
import { useReferenceData } from "../../hooks/useReferenceData";
import { receivablesService } from "../../services/receivablesService";
import type { Receivable, ReceivableFormValues } from "../../types/erp.types";
import { getCrudPermissions } from "../../utils/permissions";

const receivableSchema = z.object({
  amount: z.number().gt(0, "Amount must be greater than zero."),
  date: z.string().min(1, "Invoice date is required."),
  party: z.number().min(1, "Party is required."),
  received_amount: z.number().min(0, "Received amount must be zero or more.").optional(),
  site: z.number().min(1, "Site is required."),
}).superRefine((value, context) => {
  if ((value.received_amount ?? 0) > value.amount) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Received amount cannot exceed invoice amount.",
      path: ["received_amount"],
    });
  }
});

export function ReceivablesPage() {
  const { user } = useAuth();
  const references = useReferenceData();
  const permissions = getCrudPermissions(user);
  const partyNameMap = new Map(
    references.parties.map((party) => [party.id, party.name]),
  );
  const siteNameMap = new Map(references.sites.map((site) => [site.id, site.name]));

  return (
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
          accessor: (row) => ((row.pending_amount ?? row.amount) > 0 ? "Pending" : "Received"),
          sortValue: (row) => ((row.pending_amount ?? row.amount) > 0 ? "Pending" : "Received"),
        },
        { key: "date", header: "Date", accessor: (row) => row.date, sortValue: (row) => row.date },
      ]}
      createLabel="Add Receivable"
      defaultValues={{
        amount: 0,
        date: new Date().toISOString().slice(0, 10),
        party: 0,
        received_amount: 0,
        site: 0,
      }}
      description="Track client invoices with partial receipt amounts and real pending balances."
      emptyDescription="No receivables have been recorded."
      emptyTitle="No receivables found"
      externalError={references.error}
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
          label: "Amount",
          min: 0,
          name: "amount",
          required: true,
          valueType: "number",
        },
        { kind: "date", label: "Invoice Date", name: "date", required: true },
        {
          kind: "number",
          label: "Received Amount",
          min: 0,
          name: "received_amount",
          required: true,
          valueType: "number",
        },
      ]}
      getEditValues={(entity) => ({
        amount: entity.amount,
        date: entity.date,
        party: entity.party,
        received_amount: entity.current_received_amount ?? 0,
        site: entity.site,
      })}
      getId={(entity) => entity.id}
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
        { label: "Received", value: (row) => row.received },
        { label: "Invoice Date", value: (row) => row.date },
        { label: "Current Received Amount", value: (row) => row.current_received_amount },
        { label: "Pending Amount", value: (row) => row.pending_amount, highlight: true },
        {
          label: "Status",
          value: (row) => ((row.pending_amount ?? row.amount) > 0 ? "Pending" : "Received"),
        },
      ]}
    />
  );
}
