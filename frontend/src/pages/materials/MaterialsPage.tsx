import { z } from "zod";

import { CrudModulePage } from "../../components/forms/CrudModulePage";
import { materialsService } from "../../services/materialsService";
import type { Material, MaterialFormValues } from "../../types/erp.types";

const materialSchema = z.object({
  name: z.string().trim().min(1, "Material name is required."),
  unit: z.enum(["bag", "kg", "ton", "meter", "litre", "piece"]),
});

export function MaterialsPage() {
  return (
    <CrudModulePage<Material, MaterialFormValues>
      canManage
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
        { kind: "text", label: "Material Name", name: "name", placeholder: "Cement, Steel, Sand..." },
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
