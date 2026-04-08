import { createCrudService } from "./crudService";
import type { Receipt, ReceiptFormValues } from "../types/erp.types";

export const materialReceiptsService = createCrudService<
  Receipt,
  ReceiptFormValues
>("/materials/stocks/");
