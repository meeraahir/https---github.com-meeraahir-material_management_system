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

export interface DateRangeFilters {
  dateFrom?: string;
  dateTo?: string;
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
  invoice_number?: string | null;
  notes?: string | null;
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
  invoice_number?: string;
  notes?: string;
  date: string;
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

export interface VendorPayment {
  id: number;
  purchase: number;
  purchase_invoice_number: string | null;
  purchase_total_amount: number;
  purchase_pending_amount: number;
  vendor: number;
  vendor_name: string;
  site: number;
  site_name: string;
  amount: number;
  date: string;
  reference_number: string | null;
  remarks: string | null;
}

export interface VendorPaymentFormValues {
  purchase: number;
  amount: number;
  date: string;
  reference_number: string;
  remarks: string;
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
  site?: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  calculated_total_amount?: number;
  attendance_days?: number;
  date?: string;
  period_start?: string;
  period_end?: string;
  notes?: string | null;
}

export interface PaymentFormValues {
  labour: number;
  total_amount: number;
  paid_amount: number;
  site?: number;
  date: string;
  period_start?: string;
  period_end?: string;
  notes?: string | null;
  auto_calculate_total?: boolean;
}

export interface Receivable {
  id: number;
  party: number;
  site: number;
  amount: number;
  received: boolean;
  date: string;
  current_received_amount?: number;
  pending_amount?: number;
}

export interface ReceivableFormValues {
  party: number;
  site: number;
  amount: number;
  date: string;
  received_amount?: number;
}

export interface DashboardStats {
  total_sites: number;
  total_materials: number;
  total_vendors: number;
  total_expenses?: number;
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
  labourId?: number;
  labourQuery?: string;
}

export interface SelectOption {
  label: string;
  value: number | string;
}

export interface MaterialWiseReportRow {
  material_id: number;
  material_name: string;
  total_quantity_received: number;
  total_quantity_used: number;
  remaining_stock: number;
  total_cost: number;
}

export interface SiteWiseMaterialReportRow {
  site_id?: number;
  site_name?: string;
  name?: string;
  total_quantity_received?: number;
  total_quantity_used?: number;
  remaining_stock?: number;
  total_cost?: number;
  total_amount?: number;
}

export interface LabourPaymentLedgerEntry {
  id: number | string;
  entry_type: string;
  site: string;
  debit: number;
  credit: number;
  balance: number;
  date: string;
}

export interface LabourPaymentLedgerTotals {
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
}

export interface LabourPaymentLedger {
  labour: string;
  payments: LabourPaymentLedgerEntry[];
  totals: LabourPaymentLedgerTotals;
}

export interface LabourReportSummary {
  labourId: number;
  labourName: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
}

export interface LabourReportData {
  ledger: LabourPaymentLedger;
  summary: LabourReportSummary;
}
