import { z } from "zod";

import { CrudModulePage } from "../../components/forms/CrudModulePage";
import { useAuth } from "../../hooks/useAuth";
import { partiesService } from "../../services/partiesService";
import type { Party, PartyFormValues } from "../../types/erp.types";
import { getCrudPermissions } from "../../utils/permissions";

const partySchema = z.object({
  contact: z
    .string()
    .trim()
    .min(3, "Contact must be at least 3 characters.")
    .max(80, "Contact must be 80 characters or fewer."),
  name: z
    .string()
    .trim()
    .min(2, "Party name must be at least 2 characters.")
    .max(100, "Party name must be 100 characters or fewer."),
});

export function PartiesPage() {
  const { user } = useAuth();
  const permissions = getCrudPermissions(user);

  return (
    <CrudModulePage<Party, PartyFormValues>
      canCreate={permissions.canCreate}
      canDelete={permissions.canDelete}
      canEdit={permissions.canEdit}
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
        {
          kind: "text",
          label: "Party Name",
          maxLength: 100,
          minLength: 2,
          name: "name",
          placeholder: "Client or party name",
          required: true,
        },
        {
          kind: "text",
          label: "Contact",
          maxLength: 80,
          minLength: 3,
          name: "contact",
          placeholder: "Phone or contact info",
          required: true,
        },
      ]}
      getEditValues={(entity) => ({ contact: entity.contact, name: entity.name })}
      getId={(entity) => entity.id}
      schema={partySchema}
      searchPlaceholder="Search parties"
      service={partiesService}
      title="Parties"
      viewFields={[
        { label: "Record ID", value: (row) => row.id, highlight: true },
        { label: "Party Name", value: (row) => row.name, highlight: true },
        { label: "Contact", value: (row) => row.contact },
      ]}
    />
  );
}
