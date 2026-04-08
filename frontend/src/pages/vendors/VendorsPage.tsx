import { z } from "zod";

import { CrudModulePage } from "../../components/forms/CrudModulePage";
import { vendorsService } from "../../services/vendorsService";
import type { Vendor, VendorFormValues } from "../../types/erp.types";

const optionalText = z.string();
const optionalEmail = z
  .string()
  .refine(
    (value) => value === "" || z.string().email().safeParse(value).success,
    "Enter a valid email address.",
  );

const vendorSchema = z.object({
  aadhar_number: optionalText,
  address: z.string().trim().min(1, "Address is required."),
  bank_account_number: optionalText,
  bank_name: optionalText,
  document_details: optionalText,
  email: optionalEmail,
  ifsc_code: optionalText,
  license_number: optionalText,
  name: z.string().trim().min(1, "Vendor name is required."),
  pan_number: optionalText,
  phone: z.string().trim().min(1, "Phone number is required."),
  tax_identifier: optionalText,
});

export function VendorsPage() {
  return (
    <CrudModulePage<Vendor, VendorFormValues>
      canManage
      columns={[
        { key: "name", header: "Vendor", accessor: (row) => row.name, sortValue: (row) => row.name },
        { key: "phone", header: "Phone", accessor: (row) => row.phone, sortValue: (row) => row.phone },
        { key: "email", header: "Email", accessor: (row) => row.email || "-" },
        { key: "address", header: "Address", accessor: (row) => row.address || "-" },
      ]}
      createLabel="Add Vendor"
      defaultValues={{
        aadhar_number: "",
        address: "",
        bank_account_number: "",
        bank_name: "",
        document_details: "",
        email: "",
        ifsc_code: "",
        license_number: "",
        name: "",
        pan_number: "",
        phone: "",
        tax_identifier: "",
      }}
      description="Manage supplier master records including contact and banking details."
      emptyDescription="No vendors are available yet."
      emptyTitle="No vendors found"
      fields={[
        { kind: "text", label: "Vendor Name", name: "name", placeholder: "Supplier name" },
        { kind: "text", label: "Phone", name: "phone", placeholder: "Phone number" },
        { kind: "email", label: "Email", name: "email", placeholder: "Optional email" },
        { kind: "textarea", label: "Address", name: "address", placeholder: "Full address" },
        { kind: "text", label: "Bank Name", name: "bank_name", placeholder: "Optional bank name" },
        { kind: "text", label: "Account Number", name: "bank_account_number", placeholder: "Optional account number" },
        { kind: "text", label: "IFSC Code", name: "ifsc_code", placeholder: "Optional IFSC code" },
        { kind: "text", label: "Tax Identifier", name: "tax_identifier", placeholder: "Optional tax ID" },
        { kind: "text", label: "License Number", name: "license_number", placeholder: "Optional license number" },
        { kind: "text", label: "PAN Number", name: "pan_number", placeholder: "Optional PAN number" },
        { kind: "text", label: "Aadhar Number", name: "aadhar_number", placeholder: "Optional Aadhar number" },
        { kind: "textarea", label: "Document Details", name: "document_details", placeholder: "Supporting documents or notes" },
      ]}
      getEditValues={(entity) => ({
        aadhar_number: entity.aadhar_number || "",
        address: entity.address,
        bank_account_number: entity.bank_account_number || "",
        bank_name: entity.bank_name || "",
        document_details: entity.document_details || "",
        email: entity.email || "",
        ifsc_code: entity.ifsc_code || "",
        license_number: entity.license_number || "",
        name: entity.name,
        pan_number: entity.pan_number || "",
        phone: entity.phone,
        tax_identifier: entity.tax_identifier || "",
      })}
      getId={(entity) => entity.id}
      schema={vendorSchema}
      searchPlaceholder="Search vendors by name or phone"
      service={vendorsService}
      title="Vendors"
    />
  );
}
