import { createCrudService } from "./crudService";
import type { OwnerPayout, OwnerPayoutFormValues } from "../types/erp.types";

type OwnerPayoutPayload = Omit<
  OwnerPayoutFormValues,
  "cheque_number" | "receiver_name" | "reference_number" | "remarks" | "sender_name"
> & {
  cheque_number?: string;
  receiver_name?: string;
  reference_number?: string;
  remarks?: string;
  sender_name?: string;
};

const baseService = createCrudService<OwnerPayout, OwnerPayoutPayload>(
  "/finance/owner-payouts/",
);

function normalizePayload(payload: OwnerPayoutFormValues): OwnerPayoutPayload {
  return {
    ...payload,
    cheque_number: payload.cheque_number.trim() || undefined,
    receiver_name: payload.receiver_name.trim() || undefined,
    reference_number: payload.reference_number.trim() || undefined,
    remarks: payload.remarks.trim() || undefined,
    sender_name: payload.sender_name.trim() || undefined,
  };
}

export const ownerPayoutsService = {
  ...baseService,
  create(payload: OwnerPayoutFormValues) {
    return baseService.create(normalizePayload(payload));
  },
  update(id: number, payload: OwnerPayoutFormValues) {
    return baseService.update(id, normalizePayload(payload));
  },
};
