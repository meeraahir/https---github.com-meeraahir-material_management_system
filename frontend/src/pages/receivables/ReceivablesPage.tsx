import { z } from "zod";

import { CrudModulePage } from "../../components/forms/CrudModulePage";
import { useAuth } from "../../hooks/useAuth";
import { useReferenceData } from "../../hooks/useReferenceData";
import { receivablesService } from "../../services/receivablesService";
import type { Receivable, ReceivableFormValues } from "../../types/erp.types";
import { getCrudPermissions } from "../../utils/permissions";

const receivableSchema = z.object({
  amount: z.number().gt(0, "Amount must be greater than zero."),
  party: z.number().min(1, "Party is required."),
  received: z.boolean(),
  site: z.number().min(1, "Site is required."),
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
        { key: "received", header: "Received", accessor: (row) => (row.received ? "Yes" : "No"), sortValue: (row) => row.received },
        { key: "date", header: "Date", accessor: (row) => row.date, sortValue: (row) => row.date },
      ]}
      createLabel="Add Receivable"
      defaultValues={{ amount: 0, party: 0, received: false, site: 0 }}
      description="Record receivables and mark whether client payments have been received."
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
        { kind: "checkbox", label: "Received", name: "received" },
      ]}
      getEditValues={(entity) => ({
        amount: entity.amount,
        party: entity.party,
        received: entity.received,
        site: entity.site,
      })}
      getId={(entity) => entity.id}
      schema={receivableSchema}
      searchPlaceholder="Search receivables"
      service={receivablesService}
      title="Receivables"
    />
  );
}
