import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { Receivable, ReceivePaymentFormValues } from "../../types/erp.types";
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

const receivePaymentSchema = z.object({
  amount: z.number().gt(0, "Received amount must be greater than zero."),
  cheque_number: z.string().max(50, "Cheque number must be 50 characters or fewer."),
  date: z
    .string()
    .min(1, "Receipt date is required.")
    .refine((value) => value <= today, "Receipt date cannot be in the future."),
  notes: z.string().max(600, "Notes must be 600 characters or fewer."),
  payment_mode: z.enum(["cash", "check", "bank_transfer", "upi", "other"]),
  receiver_name: z.string().max(255, "Receiver name must be 255 characters or fewer."),
  reference_number: z.string().max(50, "Reference number must be 50 characters or fewer."),
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

interface ReceivePaymentModalProps {
  item: Receivable | null;
  onClose: () => void;
  onSubmit: (values: ReceivePaymentFormValues) => Promise<void>;
  open: boolean;
  partyLabel?: string;
  siteLabel?: string;
}

export function ReceivePaymentModal({
  item,
  onClose,
  onSubmit,
  open,
}: ReceivePaymentModalProps) {
  const { showSuccess } = useToast();
  const [formError, setFormError] = useState("");
  const pendingAmount = useMemo(
    () => item?.pending_amount ?? item?.amount ?? 0,
    [item],
  );

  const {
    formState: { errors, isSubmitting, isValid },
    handleSubmit,
    register,
    reset,
    watch,
  } = useForm<ReceivePaymentFormValues>({
    defaultValues: {
      amount: pendingAmount,
      cheque_number: "",
      date: today,
      notes: "",
      payment_mode: "cash",
      receiver_name: "",
      reference_number: "",
      sender_name: "",
    },
    mode: "onChange",
    resolver: createZodResolver(receivePaymentSchema),
  });

  const paymentMode = watch("payment_mode");

  useEffect(() => {
    if (!open) {
      return;
    }

    reset({
      amount: pendingAmount,
      cheque_number: "",
      date: today,
      notes: "",
      payment_mode: "cash",
      receiver_name: "",
      reference_number: "",
      sender_name: "",
    });
    setFormError("");
  }, [open, pendingAmount, reset]);

  if (!item) {
    return null;
  }

  async function submit(values: ReceivePaymentFormValues) {
    if (values.amount > pendingAmount) {
      setFormError("Received amount cannot exceed pending amount.");
      return;
    }

    try {
      setFormError("");
      await onSubmit(values);
      showSuccess(
        "Payment received",
        "Receivable balance has been updated successfully.",
      );
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  }

  return (
    <Modal
      footer={
        <div className="flex justify-end gap-3">
          <Button onClick={onClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={!isValid || pendingAmount <= 0}
            form="receive-payment-form"
            isLoading={isSubmitting}
            type="submit"
          >
            Save Receipt
          </Button>
        </div>
      }
      onClose={onClose}
      open={open}
      size="lg"
      title="Receive Payment"
    >
      <form
        className="grid gap-4 md:grid-cols-2"
        id="receive-payment-form"
        onSubmit={handleSubmit(submit)}
      >
        <Input
          error={errors.amount?.message}
          label="Received Amount"
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
          label="Receipt Date"
          requiredIndicator
          type="date"
          {...register("date")}
        />
        <Select
          clearable={false}
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
          error={errors.reference_number?.message}
          label="Reference Number"
          maxLength={50}
          placeholder="Receipt, UTR, cheque, or voucher reference"
          {...register("reference_number")}
        />
        <Input
          error={errors.sender_name?.message}
          label="Sender Name"
          maxLength={255}
          placeholder="Who sent the payment"
          {...register("sender_name")}
        />
        <Input
          error={errors.receiver_name?.message}
          label="Receiver Name"
          maxLength={255}
          placeholder="Who received the payment"
          {...register("receiver_name")}
        />
        {paymentMode === "check" ? (
          <Input
            error={errors.cheque_number?.message}
            label="Cheque Number"
            maxLength={50}
            placeholder="Required for check payments"
            {...register("cheque_number")}
          />
        ) : null}
        <div className="md:col-span-2">
          <Textarea
            error={errors.notes?.message}
            label="Notes"
            placeholder="Optional collection remarks"
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
