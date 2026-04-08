import { z } from "zod";

import { CrudModulePage } from "../../components/forms/CrudModulePage";
import { useReferenceData } from "../../hooks/useReferenceData";
import { materialReceiptsService } from "../../services/materialReceiptsService";
import type { Receipt, ReceiptFormValues } from "../../types/erp.types";

const receiptSchema = z.object({
  cost_per_unit: z.number().min(0, "Cost per unit must be zero or more."),
  material: z.number().min(1, "Material is required."),
  quantity_received: z.number().gt(0, "Received quantity must be greater than zero."),
  quantity_used: z.number().min(0, "Used quantity must be zero or more."),
  site: z.number().min(1, "Site is required."),
  transport_cost: z.number().min(0, "Transport cost must be zero or more."),
}).refine((value) => value.quantity_used <= value.quantity_received, {
  message: "Used quantity cannot exceed received quantity.",
  path: ["quantity_used"],
});

export function MaterialReceiptsPage() {
  const references = useReferenceData();

  return (
    <CrudModulePage<Receipt, ReceiptFormValues>
      canManage
      columns={[
        { key: "site", header: "Site", accessor: (row) => row.site_name, sortValue: (row) => row.site_name },
        { key: "material", header: "Material", accessor: (row) => row.material_name, sortValue: (row) => row.material_name },
        { key: "received", header: "Received", accessor: (row) => row.quantity_received, sortValue: (row) => row.quantity_received },
        { key: "used", header: "Used", accessor: (row) => row.quantity_used, sortValue: (row) => row.quantity_used },
        { key: "remaining", header: "Remaining", accessor: (row) => row.remaining_stock, sortValue: (row) => row.remaining_stock },
        { key: "cost", header: "Total Cost", accessor: (row) => row.total_cost, sortValue: (row) => row.total_cost },
      ]}
      createLabel="Add Receipt"
      defaultValues={{
        cost_per_unit: 0,
        material: 0,
        quantity_received: 0,
        quantity_used: 0,
        site: 0,
        transport_cost: 0,
      }}
      description="Record material inflow, usage, and stock costs across sites."
      emptyDescription="No material receipts have been recorded."
      emptyTitle="No receipts found"
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
      ]}
      getEditValues={(entity) => ({
        cost_per_unit: entity.cost_per_unit,
        material: entity.material,
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
    />
  );
}
