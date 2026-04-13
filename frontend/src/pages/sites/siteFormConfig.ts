import { z } from "zod";

import type { FormFieldConfig } from "../../types/ui.types";
import type { SiteFormValues } from "../../types/erp.types";

export const siteSchema = z.object({
  description: z.string().max(300, "Description must be 300 characters or fewer."),
  location: z
    .string()
    .trim()
    .min(2, "Location must be at least 2 characters.")
    .max(120, "Location must be 120 characters or fewer."),
  name: z
    .string()
    .trim()
    .min(2, "Site name must be at least 2 characters.")
    .max(100, "Site name must be 100 characters or fewer."),
});

export const siteDefaultValues: SiteFormValues = {
  description: "",
  location: "",
  name: "",
};

export const siteFormFields: FormFieldConfig<SiteFormValues>[] = [
  {
    kind: "text",
    label: "Site Name",
    maxLength: 100,
    minLength: 2,
    name: "name",
    placeholder: "Enter site name",
    required: true,
  },
  {
    kind: "text",
    label: "Location",
    maxLength: 120,
    minLength: 2,
    name: "location",
    placeholder: "Enter location",
    required: true,
  },
  {
    kind: "textarea",
    label: "Description",
    name: "description",
    placeholder: "Optional notes about this site",
    rows: 5,
  },
];
