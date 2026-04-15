import { apiClient } from "../api/client";
import { triggerAppRefresh } from "../context/dataSyncStore";
import { createCrudService } from "./crudService";
import type {
  Receivable,
  ReceivableFormValues,
  ReceivePaymentFormValues,
} from "../types/erp.types";

type ReceivablePayload = ReceivableFormValues & {
  received: boolean;
};

const baseService = createCrudService<Receivable, ReceivablePayload>(
  "/finance/transactions/",
);

function normalizePayload(payload: ReceivableFormValues): ReceivablePayload {
  return {
    ...payload,
    description: payload.description.trim(),
    phase_name: payload.phase_name.trim(),
    received: false,
    receipt_cheque_number: payload.receipt_cheque_number?.trim() || undefined,
    receipt_receiver_name: payload.receipt_receiver_name?.trim() || undefined,
    receipt_sender_name: payload.receipt_sender_name?.trim() || undefined,
  };
}

export const receivablesService = {
  ...baseService,
  create(payload: ReceivableFormValues) {
    return baseService.create(normalizePayload(payload));
  },
  async receivePayment(id: number, payload: ReceivePaymentFormValues) {
    const response = await apiClient.post<Receivable>(
      `/finance/transactions/${id}/receive-payment/`,
      {
        ...payload,
        cheque_number: payload.cheque_number.trim() || undefined,
        receiver_name: payload.receiver_name.trim() || undefined,
        sender_name: payload.sender_name.trim() || undefined,
      },
    );

    triggerAppRefresh();
    return response.data;
  },
  update(id: number, payload: ReceivableFormValues) {
    return baseService.update(id, normalizePayload(payload));
  },
};
