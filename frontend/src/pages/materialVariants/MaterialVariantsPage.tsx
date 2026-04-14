import { z } from "zod";

import { CrudModulePage } from "../../components/forms/CrudModulePage";
import { useReferenceData } from "../../hooks/useReferenceData";
import { useAuth } from "../../hooks/useAuth";
import { materialVariantsService } from "../../services/materialsService";
import type {
  MaterialVariant,
  MaterialVariantFormValues,
} from "../../types/erp.types";
import { getCrudPermissions } from "../../utils/permissions";

const materialVariantSchema = z.object({
  is_active: z.boolean(),
  label: z
    .string()
    .trim()
    .min(1, "Variant label is required.")
    .max(100, "Variant label must be 100 characters or fewer."),
  material: z.number().min(1, "Material is required."),
  size_mm: z.number().gt(0, "Size in mm must be greater than zero."),
  unit_weight: z.number().gt(0, "Unit weight must be greater than zero."),
});

export function MaterialVariantsPage() {
  const { user } = useAuth();
  const references = useReferenceData();
  const permissions = getCrudPermissions(user);

  return (
    <CrudModulePage<MaterialVariant, MaterialVariantFormValues>
      canCreate={permissions.canCreate}
      canDelete={permissions.canDelete}
      canEdit={permissions.canEdit}
      columns={[
        {
          key: "material_name",
          header: "Material",
          accessor: (row) => row.material_name,
          sortValue: (row) => row.material_name,
        },
        {
          key: "label",
          header: "Variant",
          accessor: (row) => row.label,
          sortValue: (row) => row.label,
        },
        {
          key: "size_mm",
          header: "Size (mm)",
          accessor: (row) => row.size_mm ?? "-",
          sortValue: (row) => row.size_mm ?? 0,
        },
        {
          key: "unit_weight",
          header: "Unit Weight",
          accessor: (row) => row.unit_weight ?? "-",
          sortValue: (row) => row.unit_weight ?? 0,
        },
        {
          key: "current_price",
          header: "Current Price",
          accessor: (row) => row.current_price ?? "-",
          sortValue: (row) => row.current_price ?? 0,
        },
        {
          key: "is_active",
          header: "Active",
          accessor: (row) => (row.is_active ? "Yes" : "No"),
          sortValue: (row) => row.is_active,
        },
      ]}
      createLabel="Add Variant"
      defaultValues={{
        is_active: true,
        label: "",
        material: 0,
        size_mm: 0,
        unit_weight: 0,
      }}
      description="Manage material variants like steel sizes and their unit weights."
      emptyDescription="No material variants are available yet."
      emptyTitle="No material variants found"
      externalError={references.error}
      fields={[
        {
          kind: "select",
          label: "Material",
          name: "material",
          options: references.materials.map((material) => ({
            label: material.name,
            value: material.id,
          })),
          required: true,
          valueType: "number",
        },
        {
          kind: "text",
          label: "Variant Label",
          maxLength: 100,
          name: "label",
          placeholder: "8mm, 10mm, Grade A...",
          required: true,
        },
        {
          kind: "number",
          label: "Size (mm)",
          min: 0,
          name: "size_mm",
          required: true,
          step: 0.01,
          valueType: "number",
        },
        {
          kind: "number",
          label: "Unit Weight",
          min: 0,
          name: "unit_weight",
          required: true,
          step: 0.001,
          valueType: "number",
        },
        {
          description: "Disable variants you no longer want to use in forms.",
          kind: "checkbox",
          label: "Active Variant",
          name: "is_active",
          wrapperClassName: "md:col-span-2",
        },
      ]}
      getEditValues={(entity) => ({
        is_active: entity.is_active,
        label: entity.label,
        material: entity.material,
        size_mm: entity.size_mm ?? 0,
        unit_weight: entity.unit_weight ?? 0,
      })}
      getId={(entity) => entity.id}
      schema={materialVariantSchema}
      searchPlaceholder="Search variants by label or material"
      service={materialVariantsService}
      title="Material Variants"
      viewFields={[
        { label: "Record ID", value: (row) => row.id, highlight: true },
        { label: "Material", value: (row) => row.material_name, highlight: true },
        { label: "Material Unit", value: (row) => row.material_unit },
        { label: "Variant Label", value: (row) => row.label, highlight: true },
        { label: "Size (mm)", value: (row) => row.size_mm },
        { label: "Unit Weight", value: (row) => row.unit_weight },
        { label: "Current Price", value: (row) => row.current_price },
        { label: "Current Price Date", value: (row) => row.current_price_date },
        { label: "Active", value: (row) => row.is_active, highlight: true },
      ]}
    />
  );
}
