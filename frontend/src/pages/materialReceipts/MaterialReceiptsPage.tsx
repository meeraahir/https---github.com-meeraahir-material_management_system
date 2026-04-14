import { z } from "zod";

import { CrudModulePage } from "../../components/forms/CrudModulePage";
import { useAuth } from "../../hooks/useAuth";
import { useReferenceData } from "../../hooks/useReferenceData";
import { materialReceiptsService } from "../../services/materialReceiptsService";
import type { Receipt, ReceiptFormValues } from "../../types/erp.types";
import { formatNumber } from "../../utils/format";
import { getCrudPermissions } from "../../utils/permissions";

const receiptSchema = z.object({
  cost_per_unit: z.number().min(0, "Cost per unit must be zero or more.").optional(),
  date: z.string().min(1, "Receipt date is required."),
  invoice_number: z.string().optional().or(z.literal("")),
  material: z.number().min(1, "Material is required."),
  material_variant: z.number().min(0, "Variant is invalid.").optional(),
  notes: z
    .string()
    .max(600, "Notes must be 600 characters or fewer.")
    .optional()
    .or(z.literal("")),
  quantity_received: z.number().gt(0, "Received quantity must be greater than zero."),
  quantity_used: z.number().min(0, "Used quantity must be zero or more."),
  site: z.number().min(1, "Site is required."),
  transport_cost: z.number().min(0, "Transport cost must be zero or more."),
}).refine((value) => value.quantity_used <= value.quantity_received, {
  message: "Used quantity cannot exceed received quantity.",
  path: ["quantity_used"],
});

const unitLabels: Record<string, { singular: string; plural: string }> = {
  bag: { singular: "bag", plural: "bags" },
  kg: { singular: "kg", plural: "kg" },
  litre: { singular: "litre", plural: "litres" },
  meter: { singular: "meter", plural: "meters" },
  other: { singular: "other", plural: "other" },
  piece: { singular: "piece", plural: "pieces" },
  ton: { singular: "ton", plural: "tons" },
};

function getUnitLabel(unit: string) {
  return unitLabels[unit]?.singular ?? unit;
}

function getQuantityLabel(quantity: number, unit: string) {
  const unitLabel = quantity === 1
    ? unitLabels[unit]?.singular ?? unit
    : unitLabels[unit]?.plural ?? unit;

  return `${formatNumber(quantity)} ${unitLabel}`;
}

function getCostPerUnitLabel(row: Receipt) {
  return `${formatNumber(row.cost_per_unit)} / ${getUnitLabel(row.material_unit)}`;
}

function getTotalCostCalculation(row: Receipt) {
  return `${formatNumber(row.quantity_received)} x ${formatNumber(row.cost_per_unit)} + ${formatNumber(row.transport_cost)} = ${formatNumber(row.total_cost)}`;
}

function getStockStatus(row: Receipt) {
  if (row.remaining_stock <= 0) {
    return "Used";
  }

  if (row.remaining_stock <= row.quantity_received * 0.25) {
    return "Low";
  }

  return "Available";
}

export function MaterialReceiptsPage() {
  const { user } = useAuth();
  const references = useReferenceData();
  const permissions = getCrudPermissions(user);

  return (
    <CrudModulePage<Receipt, ReceiptFormValues>
      canCreate={permissions.canCreate}
      canDelete={permissions.canDelete}
      canEdit={permissions.canEdit}
      columns={[
        { key: "site", header: "Site", accessor: (row) => row.site_name, sortValue: (row) => row.site_name },
        { key: "material", header: "Material", accessor: (row) => row.material_name, sortValue: (row) => row.material_name },
        {
          key: "variant",
          header: "Variant",
          accessor: (row) =>
            row.material_variant_label
              ? row.material_variant_size_mm
                ? `${row.material_variant_label} (${row.material_variant_size_mm} mm)`
                : row.material_variant_label
              : "-",
          sortValue: (row) => row.material_variant_label || "",
        },
        { key: "unit", header: "Unit", accessor: (row) => getUnitLabel(row.material_unit), sortValue: (row) => row.material_unit },
        { key: "date", header: "Date", accessor: (row) => row.date_display || row.date, sortValue: (row) => row.date },
        { key: "cost", header: "Total Cost", accessor: (row) => row.total_cost, sortValue: (row) => row.total_cost },
        { key: "status", header: "Stock Status", accessor: (row) => getStockStatus(row), sortValue: (row) => getStockStatus(row) },
      ]}
      createLabel="Add Receipt"
      defaultValues={{
        cost_per_unit: undefined,
        date: new Date().toISOString().slice(0, 10),
        invoice_number: "",
        material: 0,
        material_variant: 0,
        notes: "",
        quantity_received: 0,
        quantity_used: 0,
        site: 0,
        transport_cost: 0,
      }}
      description="Record material inflow, usage, and stock costs across sites."
      emptyDescription="No material receipts have been recorded."
      emptyTitle="No receipts found"
      externalError={references.error}
      fields={[
        {
          kind: "select",
          label: "Site",
          name: "site",
          options: references.sites.map((site) => ({ label: site.name, value: site.id })),
          required: true,
          valueType: "number",
        },
        {
          kind: "select",
          label: "Material",
          name: "material",
          options: references.materials.map((material) => ({ label: material.name, value: material.id })),
          required: true,
          valueType: "number",
        },
        {
          clearable: true,
          kind: "select",
          label: "Material Variant",
          name: "material_variant",
          options: references.materialVariants.map((variant) => ({
            label: `${variant.material_name} | ${variant.label}${variant.size_mm ? ` (${variant.size_mm} mm)` : ""}`,
            value: variant.id,
          })),
          valueType: "number",
        },
        { kind: "date", label: "Receipt Date", name: "date", required: true },
        {
          kind: "number",
          description: "Fresh material received in this entry.",
          label: "Quantity Received",
          min: 0,
          name: "quantity_received",
          required: true,
          valueType: "number",
        },
        {
          kind: "number",
          description: "Material consumed from this receipt. It cannot be greater than received quantity.",
          label: "Quantity Used",
          min: 0,
          name: "quantity_used",
          required: true,
          valueType: "number",
        },
        {
          kind: "number",
          emptyValue: "undefined",
          label: "Cost Per Unit",
          min: 0,
          name: "cost_per_unit",
          step: 0.01,
          valueType: "number",
        },
        {
          kind: "number",
          label: "Transport Cost",
          min: 0,
          name: "transport_cost",
          required: true,
          valueType: "number",
        },
        {
          kind: "textarea",
          label: "Notes",
          name: "notes",
          placeholder: "Transport, batch, or delivery notes",
          rows: 4,
          wrapperClassName: "md:col-span-2",
        },
      ]}
      getEditValues={(entity) => ({
        cost_per_unit: entity.cost_per_unit,
        date: entity.date,
        invoice_number: entity.invoice_number || "",
        material: entity.material,
        material_variant: entity.material_variant || 0,
        notes: entity.notes || "",
        quantity_received: entity.quantity_received,
        quantity_used: entity.quantity_used,
        site: entity.site,
        transport_cost: entity.transport_cost,
      })}
      getId={(entity) => entity.id}
      schema={receiptSchema}
      searchPlaceholder="Search receipts by material or site"
      service={materialReceiptsService}
      title="Material Receipts"
      viewFields={[
        { label: "Record ID", value: (row) => row.id, highlight: true },
        { label: "Site", value: (row) => row.site_name, highlight: true },
        { label: "Material", value: (row) => row.material_name, highlight: true },
        {
          label: "Material Variant",
          value: (row) =>
            row.material_variant_label
              ? row.material_variant_size_mm
                ? `${row.material_variant_label} (${row.material_variant_size_mm} mm)`
                : row.material_variant_label
              : "-",
        },
        { label: "Material Unit", value: (row) => getUnitLabel(row.material_unit) },
        { label: "Variant Unit Weight", value: (row) => row.material_variant_unit_weight },
        { label: "Quantity Received", value: (row) => getQuantityLabel(row.quantity_received, row.material_unit), highlight: true },
        { label: "Quantity Used", value: (row) => getQuantityLabel(row.quantity_used, row.material_unit) },
        { label: "Remaining Stock", value: (row) => getQuantityLabel(row.remaining_stock, row.material_unit), highlight: true },
        { label: "Cost Per Unit", value: (row) => getCostPerUnitLabel(row) },
        { label: "Transport Cost", value: (row) => row.transport_cost },
        { label: "Receipt Date", value: (row) => row.date_display || row.date },
        { label: "Total Cost", value: (row) => row.total_cost, highlight: true },
        { label: "Stock Status", value: (row) => getStockStatus(row), highlight: true },
        { label: "Total Calculation", value: (row) => getTotalCostCalculation(row), span: "full" },
        { label: "Notes", value: (row) => row.notes, span: "full" },
      ]}
    />
  );
}
