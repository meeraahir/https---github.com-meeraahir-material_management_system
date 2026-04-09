import { z } from "zod";

import { CrudModulePage } from "../../components/forms/CrudModulePage";
import { vendorsService } from "../../services/vendorsService";
import type { Vendor, VendorFormValues } from "../../types/erp.types";

const phoneRegex = /^[0-9]{10}$/;
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const aadharRegex = /^[0-9]{12}$/;
const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const bankAccountRegex = /^[0-9]{9,18}$/;

const optionalText = (maxLength: number) =>
  z.string().max(maxLength, `Must be ${maxLength} characters or fewer.`);
const optionalEmail = z
  .string()
  .refine(
    (value) =>
      value === "" ||
      (value.length <= 120 && z.string().email().safeParse(value).success),
    "Enter a valid email address.",
  );

const vendorSchema = z.object({
  aadhar_number: z
    .string()
    .refine((value) => value === "" || aadharRegex.test(value), "Aadhar must be 12 digits."),
  address: z
    .string()
    .trim()
    .min(5, "Address must be at least 5 characters.")
    .max(300, "Address must be 300 characters or fewer."),
  bank_account_number: z
    .string()
    .refine(
      (value) => value === "" || bankAccountRegex.test(value),
      "Account number must be 9 to 18 digits.",
    ),
  bank_name: optionalText(80),
  document_details: optionalText(300),
  email: optionalEmail,
  ifsc_code: z
    .string()
    .transform((value) => value.toUpperCase())
    .refine((value) => value === "" || ifscRegex.test(value), "Enter a valid IFSC code."),
  license_number: optionalText(60),
  name: z
    .string()
    .trim()
    .min(2, "Vendor name must be at least 2 characters.")
    .max(100, "Vendor name must be 100 characters or fewer."),
  pan_number: z
    .string()
    .transform((value) => value.toUpperCase())
    .refine((value) => value === "" || panRegex.test(value), "Enter a valid PAN number."),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => phoneRegex.test(value),
      "Mobile number must be exactly 10 digits.",
    ),
  tax_identifier: optionalText(60),
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
        {
          kind: "text",
          label: "Vendor Name",
          maxLength: 100,
          minLength: 2,
          name: "name",
          placeholder: "Supplier name",
          required: true,
        },
        {
          kind: "text",
          digitsOnly: true,
          inputMode: "numeric",
          label: "Mobile Number",
          maxLength: 10,
          minLength: 10,
          name: "phone",
          pattern: "[0-9]{10}",
          placeholder: "Enter 10 digit mobile number",
          required: true,
        },
        {
          kind: "email",
          label: "Email",
          maxLength: 120,
          name: "email",
          placeholder: "Optional email",
        },
        {
          kind: "textarea",
          label: "Address",
          name: "address",
          placeholder: "Full address",
          required: true,
          rows: 4,
        },
        { kind: "text", label: "Bank Name", maxLength: 80, name: "bank_name", placeholder: "Optional bank name" },
        {
          kind: "text",
          label: "Account Number",
          maxLength: 18,
          minLength: 9,
          name: "bank_account_number",
          pattern: "[0-9]{9,18}",
          placeholder: "Optional account number",
        },
        {
          kind: "text",
          label: "IFSC Code",
          maxLength: 11,
          minLength: 11,
          name: "ifsc_code",
          placeholder: "Optional IFSC code",
        },
        { kind: "text", label: "Tax Identifier", maxLength: 60, name: "tax_identifier", placeholder: "Optional tax ID" },
        { kind: "text", label: "License Number", maxLength: 60, name: "license_number", placeholder: "Optional license number" },
        {
          kind: "text",
          label: "PAN Number",
          maxLength: 10,
          minLength: 10,
          name: "pan_number",
          placeholder: "Optional PAN number",
        },
        {
          kind: "text",
          label: "Aadhar Number",
          maxLength: 12,
          minLength: 12,
          name: "aadhar_number",
          pattern: "[0-9]{12}",
          placeholder: "Optional Aadhar number",
        },
        {
          kind: "textarea",
          label: "Document Details",
          name: "document_details",
          placeholder: "Supporting documents or notes",
          rows: 5,
        },
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
