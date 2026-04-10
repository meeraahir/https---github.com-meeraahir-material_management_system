import { createCrudService } from "./crudService";
import type { VendorPayment, VendorPaymentFormValues } from "../types/erp.types";

type VendorPaymentPayload = Omit<VendorPaymentFormValues, "reference_number" | "remarks"> & {
  reference_number?: string;
  remarks?: string;
};

const baseService = createCrudService<VendorPayment, VendorPaymentPayload>(
  "/vendors/payments/",
);

function normalizePayload(payload: VendorPaymentFormValues): VendorPaymentPayload {
  return {
    ...payload,
    reference_number: payload.reference_number.trim() || undefined,
    remarks: payload.remarks.trim() || undefined,
  };
}

export const vendorPaymentsService = {
  ...baseService,
  create(payload: VendorPaymentFormValues) {
    return baseService.create(normalizePayload(payload));
  },
  update(id: number, payload: VendorPaymentFormValues) {
    return baseService.update(id, normalizePayload(payload));
  },
};
