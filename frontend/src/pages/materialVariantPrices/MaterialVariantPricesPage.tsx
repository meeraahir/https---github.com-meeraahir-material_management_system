import { z } from "zod";

import { CrudModulePage } from "../../components/forms/CrudModulePage";
import { useReferenceData } from "../../hooks/useReferenceData";
import { useAuth } from "../../hooks/useAuth";
import { materialVariantPricesService } from "../../services/materialsService";
import type {
  MaterialVariantPrice,
  MaterialVariantPriceFormValues,
} from "../../types/erp.types";
import { getCrudPermissions } from "../../utils/permissions";

const materialVariantPriceSchema = z.object({
  date: z.string().min(1, "Date is required."),
  notes: z.string().max(600, "Notes must be 600 characters or fewer."),
  price_per_unit: z.number().min(0, "Price per unit must be zero or more."),
  variant: z.number().min(1, "Variant is required."),
});

export function MaterialVariantPricesPage() {
  const { user } = useAuth();
  const references = useReferenceData();
  const permissions = getCrudPermissions(user);

  return (
    <CrudModulePage<MaterialVariantPrice, MaterialVariantPriceFormValues>
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
          key: "variant_label",
          header: "Variant",
          accessor: (row) =>
            row.variant_size_mm
              ? `${row.variant_label} (${row.variant_size_mm} mm)`
              : row.variant_label,
          sortValue: (row) => row.variant_label,
        },
        {
          key: "date",
          header: "Date",
          accessor: (row) => row.date,
          sortValue: (row) => row.date,
        },
        {
          key: "price_per_unit",
          header: "Price / Unit",
          accessor: (row) => row.price_per_unit,
          sortValue: (row) => row.price_per_unit,
        },
      ]}
      createLabel="Add Daily Price"
      defaultValues={{
        date: new Date().toISOString().slice(0, 10),
        notes: "",
        price_per_unit: 0,
        variant: 0,
      }}
      description="Track daily or latest prices for each material variant."
      emptyDescription="No variant prices are available yet."
      emptyTitle="No variant prices found"
      externalError={references.error}
      fields={[
        {
          kind: "select",
          label: "Variant",
          name: "variant",
          options: references.materialVariants.map((variant) => ({
            label: `${variant.material_name} | ${variant.label}${variant.size_mm ? ` (${variant.size_mm} mm)` : ""}`,
            value: variant.id,
          })),
          required: true,
          valueType: "number",
          wrapperClassName: "md:col-span-2",
        },
        {
          kind: "date",
          label: "Price Date",
          name: "date",
          required: true,
        },
        {
          kind: "number",
          label: "Price Per Unit",
          min: 0,
          name: "price_per_unit",
          required: true,
          step: 0.01,
          valueType: "number",
        },
        {
          kind: "textarea",
          label: "Notes",
          name: "notes",
          placeholder: "Market rate notes",
          rows: 4,
          wrapperClassName: "md:col-span-2",
        },
      ]}
      getEditValues={(entity) => ({
        date: entity.date,
        notes: entity.notes || "",
        price_per_unit: entity.price_per_unit,
        variant: entity.variant,
      })}
      getId={(entity) => entity.id}
      schema={materialVariantPriceSchema}
      searchPlaceholder="Search variant prices"
      service={materialVariantPricesService}
      title="Variant Prices"
      viewFields={[
        { label: "Record ID", value: (row) => row.id, highlight: true },
        { label: "Material", value: (row) => row.material_name, highlight: true },
        {
          label: "Variant",
          value: (row) =>
            row.variant_size_mm
              ? `${row.variant_label} (${row.variant_size_mm} mm)`
              : row.variant_label,
          highlight: true,
        },
        { label: "Price Date", value: (row) => row.date },
        { label: "Price Per Unit", value: (row) => row.price_per_unit, highlight: true },
        { label: "Notes", value: (row) => row.notes, span: "full" },
      ]}
    />
  );
}
