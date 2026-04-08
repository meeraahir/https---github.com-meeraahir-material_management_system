import { createCrudService } from "./crudService";
import type { Site, SiteFormValues } from "../types/erp.types";

export const sitesService = createCrudService<Site, SiteFormValues>("/sites/");
