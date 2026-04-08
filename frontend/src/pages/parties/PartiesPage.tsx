import { z } from "zod";

import { CrudModulePage } from "../../components/forms/CrudModulePage";
import { partiesService } from "../../services/partiesService";
import type { Party, PartyFormValues } from "../../types/erp.types";

const partySchema = z.object({
  contact: z.string().trim().min(1, "Contact is required."),
  name: z.string().trim().min(1, "Party name is required."),
});

export function PartiesPage() {
  return (
    <CrudModulePage<Party, PartyFormValues>
      canManage
      columns={[
        { key: "name", header: "Party", accessor: (row) => row.name, sortValue: (row) => row.name },
        { key: "contact", header: "Contact", accessor: (row) => row.contact, sortValue: (row) => row.contact },
      ]}
      createLabel="Add Party"
      defaultValues={{ contact: "", name: "" }}
      description="Maintain client or finance party master records for receivables."
      emptyDescription="No finance parties are available."
      emptyTitle="No parties found"
      fields={[
        { kind: "text", label: "Party Name", name: "name", placeholder: "Client or party name" },
        { kind: "text", label: "Contact", name: "contact", placeholder: "Phone or contact info" },
      ]}
      getEditValues={(entity) => ({ contact: entity.contact, name: entity.name })}
      getId={(entity) => entity.id}
      schema={partySchema}
      searchPlaceholder="Search parties"
      service={partiesService}
      title="Parties"
    />
  );
}
