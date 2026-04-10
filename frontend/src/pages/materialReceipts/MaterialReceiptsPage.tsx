import { z } from "zod";

import { CrudModulePage } from "../../components/forms/CrudModulePage";
import { useAuth } from "../../hooks/useAuth";
import { useReferenceData } from "../../hooks/useReferenceData";
import { materialReceiptsService } from "../../services/materialReceiptsService";
import type { Receipt, ReceiptFormValues } from "../../types/erp.types";
import { formatNumber } from "../../utils/format";
import { getCrudPermissions } from "../../utils/permissions";

const receiptSchema = z.object({
  cost_per_unit: z.number().min(0, "Cost per unit must be zero or more."),
  date: z.string().min(1, "Receipt date is required."),
  invoice_number: z
    .string()
    .max(50, "Invoice number must be 50 characters or fewer.")
    .optional()
    .or(z.literal("")),
  material: z.number().min(1, "Material is required."),
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
        { key: "unit", header: "Unit", accessor: (row) => getUnitLabel(row.material_unit), sortValue: (row) => row.material_unit },
        { key: "invoice", header: "Invoice", accessor: (row) => row.invoice_number || "-", sortValue: (row) => row.invoice_number || "" },
        { key: "date", header: "Date", accessor: (row) => row.date_display || row.date, sortValue: (row) => row.date },
        { key: "received", header: "Received", accessor: (row) => getQuantityLabel(row.quantity_received, row.material_unit), sortValue: (row) => row.quantity_received },
        { key: "used", header: "Used", accessor: (row) => getQuantityLabel(row.quantity_used, row.material_unit), sortValue: (row) => row.quantity_used },
        { key: "remaining", header: "Remaining Stock", accessor: (row) => getQuantityLabel(row.remaining_stock, row.material_unit), sortValue: (row) => row.remaining_stock },
        { key: "costPerUnit", header: "Cost / Unit", accessor: (row) => getCostPerUnitLabel(row), sortValue: (row) => row.cost_per_unit },
        { key: "transport", header: "Transport Cost", accessor: (row) => row.transport_cost, sortValue: (row) => row.transport_cost },
        { key: "cost", header: "Total Cost", accessor: (row) => row.total_cost, sortValue: (row) => row.total_cost },
        { key: "calculation", header: "Total Calculation", accessor: (row) => getTotalCostCalculation(row), sortValue: (row) => row.total_cost },
      ]}
      createLabel="Add Receipt"
      defaultValues={{
        cost_per_unit: 0,
        date: new Date().toISOString().slice(0, 10),
        invoice_number: "",
        material: 0,
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
        { kind: "date", label: "Receipt Date", name: "date", required: true },
        {
          kind: "text",
          label: "Invoice Number",
          maxLength: 50,
          name: "invoice_number",
          placeholder: "Optional invoice reference",
        },
        {
          kind: "number",
          label: "Quantity Received",
          min: 0,
          name: "quantity_received",
          required: true,
          valueType: "number",
        },
        {
          kind: "number",
          label: "Quantity Used",
          min: 0,
          name: "quantity_used",
          required: true,
          valueType: "number",
        },
        {
          kind: "number",
          label: "Cost Per Unit",
          min: 0,
          name: "cost_per_unit",
          required: true,
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
        { label: "Material Unit", value: (row) => getUnitLabel(row.material_unit) },
        { label: "Quantity Received", value: (row) => getQuantityLabel(row.quantity_received, row.material_unit), highlight: true },
        { label: "Quantity Used", value: (row) => getQuantityLabel(row.quantity_used, row.material_unit) },
        { label: "Remaining Stock", value: (row) => getQuantityLabel(row.remaining_stock, row.material_unit), highlight: true },
        { label: "Cost Per Unit", value: (row) => getCostPerUnitLabel(row) },
        { label: "Transport Cost", value: (row) => row.transport_cost },
        { label: "Invoice Number", value: (row) => row.invoice_number },
        { label: "Receipt Date", value: (row) => row.date_display || row.date },
        { label: "Total Cost", value: (row) => row.total_cost, highlight: true },
        { label: "Total Calculation", value: (row) => getTotalCostCalculation(row), span: "full" },
        { label: "Notes", value: (row) => row.notes, span: "full" },
      ]}
    />
  );
}
