import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

import { ErrorMessage } from "../../components/common/ErrorMessage";
import { Skeleton } from "../../components/common/Skeleton";
import { useToast } from "../../components/feedback/useToast";
import { EntityFormModal } from "../../components/forms/EntityFormModal";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatCard } from "../../components/layout/StatCard";
import { Button } from "../../components/ui/Button";
import { miscellaneousExpensesService } from "../../services/miscellaneousExpensesService";
import { ownerDashboardService } from "../../services/ownerDashboardService";
import { ownerPayoutsService } from "../../services/ownerPayoutsService";
import type {
  MiscellaneousExpense,
  MiscellaneousExpenseFormValues,
  OwnerDashboardData,
  OwnerPayout,
  OwnerPayoutFormValues,
} from "../../types/erp.types";
import { getErrorMessage } from "../../utils/apiError";
import { formatCurrency, formatDate, formatNumber } from "../../utils/format";

const miscellaneousExpenseSchema = z.object({
  amount: z.number().gt(0, "Amount must be greater than zero."),
  date: z.string().min(1, "Date is required."),
  notes: z.string().max(1000, "Notes must be 1000 characters or fewer."),
  paid_to_name: z.string().max(255, "Paid to name must be 255 characters or fewer."),
  payment_mode: z.enum(["cash", "check", "bank_transfer", "upi", "other"]),
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters.")
    .max(255, "Title must be 255 characters or fewer."),
});

const ownerPayoutSchema = z.object({
  amount: z.number().gt(0, "Payment amount must be greater than zero."),
  cheque_number: z.string().max(50, "Cheque number must be 50 characters or fewer."),
  date: z.string().min(1, "Payment date is required."),
  payment_mode: z.enum(["cash", "check", "bank_transfer", "upi", "other"]),
  receiver_name: z.string().max(255, "Receiver name must be 255 characters or fewer."),
  reference_number: z
    .string()
    .max(50, "Reference number must be 50 characters or fewer."),
  remarks: z
    .string()
    .max(600, "Remarks must be 600 characters or fewer."),
  sender_name: z.string().max(255, "Sender name must be 255 characters or fewer."),
}).superRefine((value, context) => {
  if (value.payment_mode === "cash" && !value.sender_name.trim() && !value.receiver_name.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Sender name or receiver name is required for cash payments.",
      path: ["sender_name"],
    });
  }

  if (value.payment_mode === "check" && !value.cheque_number.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Cheque number is required for check payments.",
      path: ["cheque_number"],
    });
  }
});

function getNotificationClasses(severity: string) {
  if (severity === "high") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-[#E5E7EB] bg-[#F9FAFB] text-[#374151]";
}

export function OwnerDashboardPage() {
  const { showError, showSuccess } = useToast();
  const [dashboard, setDashboard] = useState<OwnerDashboardData | null>(null);
  const [expenses, setExpenses] = useState<MiscellaneousExpense[]>([]);
  const [payouts, setPayouts] = useState<OwnerPayout[]>([]);
  const [error, setError] = useState("");
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpensesLoading, setIsExpensesLoading] = useState(true);
  const [isPayoutsLoading, setIsPayoutsLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await ownerDashboardService.getDashboard();
      setDashboard(response);
    } catch (loadError) {
      const message = getErrorMessage(loadError);
      setError(message);
      showError("Unable to load owner dashboard", message);
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  const loadExpenses = useCallback(async () => {
    try {
      setIsExpensesLoading(true);
      const response = await miscellaneousExpensesService.list({ page: 1 });
      setExpenses(response.results.slice(0, 5));
    } catch (loadError) {
      const message = getErrorMessage(loadError);
      showError("Unable to load expenses", message);
    } finally {
      setIsExpensesLoading(false);
    }
  }, [showError]);

  const loadPayouts = useCallback(async () => {
    try {
      setIsPayoutsLoading(true);
      const response = await ownerPayoutsService.list({ page: 1 });
      setPayouts(response.results.slice(0, 5));
    } catch (loadError) {
      const message = getErrorMessage(loadError);
      showError("Unable to load owner payments", message);
    } finally {
      setIsPayoutsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

  useEffect(() => {
    void loadPayouts();
  }, [loadPayouts]);

  const summaryCards = dashboard
    ? [
        {
          accent: "from-[#FF6B4A]/18 to-[#FF6B4A]/0",
          label: "Total Sites",
          value: formatNumber(dashboard.summary.total_sites),
        },
        {
          accent: "from-[#111111]/10 to-[#111111]/0",
          label: "Active Sites",
          value: formatNumber(dashboard.summary.active_sites),
        },
        {
          accent: "from-[#FAFAFA] to-[#FFFFFF]",
          label: "Inactive Sites",
          value: formatNumber(dashboard.summary.inactive_sites),
        },
        {
          accent: "from-[#FFD8CD] to-[#FFFFFF]",
          label: "Client Pending",
          value: formatCurrency(dashboard.summary.payment_pending_from_clients),
        },
        {
          accent: "from-[#FFEAE4] to-[#FFFFFF]",
          label: "Vendor Pending",
          value: formatCurrency(dashboard.summary.payment_pending_to_vendors),
        },
        {
          accent: "from-[#F3F4F6] to-[#FFFFFF]",
          label: "Employee Pending",
          value: formatCurrency(dashboard.summary.payment_pending_to_employees),
        },
        {
          accent: "from-[#FFF1EC] to-[#FFFFFF]",
          label: "Cash Received",
          value: formatCurrency(dashboard.summary.total_cash_received),
        },
        {
          accent: "from-[#F9FAFB] to-[#FFFFFF]",
          label: "Cash Outflow",
          value: formatCurrency(dashboard.summary.total_cash_outflow),
        },
        {
          accent: dashboard.summary.has_negative_cash_balance
            ? "from-rose-100 to-[#FFFFFF]"
            : "from-emerald-100 to-[#FFFFFF]",
          label: "Cash Available",
          value: formatCurrency(dashboard.summary.cash_available),
        },
      ]
    : [];

  async function handleExpenseCreate(values: MiscellaneousExpenseFormValues) {
    await miscellaneousExpensesService.create(values);
    showSuccess("Expense added", "Miscellaneous expense has been added successfully.");
    setIsExpenseModalOpen(false);
    await Promise.all([loadDashboard(), loadExpenses()]);
  }

  async function handlePayoutCreate(values: OwnerPayoutFormValues) {
    await ownerPayoutsService.create(values);
    showSuccess("Payment recorded", "Owner payment has been recorded successfully.");
    setIsPayoutModalOpen(false);
    await Promise.all([loadDashboard(), loadPayouts()]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button onClick={() => setIsPayoutModalOpen(true)} type="button">
              Pay Cash
            </Button>
            <Button onClick={() => setIsExpenseModalOpen(true)} type="button">
              Add Expense
            </Button>
            <Button
              isLoading={isLoading || isExpensesLoading || isPayoutsLoading}
              onClick={() => {
                void Promise.all([loadDashboard(), loadExpenses(), loadPayouts()]);
              }}
              variant="secondary"
            >
              Refresh
            </Button>
          </>
        }
        description="Track live owner-level site activity, pending balances, cash position, and notifications without changing the existing dashboard."
        title="Owner Dashboard"
      />

      <ErrorMessage message={error} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading
          ? Array.from({ length: 9 }).map((_, index) => (
              <div
                className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm"
                key={index}
              >
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-3 h-8 w-2/3" />
              </div>
            ))
          : summaryCards.map((card) => (
              <div
                className={`rounded-3xl border border-[#E5E7EB] bg-gradient-to-br ${card.accent} p-1 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md`}
                key={card.label}
              >
                <div className="rounded-[1.35rem] bg-white px-4 py-4">
                  <StatCard label={card.label} value={card.value} />
                </div>
              </div>
            ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#111111]">Site Overview</h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                Activity snapshot for {formatDate(dashboard?.site_activity_date)}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="mt-5 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton className="h-14 w-full" key={index} />
              ))}
            </div>
          ) : dashboard?.site_overview.length ? (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.16em] text-[#9CA3AF]">
                    <th className="px-3 py-3 font-semibold">Site</th>
                    <th className="px-3 py-3 font-semibold">Location</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Client Pending</th>
                    <th className="px-3 py-3 font-semibold">Vendor Pending</th>
                    <th className="px-3 py-3 font-semibold">Employee Pending</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {dashboard.site_overview.map((site) => (
                    <tr className="align-top" key={site.site_id}>
                      <td className="px-3 py-4">
                        <p className="font-semibold text-[#111111]">{site.site_name}</p>
                      </td>
                      <td className="px-3 py-4 text-[#4B5563]">{site.location || "-"}</td>
                      <td className="px-3 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            site.is_active
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-rose-200 bg-rose-50 text-rose-700"
                          }`}
                        >
                          {site.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-[#111111]">
                        {formatCurrency(site.payment_pending_from_clients)}
                      </td>
                      <td className="px-3 py-4 text-[#111111]">
                        {formatCurrency(site.payment_pending_to_vendors)}
                      </td>
                      <td className="px-3 py-4 text-[#111111]">
                        {formatCurrency(site.payment_pending_to_employees)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-[#E5E7EB] bg-[#FAFAFA] px-4 py-8 text-center text-sm text-[#6B7280]">
              No site activity is available for the selected owner dashboard snapshot.
            </div>
          )}
        </div>

        <div className="space-y-5">
          <section className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-[#111111]">Notifications</h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              Important alerts from the owner dashboard API.
            </p>

            {isLoading ? (
              <div className="mt-5 space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : dashboard?.notifications.length ? (
              <div className="mt-5 space-y-3">
                {dashboard.notifications.map((notification, index) => (
                  <div
                    className={`rounded-2xl border px-4 py-4 ${getNotificationClasses(notification.severity)}`}
                    key={`${notification.type}-${index}`}
                  >
                    <p className="text-sm font-semibold capitalize">
                      {notification.type.replace(/_/g, " ")}
                    </p>
                    <p className="mt-1 text-sm leading-6">{notification.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-[#E5E7EB] bg-[#FAFAFA] px-4 py-8 text-center text-sm text-[#6B7280]">
                No owner notifications right now.
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-[#111111]">Cash Breakdown</h2>
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-[#6B7280]">Paid to vendors</span>
                <span className="font-semibold text-[#111111]">
                  {formatCurrency(dashboard?.summary.cash_paid_to_vendors)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-[#6B7280]">Paid to employees</span>
                <span className="font-semibold text-[#111111]">
                  {formatCurrency(dashboard?.summary.cash_paid_to_employees)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-[#6B7280]">Paid to casual labour</span>
                <span className="font-semibold text-[#111111]">
                  {formatCurrency(dashboard?.summary.cash_paid_to_casual_labour)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-[#6B7280]">Miscellaneous expenses</span>
                <span className="font-semibold text-[#111111]">
                  {formatCurrency(
                    dashboard?.summary.cash_paid_for_miscellaneous_expenses,
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-[#6B7280]">Owner payments</span>
                <span className="font-semibold text-[#111111]">
                  {formatCurrency(
                    dashboard?.summary.cash_paid_for_owner_payments,
                  )}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-[#111111]">Recent Owner Payments</h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              Cash and check payouts recorded from the owner dashboard.
            </p>

            {isPayoutsLoading ? (
              <div className="mt-5 space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : payouts.length ? (
              <div className="mt-5 space-y-3">
                {payouts.map((payout) => (
                  <div
                    className="rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] px-4 py-4"
                    key={payout.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#111111]">
                          {payout.receiver_name || payout.sender_name || `Payment #${payout.id}`}
                        </p>
                        <p className="mt-1 text-xs text-[#6B7280]">
                          {formatDate(payout.date)}
                        </p>
                        <p className="mt-1 text-xs text-[#6B7280]">
                          From: {payout.sender_name || "-"} | To: {payout.receiver_name || "-"}
                        </p>
                        {payout.remarks ? (
                          <p className="mt-1 text-xs text-[#6B7280]">{payout.remarks}</p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-[#111111]">
                          {formatCurrency(payout.amount)}
                        </p>
                        <p className="mt-1 text-xs capitalize text-[#6B7280]">
                          {payout.payment_mode.replaceAll("_", " ")}
                        </p>
                        {payout.cheque_number ? (
                          <p className="mt-1 text-xs text-[#6B7280]">
                            Cheque: {payout.cheque_number}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-[#E5E7EB] bg-[#FAFAFA] px-4 py-8 text-center text-sm text-[#6B7280]">
                No owner payments added yet.
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-[#111111]">Recent Expenses</h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              Latest miscellaneous expenses added through the existing backend API.
            </p>

            {isExpensesLoading ? (
              <div className="mt-5 space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : expenses.length ? (
              <div className="mt-5 space-y-3">
                {expenses.map((expense) => (
                  <div
                    className="rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] px-4 py-4"
                    key={expense.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#111111]">
                          {expense.title}
                        </p>
                        <p className="mt-1 text-xs text-[#6B7280]">
                          {formatDate(expense.date)}
                        </p>
                        <p className="mt-1 text-xs text-[#6B7280]">
                          Paid to: {expense.paid_to_name || "-"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-[#111111]">
                          {formatCurrency(expense.amount)}
                        </p>
                        <p className="mt-1 text-xs capitalize text-[#6B7280]">
                          {expense.payment_mode.replaceAll("_", " ")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-[#E5E7EB] bg-[#FAFAFA] px-4 py-8 text-center text-sm text-[#6B7280]">
                No expenses added yet.
              </div>
            )}
          </section>
        </div>
      </section>

      <EntityFormModal<MiscellaneousExpenseFormValues>
        defaultValues={{
          amount: 0,
          date: new Date().toISOString().slice(0, 10),
          notes: "",
          paid_to_name: "",
          payment_mode: "cash",
          title: "",
        }}
        description="Add a miscellaneous expense directly from the owner dashboard."
        fields={[
          {
            kind: "text",
            label: "Expense Title",
            maxLength: 255,
            name: "title",
            placeholder: "Diesel, transport, tea, tools...",
            required: true,
          },
          {
            kind: "text",
            label: "Paid To Name",
            maxLength: 255,
            name: "paid_to_name",
            placeholder: "Fuel station, worker, shop...",
          },
          {
            kind: "number",
            label: "Amount",
            min: 0,
            name: "amount",
            required: true,
            step: 0.01,
            valueType: "number",
          },
          {
            kind: "date",
            label: "Expense Date",
            name: "date",
            required: true,
          },
          {
            kind: "select",
            label: "Payment Mode",
            name: "payment_mode",
            options: [
              { label: "Cash", value: "cash" },
              { label: "Check", value: "check" },
              { label: "Bank Transfer", value: "bank_transfer" },
              { label: "UPI", value: "upi" },
              { label: "Other", value: "other" },
            ],
            required: true,
          },
          {
            kind: "textarea",
            label: "Notes",
            name: "notes",
            placeholder: "Optional expense notes",
            rows: 4,
            wrapperClassName: "md:col-span-2",
          },
        ]}
        onClose={() => {
          setIsExpenseModalOpen(false);
        }}
        onSubmit={handleExpenseCreate}
        open={isExpenseModalOpen}
        schema={miscellaneousExpenseSchema}
        title="Add Expense"
      />

      <EntityFormModal<OwnerPayoutFormValues>
        defaultValues={{
          amount: 0,
          cheque_number: "",
          date: new Date().toISOString().slice(0, 10),
          payment_mode: "cash",
          receiver_name: "",
          reference_number: "",
          remarks: "",
          sender_name: "",
        }}
        description="Record an owner-level cash or check payout and refresh the cash balance immediately."
        fields={[
          {
            kind: "text",
            label: "Sender Name",
            maxLength: 255,
            name: "sender_name",
            placeholder: "Who paid the amount",
          },
          {
            kind: "text",
            label: "Receiver Name",
            maxLength: 255,
            name: "receiver_name",
            placeholder: "Who received the amount",
          },
          {
            kind: "number",
            label: "Amount",
            min: 0,
            name: "amount",
            required: true,
            step: 0.01,
            valueType: "number",
          },
          {
            kind: "date",
            label: "Payment Date",
            name: "date",
            required: true,
          },
          {
            kind: "select",
            label: "Payment Mode",
            name: "payment_mode",
            options: [
              { label: "Cash", value: "cash" },
              { label: "Check", value: "check" },
              { label: "Bank Transfer", value: "bank_transfer" },
              { label: "UPI", value: "upi" },
              { label: "Other", value: "other" },
            ],
            required: true,
          },
          {
            kind: "text",
            label: "Cheque Number",
            maxLength: 50,
            name: "cheque_number",
            placeholder: "Required for check payments",
          },
          {
            kind: "text",
            label: "Reference Number",
            maxLength: 50,
            name: "reference_number",
            placeholder: "Optional reference number",
          },
          {
            kind: "textarea",
            label: "Remarks",
            name: "remarks",
            placeholder: "Optional payment remarks",
            rows: 4,
            wrapperClassName: "md:col-span-2",
          },
        ]}
        onClose={() => {
          setIsPayoutModalOpen(false);
        }}
        onSubmit={handlePayoutCreate}
        open={isPayoutModalOpen}
        schema={ownerPayoutSchema}
        title="Pay Cash"
      />
    </div>
  );
}
