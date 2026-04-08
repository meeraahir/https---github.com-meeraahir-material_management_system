import { z } from "zod";

import { CrudModulePage } from "../../components/forms/CrudModulePage";
import { labourService } from "../../services/labourService";
import type { Labour, LabourFormValues } from "../../types/erp.types";

const labourSchema = z.object({
  name: z.string().trim().min(1, "Labour name is required."),
  per_day_wage: z.number().min(0, "Wage must be zero or more."),
  phone: z.string().trim().min(1, "Phone number is required."),
});

export function LabourPage() {
  return (
    <CrudModulePage<Labour, LabourFormValues>
      canManage
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
        { kind: "text", label: "Labour Name", name: "name", placeholder: "Worker name" },
        { kind: "text", label: "Phone", name: "phone", placeholder: "Contact number" },
        { kind: "number", label: "Per Day Wage", min: 0, name: "per_day_wage", placeholder: "500", step: 1, valueType: "number" },
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
    />
  );
}
