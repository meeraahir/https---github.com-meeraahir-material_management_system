import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { Purchase, VendorPaymentFormValues } from "../../types/erp.types";
import { getErrorMessage } from "../../utils/apiError";
import { createZodResolver } from "../../utils/zodResolver";
import { useToast } from "../feedback/useToast";
import { Modal } from "../modal/Modal";
import { Button } from "../ui/Button";
import { FormError } from "../ui/FormError";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";

const today = new Date().toISOString().slice(0, 10);

const vendorPaymentSchema = z.object({
  amount: z.number().gt(0, "Paid amount must be greater than zero."),
  cheque_number: z.string().max(50, "Cheque number must be 50 characters or fewer."),
  date: z
    .string()
    .min(1, "Payment date is required.")
    .refine((value) => value <= today, "Payment date cannot be in the future."),
  notes: z.string().max(600, "Notes must be 600 characters or fewer."),
  payment_mode: z.enum(["cash", "check", "bank_transfer", "upi", "other"], {
    message: "Payment method is required.",
  }),
  receiver_name: z.string().max(255, "Receiver name must be 255 characters or fewer."),
  reference_number: z
    .string()
    .max(50, "Reference number must be 50 characters or fewer."),
  sender_name: z.string().max(255, "Sender name must be 255 characters or fewer."),
}).superRefine((value, context) => {
  if (value.payment_mode === "cash" && !value.sender_name.trim() && !value.receiver_name.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Sender name or receiver name is required for cash payments.",
      path: ["sender_name"],
    });
  }

  if (value.payment_mode === "check" && !value.cheque_number.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Cheque number is required for check payments.",
      path: ["cheque_number"],
    });
  }
});

export type VendorPaymentModalValues = Pick<
  VendorPaymentFormValues,
  | "amount"
  | "cheque_number"
  | "date"
  | "payment_mode"
  | "receiver_name"
  | "reference_number"
  | "sender_name"
> & {
  notes: string;
};

interface VendorPaymentModalProps {
  onClose: () => void;
  onSubmit: (values: VendorPaymentModalValues) => Promise<void>;
  open: boolean;
  purchase: Purchase | null;
}

export function VendorPaymentModal({
  onClose,
  onSubmit,
  open,
  purchase,
}: VendorPaymentModalProps) {
  const { showSuccess } = useToast();
  const [formError, setFormError] = useState("");
  const remainingAmount = purchase?.pending_amount ?? 0;

  function getDefaultValues(): VendorPaymentModalValues {
    return {
      amount: remainingAmount,
      cheque_number: "",
      date: today,
      notes: "",
      payment_mode: "cash",
      receiver_name: "",
      reference_number: "",
      sender_name: "",
    };
  }

  const {
    formState: { errors, isSubmitting, isValid },
    handleSubmit,
    register,
    reset,
  } = useForm<VendorPaymentModalValues>({
    defaultValues: getDefaultValues(),
    mode: "onChange",
    resolver: createZodResolver(vendorPaymentSchema),
  });

  function handleClose() {
    reset(getDefaultValues());
    setFormError("");
    onClose();
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(getDefaultValues());
    setFormError("");
  }, [open, remainingAmount, reset]);

  if (!purchase) {
    return null;
  }

  async function submit(values: VendorPaymentModalValues) {
    if (values.amount > remainingAmount) {
      setFormError("Paid amount cannot exceed remaining payable amount.");
      return;
    }

    try {
      setFormError("");
      await onSubmit(values);
      reset(getDefaultValues());
      showSuccess("Vendor payment saved", "Vendor payment has been recorded successfully.");
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  }

  return (
    <Modal
      footer={
        <div className="flex justify-end gap-3">
          <Button onClick={handleClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={!isValid || remainingAmount <= 0}
            form="vendor-payment-form"
            isLoading={isSubmitting}
            type="submit"
          >
            Save Payment
          </Button>
        </div>
      }
      onClose={handleClose}
      open={open}
      size="lg"
      title="Make Payment"
    >
      <form
        className="grid gap-4 md:grid-cols-2"
        id="vendor-payment-form"
        onSubmit={handleSubmit(submit)}
      >
        <Input
          error={errors.amount?.message}
          label="Paid Amount"
          min={0}
          requiredIndicator
          step={0.01}
          type="number"
          {...register("amount", {
            setValueAs: (value) => (value === "" ? 0 : Number(value)),
          })}
        />
        <Input
          error={errors.date?.message}
          label="Payment Date"
          requiredIndicator
          type="date"
          {...register("date")}
        />
        <Select
          error={errors.payment_mode?.message}
          label="Payment Method"
          options={[
            { label: "Cash", value: "cash" },
            { label: "Check", value: "check" },
            { label: "Bank Transfer", value: "bank_transfer" },
            { label: "UPI", value: "upi" },
            { label: "Other", value: "other" },
          ]}
          requiredIndicator
          {...register("payment_mode")}
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
        <Input
          error={errors.reference_number?.message}
          label="Reference Number"
          maxLength={50}
          placeholder="Receipt, UTR, cheque, or voucher reference"
          {...register("reference_number")}
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
    </Modal>
  );
}
