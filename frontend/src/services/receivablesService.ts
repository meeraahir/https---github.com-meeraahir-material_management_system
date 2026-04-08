import { createCrudService } from "./crudService";
import type { Receivable, ReceivableFormValues } from "../types/erp.types";

export const receivablesService = createCrudService<
  Receivable,
  ReceivableFormValues
>("/finance/transactions/");
