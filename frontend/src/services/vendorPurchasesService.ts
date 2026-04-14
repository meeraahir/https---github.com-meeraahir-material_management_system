import { createCrudService } from "./crudService";
import type { Purchase, PurchaseFormValues } from "../types/erp.types";

type VendorPurchasePayload = Omit<
  PurchaseFormValues,
  "cheque_number" | "material" | "receiver_name" | "sender_name"
> & {
  cheque_number?: string;
  material: number | null;
  receiver_name?: string;
  sender_name?: string;
};

const baseService = createCrudService<
  Purchase,
  VendorPurchasePayload
>("/vendors/transactions/");

function normalizePayload(payload: PurchaseFormValues): VendorPurchasePayload {
  return {
    ...payload,
    cheque_number: payload.cheque_number.trim() || undefined,
    material: payload.material > 0 ? payload.material : null,
    receiver_name: payload.receiver_name.trim() || undefined,
    sender_name: payload.sender_name.trim() || undefined,
  };
}

export const vendorPurchasesService = {
  ...baseService,
  create(payload: PurchaseFormValues) {
    return baseService.create(normalizePayload(payload));
  },
  update(id: number, payload: PurchaseFormValues) {
    return baseService.update(id, normalizePayload(payload));
  },
};
