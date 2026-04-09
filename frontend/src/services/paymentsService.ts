import { createCrudService } from "./crudService";
import type { Payment, PaymentFormValues } from "../types/erp.types";

type PaymentPayload = Omit<PaymentFormValues, "site"> & {
  site?: number | null;
};

const baseService = createCrudService<Payment, PaymentPayload>(
  "/labour/payments/",
);

function normalizePayload(payload: PaymentFormValues): PaymentPayload {
  return {
    ...payload,
    notes: payload.notes?.trim() || "",
    period_end: payload.period_end || undefined,
    period_start: payload.period_start || undefined,
    site: payload.site && payload.site > 0 ? payload.site : null,
  };
}

export const paymentsService = {
  ...baseService,
  create(payload: PaymentFormValues) {
    return baseService.create(normalizePayload(payload));
  },
  update(id: number, payload: PaymentFormValues) {
    return baseService.update(id, normalizePayload(payload));
  },
};
