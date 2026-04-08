import { createCrudService } from "./crudService";
import type { Labour, LabourFormValues } from "../types/erp.types";

export const labourService = createCrudService<Labour, LabourFormValues>(
  "/labour/",
);
