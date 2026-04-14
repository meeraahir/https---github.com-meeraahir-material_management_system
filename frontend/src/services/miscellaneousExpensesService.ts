import { createCrudService } from "./crudService";
import type {
  MiscellaneousExpense,
  MiscellaneousExpenseFormValues,
} from "../types/erp.types";

type MiscellaneousExpensePayload = MiscellaneousExpenseFormValues;

const baseService = createCrudService<
  MiscellaneousExpense,
  MiscellaneousExpensePayload
>("/finance/miscellaneous-expenses/");

function normalizePayload(
  payload: MiscellaneousExpenseFormValues,
): MiscellaneousExpensePayload {
  return {
    ...payload,
    notes: payload.notes.trim() || "",
    paid_to_name: payload.paid_to_name.trim() || "",
    title: payload.title.trim(),
  };
}

export const miscellaneousExpensesService = {
  ...baseService,
  create(payload: MiscellaneousExpenseFormValues) {
    return baseService.create(normalizePayload(payload));
  },
  update(id: number, payload: MiscellaneousExpenseFormValues) {
    return baseService.update(id, normalizePayload(payload));
  },
};
