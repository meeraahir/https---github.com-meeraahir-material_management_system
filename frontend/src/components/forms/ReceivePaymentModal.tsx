import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { Receivable, ReceivePaymentFormValues } from "../../types/erp.types";
import { createZodResolver } from "../../utils/zodResolver";
import { getErrorMessage } from "../../utils/apiError";
import { formatCurrency, formatDate } from "../../utils/format";
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
  date: z.string().min(1, "Receipt date is required."),
  notes: z.string().max(600, "Notes must be 600 characters or fewer."),
  payment_mode: z.enum(["cash", "check", "bank_transfer", "upi", "other"], {
    message: "Payment method is required.",
  }),
  reference_number: z
    .string()
    .max(50, "Reference number must be 50 characters or fewer."),
  receiver_name: z.string().max(255, "Receiver name must be 255 characters or fewer."),
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
  partyLabel,
  siteLabel,
}: ReceivePaymentModalProps) {
  const { showSuccess } = useToast();
  const [formError, setFormError] = useState("");
  const pendingAmount = useMemo(
    () => item?.pending_amount ?? item?.amount ?? 0,
    [item],
  );
  const currentReceivedAmount = useMemo(
    () => item?.current_received_amount ?? 0,
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
      cheque_number: "",
      date: today,
      payment_mode: "cash",
      notes: "",
      receiver_name: "",
      reference_number: "",
      sender_name: "",
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
      cheque_number: "",
      date: today,
      payment_mode: "cash",
      notes: "",
      receiver_name: "",
      reference_number: "",
      sender_name: "",
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
      <div className="space-y-5">
        <section className="grid gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 md:grid-cols-2 dark:border-blue-100 dark:bg-blue-50/60">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              Party
            </p>
            <p className="mt-1 text-base font-black text-slate-950">
              {partyLabel || `Party #${item.party}`}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              Site
            </p>
            <p className="mt-1 text-base font-black text-slate-950">
              {siteLabel || `Site #${item.site}`}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              Invoice Amount
            </p>
            <p className="mt-1 text-base font-black text-slate-950">
              {formatCurrency(item.amount)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              Invoice Date
            </p>
            <p className="mt-1 text-base font-black text-slate-950">
              {formatDate(item.date)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              Phase
            </p>
            <p className="mt-1 text-base font-black text-slate-950">
              {item.phase_name || "-"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              Received So Far
            </p>
            <p className="mt-1 text-base font-black text-emerald-700">
              {formatCurrency(currentReceivedAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              Pending Amount
            </p>
            <p className="mt-1 text-base font-black text-amber-700">
              {formatCurrency(pendingAmount)}
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              Description
            </p>
            <p className="mt-1 text-base font-black text-slate-950">
              {item.description || "-"}
            </p>
          </div>
        </section>

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
            error={errors.payment_mode?.message}
            label="Payment Mode"
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
              placeholder="Optional collection remarks"
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
  );
}
