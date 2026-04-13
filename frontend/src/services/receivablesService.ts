import { apiClient } from "../api/client";
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
    received: false,
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
      payload,
    );

    return response.data;
  },
  update(id: number, payload: ReceivableFormValues) {
    return baseService.update(id, normalizePayload(payload));
  },
};
