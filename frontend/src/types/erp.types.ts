export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ListParams {
  page?: number;
  search?: string;
}

export interface Site {
  id: number;
  name: string;
  location: string;
  description: string;
}

export interface SiteFormValues {
  name: string;
  location: string;
  description: string;
}

export type MaterialUnit = "bag" | "kg" | "ton" | "meter" | "litre" | "piece";

export interface Material {
  id: number;
  name: string;
  unit: MaterialUnit;
}

export interface MaterialFormValues {
  name: string;
  unit: MaterialUnit;
}

export interface Vendor {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  address: string;
  bank_name: string | null;
  bank_account_number: string | null;
  ifsc_code: string | null;
  tax_identifier: string | null;
  license_number: string | null;
  document_details: string | null;
  pan_number: string | null;
  aadhar_number: string | null;
}

export interface VendorFormValues {
  name: string;
  phone: string;
  email: string;
  address: string;
  bank_name: string;
  bank_account_number: string;
  ifsc_code: string;
  tax_identifier: string;
  license_number: string;
  document_details: string;
  pan_number: string;
  aadhar_number: string;
}

export interface Labour {
  id: number;
  name: string;
  phone: string;
  per_day_wage: number;
}

export interface LabourFormValues {
  name: string;
  phone: string;
  per_day_wage: number;
}

export interface Party {
  id: number;
  name: string;
  contact: string;
}

export interface PartyFormValues {
  name: string;
  contact: string;
}

export interface Receipt {
  id: number;
  site: number;
  site_name: string;
  material: number;
  material_name: string;
  material_unit: string;
  quantity_received: number;
  quantity_used: number;
  cost_per_unit: number;
  transport_cost: number;
  date: string;
  total_cost: number;
  remaining_stock: number;
}

export interface ReceiptFormValues {
  site: number;
  material: number;
  quantity_received: number;
  quantity_used: number;
  cost_per_unit: number;
  transport_cost: number;
}

export interface Purchase {
  id: number;
  vendor: number;
  vendor_name: string;
  material: number | null;
  material_name: string | null;
  site: number;
  site_name: string;
  invoice_number: string | null;
  description: string | null;
  total_amount: number;
  paid_amount: number;
  date: string;
  pending_amount: number;
}

export interface PurchaseFormValues {
  vendor: number;
  material: number;
  site: number;
  invoice_number: string;
  description: string;
  total_amount: number;
  paid_amount: number;
  date: string;
}

export interface Attendance {
  id: number;
  labour: number;
  site: number;
  date: string;
  present: boolean;
}

export interface AttendanceFormValues {
  labour: number;
  site: number;
  date: string;
  present: boolean;
}

export interface Payment {
  id: number;
  labour: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
}

export interface PaymentFormValues {
  labour: number;
  total_amount: number;
  paid_amount: number;
}

export interface Receivable {
  id: number;
  party: number;
  site: number;
  amount: number;
  received: boolean;
  date: string;
}

export interface ReceivableFormValues {
  party: number;
  site: number;
  amount: number;
  received: boolean;
}

export interface DashboardStats {
  total_sites: number;
  total_materials: number;
  total_vendors: number;
  total_material_cost: number;
  total_vendor_cost: number;
  total_labour_cost: number;
  total_receivables: number;
  total_received: number;
  pending_receivables: number;
  pending_vendor_amounts: number;
  pending_labour_amounts: number;
  total_labour?: number;
  total_finance_parties?: number;
  total_finance_transactions?: number;
  total_material_stock?: number;
  total_vendor_transactions?: number;
  recent_sites: Site[];
  recent_materials: Material[];
  recent_vendors: Array<Pick<Vendor, "id" | "name" | "phone" | "address">>;
  recent_labour?: Array<Pick<Labour, "id" | "name" | "phone">>;
  recent_transactions?: Array<Pick<Receivable, "id" | "amount" | "received" | "date">>;
}

export type ReportModuleKey =
  | "dashboard"
  | "materials"
  | "vendors"
  | "labour"
  | "receivables";

export interface ReportFilters {
  module: ReportModuleKey;
  dateFrom: string;
  dateTo: string;
}

export interface SelectOption {
  label: string;
  value: number | string;
}
