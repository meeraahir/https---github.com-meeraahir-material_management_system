import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { apiClient } from "../../api/client";
import { icons } from "../../assets/icons";
import { useToast } from "../../components/feedback/useToast";
import { Modal } from "../../components/modal/Modal";
import { Button } from "../../components/ui/Button";
import { FormError } from "../../components/ui/FormError";
import { Input } from "../../components/ui/Input";
import { Loader } from "../../components/ui/Loader";
import type { CasualLabourEntry, Labour, PaginatedResponse } from "../../types/erp.types";
import { getErrorMessage } from "../../utils/apiError";
import { formatCurrency } from "../../utils/format";
import { createZodResolver } from "../../utils/zodResolver";
import { casualLabourService } from "../../services/casualLabourService";
import { labourService } from "../../services/labourService";

const casualLabourToday = new Date().toISOString().slice(0, 10);
const casualLabourContactStorageKey = "site-dashboard-casual-labour-contacts";

interface LabourListItem {
  contact?: string | null;
  id: number | string;
  name: string;
  role?: string | null;
  secondaryText?: string | null;
  wageLabel: string;
}

interface LabourListProps {
  addButtonLabel?: string;
  description: string;
  emptyMessage: string;
  isLoading: boolean;
  items: LabourListItem[];
  onAddClick?: () => void;
  title: string;
}

interface CasualLabourContactFormValues {
  contact?: string;
  labour_name: string;
  labour_type: string;
  paid_amount: number;
}

interface SiteCasualLabourBrowserModalProps {
  onClose: () => void;
  onSaved?: () => void;
  open: boolean;
  siteId: number;
  siteName: string;
}

interface SiteRegularLabourBrowserModalProps {
  onClose: () => void;
  open: boolean;
  siteName: string;
}

const casualLabourAddSchema = z.object({
  contact: z.string().trim().max(20, "Contact must be 20 characters or fewer.").optional().or(z.literal("")),
  labour_name: z
    .string()
    .trim()
    .min(2, "Labour name must be at least 2 characters.")
    .max(255, "Labour name must be 255 characters or fewer."),
  labour_type: z
    .string()
    .trim()
    .min(1, "Work type is required.")
    .max(100, "Work type must be 100 characters or fewer."),
  paid_amount: z.number().gt(0, "Daily wage must be greater than zero."),
});

function getCasualContactKey(entry: Pick<CasualLabourEntry, "date" | "labour_name" | "labour_type" | "paid_amount" | "site">) {
  return [
    entry.site,
    entry.date,
    entry.labour_name.trim().toLowerCase(),
    entry.labour_type.trim().toLowerCase(),
    entry.paid_amount,
  ].join("|");
}

function readCasualContactMap() {
  if (typeof window === "undefined") {
    return {} as Record<string, string>;
  }

  try {
    const storedValue = window.localStorage.getItem(casualLabourContactStorageKey);

    if (!storedValue) {
      return {} as Record<string, string>;
    }

    const parsedValue = JSON.parse(storedValue) as Record<string, string>;
    return parsedValue && typeof parsedValue === "object" ? parsedValue : {};
  } catch {
    return {} as Record<string, string>;
  }
}

function writeCasualContactMap(nextValue: Record<string, string>) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(casualLabourContactStorageKey, JSON.stringify(nextValue));
  } catch {
    // Ignore storage failures so the main labour flow still works.
  }
}

async function fetchAllPaginatedResults<TEntity>(
  path: string,
  params?: Record<string, number | string | undefined>,
) {
  const items: TEntity[] = [];
  let nextUrl: string | null = path;
  let nextParams = params;

  while (nextUrl) {
    const response: { data: PaginatedResponse<TEntity> } = await apiClient.get<PaginatedResponse<TEntity>>(nextUrl, {
      params: nextParams,
    });
    items.push(...response.data.results);
    nextUrl = response.data.next;
    nextParams = undefined;
  }

  return items;
}

function LabourList({
  addButtonLabel = "Add Labour",
  description,
  emptyMessage,
  isLoading,
  items,
  onAddClick,
  title,
}: LabourListProps) {
  const headerButton = onAddClick ? (
    <Button
      aria-label={addButtonLabel}
      className="h-10 w-10 rounded-full px-0"
      onClick={onAddClick}
      title={addButtonLabel}
      type="button"
      variant="secondary"
    >
      {icons.plus({ className: "h-4 w-4" })}
    </Button>
  ) : null;

  return (
    <section className="overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white">
      <div className="flex items-start justify-between gap-4 border-b border-[#E5E7EB] px-5 py-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-[#111111]">{title}</h3>
          <p className="mt-1 text-sm text-[#6B7280]">{description}</p>
        </div>
        {headerButton}
      </div>

      {isLoading ? (
        <div className="px-5 py-16">
          <Loader label="Loading labour..." />
        </div>
      ) : items.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm font-semibold text-[#111111]">No labour found</p>
          <p className="mt-1 text-sm text-[#6B7280]">{emptyMessage}</p>
        </div>
      ) : (
        <div className="max-h-[26rem] overflow-y-auto">
          <div className="grid gap-3 p-4 md:hidden">
            {items.map((item) => (
              <article
                className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm transition duration-200 hover:border-[#D1D5DB] hover:shadow-md"
                key={item.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-semibold text-[#111111]">{item.name}</h4>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#6B7280]">
                      {item.role || "-"}
                    </p>
                  </div>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    {item.wageLabel}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-[#4B5563]">
                  <div className="flex items-center justify-between gap-4">
                    <span>Contact</span>
                    <span className="font-medium text-[#111111]">{item.contact || "-"}</span>
                  </div>
                  {item.secondaryText ? (
                    <div className="flex items-center justify-between gap-4">
                      <span>Details</span>
                      <span className="font-medium text-[#111111]">{item.secondaryText}</span>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          <div className="hidden md:block">
            <table className="min-w-full divide-y divide-[#E5E7EB]">
              <thead className="bg-[#F9FAFB]">
                <tr>
                  <th className="px-5 py-3 text-left text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">Labour Name</th>
                  <th className="px-5 py-3 text-left text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">Role / Type</th>
                  <th className="px-5 py-3 text-left text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">Daily Wage</th>
                  <th className="px-5 py-3 text-left text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">Contact</th>
                  <th className="px-5 py-3 text-left text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {items.map((item) => (
                  <tr className="transition duration-200 hover:bg-[#FAFAFA]" key={item.id}>
                    <td className="px-5 py-4 text-sm font-semibold text-[#111111]">{item.name}</td>
                    <td className="px-5 py-4 text-sm text-[#374151]">{item.role || "-"}</td>
                    <td className="px-5 py-4 text-sm font-medium text-[#111111]">{item.wageLabel}</td>
                    <td className="px-5 py-4 text-sm text-[#374151]">{item.contact || "-"}</td>
                    <td className="px-5 py-4 text-sm text-[#374151]">{item.secondaryText || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function AddCasualLabourModal({
  onClose,
  onSaved,
  open,
  siteId,
  siteName,
}: {
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  open: boolean;
  siteId: number;
  siteName: string;
}) {
  const { showSuccess } = useToast();
  const [formError, setFormError] = useState("");
  const {
    formState: { errors, isSubmitting, isValid },
    handleSubmit,
    register,
    reset,
  } = useForm<CasualLabourContactFormValues>({
    defaultValues: {
      contact: "",
      labour_name: "",
      labour_type: "",
      paid_amount: 0,
    },
    mode: "onChange",
    resolver: createZodResolver(casualLabourAddSchema),
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset({
      contact: "",
      labour_name: "",
      labour_type: "",
      paid_amount: 0,
    });
    setFormError("");
  }, [open, reset]);

  return (
    <Modal
      footer={
        <div className="flex justify-end gap-3">
          <Button onClick={onClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={!isValid} form="site-casual-labour-browser-form" isLoading={isSubmitting} type="submit">
            Save Casual Labour
          </Button>
        </div>
      }
      onClose={onClose}
      open={open}
      size="lg"
      title="Add Casual Labour"
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-slate-700">
          New casual labour entry will be added for <span className="font-semibold">{siteName}</span>.
        </div>

        <form
          className="grid gap-4 md:grid-cols-2"
          id="site-casual-labour-browser-form"
          onSubmit={handleSubmit(async (values) => {
            try {
              setFormError("");
              const contactValue = values.contact?.trim() ?? "";
              const createdEntry = await casualLabourService.create({
                date: casualLabourToday,
                labour_name: values.labour_name,
                labour_type: values.labour_type,
                paid_amount: values.paid_amount,
                site: siteId,
              });

              if (contactValue) {
                const currentMap = readCasualContactMap();
                currentMap[getCasualContactKey(createdEntry)] = contactValue;
                writeCasualContactMap(currentMap);
              }

              await onSaved();
              showSuccess("Casual labour added", "The casual labour list has been refreshed.");
              onClose();
            } catch (error) {
              setFormError(getErrorMessage(error));
            }
          })}
        >
          <Input disabled label="Site" readOnly value={siteName} />
          <Input disabled label="Entry Date" readOnly value={casualLabourToday} />

          <Input
            error={errors.labour_name?.message}
            label="Name"
            maxLength={255}
            placeholder="Worker name"
            requiredIndicator
            {...register("labour_name")}
          />
          <Input
            error={errors.labour_type?.message}
            label="Work Type"
            maxLength={100}
            placeholder="Helper, Mason, Loader..."
            requiredIndicator
            {...register("labour_type")}
          />
          <Input
            error={errors.paid_amount?.message}
            label="Daily Wage"
            min={0}
            requiredIndicator
            step={0.01}
            type="number"
            {...register("paid_amount", {
              setValueAs: (value) => (value === "" ? 0 : Number(value)),
            })}
          />
          <Input
            description="Stored in this browser because the current API does not include a casual labour contact field."
            error={errors.contact?.message}
            label="Contact"
            maxLength={20}
            placeholder="Optional contact number"
            {...register("contact")}
          />

          <div className="md:col-span-2">
            <FormError message={formError} />
          </div>
        </form>
      </div>
    </Modal>
  );
}

export function SiteCasualLabourBrowserModal({
  onClose,
  onSaved,
  open,
  siteId,
  siteName,
}: SiteCasualLabourBrowserModalProps) {
  const { showError } = useToast();
  const [casualEntries, setCasualEntries] = useState<CasualLabourEntry[]>([]);
  const [error, setError] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const contactMap = useMemo(() => readCasualContactMap(), [casualEntries, open]);

  async function loadCasualLabour() {
    try {
      setIsLoading(true);
      setError("");
      const entries = await fetchAllPaginatedResults<CasualLabourEntry>("/labour/casual-labour/", {
        site: siteId,
      });

      setCasualEntries(
        entries.sort((left, right) => {
          const dateCompare = right.date.localeCompare(left.date);
          if (dateCompare !== 0) {
            return dateCompare;
          }

          return right.id - left.id;
        }),
      );
    } catch (loadError) {
      const message = getErrorMessage(loadError);
      setError(message);
      showError("Unable to load casual labour", message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    void loadCasualLabour();
  }, [open, siteId]);

  return (
    <>
      <Modal
        footer={
          <div className="flex justify-end gap-3">
            <Button onClick={onClose} type="button" variant="secondary">
              Close
            </Button>
          </div>
        }
        onClose={() => {
          setIsAddModalOpen(false);
          onClose();
        }}
        open={open}
        size="xl"
        title="Casual Labour"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-slate-700">
            Casual labour entries for <span className="font-semibold">{siteName}</span>.
          </div>

          <FormError message={error} />

          <LabourList
            addButtonLabel="Add Casual Labour"
            description="Site-specific casual labour entries fetched from the existing casual labour API."
            emptyMessage="No casual labour entries are available for this site yet."
            isLoading={isLoading}
            items={casualEntries.map((entry) => ({
              contact: contactMap[getCasualContactKey(entry)] || null,
              id: entry.id,
              name: entry.labour_name,
              role: entry.labour_type,
              secondaryText: entry.date,
              wageLabel: formatCurrency(entry.paid_amount),
            }))}
            onAddClick={() => setIsAddModalOpen(true)}
            title="Casual Labour List"
          />

          <p className="text-xs text-[#6B7280]">
            Contact is shown when available in frontend storage. The current casual labour API does not return a contact field.
          </p>
        </div>
      </Modal>

      <AddCasualLabourModal
        onClose={() => setIsAddModalOpen(false)}
        onSaved={async () => {
          await loadCasualLabour();
          onSaved?.();
        }}
        open={open && isAddModalOpen}
        siteId={siteId}
        siteName={siteName}
      />
    </>
  );
}

export function SiteRegularLabourBrowserModal({
  onClose,
  open,
  siteName,
}: SiteRegularLabourBrowserModalProps) {
  const { showError } = useToast();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [labours, setLabours] = useState<Labour[]>([]);

  useEffect(() => {
    async function loadLabour() {
      try {
        setIsLoading(true);
        setError("");
        const entries = await labourService.getOptions();
        setLabours(
          entries.sort((left, right) => left.name.localeCompare(right.name)),
        );
      } catch (loadError) {
        const message = getErrorMessage(loadError);
        setError(message);
        showError("Unable to load regular labour", message);
      } finally {
        setIsLoading(false);
      }
    }

    if (!open) {
      return;
    }

    void loadLabour();
  }, [open, showError]);

  return (
    <Modal
      footer={
        <div className="flex justify-end gap-3">
          <Button onClick={onClose} type="button" variant="secondary">
            Close
          </Button>
        </div>
      }
      onClose={onClose}
      open={open}
      size="xl"
      title="Regular Labour"
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-slate-700">
          Regular labour master records available while working on <span className="font-semibold">{siteName}</span>.
        </div>

        <FormError message={error} />

        <LabourList
          description="The current labour API returns all regular labour records, so this list shows the existing master data available in the system."
          emptyMessage="No regular labour records are available right now."
          isLoading={isLoading}
          items={labours.map((labour) => ({
            contact: labour.phone || null,
            id: labour.id,
            name: labour.name,
            role: labour.labour_type || null,
            secondaryText: labour.labour_type ? `Type: ${labour.labour_type}` : null,
            wageLabel: formatCurrency(labour.per_day_wage),
          }))}
          title="Regular Labour List"
        />
      </div>
    </Modal>
  );
}
