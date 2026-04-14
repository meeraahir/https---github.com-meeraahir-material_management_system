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

export type PaymentMode =
  | "cash"
  | "check"
  | "bank_transfer"
  | "upi"
  | "other";

export type MaterialUnit =
  | "bag"
  | "kg"
  | "ton"
  | "meter"
  | "litre"
  | "piece"
  | "other";

export interface MaterialVariant {
  id: number;
  material: number;
  material_name: string;
  material_unit: string;
  label: string;
  size_mm: number | null;
  unit_weight: number | null;
  is_active: boolean;
  current_price: number | null;
  current_price_date: string | null;
}

export interface MaterialVariantFormValues {
  is_active: boolean;
  label: string;
  material: number;
  size_mm: number;
  unit_weight: number;
}

export interface MaterialVariantPrice {
  id: number;
  variant: number;
  variant_label: string;
  variant_size_mm: number | null;
  material_id: number;
  material_name: string;
  date: string;
  price_per_unit: number;
  notes: string | null;
}

export interface MaterialVariantPriceFormValues {
  date: string;
  notes: string;
  price_per_unit: number;
  variant: number;
}

export interface Material {
  id: number;
  name: string;
  unit: MaterialUnit;
  variants?: MaterialVariant[];
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
  labour_type?: string | null;
}

export interface LabourFormValues {
  labour_type?: string;
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
  material_variant?: number | null;
  material_variant_label?: string | null;
  material_variant_size_mm?: number | null;
  material_variant_unit_weight?: number | null;
  quantity_received: number;
  quantity_used: number;
  cost_per_unit: number;
  transport_cost: number;
  invoice_number?: string | null;
  notes?: string | null;
  date: string;
  date_display?: string | null;
  total_cost: number;
  remaining_stock: number;
}

export interface MaterialUsage {
  id: number;
  receipt: number;
  receipt_date: string;
  receipt_invoice_number: string | null;
  receipt_material_variant_label?: string | null;
  receipt_material_variant_size_mm?: number | null;
  site: number;
  site_name: string;
  material: number;
  material_name: string;
  quantity: number;
  date: string;
  notes: string | null;
}

export interface ReceiptFormValues {
  site: number;
  material: number;
  material_variant?: number;
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
  payment_mode?: PaymentMode;
  sender_name?: string | null;
  receiver_name?: string | null;
  cheque_number?: string | null;
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
  payment_mode: PaymentMode;
  sender_name: string;
  receiver_name: string;
  cheque_number: string;
  date: string;
}

export interface VendorPayment {
  id: number;
  purchase: number;
  purchase_invoice_number: string | null;
  purchase_total_amount: number;
  purchase_pending_amount: number;
  pending_after_payment?: number;
  vendor: number;
  vendor_name: string;
  site: number;
  site_name: string;
  amount: number;
  date: string;
  payment_mode?: PaymentMode;
  sender_name?: string | null;
  receiver_name?: string | null;
  cheque_number?: string | null;
  reference_number: string | null;
  remarks: string | null;
}

export interface VendorPaymentFormValues {
  purchase: number;
  amount: number;
  date: string;
  payment_mode: PaymentMode;
  sender_name: string;
  receiver_name: string;
  cheque_number: string;
  reference_number: string;
  remarks: string;
}

export interface Attendance {
  id: number;
  labour: number;
  labour_name: string;
  site: number;
  site_name: string;
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
  labour_name?: string;
  site?: number;
  site_name?: string | null;
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
  phase_name?: string | null;
  description?: string | null;
  received: boolean;
  date: string;
  current_received_amount?: number;
  pending_amount?: number;
  receipt_id?: number;
}

export interface ReceivableFormValues {
  party: number;
  site: number;
  amount: number;
  phase_name: string;
  description: string;
  date: string;
  received_amount?: number;
  receipt_payment_mode?: PaymentMode;
  receipt_sender_name?: string;
  receipt_receiver_name?: string;
  receipt_cheque_number?: string;
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

export interface SiteDashboardMaterialSummary {
  material__id: number;
  material__name: string;
  total_received: number;
  total_used: number;
  total_cost: number;
  remaining_stock: number;
}

export interface SiteDashboardVendorSummary {
  vendor_id: number;
  vendor_name: string;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
}

export interface SiteDashboardLabourSummary {
  labour_id: number;
  labour_name: string;
  present_count: number;
  total_days: number;
  absent_count: number;
  total_wage: number;
  paid_amount: number;
  pending_amount: number;
}

export interface SiteDashboardFinanceSummary {
  party__id: number;
  party__name: string;
  total_amount: number;
  received_amount: number;
  pending_amount: number;
}

export interface SiteDashboardData {
  site: Site;
  material_summary: SiteDashboardMaterialSummary[];
  vendor_summary: SiteDashboardVendorSummary[];
  labour_summary: SiteDashboardLabourSummary[];
  finance_summary: SiteDashboardFinanceSummary[];
}

export interface CasualLabourEntry {
  id: number;
  labour_name: string;
  labour_type: string;
  site: number;
  site_name: string;
  date: string;
  paid_amount: number;
}

export interface CasualLabourEntryFormValues {
  labour_name: string;
  labour_type: string;
  site: number;
  date: string;
  paid_amount: number;
}

export interface MiscellaneousExpense {
  id: number;
  title: string;
  site: number | null;
  site_name: string | null;
  labour: number | null;
  labour_name: string | null;
  paid_to_name: string | null;
  amount: number;
  date: string;
  payment_mode: PaymentMode;
  notes: string | null;
}

export interface MiscellaneousExpenseFormValues {
  title: string;
  site: number;
  labour: number;
  paid_to_name: string;
  amount: number;
  date: string;
  payment_mode: PaymentMode;
  notes: string;
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
  partyId?: number;
  partyQuery?: string;
  vendorId?: number;
  vendorQuery?: string;
}

export interface SelectOption {
  label: string;
  value: number | string;
}

export interface MaterialWiseReportRow {
  material_id: number;
  material_name: string;
  material_unit?: string;
  material_variant_id?: number | null;
  material_variant_label?: string | null;
  material_variant_size_mm?: number | null;
  cost_per_unit?: number;
  transport_cost?: number;
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

export interface LabourAttendanceMonth {
  month: string;
  month_start: string;
  present_days: number;
  absent_days: number;
  total_days: number;
  total_wage: number;
}

export interface LabourAttendanceMonthlyReport {
  labour_id: number;
  labour_name: string;
  per_day_wage: number;
  filters: {
    year: number | null;
    month: number | null;
    site: number | null;
    date_from: string | null;
    date_to: string | null;
  };
  totals: {
    present_days: number;
    absent_days: number;
    total_days: number;
    total_wage: number;
  };
  months: LabourAttendanceMonth[];
}

export interface VendorLedgerEntry {
  id: number | string;
  entry_type: string;
  reference: string;
  description: string | null;
  site: string;
  material: string | null;
  debit: number;
  credit: number;
  balance: number;
  date: string;
}

export interface VendorLedgerTotals {
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
}

export interface VendorLedger {
  vendor: string;
  transactions: VendorLedgerEntry[];
  totals: VendorLedgerTotals;
}

export interface VendorPendingReportRow {
  vendor_id: number;
  vendor_name: string;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
}

export interface PartyLedgerEntry {
  id: number | string;
  entry_type: string;
  site: string;
  debit: number;
  credit: number;
  balance: number;
  date: string;
  payment_mode?: PaymentMode | null;
  reference_number?: string | null;
  notes?: string | null;
  sender_name?: string | null;
  receiver_name?: string | null;
  cheque_number?: string | null;
}

export interface PartyLedgerTotals {
  total_amount: number;
  received_amount: number;
  pending_amount: number;
}

export interface PartyLedger {
  party: string;
  transactions: PartyLedgerEntry[];
  totals: PartyLedgerTotals;
}

export interface ReceivePaymentFormValues {
  amount: number;
  date: string;
  payment_mode: PaymentMode;
  sender_name: string;
  receiver_name: string;
  cheque_number: string;
  reference_number: string;
  notes: string;
}

export interface PersonalAdminDashboardSummary {
  total_sites: number;
  currently_working_sites: number;
  receivable_from_parties: number;
  payment_received: number;
  payment_pending: number;
  vendor_payment_paid: number;
  vendor_payment_pending: number;
  employee_payment_paid: number;
  employee_payment_pending: number;
  miscellaneous_expense_paid: number;
  cash_receipts: number;
  check_receipts: number;
  bank_transfer_receipts: number;
  upi_receipts: number;
  other_receipts: number;
  cash_receipts_on_selected_date: number;
  check_receipts_on_selected_date: number;
  receipt_payment_mode_breakdown: Record<PaymentMode, number>;
  total_cash_payment: number;
  total_outgoing_payment: number;
  cash_payment_on_selected_date: number;
  outgoing_payment_on_selected_date: number;
  employee_payment_on_selected_date: number;
  miscellaneous_expense_on_selected_date: number;
}

export interface PersonalAdminSiteOverview {
  site_id: number;
  site_name: string;
  location: string;
  is_currently_working: boolean;
  present_workers_on_selected_date: number;
  total_receivable: number;
  received_amount: number;
  pending_amount: number;
  cash_received_amount: number;
  check_received_amount: number;
  bank_transfer_received_amount: number;
  upi_received_amount: number;
  other_received_amount: number;
  vendor_paid_amount: number;
  employee_paid_amount: number;
  employee_pending_amount: number;
  miscellaneous_expense_amount: number;
}

export interface PersonalAdminDashboardData {
  user_id: number;
  user_name: string;
  title: string;
  selected_date: string;
  summary: PersonalAdminDashboardSummary;
  site_overview: PersonalAdminSiteOverview[];
  party_receivables: Array<{
    party_id: number;
    party_name: string;
    total_receivable: number;
    received_amount: number;
    pending_amount: number;
  }>;
  employee_payments_on_selected_date: Array<Record<string, unknown>>;
  miscellaneous_expenses_on_selected_date: Array<Record<string, unknown>>;
  recent_receipts: Array<Record<string, unknown>>;
  recent_vendor_payments: Array<Record<string, unknown>>;
  recent_employee_payments: Array<Record<string, unknown>>;
  recent_miscellaneous_expenses: Array<Record<string, unknown>>;
}

export interface OwnerDashboardData {
  user_id: number;
  user_name: string;
  title: string;
  site_activity_date: string;
  summary: {
    total_sites: number;
    active_sites: number;
    inactive_sites: number;
    payment_pending_from_clients: number;
    payment_pending_to_vendors: number;
    payment_pending_to_employees: number;
    total_cash_received: number;
    cash_paid_to_vendors: number;
    cash_paid_to_employees: number;
    cash_paid_to_casual_labour: number;
    cash_paid_for_miscellaneous_expenses: number;
    total_cash_outflow: number;
    cash_available: number;
    has_negative_cash_balance: boolean;
  };
  notifications: Array<{
    type: string;
    severity: string;
    message: string;
    cash_available: number;
  }>;
  site_overview: Array<{
    site_id: number;
    site_name: string;
    location: string;
    is_active: boolean;
    payment_pending_from_clients: number;
    payment_pending_to_vendors: number;
    payment_pending_to_employees: number;
  }>;
}
