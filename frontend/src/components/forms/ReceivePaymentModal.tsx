import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { Receivable, ReceivePaymentFormValues } from "../../types/erp.types";
import { createZodResolver } from "../../utils/zodResolver";
import { getErrorMessage } from "../../utils/apiError";
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
  date: z
    .string()
    .min(1, "Receipt date is required.")
    .refine((value) => value <= today, "Receipt date cannot be in the future."),
  notes: z.string().max(600, "Notes must be 600 characters or fewer."),
  payment_mode: z.string().min(1, "Payment method is required."),
  reference_number: z
    .string()
    .max(50, "Reference number must be 50 characters or fewer."),
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
  partyLabel: _partyLabel,
  siteLabel: _siteLabel,
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
  } = useForm<ReceivePaymentFormValues>({
    defaultValues: {
      amount: pendingAmount,
      date: new Date().toISOString().slice(0, 10),
      notes: "",
      payment_mode: "cash",
      reference_number: "",
    },
    mode: "onChange",
    resolver: createZodResolver(receivePaymentSchema),
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset({
      amount: pendingAmount,
      date: new Date().toISOString().slice(0, 10),
      notes: "",
      payment_mode: "cash",
      reference_number: "",
    });
  }, [open, pendingAmount, reset]);

  if (!item) {
    return null;
  }

  function handleClose() {
    setFormError("");
    onClose();
  }

  return (
    <Modal
      footer={
        <div className="flex justify-end gap-3">
          <Button onClick={handleClose} type="button" variant="secondary">
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
      onClose={handleClose}
      open={open}
      size="lg"
      title="Receive Payment"
    >
      <form
        className="grid gap-4 md:grid-cols-2"
        id="receive-payment-form"
        onSubmit={handleSubmit(async (values: ReceivePaymentFormValues) => {
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
        })}
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
              { label: "Bank", value: "bank_transfer" },
              { label: "UPI", value: "upi" },
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
