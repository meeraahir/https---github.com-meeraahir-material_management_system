import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { icons } from "../../assets/icons";
import { EntityFormModal } from "../../components/forms/EntityFormModal";
import { useToast } from "../../components/feedback/useToast";
import { Modal } from "../../components/modal/Modal";
import { Button } from "../../components/ui/Button";
import { FormError } from "../../components/ui/FormError";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { attendanceReportsService, attendanceService } from "../../services/attendanceService";
import { casualLabourService } from "../../services/casualLabourService";
import { labourService } from "../../services/labourService";
import { materialReceiptsService } from "../../services/materialReceiptsService";
import { materialsService } from "../../services/materialsService";
import { partiesService } from "../../services/partiesService";
import { paymentsService } from "../../services/paymentsService";
import { receivablesService } from "../../services/receivablesService";
import { vendorPurchasesService } from "../../services/vendorPurchasesService";
import { vendorsService } from "../../services/vendorsService";
import type {
  AttendanceFormValues,
  CasualLabourEntryFormValues,
  Labour,
  LabourFormValues,
  Material,
  MaterialFormValues,
  MaterialVariant,
  PaymentFormValues,
  Party,
  PartyFormValues,
  PurchaseFormValues,
  ReceiptFormValues,
  ReceivableFormValues,
  Vendor,
  VendorFormValues,
} from "../../types/erp.types";
import { getErrorMessage } from "../../utils/apiError";
import { createZodResolver } from "../../utils/zodResolver";

const siteDashboardToday = new Date().toISOString().slice(0, 10);
const otherMaterialOptionValue = -1;
const otherVendorOptionValue = -1;
const otherPartyOptionValue = -1;
const otherLabourOptionValue = -1;
const paymentModeOptions = [
  { label: "Cash", value: "cash" },
  { label: "Check", value: "check" },
  { label: "Bank Transfer", value: "bank_transfer" },
  { label: "UPI", value: "upi" },
  { label: "Other", value: "other" },
];

function formatMaterialVariantLabel(variant: MaterialVariant) {
  return variant.size_mm
    ? `${variant.label} (${variant.size_mm} mm)`
    : variant.label;
}

function InlineSelectActionField({
  actionAriaLabel,
  children,
  onActionClick,
}: {
  actionAriaLabel: string;
  children: ReactNode;
  onActionClick: () => void;
}) {
  return (
    <div className="flex min-w-0 items-end gap-2">
      <div className="min-w-0 flex-1">{children}</div>
      <Button
        aria-label={actionAriaLabel}
        className="h-11 w-11 shrink-0 rounded-2xl px-0"
        onClick={onActionClick}
        title={actionAriaLabel}
        type="button"
        variant="secondary"
      >
        {icons.plus({ className: "h-4 w-4" })}
      </Button>
    </div>
  );
}

const materialSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Material name must be at least 2 characters.")
    .max(100, "Material name must be 100 characters or fewer."),
  unit: z.enum(["bag", "kg", "ton", "meter", "litre", "piece", "other"]),
});

const phoneRegex = /^[0-9]{10}$/;
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const aadharRegex = /^[0-9]{12}$/;
const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const bankAccountRegex = /^[0-9]{9,18}$/;

const optionalText = (maxLength: number) =>
  z.string().max(maxLength, `Must be ${maxLength} characters or fewer.`);
const optionalEmail = z
  .string()
  .refine(
    (value) =>
      value === "" ||
      (value.length <= 120 && z.string().email().safeParse(value).success),
    "Enter a valid email address.",
  );

const vendorSchema = z.object({
  aadhar_number: z
    .string()
    .refine((value) => value === "" || aadharRegex.test(value), "Aadhar must be 12 digits."),
  address: z
    .string()
    .trim()
    .min(5, "Address must be at least 5 characters.")
    .max(300, "Address must be 300 characters or fewer."),
  bank_account_number: z
    .string()
    .refine(
      (value) => value === "" || bankAccountRegex.test(value),
      "Account number must be 9 to 18 digits.",
    ),
  bank_name: optionalText(80),
  document_details: optionalText(300),
  email: optionalEmail,
  ifsc_code: z
    .string()
    .transform((value) => value.toUpperCase())
    .refine((value) => value === "" || ifscRegex.test(value), "Enter a valid IFSC code."),
  license_number: optionalText(60),
  name: z
    .string()
    .trim()
    .min(2, "Vendor name must be at least 2 characters.")
    .max(100, "Vendor name must be 100 characters or fewer."),
  pan_number: z
    .string()
    .transform((value) => value.toUpperCase())
    .refine((value) => value === "" || panRegex.test(value), "Enter a valid PAN number."),
  phone: z
    .string()
    .trim()
    .refine((value) => phoneRegex.test(value), "Mobile number must be exactly 10 digits."),
  tax_identifier: optionalText(60),
});

const partySchema = z.object({
  contact: z
    .string()
    .trim()
    .min(3, "Contact must be at least 3 characters.")
    .max(80, "Contact must be 80 characters or fewer."),
  name: z
    .string()
    .trim()
    .min(2, "Party name must be at least 2 characters.")
    .max(100, "Party name must be 100 characters or fewer."),
});

const labourSchema = z.object({
  labour_type: z
    .string()
    .max(100, "Labour type must be 100 characters or fewer.")
    .optional()
    .or(z.literal("")),
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

const casualLabourSchema = z.object({
  date: z.string().min(1, "Date is required."),
  labour_name: z
    .string()
    .trim()
    .min(2, "Labour name must be at least 2 characters.")
    .max(255, "Labour name must be 255 characters or fewer."),
  labour_type: z
    .string()
    .trim()
    .min(1, "Labour type is required.")
    .max(100, "Labour type must be 100 characters or fewer."),
  paid_amount: z.number().gt(0, "Paid amount must be greater than zero."),
  site: z.number().min(1, "Site is required."),
});

const purchaseSchema = z
  .object({
    cheque_number: z.string().max(50, "Cheque number must be 50 characters or fewer."),
    date: z.string().min(1, "Date is required."),
    description: z.string().max(300, "Description must be 300 characters or fewer."),
    invoice_number: z.string(),
    material: z.number().min(0, "Material is invalid."),
    paid_amount: z.number().min(0, "Paid amount must be zero or more."),
    payment_mode: z.enum(["cash", "check", "bank_transfer", "upi", "other"]),
    receiver_name: z.string().max(255, "Receiver name must be 255 characters or fewer."),
    sender_name: z.string().max(255, "Sender name must be 255 characters or fewer."),
    site: z.number().min(1, "Site is required."),
    total_amount: z.number().gt(0, "Total amount must be greater than zero."),
    vendor: z.number().min(1, "Vendor is required."),
  })
  .superRefine((value, context) => {
    if (value.paid_amount > value.total_amount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Paid amount cannot exceed total amount.",
        path: ["paid_amount"],
      });
    }

    if (value.paid_amount > 0 && value.payment_mode === "cash") {
      if (!value.sender_name.trim() && !value.receiver_name.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Sender name or receiver name is required for cash payments.",
          path: ["sender_name"],
        });
      }
    }

    if (value.paid_amount > 0 && value.payment_mode === "check" && !value.cheque_number.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cheque number is required for check payments.",
        path: ["cheque_number"],
      });
    }
  });

const receivableSchema = z
  .object({
    amount: z.number().gt(0, "Amount must be greater than zero."),
    date: z.string().min(1, "Date is required."),
    description: z.string().max(1000, "Description must be 1000 characters or fewer."),
    party: z.number().min(1, "Party is required."),
    phase_name: z.string().max(255, "Phase name must be 255 characters or fewer."),
    receipt_cheque_number: z.string().max(50, "Cheque number must be 50 characters or fewer.").optional().or(z.literal("")),
    receipt_payment_mode: z.enum(["cash", "check", "bank_transfer", "upi", "other"]).optional(),
    receipt_receiver_name: z.string().max(255, "Receiver name must be 255 characters or fewer.").optional().or(z.literal("")),
    receipt_sender_name: z.string().max(255, "Sender name must be 255 characters or fewer.").optional().or(z.literal("")),
    received_amount: z.number().min(0, "Received amount must be zero or more.").optional(),
    site: z.number().min(1, "Site is required."),
  })
  .superRefine((value, context) => {
    if ((value.received_amount ?? 0) > value.amount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Received amount cannot exceed total amount.",
        path: ["received_amount"],
      });
    }

    if ((value.received_amount ?? 0) > 0 && value.receipt_payment_mode === "cash") {
      if (!value.receipt_sender_name?.trim() && !value.receipt_receiver_name?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Sender name or receiver name is required for cash receipts.",
          path: ["receipt_sender_name"],
        });
      }
    }

    if ((value.received_amount ?? 0) > 0 && value.receipt_payment_mode === "check" && !value.receipt_cheque_number?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cheque number is required for check receipts.",
        path: ["receipt_cheque_number"],
      });
    }
  });

const paymentSchema = z
  .object({
    auto_calculate_total: z.boolean().optional(),
    date: z.string().min(1, "Payment date is required."),
    labour: z.number().min(1, "Labour is required."),
    notes: z.string().max(600, "Notes must be 600 characters or fewer.").nullable().optional(),
    paid_amount: z.number().min(0, "Paid amount must be zero or more."),
    period_end: z.string().optional(),
    period_start: z.string().optional(),
    site: z.number().min(0, "Site is invalid.").optional(),
    total_amount: z.number().min(0, "Total amount must be zero or more."),
  })
  .superRefine((value, context) => {
    if (value.paid_amount > value.total_amount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Paid amount cannot exceed total amount.",
        path: ["paid_amount"],
      });
    }

    if (value.period_start && value.period_end && value.period_end < value.period_start) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Period end must be on or after period start.",
        path: ["period_end"],
      });
    }
  });

const attendanceSchema = z.object({
  date: z
    .string()
    .min(1, "Date is required.")
    .refine((value) => value <= siteDashboardToday, "Future dates are not allowed."),
  labour: z.number().min(1, "Labour is required."),
  present: z.boolean(),
  site: z.number().min(1, "Site is required."),
});

const receiptSchema = z
  .object({
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
  })
  .refine((value) => value.quantity_used <= value.quantity_received, {
    message: "Used quantity cannot exceed received quantity.",
    path: ["quantity_used"],
  });

interface SiteMaterialReceiptModalProps {
  materials: Material[];
  materialVariants: MaterialVariant[];
  onClose: () => void;
  onMaterialAdded: (material: Material) => void;
  onSaved: () => void;
  open: boolean;
  siteId: number;
  siteName: string;
}

export function SiteMaterialReceiptModal({
  materials,
  materialVariants,
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
      cost_per_unit: undefined,
      date: siteDashboardToday,
      invoice_number: "",
      material: 0,
      material_variant: 0,
      notes: "",
      quantity_received: 0,
      quantity_used: 0,
      site: siteId,
      transport_cost: 0,
    },
    mode: "onChange",
    resolver: createZodResolver(receiptSchema),
  });
  const selectedMaterialId = useWatch({ control, name: "material" });
  const filteredMaterialVariants = useMemo(
    () =>
      materialVariants.filter((variant) => {
        const materialId = Number(selectedMaterialId) || 0;
        return !materialId || variant.material === materialId;
      }),
    [materialVariants, selectedMaterialId],
  );

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
      cost_per_unit: undefined,
      date: siteDashboardToday,
      invoice_number: "",
      material: 0,
      material_variant: 0,
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
            <Button onClick={handleClose} type="button" variant="secondary">
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
                <InlineSelectActionField
                  actionAriaLabel="Add Material"
                  onActionClick={() => setIsMaterialModalOpen(true)}
                >
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
                </InlineSelectActionField>
              )}
            />

            <Controller
              control={control}
              name="material_variant"
              render={({ field }) => (
                <Select
                  clearable
                  error={errors.material_variant?.message}
                  label="Material Variant"
                  options={filteredMaterialVariants.map((variant) => ({
                    label: formatMaterialVariantLabel(variant),
                    value: variant.id,
                  }))}
                  placeholder="Optional variant"
                  value={field.value || ""}
                  onChange={(event) => {
                    field.onChange(event.target.value ? Number(event.target.value) : 0);
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
              step={0.01}
              type="number"
              {...register("cost_per_unit", {
                setValueAs: (value) => (value === "" ? undefined : Number(value)),
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
              { label: "Other", value: "other" },
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

interface SiteVendorEntryModalProps {
  materials: Material[];
  onClose: () => void;
  onSaved: () => void;
  onVendorAdded: (vendor: Vendor) => void;
  open: boolean;
  siteId: number;
  siteName: string;
  vendors: Vendor[];
}

export function SiteVendorEntryModal({
  materials,
  onClose,
  onSaved,
  onVendorAdded,
  open,
  siteId,
  siteName,
  vendors,
}: SiteVendorEntryModalProps) {
  const { showSuccess } = useToast();
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const lastSelectedVendorRef = useRef(0);
  const {
    control,
    formState: { errors, isSubmitting, isValid },
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<PurchaseFormValues>({
    defaultValues: {
      cheque_number: "",
      date: siteDashboardToday,
      description: "",
      invoice_number: "",
      material: 0,
      paid_amount: 0,
      payment_mode: "cash",
      receiver_name: "",
      sender_name: "",
      site: siteId,
      total_amount: 0,
      vendor: 0,
    },
    mode: "onChange",
    resolver: createZodResolver(purchaseSchema),
  });

  function handleClose() {
    setFormError("");
    setIsVendorModalOpen(false);
    onClose();
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    lastSelectedVendorRef.current = 0;
    reset({
      cheque_number: "",
      date: siteDashboardToday,
      description: "",
      invoice_number: "",
      material: 0,
      paid_amount: 0,
      payment_mode: "cash",
      receiver_name: "",
      sender_name: "",
      site: siteId,
      total_amount: 0,
      vendor: 0,
    });
  }, [open, reset, siteId]);

  return (
    <>
      <Modal
        footer={
          <div className="flex justify-end gap-3">
            <Button onClick={handleClose} type="button" variant="secondary">
              Cancel
            </Button>
            <Button
              disabled={!isValid}
              form="site-vendor-entry-form"
              isLoading={isSubmitting}
              type="submit"
            >
              Save Vendor Entry
            </Button>
          </div>
        }
        onClose={handleClose}
        open={open}
        size="xl"
        title="Add Vendor Entry"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-slate-700 dark:border-blue-100 dark:bg-blue-50/70 dark:text-slate-700">
            New vendor purchase will be recorded for <span className="font-semibold">{siteName}</span>.
          </div>
          <form
            className="grid gap-4 md:grid-cols-2"
            id="site-vendor-entry-form"
            onSubmit={handleSubmit(async (values) => {
              try {
                setFormError("");
                await vendorPurchasesService.create(values);
                showSuccess("Vendor entry added", "Vendor purchase has been created for this site.");
                onSaved();
                handleClose();
              } catch (error) {
                setFormError(getErrorMessage(error));
              }
            })}
          >
            <Controller
              control={control}
              name="vendor"
              render={({ field }) => (
                <InlineSelectActionField
                  actionAriaLabel="Add Vendor"
                  onActionClick={() => setIsVendorModalOpen(true)}
                >
                  <Select
                    clearable={false}
                    error={errors.vendor?.message}
                    label="Vendor"
                    options={[
                      ...vendors.map((vendor) => ({ label: vendor.name, value: vendor.id })),
                      { label: "Other Vendor", value: otherVendorOptionValue },
                    ]}
                    placeholder="Select vendor"
                    requiredIndicator
                    value={field.value || ""}
                    onChange={(event) => {
                      const nextValue = event.target.value ? Number(event.target.value) : 0;

                      if (nextValue === otherVendorOptionValue) {
                        field.onChange(lastSelectedVendorRef.current || 0);
                        setIsVendorModalOpen(true);
                        return;
                      }

                      lastSelectedVendorRef.current = nextValue;
                      field.onChange(nextValue);
                    }}
                  />
                </InlineSelectActionField>
              )}
            />
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
                  error={errors.material?.message}
                  label="Material"
                  options={materials.map((material) => ({
                    label: material.name,
                    value: material.id,
                  }))}
                  value={field.value || ""}
                  onChange={(event) => {
                    field.onChange(event.target.value ? Number(event.target.value) : 0);
                  }}
                />
              )}
            />
            <Input
              error={errors.date?.message}
              label="Date"
              requiredIndicator
              type="date"
              {...register("date")}
            />
            <Input
              error={errors.total_amount?.message}
              label="Total Amount"
              min={0}
              requiredIndicator
              type="number"
              {...register("total_amount", {
                setValueAs: (value) => (value === "" ? 0 : Number(value)),
              })}
            />
            <Input
              error={errors.paid_amount?.message}
              label="Initial Paid Amount"
              min={0}
              requiredIndicator
              type="number"
              {...register("paid_amount", {
                setValueAs: (value) => (value === "" ? 0 : Number(value)),
              })}
            />
            <Controller
              control={control}
              name="payment_mode"
              render={({ field }) => (
                <Select
                  clearable={false}
                  error={errors.payment_mode?.message}
                  label="Payment Mode"
                  options={paymentModeOptions}
                  requiredIndicator
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                />
              )}
            />
            <Input
              error={errors.sender_name?.message}
              label="Sender Name"
              maxLength={255}
              placeholder="Who paid the amount"
              {...register("sender_name")}
            />
            <Input
              error={errors.receiver_name?.message}
              label="Receiver Name"
              maxLength={255}
              placeholder="Who received the amount"
              {...register("receiver_name")}
            />
            <Input
              error={errors.cheque_number?.message}
              label="Cheque Number"
              maxLength={50}
              placeholder="Required for check payments"
              {...register("cheque_number")}
            />
            <div className="md:col-span-2">
              <Textarea
                error={errors.description?.message}
                label="Description"
                placeholder="Purchase notes"
                rows={4}
                {...register("description")}
              />
            </div>
            <div className="md:col-span-2">
              <FormError message={formError} />
            </div>
          </form>
        </div>
      </Modal>

      <EntityFormModal<VendorFormValues>
        defaultValues={{
          aadhar_number: "",
          address: "",
          bank_account_number: "",
          bank_name: "",
          document_details: "",
          email: "",
          ifsc_code: "",
          license_number: "",
          name: "",
          pan_number: "",
          phone: "",
          tax_identifier: "",
        }}
        description="Create or update vendor records."
        fields={[
          { kind: "text", label: "Vendor Name", maxLength: 100, minLength: 2, name: "name", placeholder: "Supplier name", required: true },
          { kind: "text", digitsOnly: true, inputMode: "numeric", label: "Mobile Number", maxLength: 10, minLength: 10, name: "phone", pattern: "[0-9]{10}", placeholder: "Enter 10 digit mobile number", required: true },
          { kind: "email", label: "Email", maxLength: 120, name: "email", placeholder: "Optional email" },
          { kind: "textarea", label: "Address", name: "address", placeholder: "Full address", required: true, rows: 4 },
          { kind: "text", label: "Bank Name", maxLength: 80, name: "bank_name", placeholder: "Optional bank name" },
          { kind: "text", digitsOnly: true, inputMode: "numeric", label: "Account Number", maxLength: 18, minLength: 9, name: "bank_account_number", pattern: "[0-9]{9,18}", placeholder: "Optional account number" },
          { kind: "text", label: "IFSC Code", maxLength: 11, minLength: 11, name: "ifsc_code", placeholder: "Optional IFSC code" },
          { kind: "text", label: "Tax Identifier", maxLength: 60, name: "tax_identifier", placeholder: "Optional tax ID" },
          { kind: "text", label: "License Number", maxLength: 60, name: "license_number", placeholder: "Optional license number" },
          { kind: "text", label: "PAN Number", maxLength: 10, minLength: 10, name: "pan_number", placeholder: "Optional PAN number" },
          { kind: "text", digitsOnly: true, inputMode: "numeric", label: "Aadhar Number", maxLength: 12, minLength: 12, name: "aadhar_number", pattern: "[0-9]{12}", placeholder: "Optional Aadhar number" },
          { kind: "textarea", label: "Document Details", name: "document_details", placeholder: "Supporting documents or notes", rows: 5 },
        ]}
        onClose={() => setIsVendorModalOpen(false)}
        onSubmit={async (values) => {
          const vendor = await vendorsService.create(values);
          onVendorAdded(vendor);
          lastSelectedVendorRef.current = vendor.id;
          setValue("vendor", vendor.id, {
            shouldDirty: true,
            shouldTouch: false,
            shouldValidate: true,
          });
          setIsVendorModalOpen(false);
          showSuccess("Vendor added", "New vendor is ready to use in this entry.");
        }}
        open={isVendorModalOpen}
        schema={vendorSchema}
        title="Add Vendor"
      />
    </>
  );
}

interface SitePartyEntryModalProps {
  onClose: () => void;
  onPartyAdded: (party: Party) => void;
  onSaved: () => void;
  open: boolean;
  parties: Party[];
  siteId: number;
  siteName: string;
}

export function SitePartyEntryModal({
  onClose,
  onPartyAdded,
  onSaved,
  open,
  parties,
  siteId,
  siteName,
}: SitePartyEntryModalProps) {
  const { showSuccess } = useToast();
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const lastSelectedPartyRef = useRef(0);
  const {
    control,
    formState: { errors, isSubmitting, isValid },
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<ReceivableFormValues>({
    defaultValues: {
      amount: 0,
      date: siteDashboardToday,
      description: "",
      party: 0,
      phase_name: "",
      receipt_cheque_number: "",
      receipt_payment_mode: "cash",
      receipt_receiver_name: "",
      receipt_sender_name: "",
      received_amount: 0,
      site: siteId,
    },
    mode: "onChange",
    resolver: createZodResolver(receivableSchema),
  });

  function handleClose() {
    setFormError("");
    setIsPartyModalOpen(false);
    onClose();
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    lastSelectedPartyRef.current = 0;
    reset({
      amount: 0,
      date: siteDashboardToday,
      description: "",
      party: 0,
      phase_name: "",
      receipt_cheque_number: "",
      receipt_payment_mode: "cash",
      receipt_receiver_name: "",
      receipt_sender_name: "",
      received_amount: 0,
      site: siteId,
    });
  }, [open, reset, siteId]);

  return (
    <>
      <Modal
        footer={
          <div className="flex justify-end gap-3">
            <Button onClick={handleClose} type="button" variant="secondary">
              Cancel
            </Button>
            <Button disabled={!isValid} form="site-party-entry-form" isLoading={isSubmitting} type="submit">
              Save Party Entry
            </Button>
          </div>
        }
        onClose={handleClose}
        open={open}
        size="lg"
        title="Add Party Entry"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-slate-700 dark:border-blue-100 dark:bg-blue-50/70 dark:text-slate-700">
            New receivable will be recorded for <span className="font-semibold">{siteName}</span>.
          </div>
          <form
            className="grid gap-4 md:grid-cols-2"
            id="site-party-entry-form"
            onSubmit={handleSubmit(async (values) => {
              try {
                setFormError("");
                await receivablesService.create(values);
                showSuccess("Party entry added", "Receivable has been created for this site.");
                onSaved();
                handleClose();
              } catch (error) {
                setFormError(getErrorMessage(error));
              }
            })}
          >
            <Controller
              control={control}
              name="party"
              render={({ field }) => (
                <InlineSelectActionField
                  actionAriaLabel="Add Party"
                  onActionClick={() => setIsPartyModalOpen(true)}
                >
                  <Select
                    clearable={false}
                    error={errors.party?.message}
                    label="Party"
                    options={[
                      ...parties.map((party) => ({ label: party.name, value: party.id })),
                      { label: "Other Party", value: otherPartyOptionValue },
                    ]}
                    placeholder="Select party"
                    requiredIndicator
                    value={field.value || ""}
                    onChange={(event) => {
                      const nextValue = event.target.value ? Number(event.target.value) : 0;

                      if (nextValue === otherPartyOptionValue) {
                        field.onChange(lastSelectedPartyRef.current || 0);
                        setIsPartyModalOpen(true);
                        return;
                      }

                      lastSelectedPartyRef.current = nextValue;
                      field.onChange(nextValue);
                    }}
                  />
                </InlineSelectActionField>
              )}
            />
            <Select clearable={false} disabled label="Site" options={[{ label: siteName, value: siteId }]} value={siteId} />
            <Input error={errors.amount?.message} label="Amount" min={0} requiredIndicator type="number" {...register("amount", { setValueAs: (value) => (value === "" ? 0 : Number(value)) })} />
            <Input
              error={errors.phase_name?.message}
              label="Phase Name"
              maxLength={255}
              placeholder="Plaster Work, Slab, Brickwork..."
              {...register("phase_name")}
            />
            <Input error={errors.date?.message} label="Date" requiredIndicator type="date" {...register("date")} />
            <Input error={errors.received_amount?.message} label="Received Amount" min={0} requiredIndicator type="number" {...register("received_amount", { setValueAs: (value) => (value === "" ? 0 : Number(value)) })} />
            <Controller
              control={control}
              name="receipt_payment_mode"
              render={({ field }) => (
                <Select
                  clearable={false}
                  error={errors.receipt_payment_mode?.message}
                  label="Receipt Payment Mode"
                  options={paymentModeOptions}
                  value={field.value || "cash"}
                  onChange={(event) => field.onChange(event.target.value)}
                />
              )}
            />
            <Input
              error={errors.receipt_sender_name?.message}
              label="Receipt Sender Name"
              maxLength={255}
              placeholder="Who sent the receipt payment"
              {...register("receipt_sender_name")}
            />
            <Input
              error={errors.receipt_receiver_name?.message}
              label="Receipt Receiver Name"
              maxLength={255}
              placeholder="Who received the receipt payment"
              {...register("receipt_receiver_name")}
            />
            <Input
              error={errors.receipt_cheque_number?.message}
              label="Receipt Cheque Number"
              maxLength={50}
              placeholder="Required for check receipts"
              {...register("receipt_cheque_number")}
            />
            <div className="md:col-span-2">
              <Textarea
                error={errors.description?.message}
                label="Description"
                placeholder="Work description"
                rows={4}
                {...register("description")}
              />
            </div>
            <div className="md:col-span-2">
              <FormError message={formError} />
            </div>
          </form>
        </div>
      </Modal>

      <EntityFormModal<PartyFormValues>
        defaultValues={{ contact: "", name: "" }}
        description="Create or update party records."
        fields={[
          { kind: "text", label: "Party Name", maxLength: 100, minLength: 2, name: "name", placeholder: "Client or party name", required: true },
          { kind: "text", label: "Contact", maxLength: 80, minLength: 3, name: "contact", placeholder: "Phone or contact info", required: true },
        ]}
        onClose={() => setIsPartyModalOpen(false)}
        onSubmit={async (values) => {
          const party = await partiesService.create(values);
          onPartyAdded(party);
          lastSelectedPartyRef.current = party.id;
          setValue("party", party.id, {
            shouldDirty: true,
            shouldTouch: false,
            shouldValidate: true,
          });
          setIsPartyModalOpen(false);
          showSuccess("Party added", "New party is ready to use in this entry.");
        }}
        open={isPartyModalOpen}
        schema={partySchema}
        title="Add Party"
      />
    </>
  );
}

interface SiteLabourPaymentModalProps {
  labours: Labour[];
  onClose: () => void;
  onLabourAdded: (labour: Labour) => void;
  onSaved: () => void;
  open: boolean;
  siteId: number;
  siteName: string;
}

export function SiteLabourPaymentModal({
  labours,
  onClose,
  onLabourAdded,
  onSaved,
  open,
  siteId,
  siteName,
}: SiteLabourPaymentModalProps) {
  const { showSuccess } = useToast();
  const [isLabourModalOpen, setIsLabourModalOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const lastSelectedLabourRef = useRef(0);
  const calculationRequestRef = useRef(0);
  const lastCalculationKeyRef = useRef("");
  const labourWageMap = useMemo(
    () => new Map(labours.map((labour) => [labour.id, Number(labour.per_day_wage) || 0])),
    [labours],
  );
  const {
    control,
    formState: { errors, isSubmitting, isValid },
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<PaymentFormValues>({
    defaultValues: {
      auto_calculate_total: true,
      date: siteDashboardToday,
      labour: 0,
      notes: "",
      paid_amount: 0,
      period_end: "",
      period_start: "",
      site: siteId,
      total_amount: 0,
    },
    mode: "onChange",
    resolver: createZodResolver(paymentSchema),
  });
  const selectedLabourId = useWatch({ control, name: "labour" });
  const selectedPeriodStart = useWatch({ control, name: "period_start" });
  const selectedPeriodEnd = useWatch({ control, name: "period_end" });
  const selectedTotalAmount = useWatch({ control, name: "total_amount" });

  function handleClose() {
    setFormError("");
    setIsLabourModalOpen(false);
    onClose();
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    calculationRequestRef.current = 0;
    lastCalculationKeyRef.current = "";
    lastSelectedLabourRef.current = 0;
    reset({
      auto_calculate_total: true,
      date: siteDashboardToday,
      labour: 0,
      notes: "",
      paid_amount: 0,
      period_end: "",
      period_start: "",
      site: siteId,
      total_amount: 0,
    });
  }, [open, reset, siteId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const labourId = Number(selectedLabourId) || 0;
    const periodStart = selectedPeriodStart || "";
    const periodEnd = selectedPeriodEnd || "";
    const currentTotal = Number(selectedTotalAmount) || 0;
    const calculationKey = `${labourId}|${siteId}|${periodStart}|${periodEnd}`;

    if (!labourId) {
      if (lastCalculationKeyRef.current === calculationKey && currentTotal === 0) {
        return;
      }

      lastCalculationKeyRef.current = calculationKey;

      if (currentTotal !== 0) {
        setValue("total_amount", 0, {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: true,
        });
      }

      return;
    }

    if (!periodStart || !periodEnd) {
      const defaultWageTotal = Number(
        (Number(labourWageMap.get(labourId) || 0) || 0).toFixed(2),
      );

      if (
        lastCalculationKeyRef.current === calculationKey &&
        currentTotal === defaultWageTotal
      ) {
        return;
      }

      lastCalculationKeyRef.current = calculationKey;

      if (currentTotal !== defaultWageTotal) {
        setValue("total_amount", defaultWageTotal, {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: true,
        });
      }

      return;
    }

    if (periodEnd < periodStart) {
      if (lastCalculationKeyRef.current === calculationKey && currentTotal === 0) {
        return;
      }

      lastCalculationKeyRef.current = calculationKey;

      if (currentTotal !== 0) {
        setValue("total_amount", 0, {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: true,
        });
      }

      return;
    }

    if (lastCalculationKeyRef.current === calculationKey) {
      return;
    }

    lastCalculationKeyRef.current = calculationKey;
    const requestId = ++calculationRequestRef.current;

    async function syncAutoCalculatedTotal() {
      try {
        const attendance = await attendanceReportsService.getLabourAttendance(labourId, {
          dateFrom: periodStart,
          dateTo: periodEnd,
        });

        if (requestId !== calculationRequestRef.current) {
          return;
        }

        const presentDays = attendance.filter(
          (row) => row.present && row.site === siteId,
        ).length;
        const totalAmount = Number(
          (presentDays * (Number(labourWageMap.get(labourId) || 0) || 0)).toFixed(2),
        );

        if (currentTotal !== totalAmount) {
          setValue("total_amount", totalAmount, {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: true,
          });
        }
      } catch {
        if (requestId !== calculationRequestRef.current) {
          return;
        }

        if (currentTotal !== 0) {
          setValue("total_amount", 0, {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: true,
          });
        }
      }
    }

    void syncAutoCalculatedTotal();
  }, [
    labourWageMap,
    open,
    selectedLabourId,
    selectedPeriodEnd,
    selectedPeriodStart,
    selectedTotalAmount,
    setValue,
    siteId,
  ]);

  return (
    <>
      <Modal
        footer={
          <div className="flex justify-end gap-3">
            <Button onClick={handleClose} type="button" variant="secondary">
              Cancel
            </Button>
            <Button
              disabled={!isValid}
              form="site-labour-payment-form"
              isLoading={isSubmitting}
              type="submit"
            >
              Save Payment
            </Button>
          </div>
        }
        onClose={handleClose}
        open={open}
        size="xl"
        title="Add Labour Payment"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-slate-700 dark:border-blue-100 dark:bg-blue-50/70 dark:text-slate-700">
            New labour payment will be recorded for <span className="font-semibold">{siteName}</span>.
          </div>

          <form
            className="grid gap-4 md:grid-cols-2"
            id="site-labour-payment-form"
            onSubmit={handleSubmit(async (values) => {
              try {
                setFormError("");
                await paymentsService.create(values as PaymentFormValues);
                showSuccess("Payment added", "Labour payment has been created for this site.");
                onSaved();
                handleClose();
              } catch (error) {
                setFormError(getErrorMessage(error));
              }
            })}
          >
            <Controller
              control={control}
              name="labour"
              render={({ field }) => (
                <InlineSelectActionField
                  actionAriaLabel="Add Labour"
                  onActionClick={() => setIsLabourModalOpen(true)}
                >
                  <Select
                    clearable={false}
                    error={errors.labour?.message}
                    label="Labour"
                    options={[
                      ...labours.map((labour) => ({ label: labour.name, value: labour.id })),
                      { label: "Other Labour", value: otherLabourOptionValue },
                    ]}
                    placeholder="Select labour"
                    requiredIndicator
                    value={field.value || ""}
                    onChange={(event) => {
                      const nextValue = event.target.value ? Number(event.target.value) : 0;

                      if (nextValue === otherLabourOptionValue) {
                        field.onChange(lastSelectedLabourRef.current || 0);
                        setIsLabourModalOpen(true);
                        return;
                      }

                      lastSelectedLabourRef.current = nextValue;
                      field.onChange(nextValue);
                    }}
                  />
                </InlineSelectActionField>
              )}
            />
            <Select clearable={false} disabled label="Site" options={[{ label: siteName, value: siteId }]} value={siteId} />
            <Input error={errors.date?.message} label="Payment Date" requiredIndicator type="date" {...register("date")} />
            <Input error={errors.period_start?.message} label="Period Start" type="date" {...register("period_start")} />
            <Input error={errors.period_end?.message} label="Period End" type="date" {...register("period_end")} />
            <Input
              error={errors.total_amount?.message}
              label="Total Amount"
              min={0}
              readOnly
              requiredIndicator
              type="number"
              {...register("total_amount", {
                setValueAs: (value) => (value === "" ? 0 : Number(value)),
              })}
            />
            <Input
              error={errors.paid_amount?.message}
              label="Paid Amount"
              min={0}
              requiredIndicator
              type="number"
              {...register("paid_amount", {
                setValueAs: (value) => (value === "" ? 0 : Number(value)),
              })}
            />
            <div className="md:col-span-2">
              <Textarea
                error={errors.notes?.message}
                label="Notes"
                placeholder="Optional payment notes"
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

      <EntityFormModal<LabourFormValues>
        defaultValues={{ labour_type: "", name: "", per_day_wage: 0, phone: "" }}
        description="Create or update labour records."
        fields={[
          { kind: "text", label: "Labour Name", maxLength: 80, minLength: 2, name: "name", placeholder: "Worker name", required: true },
          { kind: "text", label: "Labour Type", maxLength: 100, name: "labour_type", placeholder: "Mason, Helper, Carpenter..." },
          { kind: "text", digitsOnly: true, inputMode: "numeric", label: "Phone", maxLength: 15, minLength: 10, name: "phone", pattern: "[0-9]{10,15}", placeholder: "Contact number", required: true },
          { kind: "number", label: "Per Day Wage", min: 0, name: "per_day_wage", placeholder: "500", required: true, step: 1, valueType: "number" },
        ]}
        onClose={() => setIsLabourModalOpen(false)}
        onSubmit={async (values) => {
          const labour = await labourService.create(values);
          onLabourAdded(labour);
          lastSelectedLabourRef.current = labour.id;
          setValue("labour", labour.id, {
            shouldDirty: true,
            shouldTouch: false,
            shouldValidate: true,
          });
          setIsLabourModalOpen(false);
          showSuccess("Labour added", "New labour is ready to use in this payment.");
        }}
        open={isLabourModalOpen}
        schema={labourSchema}
        title="Add Labour"
      />
    </>
  );
}

interface SiteLabourEntryModalProps {
  labours: Labour[];
  onClose: () => void;
  onLabourAdded: (labour: Labour) => void;
  onSaved: () => void;
  open: boolean;
  siteId: number;
  siteName: string;
}

export function SiteLabourEntryModal({
  labours,
  onClose,
  onLabourAdded,
  onSaved,
  open,
  siteId,
  siteName,
}: SiteLabourEntryModalProps) {
  const { showSuccess } = useToast();
  const [isLabourModalOpen, setIsLabourModalOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const lastSelectedLabourRef = useRef(0);
  const {
    control,
    formState: { errors, isSubmitting, isValid },
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<AttendanceFormValues>({
    defaultValues: {
      date: siteDashboardToday,
      labour: 0,
      present: true,
      site: siteId,
    },
    mode: "onChange",
    resolver: createZodResolver(attendanceSchema),
  });

  function handleClose() {
    setFormError("");
    setIsLabourModalOpen(false);
    onClose();
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    lastSelectedLabourRef.current = 0;
    reset({
      date: siteDashboardToday,
      labour: 0,
      present: true,
      site: siteId,
    });
  }, [open, reset, siteId]);

  return (
    <>
      <Modal
        footer={
          <div className="flex justify-end gap-3">
            <Button onClick={handleClose} type="button" variant="secondary">
              Cancel
            </Button>
            <Button disabled={!isValid} form="site-labour-entry-form" isLoading={isSubmitting} type="submit">
              Save Labour Entry
            </Button>
          </div>
        }
        onClose={handleClose}
        open={open}
        size="lg"
        title="Add Labour Entry"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-slate-700 dark:border-blue-100 dark:bg-blue-50/70 dark:text-slate-700">
            New attendance entry will be recorded for <span className="font-semibold">{siteName}</span>.
          </div>
          <form
            className="grid gap-4 md:grid-cols-2"
            id="site-labour-entry-form"
            onSubmit={handleSubmit(async (values) => {
              try {
                setFormError("");
                await attendanceService.create(values);
                showSuccess("Labour entry added", "Attendance record has been created for this site.");
                onSaved();
                handleClose();
              } catch (error) {
                setFormError(getErrorMessage(error));
              }
            })}
          >
            <Controller
              control={control}
              name="labour"
              render={({ field }) => (
                <Select
                  clearable={false}
                  error={errors.labour?.message}
                  label="Labour"
                  options={[
                    ...labours.map((labour) => ({ label: labour.name, value: labour.id })),
                    { label: "Other Labour", value: otherLabourOptionValue },
                  ]}
                  placeholder="Select labour"
                  requiredIndicator
                  value={field.value || ""}
                  onChange={(event) => {
                    const nextValue = event.target.value ? Number(event.target.value) : 0;

                    if (nextValue === otherLabourOptionValue) {
                      field.onChange(lastSelectedLabourRef.current || 0);
                      setIsLabourModalOpen(true);
                      return;
                    }

                    lastSelectedLabourRef.current = nextValue;
                    field.onChange(nextValue);
                  }}
                />
              )}
            />
            <Select clearable={false} disabled label="Site" options={[{ label: siteName, value: siteId }]} value={siteId} />
            <Input error={errors.date?.message} label="Date" max={siteDashboardToday} requiredIndicator type="date" {...register("date")} />
            <Controller
              control={control}
              name="present"
              render={({ field }) => (
                <Select
                  clearable={false}
                  label="Attendance"
                  options={[
                    { label: "Present", value: "true" },
                    { label: "Absent", value: "false" },
                  ]}
                  requiredIndicator
                  value={field.value ? "true" : "false"}
                  onChange={(event) => field.onChange(event.target.value === "true")}
                />
              )}
            />
            <div className="md:col-span-2">
              <FormError message={formError} />
            </div>
          </form>
        </div>
      </Modal>

      <EntityFormModal<LabourFormValues>
        defaultValues={{ labour_type: "", name: "", per_day_wage: 0, phone: "" }}
        description="Create or update labour records."
        fields={[
          { kind: "text", label: "Labour Name", maxLength: 80, minLength: 2, name: "name", placeholder: "Worker name", required: true },
          { kind: "text", label: "Labour Type", maxLength: 100, name: "labour_type", placeholder: "Mason, Helper, Carpenter..." },
          { kind: "text", digitsOnly: true, inputMode: "numeric", label: "Phone", maxLength: 15, minLength: 10, name: "phone", pattern: "[0-9]{10,15}", placeholder: "Contact number", required: true },
          { kind: "number", label: "Per Day Wage", min: 0, name: "per_day_wage", placeholder: "500", required: true, step: 1, valueType: "number" },
        ]}
        onClose={() => setIsLabourModalOpen(false)}
        onSubmit={async (values) => {
          const labour = await labourService.create(values);
          onLabourAdded(labour);
          lastSelectedLabourRef.current = labour.id;
          setValue("labour", labour.id, {
            shouldDirty: true,
            shouldTouch: false,
            shouldValidate: true,
          });
          setIsLabourModalOpen(false);
          showSuccess("Labour added", "New labour is ready to use in this entry.");
        }}
        open={isLabourModalOpen}
        schema={labourSchema}
        title="Add Labour"
      />
    </>
  );
}

interface SiteCasualLabourEntryModalProps {
  onClose: () => void;
  onSaved: () => void;
  open: boolean;
  siteId: number;
  siteName: string;
}

export function SiteCasualLabourEntryModal({
  onClose,
  onSaved,
  open,
  siteId,
  siteName,
}: SiteCasualLabourEntryModalProps) {
  const { showSuccess } = useToast();
  const [formError, setFormError] = useState("");
  const {
    formState: { errors, isSubmitting, isValid },
    handleSubmit,
    register,
    reset,
  } = useForm<CasualLabourEntryFormValues>({
    defaultValues: {
      date: siteDashboardToday,
      labour_name: "",
      labour_type: "",
      paid_amount: 0,
      site: siteId,
    },
    mode: "onChange",
    resolver: createZodResolver(casualLabourSchema),
  });

  function handleClose() {
    setFormError("");
    onClose();
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    reset({
      date: siteDashboardToday,
      labour_name: "",
      labour_type: "",
      paid_amount: 0,
      site: siteId,
    });
  }, [open, reset, siteId]);

  return (
    <Modal
      footer={
        <div className="flex justify-end gap-3">
          <Button onClick={handleClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={!isValid}
            form="site-casual-labour-entry-form"
            isLoading={isSubmitting}
            type="submit"
          >
            Save Casual Labour
          </Button>
        </div>
      }
      onClose={handleClose}
      open={open}
      size="lg"
      title="Add Casual Labour"
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-slate-700 dark:border-blue-100 dark:bg-blue-50/70 dark:text-slate-700">
          New casual labour entry will be recorded for <span className="font-semibold">{siteName}</span>.
        </div>

        <form
          className="grid gap-4 md:grid-cols-2"
          id="site-casual-labour-entry-form"
          onSubmit={handleSubmit(async (values) => {
            try {
              setFormError("");
              await casualLabourService.create(values);
              showSuccess(
                "Casual labour added",
                "Casual labour entry has been created for this site.",
              );
              onSaved();
              handleClose();
            } catch (error) {
              setFormError(getErrorMessage(error));
            }
          })}
        >
          <Input
            disabled
            label="Site"
            readOnly
            value={siteName}
          />
          <input type="hidden" value={siteId} {...register("site", { valueAsNumber: true })} />

          <Input
            error={errors.labour_name?.message}
            label="Labour Name"
            maxLength={255}
            placeholder="Worker name"
            requiredIndicator
            {...register("labour_name")}
          />
          <Input
            error={errors.labour_type?.message}
            label="Labour Type"
            maxLength={100}
            placeholder="Helper, Mason, Loader..."
            requiredIndicator
            {...register("labour_type")}
          />
          <Input
            error={errors.date?.message}
            label="Date"
            requiredIndicator
            type="date"
            {...register("date")}
          />
          <Input
            error={errors.paid_amount?.message}
            label="Paid Amount"
            min={0}
            requiredIndicator
            step={0.01}
            type="number"
            {...register("paid_amount", {
              setValueAs: (value) => (value === "" ? 0 : Number(value)),
            })}
          />

          <div className="md:col-span-2">
            <FormError message={formError} />
          </div>
        </form>
      </div>
    </Modal>
  );
}
