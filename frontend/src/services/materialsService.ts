import { createCrudService } from "./crudService";
import type { Material, MaterialFormValues } from "../types/erp.types";

export const materialsService = createCrudService<Material, MaterialFormValues>(
  "/materials/",
);
