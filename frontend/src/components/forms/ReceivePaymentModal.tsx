import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { Receivable, ReceivePaymentFormValues } from "../../types/erp.types";
import { createZodResolver } from "../../utils/zodResolver";
import { formatCurrency, formatDate } from "../../utils/format";
import { getErrorMessage } from "../../utils/apiError";
import { useToast } from "../feedback/useToast";
import { Modal } from "../modal/Modal";
import { Button } from "../ui/Button";
import { FormError } from "../ui/FormError";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";

const receivePaymentSchema = z.object({
  amount: z.number().gt(0, "Received amount must be greater than zero."),
  date: z.string().min(1, "Receipt date is required."),
  notes: z.string().max(600, "Notes must be 600 characters or fewer."),
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
      date: new Date().toISOString().slice(0, 10),
      notes: "",
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-600 dark:text-slate-600">
            Pending amount {formatCurrency(pendingAmount)} hai. Save par receivable
            balance update ho jayega.
          </p>
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
          <Input
            error={errors.reference_number?.message}
            label="Reference Number"
            maxLength={50}
            placeholder="Receipt, UTR, cheque, or voucher reference"
            {...register("reference_number")}
          />
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm leading-6 text-amber-800 dark:border-amber-200 dark:bg-amber-50/80 dark:text-amber-800">
            Invoice ke against partial ya full payment receive kar sakte ho. Amount
            pending se zyada nahi hona chahiye.
          </div>
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
