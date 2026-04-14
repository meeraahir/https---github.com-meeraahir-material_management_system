import { createCrudService } from "./crudService";
import type { VendorPayment, VendorPaymentFormValues } from "../types/erp.types";

type VendorPaymentPayload = Omit<
  VendorPaymentFormValues,
  "cheque_number" | "receiver_name" | "reference_number" | "remarks" | "sender_name"
> & {
  cheque_number?: string;
  receiver_name?: string;
  reference_number?: string;
  remarks?: string;
  sender_name?: string;
};

const baseService = createCrudService<VendorPayment, VendorPaymentPayload>(
  "/vendors/payments/",
);

function normalizePayload(payload: VendorPaymentFormValues): VendorPaymentPayload {
  return {
    ...payload,
    cheque_number: payload.cheque_number.trim() || undefined,
    receiver_name: payload.receiver_name.trim() || undefined,
    reference_number: payload.reference_number.trim() || undefined,
    remarks: payload.remarks.trim() || undefined,
    sender_name: payload.sender_name.trim() || undefined,
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
