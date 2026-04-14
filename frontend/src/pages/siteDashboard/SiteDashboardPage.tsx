import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";

import { icons } from "../../assets/icons";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { useToast } from "../../components/feedback/useToast";
import { EntityFormModal } from "../../components/forms/EntityFormModal";
import { ReceivePaymentModal } from "../../components/forms/ReceivePaymentModal";
import { StatCard } from "../../components/layout/StatCard";
import { ConfirmDialog } from "../../components/modal/ConfirmDialog";
import { Modal } from "../../components/modal/Modal";
import { DataTable } from "../../components/table/DataTable";
import { Button } from "../../components/ui/Button";
import { apiClient } from "../../api/client";
import { useReferenceData } from "../../hooks/useReferenceData";
import { attendanceReportsService } from "../../services/attendanceService";
import { materialReceiptsService } from "../../services/materialReceiptsService";
import { paymentsService } from "../../services/paymentsService";
import { receivablesService } from "../../services/receivablesService";
import { reportsService } from "../../services/reportsService";
import { siteDashboardService } from "../../services/sitesService";
import { vendorPurchasesService } from "../../services/vendorPurchasesService";
import type {
  Material,
  Party,
  Payment,
  PaymentFormValues,
  PartyLedgerEntry,
  Purchase,
  PurchaseFormValues,
  Receipt,
  ReceiptFormValues,
  ReceivePaymentFormValues,
  Receivable,
  ReceivableFormValues,
  SiteDashboardData,
  Labour,
  Vendor,
} from "../../types/erp.types";
import { getErrorMessage } from "../../utils/apiError";
import { formatCurrency, formatDate } from "../../utils/format";
import { DashboardLabourAttendanceModal } from "../dashboard/DashboardLabourAttendanceModal";
import {
  SiteCasualLabourEntryModal,
  SiteLabourPaymentModal,
  SiteMaterialReceiptModal,
  SitePartyEntryModal,
  SiteVendorEntryModal,
} from "./SiteDashboardEntryModals";

function getReceivableStatus(row: Receivable) {
  const pendingAmount = row.pending_amount ?? row.amount;
  const receivedAmount = row.current_received_amount ?? 0;

  if (pendingAmount <= 0) {
    return "Received";
  }

  if (receivedAmount > 0) {
    return "Partial";
  }

  return "Pending";
}

const paymentModeOptions = [
  { label: "Cash", value: "cash" },
  { label: "Check", value: "check" },
  { label: "Bank Transfer", value: "bank_transfer" },
  { label: "UPI", value: "upi" },
  { label: "Other", value: "other" },
];

function getMaterialVariantLabel(row: {
  material_variant_label?: string | null;
  material_variant_size_mm?: number | null;
}) {
  if (!row.material_variant_label) {
    return "-";
  }

  return row.material_variant_size_mm
    ? `${row.material_variant_label} (${row.material_variant_size_mm} mm)`
    : row.material_variant_label;
}

const receiptSchema = z
  .object({
    cost_per_unit: z.number().min(0, "Cost per unit must be zero or more."),
    date: z.string().min(1, "Receipt date is required."),
    invoice_number: z
      .string()
      .max(50, "Invoice number must be 50 characters or fewer.")
      .optional()
      .or(z.literal("")),
    material: z.number().min(1, "Material is required."),
    material_variant: z.number().min(0, "Variant is invalid.").optional(),
    notes: z
      .string()
      .max(600, "Notes must be 600 characters or fewer.")
      .optional()
      .or(z.literal("")),
    quantity_received: z.number().gt(0, "Received quantity must be greater than zero."),
    quantity_used: z.number().min(0, "Used quantity must be zero or more."),
    site: z.number().min(1, "Site is required."),
    transport_cost: z.number().min(0, "Transport cost must be zero or more."),
  })
  .refine((value) => value.quantity_used <= value.quantity_received, {
    message: "Used quantity cannot exceed received quantity.",
    path: ["quantity_used"],
  });

const purchaseSchema = z
  .object({
    cheque_number: z.string().max(50, "Cheque number must be 50 characters or fewer."),
    date: z.string().min(1, "Date is required."),
    description: z.string().max(300, "Description must be 300 characters or fewer."),
    invoice_number: z.string().max(60, "Invoice number must be 60 characters or fewer."),
    material: z.number().min(0, "Material is invalid."),
    paid_amount: z.number().min(0, "Paid amount must be zero or more."),
    payment_mode: z.enum(["cash", "check", "bank_transfer", "upi", "other"]),
    receiver_name: z.string().max(255, "Receiver name must be 255 characters or fewer."),
    sender_name: z.string().max(255, "Sender name must be 255 characters or fewer."),
    site: z.number().min(1, "Site is required."),
    total_amount: z.number().gt(0, "Total amount must be greater than zero."),
    vendor: z.number().min(1, "Vendor is required."),
  })
  .superRefine((value, context) => {
    if (value.paid_amount > value.total_amount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Paid amount cannot exceed total amount.",
        path: ["paid_amount"],
      });
    }

    if (value.paid_amount > 0 && value.payment_mode === "cash") {
      if (!value.sender_name.trim() && !value.receiver_name.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Sender name or receiver name is required for cash payments.",
          path: ["sender_name"],
        });
      }
    }

    if (value.paid_amount > 0 && value.payment_mode === "check" && !value.cheque_number.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cheque number is required for check payments.",
        path: ["cheque_number"],
      });
    }
  });

const receivableSchema = z
  .object({
    amount: z.number().gt(0, "Amount must be greater than zero."),
    date: z.string().min(1, "Invoice date is required."),
    description: z.string().max(1000, "Description must be 1000 characters or fewer."),
    party: z.number().min(1, "Party is required."),
    phase_name: z.string().max(255, "Phase name must be 255 characters or fewer."),
    receipt_cheque_number: z.string().max(50, "Cheque number must be 50 characters or fewer.").optional().or(z.literal("")),
    receipt_payment_mode: z.enum(["cash", "check", "bank_transfer", "upi", "other"]).optional(),
    receipt_receiver_name: z.string().max(255, "Receiver name must be 255 characters or fewer.").optional().or(z.literal("")),
    receipt_sender_name: z.string().max(255, "Sender name must be 255 characters or fewer.").optional().or(z.literal("")),
    received_amount: z.number().min(0, "Received amount must be zero or more.").optional(),
    site: z.number().min(1, "Site is required."),
  })
  .superRefine((value, context) => {
    if ((value.received_amount ?? 0) > value.amount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Received amount cannot exceed invoice amount.",
        path: ["received_amount"],
      });
    }

    if ((value.received_amount ?? 0) > 0 && value.receipt_payment_mode === "cash") {
      if (!value.receipt_sender_name?.trim() && !value.receipt_receiver_name?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Sender name or receiver name is required for cash receipts.",
          path: ["receipt_sender_name"],
        });
      }
    }

    if ((value.received_amount ?? 0) > 0 && value.receipt_payment_mode === "check" && !value.receipt_cheque_number?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cheque number is required for check receipts.",
        path: ["receipt_cheque_number"],
      });
    }
  });

const paymentSchema = z
  .object({
    auto_calculate_total: z.boolean().optional().default(true),
    date: z.string().min(1, "Payment date is required."),
    labour: z.number().min(1, "Labour is required."),
    notes: z.string().max(600, "Notes must be 600 characters or fewer.").optional().or(z.literal("")),
    paid_amount: z.number().min(0, "Paid amount must be zero or more."),
    period_end: z.string().optional(),
    period_start: z.string().optional(),
    site: z.number().min(0, "Site is invalid.").optional(),
    total_amount: z.number().min(0, "Total amount must be zero or more."),
  })
  .superRefine((value, context) => {
    if (value.paid_amount > value.total_amount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Paid amount cannot exceed total amount.",
        path: ["paid_amount"],
      });
    }

    if (value.period_start && value.period_end && value.period_end < value.period_start) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Period end must be on or after period start.",
        path: ["period_end"],
      });
    }
  });

type DashboardEntityType = "payment" | "purchase" | "receipt" | "receivable";

interface DeleteTarget {
  entity: DashboardEntityType;
  id: number;
  label: string;
}

interface SelectedReceipt {
  materialId: number;
  receipt: Receipt;
  receiptId: number;
  siteId: number;
}

interface SelectedPartyContext {
  partyId: number;
  partyLabel: string;
  siteId: number;
}

interface PartyPaymentHistoryRow {
  amount: number;
  date: string;
  id: string;
  notes?: string;
  paymentMethod?: string;
  referenceNumber?: string;
  receiverName?: string;
  senderName?: string;
}

function normalizePaymentHistoryNote(note: string | null | undefined) {
  const trimmedNote = note?.trim();

  if (!trimmedNote) {
    return undefined;
  }

  if (/^Auto-created from receivable/i.test(trimmedNote)) {
    return undefined;
  }

  return trimmedNote;
}

function AddSectionButton({
  ariaLabel,
  onClick,
}: {
  ariaLabel: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label={ariaLabel}
      className="h-9 w-9 rounded-xl px-0"
      onClick={onClick}
      size="sm"
      title={ariaLabel}
      type="button"
      variant="secondary"
    >
      {icons.plus({ className: "h-4 w-4" })}
    </Button>
  );
}

function upsertById<TEntity extends { id: number }>(
  items: TEntity[],
  nextItem: TEntity,
) {
  if (items.some((item) => item.id === nextItem.id)) {
    return items.map((item) => (item.id === nextItem.id ? nextItem : item));
  }

  return [...items, nextItem];
}

export function SiteDashboardPage() {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const references = useReferenceData();
  const parsedSiteId = Number(siteId);
  const calculationRequestRef = useRef(0);
  const lastCalculationKeyRef = useRef("");

  const [data, setData] = useState<SiteDashboardData | null>(null);
  const [error, setError] = useState("");
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [isExporting, setIsExporting] = useState<"" | "excel" | "pdf">("");
  const [isLabourAttendanceModalOpen, setIsLabourAttendanceModalOpen] = useState(false);
  const [isCasualLabourModalOpen, setIsCasualLabourModalOpen] = useState(false);
  const [isLabourPaymentModalOpen, setIsLabourPaymentModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMaterialReceiptModalOpen, setIsMaterialReceiptModalOpen] = useState(false);
  const [isPartyDetailsModalOpen, setIsPartyDetailsModalOpen] = useState(false);
  const [isPartyEntryModalOpen, setIsPartyEntryModalOpen] = useState(false);
  const [isPartyDetailsLoading, setIsPartyDetailsLoading] = useState(false);
  const [isReceivePaymentModalOpen, setIsReceivePaymentModalOpen] = useState(false);
  const [isVendorEntryModalOpen, setIsVendorEntryModalOpen] = useState(false);
  const [localPartyPaymentHistory, setLocalPartyPaymentHistory] = useState<PartyPaymentHistoryRow[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isReceiptDetailsModalOpen, setIsReceiptDetailsModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<SelectedReceipt | null>(null);

  const [materials, setMaterials] = useState<Material[]>(references.materials);
  const [vendors, setVendors] = useState<Vendor[]>(references.vendors);
  const [parties, setParties] = useState<Party[]>(references.parties);
  const [labours, setLabours] = useState<Labour[]>(references.labour);

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);

  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editingReceivable, setEditingReceivable] = useState<Receivable | null>(null);
  const [partyDetailEntries, setPartyDetailEntries] = useState<Receivable[]>([]);
  const [partyPaymentHistory, setPartyPaymentHistory] = useState<PartyPaymentHistoryRow[]>([]);
  const [paymentTarget, setPaymentTarget] = useState<Receivable | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [selectedParty, setSelectedParty] = useState<SelectedPartyContext | null>(null);

  useEffect(() => {
    setMaterials(references.materials);
  }, [references.materials]);

  useEffect(() => {
    setVendors(references.vendors);
  }, [references.vendors]);

  useEffect(() => {
    setParties(references.parties);
  }, [references.parties]);

  useEffect(() => {
    setLabours(references.labour);
  }, [references.labour]);

  useEffect(() => {
    async function loadDashboard() {
      if (!parsedSiteId) {
        setError("Invalid site selected.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError("");
        const [dashboardData, allReceipts, allPurchases, allPayments, allReceivables] =
          await Promise.all([
            siteDashboardService.getDashboard(parsedSiteId),
            materialReceiptsService.getOptions(),
            vendorPurchasesService.getOptions(),
            paymentsService.getOptions(),
            receivablesService.getOptions(),
          ]);

        setData(dashboardData);
        setReceipts(
          allReceipts
            .filter((row) => row.site === parsedSiteId)
            .sort((left, right) => right.date.localeCompare(left.date)),
        );
        setPurchases(
          allPurchases
            .filter((row) => row.site === parsedSiteId)
            .sort((left, right) => right.date.localeCompare(left.date)),
        );
        setPayments(
          allPayments
            .filter((row) => row.site === parsedSiteId)
            .sort((left, right) => (right.date || "").localeCompare(left.date || "")),
        );
        setReceivables(
          allReceivables
            .filter((row) => row.site === parsedSiteId)
            .sort((left, right) => right.date.localeCompare(left.date)),
        );
      } catch (loadError) {
        const message = getErrorMessage(loadError);
        setError(message);
        showError("Unable to load site dashboard", message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboard();
  }, [parsedSiteId, refreshKey, showError]);

  const site = data?.site ?? {
    description: "",
    id: parsedSiteId || 0,
    location: "-",
    name: "Selected Site",
  };

  const materialSummary = useMemo(() => data?.material_summary ?? [], [data]);
  const vendorSummary = useMemo(() => data?.vendor_summary ?? [], [data]);
  const financeSummary = useMemo(() => data?.finance_summary ?? [], [data]);
  const labourSummary = useMemo(() => data?.labour_summary ?? [], [data]);

  const totals = useMemo(
    () => ({
      financePending: financeSummary.reduce(
        (total, row) => total + row.pending_amount,
        0,
      ),
      labourPending: labourSummary.reduce(
        (total, row) => total + row.pending_amount,
        0,
      ),
      materialCost: materialSummary.reduce(
        (total, row) => total + row.total_cost,
        0,
      ),
      vendorPending: vendorSummary.reduce(
        (total, row) => total + row.pending_amount,
        0,
      ),
    }),
    [financeSummary, labourSummary, materialSummary, vendorSummary],
  );

  const siteOption = useMemo(() => [{ label: site.name, value: site.id }], [site.id, site.name]);
  const materialVariantOptions = useMemo(
    () =>
      references.materialVariants.map((variant) => ({
        label: `${variant.material_name} | ${getMaterialVariantLabel({
          material_variant_label: variant.label,
          material_variant_size_mm: variant.size_mm,
        })}`,
        value: variant.id,
      })),
    [references.materialVariants],
  );
  const partyNameMap = useMemo(
    () => new Map(parties.map((party) => [party.id, party.name])),
    [parties],
  );
  const labourNameMap = useMemo(
    () => new Map(labours.map((labour) => [labour.id, labour.name])),
    [labours],
  );
  const labourWageMap = useMemo(
    () => new Map(labours.map((labour) => [labour.id, labour.per_day_wage])),
    [labours],
  );
  const selectedPartyRecord = useMemo(
    () => parties.find((party) => party.id === selectedParty?.partyId) ?? null,
    [parties, selectedParty],
  );
  const selectedPartyTotals = useMemo(
    () => ({
      pending: partyDetailEntries.reduce(
        (total, entry) => total + (entry.pending_amount ?? entry.amount),
        0,
      ),
      received: partyDetailEntries.reduce(
        (total, entry) => total + (entry.current_received_amount ?? 0),
        0,
      ),
      total: partyDetailEntries.reduce((total, entry) => total + entry.amount, 0),
    }),
    [partyDetailEntries],
  );
  const firstPendingReceivable = useMemo(
    () =>
      partyDetailEntries.find((entry) => (entry.pending_amount ?? entry.amount) > 0) ??
      null,
    [partyDetailEntries],
  );

  const syncAutoCalculatedTotal = useCallback(
    async ({
      setValue,
      values,
    }: {
      setValue: Parameters<
        NonNullable<React.ComponentProps<typeof EntityFormModal<PaymentFormValues>>["onValuesChange"]>
      >[0]["setValue"];
      values: Partial<PaymentFormValues>;
    }) => {
      const labourId = Number(values.labour) || 0;
      const periodStart = values.period_start || "";
      const periodEnd = values.period_end || "";
      const siteValue = Number(values.site) || 0;
      const currentTotal = Number(values.total_amount) || 0;
      const calculationKey = `${labourId}|${siteValue}|${periodStart}|${periodEnd}`;

      if (!labourId || !periodStart || !periodEnd || periodEnd < periodStart) {
        if (lastCalculationKeyRef.current === calculationKey && currentTotal === 0) {
          return;
        }

        lastCalculationKeyRef.current = calculationKey;

        if (currentTotal !== 0) {
          setValue("total_amount", 0, {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: true,
          });
        }

        return;
      }

      if (lastCalculationKeyRef.current === calculationKey) {
        return;
      }

      lastCalculationKeyRef.current = calculationKey;
      const requestId = ++calculationRequestRef.current;

      try {
        const attendance = await attendanceReportsService.getLabourAttendance(labourId, {
          dateFrom: periodStart,
          dateTo: periodEnd,
        });

        if (requestId !== calculationRequestRef.current) {
          return;
        }

        const presentDays = attendance.filter(
          (row) => row.present && (!siteValue || row.site === siteValue),
        ).length;
        const totalAmount = Number(
          (presentDays * (labourWageMap.get(labourId) || 0)).toFixed(2),
        );

        if (currentTotal !== totalAmount) {
          setValue("total_amount", totalAmount, {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: true,
          });
        }
      } catch {
        if (requestId !== calculationRequestRef.current) {
          return;
        }

        if (currentTotal !== 0) {
          setValue("total_amount", 0, {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: true,
          });
        }
      }
    },
    [labourWageMap],
  );

  function refreshDashboardData() {
    setRefreshKey((currentValue) => currentValue + 1);
  }

  function addMaterialOption(material: Material) {
    setMaterials((currentValue) => upsertById(currentValue, material));
  }

  function addVendorOption(vendor: Vendor) {
    setVendors((currentValue) => upsertById(currentValue, vendor));
  }

  function addPartyOption(party: Party) {
    setParties((currentValue) => upsertById(currentValue, party));
  }

  function addLabourOption(labour: Labour) {
    setLabours((currentValue) => upsertById(currentValue, labour));
  }

  function buildPartyPaymentHistory(
    ledgerEntries: PartyLedgerEntry[],
    siteLabel: string,
  ) {
    return ledgerEntries
      .filter(
        (entry) =>
          entry.site === siteLabel &&
          ((typeof entry.credit === "number" && entry.credit > 0) ||
            String(entry.entry_type).toLowerCase().includes("receipt")),
      )
      .map((entry) => ({
        amount: entry.credit,
        date: entry.date,
        id: String(entry.id),
        notes: normalizePaymentHistoryNote(entry.notes),
        paymentMethod: entry.payment_mode
          ? entry.payment_mode
              .split("_")
              .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
              .join(" ")
          : undefined,
        referenceNumber: entry.reference_number || undefined,
        receiverName: entry.receiver_name || undefined,
        senderName: entry.sender_name || undefined,
      }));
  }

  function formatPaymentMethodLabel(value: ReceivePaymentFormValues["payment_mode"] | undefined) {
    if (!value) {
      return undefined;
    }

    if (value === "bank_transfer") {
      return "Bank Transfer";
    }

    return value
      .split("_")
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ");
  }

  async function loadPartyDetail(partyId: number, siteId: number, partyLabel: string) {
    setIsPartyDetailsLoading(true);

    try {
      const [partyTransactionsResponse, ledger] = await Promise.all([
        apiClient.get<{ results: Receivable[] }>("/finance/transactions/", {
          params: {
            party: partyId,
            site: siteId,
          },
        }),
        reportsService.getPartyLedger(partyId),
      ]);

      const filteredTransactions = Array.isArray(partyTransactionsResponse.data?.results)
        ? [...partyTransactionsResponse.data.results].sort((left, right) =>
            right.date.localeCompare(left.date),
          )
        : [];
      const filteredLedgerEntries = [...ledger.transactions]
        .filter((entry) => entry.site === site.name)
        .sort((left, right) => right.date.localeCompare(left.date));
      const persistedLocalHistory = localPartyPaymentHistory.filter((entry) =>
        entry.id.startsWith(`local-${partyId}-${siteId}-`),
      );

      setSelectedParty({
        partyId,
        partyLabel,
        siteId,
      });
      setPartyDetailEntries(filteredTransactions);
      const mergedHistory = [
        ...persistedLocalHistory,
        ...buildPartyPaymentHistory(filteredLedgerEntries, site.name),
      ].filter(
        (entry, index, array) =>
          array.findIndex(
            (candidate) =>
              candidate.amount === entry.amount &&
              candidate.date === entry.date,
          ) === index,
      );

      setPartyPaymentHistory(mergedHistory);
      setIsPartyDetailsModalOpen(true);
    } catch (loadError) {
      showError("Unable to load party details", getErrorMessage(loadError));
    } finally {
      setIsPartyDetailsLoading(false);
    }
  }

  function handlePartyDetailsClose() {
    setIsPartyDetailsModalOpen(false);
    setSelectedParty(null);
    setPartyDetailEntries([]);
    setPartyPaymentHistory([]);
    setPaymentTarget(null);
    setIsReceivePaymentModalOpen(false);
  }

  function handlePartyRowClick(row: Receivable) {
    void loadPartyDetail(
      row.party,
      row.site,
      partyNameMap.get(row.party) || `Party ${row.party}`,
    );
  }

  function handleMaterialRowClick(row: Receipt) {
    setSelectedReceipt({
      materialId: row.material,
      receipt: row,
      receiptId: row.id,
      siteId: row.site,
    });
    setIsReceiptDetailsModalOpen(true);
  }

  function handleReceiptDetailsClose() {
    setIsReceiptDetailsModalOpen(false);
    setSelectedReceipt(null);
  }

  async function handleExport(format: "excel" | "pdf") {
    if (!parsedSiteId) {
      return;
    }

    try {
      setIsExporting(format);
      await siteDashboardService.exportDashboard(parsedSiteId, format);
    } catch (exportError) {
      showError("Unable to export site dashboard", getErrorMessage(exportError));
    } finally {
      setIsExporting("");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    try {
      setIsDeleteLoading(true);

      if (deleteTarget.entity === "receipt") {
        await materialReceiptsService.remove(deleteTarget.id);
        setReceipts((currentValue) =>
          currentValue.filter((item) => item.id !== deleteTarget.id),
        );
      }

      if (deleteTarget.entity === "purchase") {
        await vendorPurchasesService.remove(deleteTarget.id);
        setPurchases((currentValue) =>
          currentValue.filter((item) => item.id !== deleteTarget.id),
        );
      }

      if (deleteTarget.entity === "receivable") {
        await receivablesService.remove(deleteTarget.id);
        setReceivables((currentValue) =>
          currentValue.filter((item) => item.id !== deleteTarget.id),
        );
      }

      if (deleteTarget.entity === "payment") {
        await paymentsService.remove(deleteTarget.id);
        setPayments((currentValue) =>
          currentValue.filter((item) => item.id !== deleteTarget.id),
        );
      }

      showSuccess("Record deleted", `${deleteTarget.label} has been removed.`);
      setDeleteTarget(null);
      refreshDashboardData();
    } catch (deleteError) {
      showError("Unable to delete record", getErrorMessage(deleteError));
    } finally {
      setIsDeleteLoading(false);
    }
  }

  const materialActions = [
    {
      ariaLabel: "Edit material receipt",
      icon: icons.pencil({ className: "h-4 w-4" }),
      label: "Edit",
      onClick: (row: Receipt) => setEditingReceipt(row),
      variant: "secondary" as const,
    },
    {
      ariaLabel: "Delete material receipt",
      icon: icons.trash({ className: "h-4 w-4" }),
      label: "Delete",
      onClick: (row: Receipt) =>
        setDeleteTarget({
          entity: "receipt",
          id: row.id,
          label: row.material_name,
        }),
      variant: "ghost" as const,
    },
  ];

  const vendorActions = [
    {
      ariaLabel: "Edit vendor purchase",
      icon: icons.pencil({ className: "h-4 w-4" }),
      label: "Edit",
      onClick: (row: Purchase) => setEditingPurchase(row),
      variant: "secondary" as const,
    },
    {
      ariaLabel: "Delete vendor purchase",
      icon: icons.trash({ className: "h-4 w-4" }),
      label: "Delete",
      onClick: (row: Purchase) =>
        setDeleteTarget({
          entity: "purchase",
          id: row.id,
          label: row.vendor_name,
        }),
      variant: "ghost" as const,
    },
  ];

  const financeActions = [
    {
      ariaLabel: "Edit receivable",
      icon: icons.pencil({ className: "h-4 w-4" }),
      label: "Edit",
      onClick: (row: Receivable) => setEditingReceivable(row),
      variant: "secondary" as const,
    },
    {
      ariaLabel: "Delete receivable",
      icon: icons.trash({ className: "h-4 w-4" }),
      label: "Delete",
      onClick: (row: Receivable) =>
        setDeleteTarget({
          entity: "receivable",
          id: row.id,
          label: partyNameMap.get(row.party) || `Party ${row.party}`,
        }),
      variant: "ghost" as const,
    },
  ];

  const labourActions = [
    {
      ariaLabel: "Edit payment",
      icon: icons.pencil({ className: "h-4 w-4" }),
      label: "Edit",
      onClick: (row: Payment) => setEditingPayment(row),
      variant: "secondary" as const,
    },
    {
      ariaLabel: "Delete payment",
      icon: icons.trash({ className: "h-4 w-4" }),
      label: "Delete",
      onClick: (row: Payment) =>
        setDeleteTarget({
          entity: "payment",
          id: row.id,
          label: row.labour_name || labourNameMap.get(row.labour) || `Payment ${row.id}`,
        }),
      variant: "ghost" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <ErrorMessage message={references.error || error} />

      {data ? (
        <>
          <section className="rounded-[2rem] border border-blue-100 bg-white/95 p-5 shadow-md shadow-blue-950/5 dark:border-blue-100 dark:bg-white/95">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">
                    Site Overview
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                    {site.name}
                  </h2>
                  <p className="mt-2 text-sm font-medium text-slate-600">
                    {site.location}
                  </p>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                    {site.description || "No site description provided."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                  <Button
                    isLoading={isExporting === "excel"}
                    onClick={() => void handleExport("excel")}
                    type="button"
                    variant="secondary"
                  >
                    Export Excel
                  </Button>
                  <Button
                    isLoading={isExporting === "pdf"}
                    onClick={() => void handleExport("pdf")}
                    type="button"
                  >
                    Export PDF
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                  <StatCard
                    className="rounded-none"
                    label="Material Cost"
                    value={formatCurrency(totals.materialCost)}
                  />
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                  <StatCard
                    className="rounded-none"
                    label="Vendor Pending"
                    value={formatCurrency(totals.vendorPending)}
                  />
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <StatCard
                    className="rounded-none"
                    label="Labour Pending"
                    value={formatCurrency(totals.labourPending)}
                  />
                </div>
                <div className="rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4">
                  <StatCard
                    className="rounded-none"
                    label="Finance Pending"
                    value={formatCurrency(totals.financePending)}
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="space-y-5">
            <DataTable<Receipt>
              actions={materialActions}
              actionsDisplay="icon"
              columns={[
                {
                  key: "material",
                  header: "Material",
                  accessor: (row) => row.material_name,
                  sortValue: (row) => row.material_name,
                },
                {
                  key: "invoice",
                  header: "Invoice",
                  accessor: (row) => row.invoice_number || "-",
                  sortValue: (row) => row.invoice_number || "",
                },
                {
                  key: "variant",
                  header: "Variant",
                  accessor: (row) => getMaterialVariantLabel(row),
                  sortValue: (row) => row.material_variant_label || "",
                },
                {
                  key: "date",
                  header: "Date",
                  accessor: (row) => row.date_display || row.date,
                  sortValue: (row) => row.date,
                },
                {
                  key: "received",
                  header: "Received",
                  accessor: (row) => row.quantity_received,
                  sortValue: (row) => row.quantity_received,
                },
                {
                  key: "used",
                  header: "Used",
                  accessor: (row) => row.quantity_used,
                  sortValue: (row) => row.quantity_used,
                },
                {
                  key: "remaining_stock",
                  header: "Remaining",
                  accessor: (row) => row.remaining_stock,
                  sortValue: (row) => row.remaining_stock,
                },
                {
                  key: "total_cost",
                  header: "Total Cost",
                  accessor: (row) => row.total_cost,
                  sortValue: (row) => row.total_cost,
                },
              ]}
              compact
              data={receipts}
              emptyDescription="No material receipts are available for this site."
              emptyTitle="No Material Receipts"
              headerActions={
                <AddSectionButton
                  ariaLabel="Add Material Receipt"
                  onClick={() => setIsMaterialReceiptModalOpen(true)}
                />
              }
              headerTitle="Materials"
              hidePagination
              isLoading={isLoading}
              keyExtractor={(row) => row.id}
              onRowClick={handleMaterialRowClick}
              page={1}
              searchValue=""
              totalCount={receipts.length}
              onPageChange={() => undefined}
              onSearchChange={() => undefined}
            />

            <DataTable<Purchase>
              actions={vendorActions}
              actionsDisplay="icon"
              columns={[
                {
                  key: "vendor",
                  header: "Vendor",
                  accessor: (row) => row.vendor_name,
                  sortValue: (row) => row.vendor_name,
                },
                {
                  key: "invoice",
                  header: "Invoice",
                  accessor: (row) => row.invoice_number || "-",
                  sortValue: (row) => row.invoice_number || "",
                },
                {
                  key: "material",
                  header: "Material",
                  accessor: (row) => row.material_name || "-",
                  sortValue: (row) => row.material_name || "",
                },
                {
                  key: "date",
                  header: "Date",
                  accessor: (row) => row.date,
                  sortValue: (row) => row.date,
                },
                {
                  key: "payment_mode",
                  header: "Payment Mode",
                  accessor: (row) => row.payment_mode || "-",
                  sortValue: (row) => row.payment_mode || "",
                },
                {
                  key: "total_amount",
                  header: "Total Amount",
                  accessor: (row) => row.total_amount,
                  sortValue: (row) => row.total_amount,
                },
                {
                  key: "paid_amount",
                  header: "Paid Amount",
                  accessor: (row) => row.paid_amount,
                  sortValue: (row) => row.paid_amount,
                },
                {
                  key: "pending_amount",
                  header: "Pending Amount",
                  accessor: (row) => row.pending_amount,
                  sortValue: (row) => row.pending_amount,
                },
              ]}
              compact
              data={purchases}
              emptyDescription="No vendor purchases are available for this site."
              emptyTitle="No Vendor Purchases"
              headerActions={
                <AddSectionButton
                  ariaLabel="Add Vendor Purchase"
                  onClick={() => setIsVendorEntryModalOpen(true)}
                />
              }
              headerTitle="Vendors"
              hidePagination
              isLoading={isLoading}
              keyExtractor={(row) => row.id}
              onRowClick={(row) => navigate(`/sites/${site.id}/dashboard/vendors/${row.vendor}`)}
              page={1}
              searchValue=""
              totalCount={purchases.length}
              onPageChange={() => undefined}
              onSearchChange={() => undefined}
            />

            <DataTable<Receivable>
              actions={financeActions}
              actionsDisplay="icon"
              columns={[
                {
                  key: "party",
                  header: "Party",
                  accessor: (row) => partyNameMap.get(row.party) || `Party ${row.party}`,
                  sortValue: (row) => partyNameMap.get(row.party) || row.party,
                },
                {
                  key: "amount",
                  header: "Amount",
                  accessor: (row) => row.amount,
                  sortValue: (row) => row.amount,
                },
                {
                  key: "phase_name",
                  header: "Phase",
                  accessor: (row) => row.phase_name || "-",
                  sortValue: (row) => row.phase_name || "",
                },
                {
                  key: "received_amount",
                  header: "Received Amount",
                  accessor: (row) => row.current_received_amount ?? 0,
                  sortValue: (row) => row.current_received_amount ?? 0,
                },
                {
                  key: "pending_amount",
                  header: "Pending Amount",
                  accessor: (row) => row.pending_amount ?? row.amount,
                  sortValue: (row) => row.pending_amount ?? row.amount,
                },
                {
                  key: "status",
                  header: "Status",
                  accessor: (row) => getReceivableStatus(row),
                  sortValue: (row) => getReceivableStatus(row),
                },
                {
                  key: "date",
                  header: "Date",
                  accessor: (row) => row.date,
                  sortValue: (row) => row.date,
                },
              ]}
              compact
              data={receivables}
              emptyDescription="No receivables are available for this site."
              emptyTitle="No Receivables"
              headerActions={
                <AddSectionButton
                  ariaLabel="Add Party Entry"
                  onClick={() => setIsPartyEntryModalOpen(true)}
                />
              }
              headerTitle="Parties / Finance"
              hidePagination
              isLoading={isLoading}
              keyExtractor={(row) => row.id}
              onRowClick={handlePartyRowClick}
              page={1}
              searchValue=""
              totalCount={receivables.length}
              onPageChange={() => undefined}
              onSearchChange={() => undefined}
            />

            <DataTable<Payment>
              actions={labourActions}
              actionsDisplay="icon"
              columns={[
                {
                  key: "labour",
                  header: "Labour",
                  accessor: (row) =>
                    row.labour_name || labourNameMap.get(row.labour) || `Labour ${row.labour}`,
                  sortValue: (row) =>
                    row.labour_name || labourNameMap.get(row.labour) || row.labour,
                },
                {
                  key: "date",
                  header: "Date",
                  accessor: (row) => formatDate(row.date),
                  sortValue: (row) => row.date || "",
                },
                {
                  key: "total_amount",
                  header: "Total Amount",
                  accessor: (row) => row.total_amount,
                  sortValue: (row) => row.total_amount,
                },
                {
                  key: "paid_amount",
                  header: "Paid Amount",
                  accessor: (row) => row.paid_amount,
                  sortValue: (row) => row.paid_amount,
                },
                {
                  key: "pending_amount",
                  header: "Pending Amount",
                  accessor: (row) => row.pending_amount,
                  sortValue: (row) => row.pending_amount,
                },
                {
                  key: "period",
                  header: "Period",
                  accessor: (row) =>
                    row.period_start || row.period_end
                      ? `${formatDate(row.period_start)} to ${formatDate(row.period_end)}`
                      : "-",
                  sortValue: (row) => row.period_start || row.period_end || "",
                },
              ]}
              compact
              data={payments}
              emptyDescription="No labour payments are available for this site."
              emptyTitle="No Labour Payments"
              headerActions={
                <div className="flex items-center gap-2">
                  <Button
                    className="h-9 rounded-xl px-3"
                    onClick={() => setIsCasualLabourModalOpen(true)}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Casual Labour
                  </Button>
                  <Button
                    className="h-9 rounded-xl px-3"
                    onClick={() => setIsLabourAttendanceModalOpen(true)}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Attendance
                  </Button>
                  <AddSectionButton
                    ariaLabel="Add Labour Payment"
                    onClick={() => setIsLabourPaymentModalOpen(true)}
                  />
                </div>
              }
              headerTitle="Labour"
              hidePagination
              isLoading={isLoading}
              keyExtractor={(row) => row.id}
              onRowClick={(row) => navigate(`/sites/${site.id}/dashboard/labours/${row.labour}`)}
              page={1}
              searchValue=""
              totalCount={payments.length}
              onPageChange={() => undefined}
              onSearchChange={() => undefined}
            />
          </div>
        </>
      ) : (
        <section className="rounded-[2rem] border border-blue-100 bg-white/95 p-6 text-sm font-medium text-slate-600 shadow-md shadow-blue-950/5 dark:border-blue-100 dark:bg-white/95">
          {isLoading
            ? "Loading site dashboard..."
            : "Select a valid site to load dashboard data."}
        </section>
      )}

      <SiteMaterialReceiptModal
        materials={materials}
        materialVariants={references.materialVariants}
        onClose={() => setIsMaterialReceiptModalOpen(false)}
        onMaterialAdded={addMaterialOption}
        onSaved={refreshDashboardData}
        open={isMaterialReceiptModalOpen}
        siteId={site.id}
        siteName={site.name}
      />

      <Modal
        onClose={handlePartyDetailsClose}
        open={isPartyDetailsModalOpen}
        size="xl"
        title={selectedParty?.partyLabel || "Party Details"}
      >
        <div className="space-y-5">
          <section className="grid gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                Party
              </p>
              <p className="mt-2 text-base font-semibold text-[#111111]">
                {selectedParty?.partyLabel || "-"}
              </p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                Site
              </p>
              <p className="mt-2 text-base font-semibold text-[#111111]">
                {site.name}
              </p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                Contact
              </p>
              <p className="mt-2 text-base font-semibold text-[#111111]">
                {selectedPartyRecord?.contact || "-"}
              </p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                Remaining Balance
              </p>
              <p className="mt-2 text-base font-semibold text-[#111111]">
                {formatCurrency(selectedPartyTotals.pending)}
              </p>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                Site Receivables
              </p>
              <p className="mt-2 text-lg font-semibold text-[#111111]">
                {formatCurrency(selectedPartyTotals.total)}
              </p>
            </div>
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                Payment Received
              </p>
              <p className="mt-2 text-lg font-semibold text-[#111111]">
                {formatCurrency(selectedPartyTotals.received)}
              </p>
            </div>
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                    Pending Collection
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#111111]">
                    {formatCurrency(selectedPartyTotals.pending)}
                  </p>
                </div>
                <Button
                  className="min-w-[132px] rounded-xl px-4 py-2 text-sm"
                  disabled={!firstPendingReceivable}
                  onClick={() => {
                    setPaymentTarget(firstPendingReceivable);
                    setIsReceivePaymentModalOpen(Boolean(firstPendingReceivable));
                  }}
                  size="sm"
                  type="button"
                >
                  Receive Payment
                </Button>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-base font-semibold text-[#111111]">
                Payment History
              </h3>
              <p className="mt-1 text-sm text-[#6B7280]">
                Only site-specific receipt entries are shown here.
              </p>
            </div>
            {isPartyDetailsLoading ? (
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 text-sm text-[#6B7280]">
                Loading payment history...
              </div>
            ) : partyPaymentHistory.length ? (
              <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead className="bg-[#F9FAFB]">
                      <tr>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
                          Received Amount
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
                          Receipt Date
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
                          Method
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
                          Reference Number
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
                          Sender Name
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
                          Receiver Name
                        </th>
                        <th className="min-w-[220px] px-4 py-3 text-left text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {partyPaymentHistory.map((entry) => (
                        <tr className="border-t border-[#E5E7EB]" key={entry.id}>
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-[#111111]">
                            {formatCurrency(entry.amount)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-[#111111]">
                            {formatDate(entry.date)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-[#111111]">
                            {entry.paymentMethod || "-"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-[#111111]">
                            {entry.referenceNumber || "-"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-[#111111]">
                            {entry.senderName || "-"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-[#111111]">
                            {entry.receiverName || "-"}
                          </td>
                          <td className="px-4 py-3 text-[#111111]">
                            {entry.notes || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 text-sm text-[#6B7280]">
                No site-specific receipt history is available yet.
              </div>
            )}
          </section>
        </div>
      </Modal>

      <ReceivePaymentModal
        item={paymentTarget}
        onClose={() => {
          setIsReceivePaymentModalOpen(false);
          setPaymentTarget(null);
        }}
        onSubmit={async (values: ReceivePaymentFormValues) => {
          if (!paymentTarget || !selectedParty) {
            return;
          }

          await receivablesService.receivePayment(paymentTarget.id, values);
          const localEntry = {
            amount: values.amount,
            date: values.date,
            id: `local-${selectedParty.partyId}-${selectedParty.siteId}-${paymentTarget.id}-${Date.now()}`,
            notes: normalizePaymentHistoryNote(values.notes),
            paymentMethod: formatPaymentMethodLabel(values.payment_mode),
            referenceNumber: values.reference_number.trim() || undefined,
            receiverName: values.receiver_name.trim() || undefined,
            senderName: values.sender_name.trim() || undefined,
          };
          setLocalPartyPaymentHistory((currentValue) => [localEntry, ...currentValue]);
          setIsReceivePaymentModalOpen(false);
          setPaymentTarget(null);
          await loadPartyDetail(
            selectedParty.partyId,
            selectedParty.siteId,
            selectedParty.partyLabel,
          );
          refreshDashboardData();
        }}
        open={isReceivePaymentModalOpen}
        partyLabel={selectedParty?.partyLabel}
        siteLabel={site.name}
      />

      <Modal
        onClose={handleReceiptDetailsClose}
        open={isReceiptDetailsModalOpen && Boolean(selectedReceipt)}
        size="md"
        title={selectedReceipt?.receipt.material_name || "Material Receipt Details"}
      >
        {selectedReceipt ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-[#F9FAFB] p-4">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                    Material Name
                  </p>
                  <p className="mt-2 text-base font-semibold text-[#111111]">
                    {selectedReceipt.receipt.material_name}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F9FAFB] p-4">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                    Receipt Date
                  </p>
                  <p className="mt-2 text-base font-semibold text-[#111111]">
                    {formatDate(selectedReceipt.receipt.date_display || selectedReceipt.receipt.date)}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F9FAFB] p-4">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                    Variant
                  </p>
                  <p className="mt-2 text-base font-semibold text-[#111111]">
                    {getMaterialVariantLabel(selectedReceipt.receipt)}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F9FAFB] p-4">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                    Received Quantity
                  </p>
                  <p className="mt-2 text-base font-semibold text-[#111111]">
                    {selectedReceipt.receipt.quantity_received}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F9FAFB] p-4">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                    Used Quantity
                  </p>
                  <p className="mt-2 text-base font-semibold text-[#111111]">
                    {selectedReceipt.receipt.quantity_used}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F9FAFB] p-4">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                    Remaining Quantity
                  </p>
                  <p className="mt-2 text-base font-semibold text-[#111111]">
                    {selectedReceipt.receipt.remaining_stock}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F9FAFB] p-4">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                    Cost Per Unit
                  </p>
                  <p className="mt-2 text-base font-semibold text-[#111111]">
                    {formatCurrency(selectedReceipt.receipt.cost_per_unit)}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F9FAFB] p-4">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                    Transport Cost
                  </p>
                  <p className="mt-2 text-base font-semibold text-[#111111]">
                    {formatCurrency(selectedReceipt.receipt.transport_cost)}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F9FAFB] p-4">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                    Variant Unit Weight
                  </p>
                  <p className="mt-2 text-base font-semibold text-[#111111]">
                    {selectedReceipt.receipt.material_variant_unit_weight ?? "-"}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F9FAFB] p-4">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                    Total Cost
                  </p>
                  <p className="mt-2 text-base font-semibold text-[#111111]">
                    {formatCurrency(selectedReceipt.receipt.total_cost)}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F9FAFB] p-4 sm:col-span-2">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                    Invoice
                  </p>
                  <p className="mt-2 text-base font-semibold text-[#111111]">
                    {selectedReceipt.receipt.invoice_number || "-"}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F9FAFB] p-4 sm:col-span-2">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                    Notes
                  </p>
                  <p className="mt-2 text-base font-semibold text-[#111111]">
                    {selectedReceipt.receipt.notes?.trim() || "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <SiteVendorEntryModal
        materials={materials}
        onClose={() => setIsVendorEntryModalOpen(false)}
        onSaved={refreshDashboardData}
        onVendorAdded={addVendorOption}
        open={isVendorEntryModalOpen}
        siteId={site.id}
        siteName={site.name}
        vendors={vendors}
      />

      <SitePartyEntryModal
        onClose={() => setIsPartyEntryModalOpen(false)}
        onPartyAdded={addPartyOption}
        onSaved={refreshDashboardData}
        open={isPartyEntryModalOpen}
        parties={parties}
        siteId={site.id}
        siteName={site.name}
      />

      <SiteLabourPaymentModal
        labours={labours}
        onClose={() => setIsLabourPaymentModalOpen(false)}
        onLabourAdded={addLabourOption}
        onSaved={refreshDashboardData}
        open={isLabourPaymentModalOpen}
        siteId={site.id}
        siteName={site.name}
      />

      <SiteCasualLabourEntryModal
        onClose={() => setIsCasualLabourModalOpen(false)}
        onSaved={refreshDashboardData}
        open={isCasualLabourModalOpen}
        siteId={site.id}
        siteName={site.name}
      />

      <DashboardLabourAttendanceModal
        fixedSiteId={site.id}
        fixedSiteName={site.name}
        onClose={() => setIsLabourAttendanceModalOpen(false)}
        onSaved={refreshDashboardData}
        open={isLabourAttendanceModalOpen}
      />

      <EntityFormModal<ReceiptFormValues>
        defaultValues={
          editingReceipt
            ? {
                cost_per_unit: editingReceipt.cost_per_unit,
                date: editingReceipt.date,
                invoice_number: editingReceipt.invoice_number || "",
                material: editingReceipt.material,
                material_variant: editingReceipt.material_variant || 0,
                notes: editingReceipt.notes || "",
                quantity_received: editingReceipt.quantity_received,
                quantity_used: editingReceipt.quantity_used,
                site: editingReceipt.site,
                transport_cost: editingReceipt.transport_cost,
              }
            : {
                cost_per_unit: 0,
                date: new Date().toISOString().slice(0, 10),
                invoice_number: "",
                material: 0,
                material_variant: 0,
                notes: "",
                quantity_received: 0,
                quantity_used: 0,
                site: site.id,
                transport_cost: 0,
              }
        }
        description="Create or update material receipts."
        fields={[
          {
            clearable: false,
            disabled: true,
            kind: "select",
            label: "Site",
            name: "site",
            options: siteOption,
            required: true,
            valueType: "number",
          },
          {
            kind: "select",
            label: "Material",
            name: "material",
            options: materials.map((material) => ({ label: material.name, value: material.id })),
            required: true,
            valueType: "number",
          },
          {
            kind: "select",
            label: "Material Variant",
            name: "material_variant",
            options: materialVariantOptions,
            valueType: "number",
          },
          { kind: "date", label: "Receipt Date", name: "date", required: true },
          { kind: "text", label: "Invoice Number", maxLength: 50, name: "invoice_number", placeholder: "Optional invoice reference" },
          { kind: "number", label: "Quantity Received", min: 0, name: "quantity_received", required: true, valueType: "number" },
          { kind: "number", label: "Quantity Used", min: 0, name: "quantity_used", required: true, valueType: "number" },
          { kind: "number", label: "Cost Per Unit", min: 0, name: "cost_per_unit", required: true, valueType: "number" },
          { kind: "number", label: "Transport Cost", min: 0, name: "transport_cost", required: true, valueType: "number" },
          { kind: "textarea", label: "Notes", name: "notes", placeholder: "Transport, batch, or delivery notes", rows: 4, wrapperClassName: "md:col-span-2" },
        ]}
        onClose={() => setEditingReceipt(null)}
        onSubmit={async (values) => {
          if (!editingReceipt) {
            return;
          }

          const updatedReceipt = await materialReceiptsService.update(editingReceipt.id, values);
          setReceipts((currentValue) => upsertById(currentValue, updatedReceipt));
          setEditingReceipt(null);
          refreshDashboardData();
          showSuccess("Receipt updated", "Material receipt has been updated.");
        }}
        open={Boolean(editingReceipt)}
        schema={receiptSchema}
        title="Edit Material Receipt"
      />

      <EntityFormModal<PurchaseFormValues>
        defaultValues={
          editingPurchase
            ? {
                cheque_number: editingPurchase.cheque_number || "",
                date: editingPurchase.date,
                description: editingPurchase.description || "",
                invoice_number: editingPurchase.invoice_number || "",
                material: editingPurchase.material || 0,
                paid_amount: editingPurchase.paid_amount,
                payment_mode: editingPurchase.payment_mode || "cash",
                receiver_name: editingPurchase.receiver_name || "",
                sender_name: editingPurchase.sender_name || "",
                site: editingPurchase.site,
                total_amount: editingPurchase.total_amount,
                vendor: editingPurchase.vendor,
              }
            : {
                cheque_number: "",
                date: new Date().toISOString().slice(0, 10),
                description: "",
                invoice_number: "",
                material: 0,
                paid_amount: 0,
                payment_mode: "cash",
                receiver_name: "",
                sender_name: "",
                site: site.id,
                total_amount: 0,
                vendor: 0,
              }
        }
        description="Create or update vendor purchases."
        fields={[
          {
            kind: "select",
            label: "Vendor",
            name: "vendor",
            options: vendors.map((vendor) => ({ label: vendor.name, value: vendor.id })),
            required: true,
            valueType: "number",
          },
          {
            clearable: false,
            disabled: true,
            kind: "select",
            label: "Site",
            name: "site",
            options: siteOption,
            required: true,
            valueType: "number",
          },
          {
            kind: "select",
            label: "Material",
            name: "material",
            options: materials.map((material) => ({ label: material.name, value: material.id })),
            valueType: "number",
          },
          { kind: "date", label: "Date", name: "date", required: true },
          { kind: "text", label: "Invoice Number", maxLength: 60, name: "invoice_number", placeholder: "Invoice reference" },
          { kind: "textarea", label: "Description", name: "description", placeholder: "Purchase notes", rows: 5 },
          { kind: "number", label: "Total Amount", min: 0, name: "total_amount", required: true, valueType: "number" },
          { kind: "number", label: "Initial Paid Amount", min: 0, name: "paid_amount", required: true, valueType: "number" },
          { kind: "select", label: "Payment Mode", name: "payment_mode", options: paymentModeOptions, required: true },
          { kind: "text", label: "Sender Name", maxLength: 255, name: "sender_name", placeholder: "Who paid the amount" },
          { kind: "text", label: "Receiver Name", maxLength: 255, name: "receiver_name", placeholder: "Who received the amount" },
          { kind: "text", label: "Cheque Number", maxLength: 50, name: "cheque_number", placeholder: "Required for check payments" },
        ]}
        onClose={() => setEditingPurchase(null)}
        onSubmit={async (values) => {
          if (!editingPurchase) {
            return;
          }

          const updatedPurchase = await vendorPurchasesService.update(editingPurchase.id, values);
          setPurchases((currentValue) => upsertById(currentValue, updatedPurchase));
          setEditingPurchase(null);
          refreshDashboardData();
          showSuccess("Vendor purchase updated", "Vendor purchase has been updated.");
        }}
        open={Boolean(editingPurchase)}
        schema={purchaseSchema}
        title="Edit Vendor Purchase"
      />

      <EntityFormModal<ReceivableFormValues>
        defaultValues={
          editingReceivable
            ? {
                amount: editingReceivable.amount,
                date: editingReceivable.date,
                description: editingReceivable.description || "",
                party: editingReceivable.party,
                phase_name: editingReceivable.phase_name || "",
                receipt_cheque_number: "",
                receipt_payment_mode: "cash",
                receipt_receiver_name: "",
                receipt_sender_name: "",
                received_amount: editingReceivable.current_received_amount ?? 0,
                site: editingReceivable.site,
              }
            : {
                amount: 0,
                date: new Date().toISOString().slice(0, 10),
                description: "",
                party: 0,
                phase_name: "",
                receipt_cheque_number: "",
                receipt_payment_mode: "cash",
                receipt_receiver_name: "",
                receipt_sender_name: "",
                received_amount: 0,
                site: site.id,
              }
        }
        description="Create or update receivables."
        fields={[
          {
            kind: "select",
            label: "Party",
            name: "party",
            options: parties.map((party) => ({ label: party.name, value: party.id })),
            required: true,
            valueType: "number",
          },
          {
            clearable: false,
            disabled: true,
            kind: "select",
            label: "Site",
            name: "site",
            options: siteOption,
            required: true,
            valueType: "number",
          },
          { kind: "number", label: "Amount", min: 0, name: "amount", required: true, valueType: "number" },
          { kind: "text", label: "Phase Name", maxLength: 255, name: "phase_name", placeholder: "Plaster Work, Slab, Brickwork..." },
          { kind: "date", label: "Invoice Date", name: "date", required: true },
          { kind: "number", label: "Received Amount", min: 0, name: "received_amount", required: true, valueType: "number" },
          { kind: "select", label: "Receipt Payment Mode", name: "receipt_payment_mode", options: paymentModeOptions },
          { kind: "text", label: "Receipt Sender Name", maxLength: 255, name: "receipt_sender_name", placeholder: "Who sent the receipt payment" },
          { kind: "text", label: "Receipt Receiver Name", maxLength: 255, name: "receipt_receiver_name", placeholder: "Who received the receipt payment" },
          { kind: "text", label: "Receipt Cheque Number", maxLength: 50, name: "receipt_cheque_number", placeholder: "Required for check receipts" },
          { kind: "textarea", label: "Description", name: "description", placeholder: "Invoice or work description", rows: 4, wrapperClassName: "md:col-span-2" },
        ]}
        onClose={() => setEditingReceivable(null)}
        onSubmit={async (values) => {
          if (!editingReceivable) {
            return;
          }

          const updatedReceivable = await receivablesService.update(editingReceivable.id, values);
          setReceivables((currentValue) => upsertById(currentValue, updatedReceivable));
          setEditingReceivable(null);
          refreshDashboardData();
          showSuccess("Receivable updated", "Receivable has been updated.");
        }}
        open={Boolean(editingReceivable)}
        schema={receivableSchema}
        title="Edit Receivable"
      />

      <EntityFormModal<PaymentFormValues>
        defaultValues={
          editingPayment
            ? {
                auto_calculate_total: true,
                date: editingPayment.date || new Date().toISOString().slice(0, 10),
                labour: editingPayment.labour,
                notes: editingPayment.notes || "",
                paid_amount: editingPayment.paid_amount,
                period_end: editingPayment.period_end || "",
                period_start: editingPayment.period_start || "",
                site: editingPayment.site || site.id,
                total_amount: editingPayment.total_amount,
              }
            : {
                auto_calculate_total: true,
                date: new Date().toISOString().slice(0, 10),
                labour: 0,
                notes: "",
                paid_amount: 0,
                period_end: "",
                period_start: "",
                site: site.id,
                total_amount: 0,
              }
        }
        description="Create or update labour payments."
        fields={[
          {
            kind: "select",
            label: "Labour",
            name: "labour",
            options: labours.map((labour) => ({ label: labour.name, value: labour.id })),
            required: true,
            valueType: "number",
          },
          {
            clearable: false,
            disabled: true,
            kind: "select",
            label: "Site",
            name: "site",
            options: siteOption,
            valueType: "number",
          },
          { kind: "date", label: "Payment Date", name: "date", required: true },
          { kind: "date", label: "Period Start", name: "period_start" },
          { kind: "date", label: "Period End", name: "period_end" },
          { kind: "number", label: "Total Amount", min: 0, name: "total_amount", readOnly: true, required: true, valueType: "number" },
          { kind: "number", label: "Paid Amount", min: 0, name: "paid_amount", required: true, valueType: "number" },
          { kind: "textarea", label: "Notes", name: "notes", placeholder: "Optional payment notes", rows: 4, wrapperClassName: "md:col-span-2" },
        ]}
        onClose={() => setEditingPayment(null)}
        onSubmit={async (values) => {
          if (!editingPayment) {
            return;
          }

          const updatedPayment = await paymentsService.update(editingPayment.id, values);
          setPayments((currentValue) => upsertById(currentValue, updatedPayment));
          setEditingPayment(null);
          refreshDashboardData();
          showSuccess("Payment updated", "Labour payment has been updated.");
        }}
        onValuesChange={syncAutoCalculatedTotal}
        open={Boolean(editingPayment)}
        schema={paymentSchema}
        title="Edit Payment"
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description={
          deleteTarget
            ? `Are you sure you want to delete ${deleteTarget.label}?`
            : ""
        }
        isLoading={isDeleteLoading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          void handleDelete();
        }}
        open={Boolean(deleteTarget)}
        title="Delete Record"
      />
    </div>
  );
}
