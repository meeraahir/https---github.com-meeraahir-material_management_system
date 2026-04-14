import { z } from "zod";

import { CrudModulePage } from "../../components/forms/CrudModulePage";
import { useReferenceData } from "../../hooks/useReferenceData";
import { useAuth } from "../../hooks/useAuth";
import { casualLabourService } from "../../services/casualLabourService";
import type {
  CasualLabourEntry,
  CasualLabourEntryFormValues,
} from "../../types/erp.types";
import { getCrudPermissions } from "../../utils/permissions";

const casualLabourSchema = z.object({
  date: z.string().min(1, "Date is required."),
  labour_name: z
    .string()
    .trim()
    .min(2, "Labour name must be at least 2 characters.")
    .max(255, "Labour name must be 255 characters or fewer."),
  labour_type: z
    .string()
    .trim()
    .min(1, "Labour type is required.")
    .max(100, "Labour type must be 100 characters or fewer."),
  paid_amount: z.number().gt(0, "Paid amount must be greater than zero."),
  site: z.number().min(1, "Site is required."),
});

export function CasualLabourPage() {
  const { user } = useAuth();
  const references = useReferenceData();
  const permissions = getCrudPermissions(user);

  return (
    <CrudModulePage<CasualLabourEntry, CasualLabourEntryFormValues>
      canCreate={permissions.canCreate}
      canDelete={permissions.canDelete}
      canEdit={permissions.canEdit}
      columns={[
        {
          key: "labour_name",
          header: "Labour Name",
          accessor: (row) => row.labour_name,
          sortValue: (row) => row.labour_name,
        },
        {
          key: "labour_type",
          header: "Type",
          accessor: (row) => row.labour_type,
          sortValue: (row) => row.labour_type,
        },
        {
          key: "site_name",
          header: "Site",
          accessor: (row) => row.site_name,
          sortValue: (row) => row.site_name,
        },
        {
          key: "date",
          header: "Date",
          accessor: (row) => row.date,
          sortValue: (row) => row.date,
        },
        {
          key: "paid_amount",
          header: "Paid Amount",
          accessor: (row) => row.paid_amount,
          sortValue: (row) => row.paid_amount,
        },
      ]}
      createLabel="Add Casual Labour"
      defaultValues={{
        date: new Date().toISOString().slice(0, 10),
        labour_name: "",
        labour_type: "",
        paid_amount: 0,
        site: 0,
      }}
      description="Track ad hoc or casual labour payments separately from registered labour masters."
      emptyDescription="No casual labour entries are available."
      emptyTitle="No casual labour found"
      externalError={references.error}
      fields={[
        {
          kind: "text",
          label: "Labour Name",
          maxLength: 255,
          name: "labour_name",
          placeholder: "Worker name",
          required: true,
        },
        {
          kind: "text",
          label: "Labour Type",
          maxLength: 100,
          name: "labour_type",
          placeholder: "Helper, Mason, Loader...",
          required: true,
        },
        {
          kind: "select",
          label: "Site",
          name: "site",
          options: references.sites.map((site) => ({
            label: site.name,
            value: site.id,
          })),
          required: true,
          valueType: "number",
        },
        {
          kind: "date",
          label: "Date",
          name: "date",
          required: true,
        },
        {
          kind: "number",
          label: "Paid Amount",
          min: 0,
          name: "paid_amount",
          required: true,
          step: 0.01,
          valueType: "number",
        },
      ]}
      getEditValues={(entity) => ({
        date: entity.date,
        labour_name: entity.labour_name,
        labour_type: entity.labour_type,
        paid_amount: entity.paid_amount,
        site: entity.site,
      })}
      getId={(entity) => entity.id}
      schema={casualLabourSchema}
      searchPlaceholder="Search casual labour"
      service={casualLabourService}
      title="Casual Labour"
      viewFields={[
        { label: "Record ID", value: (row) => row.id, highlight: true },
        { label: "Labour Name", value: (row) => row.labour_name, highlight: true },
        { label: "Labour Type", value: (row) => row.labour_type },
        { label: "Site", value: (row) => row.site_name, highlight: true },
        { label: "Date", value: (row) => row.date },
        { label: "Paid Amount", value: (row) => row.paid_amount, highlight: true },
      ]}
    />
  );
}
