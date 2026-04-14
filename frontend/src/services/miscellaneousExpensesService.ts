import { createCrudService } from "./crudService";
import type {
  MiscellaneousExpense,
  MiscellaneousExpenseFormValues,
} from "../types/erp.types";

type MiscellaneousExpensePayload = Omit<
  MiscellaneousExpenseFormValues,
  "labour" | "site"
> & {
  labour?: number | null;
  site?: number | null;
};

const baseService = createCrudService<
  MiscellaneousExpense,
  MiscellaneousExpensePayload
>("/finance/miscellaneous-expenses/");

function normalizePayload(
  payload: MiscellaneousExpenseFormValues,
): MiscellaneousExpensePayload {
  return {
    ...payload,
    labour: payload.labour && payload.labour > 0 ? payload.labour : null,
    notes: payload.notes.trim() || "",
    paid_to_name: payload.paid_to_name.trim() || "",
    site: payload.site && payload.site > 0 ? payload.site : null,
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
