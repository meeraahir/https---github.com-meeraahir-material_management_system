import { useEffect, useMemo, useState } from "react";

import { useToast } from "../../components/feedback/useToast";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { PageHeader } from "../../components/layout/PageHeader";
import { DataTable } from "../../components/table/DataTable";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { useReferenceData } from "../../hooks/useReferenceData";
import { materialReceiptsService } from "../../services/materialReceiptsService";
import { materialUsageService } from "../../services/materialsService";
import type { MaterialUsage, Receipt } from "../../types/erp.types";
import { getErrorMessage } from "../../utils/apiError";
import { formatDate } from "../../utils/format";

interface UsageFilters {
  date: string;
  material: number;
  receipt: number;
  site: number;
}

const initialFilters: UsageFilters = {
  date: "",
  material: 0,
  receipt: 0,
  site: 0,
};

export function MaterialUsagePage() {
  const { showError } = useToast();
  const references = useReferenceData();
  const [filters, setFilters] = useState<UsageFilters>(initialFilters);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [rows, setRows] = useState<MaterialUsage[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    async function loadReceipts() {
      try {
        setReceipts(await materialReceiptsService.getOptions());
      } catch (loadError) {
        showError("Unable to load receipt options", getErrorMessage(loadError));
      }
    }

    void loadReceipts();
  }, [showError]);

  useEffect(() => {
    async function loadUsages() {
      try {
        setIsLoading(true);
        setError("");
        const response = await materialUsageService.list({
          date: filters.date || undefined,
          material: filters.material || undefined,
          page,
          receipt: filters.receipt || undefined,
          site: filters.site || undefined,
        });
        setRows(response.results);
        setTotalCount(response.count);
      } catch (loadError) {
        const message = getErrorMessage(loadError);
        setError(message);
        showError("Unable to load material usage", message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadUsages();
  }, [filters, page, showError]);

  useEffect(() => {
    setPage(1);
  }, [filters.date, filters.material, filters.receipt, filters.site]);

  const filteredReceiptOptions = useMemo(
    () =>
      receipts
        .filter((receipt) =>
          filters.site ? receipt.site === filters.site : true,
        )
        .filter((receipt) =>
          filters.material ? receipt.material === filters.material : true,
        )
        .map((receipt) => ({
          label: `${receipt.site_name} | ${receipt.material_name} | Receipt #${receipt.id}`,
          value: receipt.id,
        })),
    [filters.material, filters.site, receipts],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button
            onClick={() => {
              setFilters(initialFilters);
              setPage(1);
            }}
            type="button"
            variant="secondary"
          >
            Reset
          </Button>
        }
        description="Receipt-wise material consumption history across sites."
        search={
          <Input
            label="Search"
            placeholder="Search material usage"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />
        }
        title="Material Usage"
      />

      <ErrorMessage message={error || references.error} />

      <section className="grid gap-4 rounded-2xl border border-blue-100/90 bg-white/94 p-4 shadow-md shadow-blue-950/5 md:grid-cols-2 xl:grid-cols-4">
        <Select
          label="Site"
          options={references.sites.map((site) => ({
            label: site.name,
            value: site.id,
          }))}
          value={filters.site || ""}
          onChange={(event) =>
            setFilters((currentValue) => ({
              ...currentValue,
              receipt: 0,
              site: event.target.value ? Number(event.target.value) : 0,
            }))
          }
        />
        <Select
          label="Material"
          options={references.materials.map((material) => ({
            label: material.name,
            value: material.id,
          }))}
          value={filters.material || ""}
          onChange={(event) =>
            setFilters((currentValue) => ({
              ...currentValue,
              material: event.target.value ? Number(event.target.value) : 0,
              receipt: 0,
            }))
          }
        />
        <Select
          label="Receipt"
          options={filteredReceiptOptions}
          value={filters.receipt || ""}
          onChange={(event) =>
            setFilters((currentValue) => ({
              ...currentValue,
              receipt: event.target.value ? Number(event.target.value) : 0,
            }))
          }
        />
        <Input
          label="Usage Date"
          type="date"
          value={filters.date}
          onChange={(event) =>
            setFilters((currentValue) => ({
              ...currentValue,
              date: event.target.value,
            }))
          }
        />
      </section>

      <DataTable<MaterialUsage>
        columns={[
          {
            key: "date",
            header: "Usage Date",
            accessor: (row) => formatDate(row.date),
            sortValue: (row) => row.date,
          },
          {
            key: "site",
            header: "Site",
            accessor: (row) => row.site_name,
            sortValue: (row) => row.site_name,
          },
          {
            key: "material",
            header: "Material",
            accessor: (row) => row.material_name,
            sortValue: (row) => row.material_name,
          },
          {
            key: "variant",
            header: "Variant",
            accessor: (row) =>
              row.receipt_material_variant_label
                ? row.receipt_material_variant_size_mm
                  ? `${row.receipt_material_variant_label} (${row.receipt_material_variant_size_mm} mm)`
                  : row.receipt_material_variant_label
                : "-",
            sortValue: (row) => row.receipt_material_variant_label || "",
          },
          {
            key: "receipt",
            header: "Receipt",
            accessor: (row) => `Receipt #${row.receipt}`,
            sortValue: (row) => row.receipt,
          },
          {
            key: "receipt_date",
            header: "Receipt Date",
            accessor: (row) => formatDate(row.receipt_date),
            sortValue: (row) => row.receipt_date,
          },
          {
            key: "quantity",
            header: "Quantity Used",
            accessor: (row) => row.quantity,
            sortValue: (row) => row.quantity,
          },
          {
            key: "notes",
            header: "Notes",
            accessor: (row) => row.notes || "-",
            sortValue: (row) => row.notes || "",
          },
        ]}
        data={rows}
        emptyDescription="No material usage records found for the selected filters."
        emptyTitle="No Usage Records"
        isLoading={isLoading}
        keyExtractor={(row) => row.id}
        page={page}
        searchValue={searchValue}
        totalCount={totalCount}
        onPageChange={setPage}
        onSearchChange={setSearchValue}
      />
    </div>
  );
}
