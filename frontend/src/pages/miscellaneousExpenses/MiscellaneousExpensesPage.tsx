import { z } from "zod";

import { CrudModulePage } from "../../components/forms/CrudModulePage";
import { useAuth } from "../../hooks/useAuth";
import { miscellaneousExpensesService } from "../../services/miscellaneousExpensesService";
import type {
  MiscellaneousExpense,
  MiscellaneousExpenseFormValues,
} from "../../types/erp.types";
import { getCrudPermissions } from "../../utils/permissions";

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

export function MiscellaneousExpensesPage() {
  const { user } = useAuth();
  const permissions = getCrudPermissions(user);

  return (
    <CrudModulePage<MiscellaneousExpense, MiscellaneousExpenseFormValues>
      canCreate={permissions.canCreate}
      canDelete={permissions.canDelete}
      canEdit={permissions.canEdit}
      columns={[
        {
          key: "title",
          header: "Title",
          accessor: (row) => row.title,
          sortValue: (row) => row.title,
        },
        {
          key: "paid_to_name",
          header: "Paid To",
          accessor: (row) => row.paid_to_name || "-",
          sortValue: (row) => row.paid_to_name || "",
        },
        {
          key: "payment_mode",
          header: "Payment Mode",
          accessor: (row) => row.payment_mode,
          sortValue: (row) => row.payment_mode,
        },
        {
          key: "amount",
          header: "Amount",
          accessor: (row) => row.amount,
          sortValue: (row) => row.amount,
        },
        {
          key: "date",
          header: "Date",
          accessor: (row) => row.date,
          sortValue: (row) => row.date,
        },
      ]}
      createLabel="Add Expense"
      defaultValues={{
        amount: 0,
        date: new Date().toISOString().slice(0, 10),
        notes: "",
        paid_to_name: "",
        payment_mode: "cash",
        title: "",
      }}
      description="Track miscellaneous site and cash expenses that sit outside standard vendor and labour flows."
      emptyDescription="No miscellaneous expenses are available."
      emptyTitle="No miscellaneous expenses found"
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
      getEditValues={(entity) => ({
        amount: entity.amount,
        date: entity.date,
        notes: entity.notes || "",
        paid_to_name: entity.paid_to_name || "",
        payment_mode: entity.payment_mode,
        title: entity.title,
      })}
      getId={(entity) => entity.id}
      schema={miscellaneousExpenseSchema}
      searchPlaceholder="Search miscellaneous expenses"
      service={miscellaneousExpensesService}
      title="Miscellaneous Expenses"
      viewFields={[
        { label: "Record ID", value: (row) => row.id, highlight: true },
        { label: "Title", value: (row) => row.title, highlight: true },
        { label: "Paid To Name", value: (row) => row.paid_to_name, highlight: true },
        { label: "Amount", value: (row) => row.amount, highlight: true },
        { label: "Date", value: (row) => row.date },
        { label: "Payment Mode", value: (row) => row.payment_mode },
        { label: "Notes", value: (row) => row.notes, span: "full" },
      ]}
    />
  );
}
