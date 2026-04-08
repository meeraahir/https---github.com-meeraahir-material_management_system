import { createCrudService } from "./crudService";
import type { Purchase, PurchaseFormValues } from "../types/erp.types";

type VendorPurchasePayload = Omit<PurchaseFormValues, "material"> & {
  material: number | null;
};

const baseService = createCrudService<
  Purchase,
  VendorPurchasePayload
>("/vendors/transactions/");

function normalizePayload(payload: PurchaseFormValues): VendorPurchasePayload {
  return {
    ...payload,
    material: payload.material > 0 ? payload.material : null,
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
