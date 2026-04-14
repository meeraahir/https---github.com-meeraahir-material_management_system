import { createCrudService } from "./crudService";
import type {
  CasualLabourEntry,
  CasualLabourEntryFormValues,
} from "../types/erp.types";

export const casualLabourService = createCrudService<
  CasualLabourEntry,
  CasualLabourEntryFormValues
>("/labour/casual-labour/");
