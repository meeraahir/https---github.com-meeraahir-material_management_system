import { createCrudService } from "./crudService";
import type { Receipt, ReceiptFormValues } from "../types/erp.types";

type ReceiptPayload = Omit<ReceiptFormValues, "material_variant"> & {
  material_variant?: number | null;
};

const baseService = createCrudService<
  Receipt,
  ReceiptPayload
>("/materials/stocks/");

function normalizePayload(payload: ReceiptFormValues): ReceiptPayload {
  const normalizedPayload: ReceiptPayload = {
    ...payload,
    material_variant:
      payload.material_variant && payload.material_variant > 0
        ? payload.material_variant
        : null,
  };

  if (payload.cost_per_unit === undefined) {
    delete normalizedPayload.cost_per_unit;
  }

  return normalizedPayload;
}

export const materialReceiptsService = {
  ...baseService,
  create(payload: ReceiptFormValues) {
    return baseService.create(normalizePayload(payload));
  },
  update(id: number, payload: ReceiptFormValues) {
    return baseService.update(id, normalizePayload(payload));
  },
};
