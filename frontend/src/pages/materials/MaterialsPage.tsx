import { z } from "zod";

import { CrudModulePage } from "../../components/forms/CrudModulePage";
import { useAuth } from "../../hooks/useAuth";
import { materialsService } from "../../services/materialsService";
import type { Material, MaterialFormValues } from "../../types/erp.types";
import { getCrudPermissions } from "../../utils/permissions";

const materialSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Material name must be at least 2 characters.")
    .max(60, "Material name must be 60 characters or fewer."),
  unit: z.enum(["bag", "kg", "ton", "meter", "litre", "piece"]),
});

export function MaterialsPage() {
  const { user } = useAuth();
  const permissions = getCrudPermissions(user);

  return (
    <CrudModulePage<Material, MaterialFormValues>
      canCreate={permissions.canCreate}
      canDelete={permissions.canDelete}
      canEdit={permissions.canEdit}
      columns={[
        { key: "name", header: "Material", accessor: (row) => row.name, sortValue: (row) => row.name },
        { key: "unit", header: "Unit", accessor: (row) => row.unit, sortValue: (row) => row.unit },
      ]}
      createLabel="Add Material"
      defaultValues={{ name: "", unit: "bag" }}
      description="Maintain your material master catalog for receipts and purchase tracking."
      emptyDescription="Create the first material to start stock tracking."
      emptyTitle="No materials found"
      fields={[
        {
          kind: "text",
          label: "Material Name",
          maxLength: 60,
          minLength: 2,
          name: "name",
          placeholder: "Cement, Steel, Sand...",
          required: true,
        },
        {
          kind: "select",
          label: "Unit",
          name: "unit",
          options: [
            { label: "Bag", value: "bag" },
            { label: "Kilogram", value: "kg" },
            { label: "Ton", value: "ton" },
            { label: "Meter", value: "meter" },
            { label: "Litre", value: "litre" },
            { label: "Piece", value: "piece" },
          ],
          required: true,
        },
      ]}
      getEditValues={(entity) => ({ name: entity.name, unit: entity.unit })}
      getId={(entity) => entity.id}
      schema={materialSchema}
      searchPlaceholder="Search materials"
      service={materialsService}
      title="Materials"
    />
  );
}
