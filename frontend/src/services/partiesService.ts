import { createCrudService } from "./crudService";
import type { Party, PartyFormValues } from "../types/erp.types";

export const partiesService = createCrudService<Party, PartyFormValues>(
  "/finance/",
);
