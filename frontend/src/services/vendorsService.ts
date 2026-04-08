import { createCrudService } from "./crudService";
import type { Vendor, VendorFormValues } from "../types/erp.types";

export const vendorsService = createCrudService<Vendor, VendorFormValues>(
  "/vendors/",
);
