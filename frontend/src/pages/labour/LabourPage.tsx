import { z } from "zod";

import { CrudModulePage } from "../../components/forms/CrudModulePage";
import { useAuth } from "../../hooks/useAuth";
import { labourService } from "../../services/labourService";
import type { Labour, LabourFormValues } from "../../types/erp.types";
import { getCrudPermissions } from "../../utils/permissions";

const labourSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Labour name must be at least 2 characters.")
    .max(80, "Labour name must be 80 characters or fewer."),
  per_day_wage: z.number().min(0, "Wage must be zero or more."),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10,15}$/, "Phone number must be 10 to 15 digits."),
});

export function LabourPage() {
  const { user } = useAuth();
  const permissions = getCrudPermissions(user);

  return (
    <CrudModulePage<Labour, LabourFormValues>
      canCreate={permissions.canCreate}
      canDelete={permissions.canDelete}
      canEdit={permissions.canEdit}
      columns={[
        { key: "name", header: "Labour", accessor: (row) => row.name, sortValue: (row) => row.name },
        { key: "phone", header: "Phone", accessor: (row) => row.phone, sortValue: (row) => row.phone },
        { key: "wage", header: "Per Day Wage", accessor: (row) => row.per_day_wage, sortValue: (row) => row.per_day_wage },
      ]}
      createLabel="Add Labour"
      defaultValues={{ name: "", per_day_wage: 0, phone: "" }}
      description="Track workers, contact details, and their daily wage values."
      emptyDescription="No labour records are available."
      emptyTitle="No labour found"
      fields={[
        {
          kind: "text",
          label: "Labour Name",
          maxLength: 80,
          minLength: 2,
          name: "name",
          placeholder: "Worker name",
          required: true,
        },
        {
          kind: "text",
          label: "Phone",
          maxLength: 15,
          minLength: 10,
          name: "phone",
          pattern: "[0-9]{10,15}",
          placeholder: "Contact number",
          required: true,
        },
        {
          kind: "number",
          label: "Per Day Wage",
          min: 0,
          name: "per_day_wage",
          placeholder: "500",
          required: true,
          step: 1,
          valueType: "number",
        },
      ]}
      getEditValues={(entity) => ({
        name: entity.name,
        per_day_wage: entity.per_day_wage,
        phone: entity.phone,
      })}
      getId={(entity) => entity.id}
      schema={labourSchema}
      searchPlaceholder="Search labour"
      service={labourService}
      title="Labour"
      viewFields={[
        { label: "Record ID", value: (row) => row.id, highlight: true },
        { label: "Labour Name", value: (row) => row.name, highlight: true },
        { label: "Phone", value: (row) => row.phone },
        { label: "Per Day Wage", value: (row) => row.per_day_wage },
      ]}
    />
  );
}
