import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { EntityFormModal } from "../../components/forms/EntityFormModal";
import { useToast } from "../../components/feedback/useToast";
import { Modal } from "../../components/modal/Modal";
import { Button } from "../../components/ui/Button";
import { FormError } from "../../components/ui/FormError";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { materialReceiptsService } from "../../services/materialReceiptsService";
import { materialsService } from "../../services/materialsService";
import type { Material, MaterialFormValues, ReceiptFormValues } from "../../types/erp.types";
import { getErrorMessage } from "../../utils/apiError";
import { createZodResolver } from "../../utils/zodResolver";

const siteDashboardToday = new Date().toISOString().slice(0, 10);
const otherMaterialOptionValue = -1;

const materialSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Material name must be at least 2 characters.")
    .max(100, "Material name must be 100 characters or fewer."),
  unit: z.enum(["bag", "kg", "ton", "meter", "litre", "piece"]),
});

const receiptSchema = z
  .object({
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
  })
  .refine((value) => value.quantity_used <= value.quantity_received, {
    message: "Used quantity cannot exceed received quantity.",
    path: ["quantity_used"],
  });

interface SiteMaterialReceiptModalProps {
  materials: Material[];
  onClose: () => void;
  onMaterialAdded: (material: Material) => void;
  onSaved: () => void;
  open: boolean;
  siteId: number;
  siteName: string;
}

export function SiteMaterialReceiptModal({
  materials,
  onClose,
  onMaterialAdded,
  onSaved,
  open,
  siteId,
  siteName,
}: SiteMaterialReceiptModalProps) {
  const { showSuccess } = useToast();
  const [formError, setFormError] = useState("");
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const lastSelectedMaterialRef = useRef(0);
  const {
    control,
    formState: { errors, isSubmitting, isValid },
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<ReceiptFormValues>({
    defaultValues: {
      cost_per_unit: 0,
      date: siteDashboardToday,
      invoice_number: "",
      material: 0,
      notes: "",
      quantity_received: 0,
      quantity_used: 0,
      site: siteId,
      transport_cost: 0,
    },
    mode: "onChange",
    resolver: createZodResolver(receiptSchema),
  });

  function handleClose() {
    setFormError("");
    setIsMaterialModalOpen(false);
    onClose();
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    lastSelectedMaterialRef.current = 0;
    reset({
      cost_per_unit: 0,
      date: siteDashboardToday,
      invoice_number: "",
      material: 0,
      notes: "",
      quantity_received: 0,
      quantity_used: 0,
      site: siteId,
      transport_cost: 0,
    });
  }, [open, reset, siteId]);

  return (
    <>
      <Modal
        footer={
          <div className="flex justify-end gap-3">
            <Button onClick={onClose} type="button" variant="secondary">
              Cancel
            </Button>
            <Button
              disabled={!isValid}
              form="site-material-receipt-form"
              isLoading={isSubmitting}
              type="submit"
            >
              Save Receipt
            </Button>
          </div>
        }
        onClose={handleClose}
        open={open}
        size="xl"
        title="Add Material Receipt"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-slate-700 dark:border-blue-100 dark:bg-blue-50/70 dark:text-slate-700">
            New receipt will be added for <span className="font-semibold">{siteName}</span>.
          </div>

          <form
            className="grid gap-4 md:grid-cols-2"
            id="site-material-receipt-form"
            onSubmit={handleSubmit(async (values) => {
              try {
                setFormError("");
                await materialReceiptsService.create(values);
                showSuccess("Receipt saved", "Material receipt has been added for this site.");
                onSaved();
                handleClose();
              } catch (error) {
                setFormError(getErrorMessage(error));
              }
            })}
          >
            <Select
              clearable={false}
              disabled
              label="Site"
              options={[{ label: siteName, value: siteId }]}
              value={siteId}
            />

            <Controller
              control={control}
              name="material"
              render={({ field }) => (
                <Select
                  clearable={false}
                  error={errors.material?.message}
                  label="Material"
                  options={[
                    ...materials.map((material) => ({
                      label: material.name,
                      value: material.id,
                    })),
                    { label: "Other Material", value: otherMaterialOptionValue },
                  ]}
                  placeholder="Select material"
                  requiredIndicator
                  value={field.value || ""}
                  onChange={(event) => {
                    const nextValue = event.target.value
                      ? Number(event.target.value)
                      : 0;

                    if (nextValue === otherMaterialOptionValue) {
                      field.onChange(lastSelectedMaterialRef.current || 0);
                      setIsMaterialModalOpen(true);
                      return;
                    }

                    lastSelectedMaterialRef.current = nextValue;
                    field.onChange(nextValue);
                  }}
                />
              )}
            />

            <Input
              error={errors.date?.message}
              label="Receipt Date"
              requiredIndicator
              type="date"
              {...register("date")}
            />
            <Input
              error={errors.invoice_number?.message}
              label="Invoice Number"
              maxLength={50}
              placeholder="Optional invoice reference"
              {...register("invoice_number")}
            />
            <Input
              description="Fresh material received in this entry."
              error={errors.quantity_received?.message}
              label="Quantity Received"
              min={0}
              requiredIndicator
              type="number"
              {...register("quantity_received", {
                setValueAs: (value) => (value === "" ? 0 : Number(value)),
              })}
            />
            <Input
              description="Material consumed from this receipt."
              error={errors.quantity_used?.message}
              label="Quantity Used"
              min={0}
              requiredIndicator
              type="number"
              {...register("quantity_used", {
                setValueAs: (value) => (value === "" ? 0 : Number(value)),
              })}
            />
            <Input
              error={errors.cost_per_unit?.message}
              label="Cost Per Unit"
              min={0}
              requiredIndicator
              type="number"
              {...register("cost_per_unit", {
                setValueAs: (value) => (value === "" ? 0 : Number(value)),
              })}
            />
            <Input
              error={errors.transport_cost?.message}
              label="Transport Cost"
              min={0}
              requiredIndicator
              type="number"
              {...register("transport_cost", {
                setValueAs: (value) => (value === "" ? 0 : Number(value)),
              })}
            />

            <div className="md:col-span-2">
              <Textarea
                error={errors.notes?.message}
                label="Notes"
                placeholder="Transport, batch, or delivery notes"
                rows={4}
                {...register("notes")}
              />
            </div>

            <div className="md:col-span-2">
              <FormError message={formError} />
            </div>
          </form>
        </div>
      </Modal>

      <EntityFormModal<MaterialFormValues>
        defaultValues={{ name: "", unit: "bag" }}
        description="Create or update material records."
        fields={[
          {
            kind: "text",
            label: "Material Name",
            maxLength: 100,
            minLength: 2,
            name: "name",
            placeholder: "Enter material name",
            required: true,
          },
          {
            kind: "select",
            label: "Unit",
            name: "unit",
            options: [
              { label: "Bag", value: "bag" },
              { label: "Kg", value: "kg" },
              { label: "Ton", value: "ton" },
              { label: "Meter", value: "meter" },
              { label: "Litre", value: "litre" },
              { label: "Piece", value: "piece" },
            ],
            required: true,
          },
        ]}
        onClose={() => setIsMaterialModalOpen(false)}
        onSubmit={async (values) => {
          const material = await materialsService.create(values);
          onMaterialAdded(material);
          lastSelectedMaterialRef.current = material.id;
          setValue("material", material.id, {
            shouldDirty: true,
            shouldTouch: false,
            shouldValidate: true,
          });
          setIsMaterialModalOpen(false);
          showSuccess("Material added", "New material is ready to use in this receipt.");
        }}
        open={isMaterialModalOpen}
        schema={materialSchema}
        title="Add Material"
      />
    </>
  );
}
