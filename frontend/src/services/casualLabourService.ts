import { createCrudService } from "./crudService";
import type {
  CasualLabourEntry,
  CasualLabourEntryFormValues,
} from "../types/erp.types";

const casualLabourCrudService = createCrudService<
  CasualLabourEntry,
  CasualLabourEntryFormValues
>("/labour/casual-labour/");

function withEmptyContact(payload: CasualLabourEntryFormValues) {
  return {
    ...payload,
    contact: "",
  };
}

export const casualLabourService = {
  ...casualLabourCrudService,
  create(payload: CasualLabourEntryFormValues) {
    return casualLabourCrudService.create(withEmptyContact(payload));
  },
  update(id: number, payload: CasualLabourEntryFormValues) {
    return casualLabourCrudService.update(id, withEmptyContact(payload));
  },
};
