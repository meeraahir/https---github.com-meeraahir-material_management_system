import { createCrudService } from "./crudService";
import type { Payment, PaymentFormValues } from "../types/erp.types";

export const paymentsService = createCrudService<Payment, PaymentFormValues>(
  "/labour/payments/",
);
