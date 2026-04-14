import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { ErrorMessage } from "../../components/common/ErrorMessage";
import { useToast } from "../../components/feedback/useToast";
import { DataTable } from "../../components/table/DataTable";
import { partiesService } from "../../services/partiesService";
import { receivablesService } from "../../services/receivablesService";
import { reportsService } from "../../services/reportsService";
import { siteDashboardService } from "../../services/sitesService";
import type {
  Party,
  PartyLedgerEntry,
  Receivable,
  SiteDashboardFinanceSummary,
} from "../../types/erp.types";
import { getErrorMessage } from "../../utils/apiError";
import { formatCurrency, formatDate, formatNumber } from "../../utils/format";
import {
  DetailEmptyState,
  DetailInfoGrid,
  DetailMetricCard,
  DetailMetricGrid,
  DetailSection,
  SiteDashboardDetailHeader,
} from "./SiteDashboardDetailShared";

interface CollectionRow {
  amount: number;
  date: string;
  id: string;
  receiptId: number | null;
  reference: string;
}

export function SitePartyDetailPage() {
  const { partyId, siteId } = useParams();
  const { showError } = useToast();
  const parsedPartyId = Number(partyId);
  const parsedSiteId = Number(siteId);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [siteName, setSiteName] = useState("");
  const [party, setParty] = useState<Party | null>(null);
  const [summary, setSummary] = useState<SiteDashboardFinanceSummary | null>(null);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<PartyLedgerEntry[]>([]);
  const [receivablePage, setReceivablePage] = useState(1);
  const [collectionPage, setCollectionPage] = useState(1);
  const [ledgerPage, setLedgerPage] = useState(1);

  useEffect(() => {
    async function loadDetails() {
      if (!parsedPartyId || !parsedSiteId) {
        setError("Invalid party detail requested.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError("");
        const [dashboard, parties, allReceivables, ledger] = await Promise.all([
          siteDashboardService.getDashboard(parsedSiteId),
          partiesService.getOptions(),
          receivablesService.getOptions(),
          reportsService.getPartyLedger(parsedPartyId),
        ]);

        setSiteName(dashboard.site.name);
        setParty(parties.find((entry) => entry.id === parsedPartyId) ?? null);
        setSummary(
          dashboard.finance_summary.find((entry) => entry.party__id === parsedPartyId) ?? null,
        );
        setReceivables(
          allReceivables
            .filter((entry) => entry.party === parsedPartyId && entry.site === parsedSiteId)
            .sort((left, right) => right.date.localeCompare(left.date)),
        );
        setLedgerEntries(
          [...ledger.transactions].sort((left, right) => right.date.localeCompare(left.date)),
        );
        setReceivablePage(1);
        setCollectionPage(1);
        setLedgerPage(1);
      } catch (loadError) {
        const message = getErrorMessage(loadError);
        setError(message);
        showError("Unable to load party detail", message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadDetails();
  }, [parsedPartyId, parsedSiteId, showError]);

  const collections = useMemo<CollectionRow[]>(
    () =>
      receivables
        .filter((entry) => (entry.current_received_amount ?? 0) > 0)
        .map((entry) => ({
          amount: entry.current_received_amount ?? 0,
          date: entry.date,
          id: `collection-${entry.id}`,
          receiptId: entry.receipt_id ?? null,
          reference: `Receivable #${entry.id}`,
        })),
    [receivables],
  );

  const totalReceivable =
    summary?.total_amount ?? receivables.reduce((total, entry) => total + entry.amount, 0);
  const totalReceived =
    summary?.received_amount ?? collections.reduce((total, entry) => total + entry.amount, 0);
  const pendingAmount =
    summary?.pending_amount ??
    receivables.reduce((total, entry) => total + (entry.pending_amount ?? entry.amount), 0);

  if (!parsedPartyId || !parsedSiteId) {
    return <DetailEmptyState message="Invalid party detail requested." />;
  }

  return (
    <div className="space-y-6">
      <SiteDashboardDetailHeader
        description="Review party profile, site receivables, collections, and overall finance ledger activity."
        siteId={parsedSiteId}
        siteName={siteName || `Site ${parsedSiteId}`}
        title={party?.name || summary?.party__name || "Party Detail"}
      />

      <ErrorMessage message={error} />

      {!party && !summary && !isLoading ? (
        <DetailEmptyState message="Party detail was not found for this site." />
      ) : (
        <>
          <DetailMetricGrid>
            <DetailMetricCard accentClassName="border-blue-100 bg-white" label="Total Receivable" value={formatCurrency(totalReceivable)} />
            <DetailMetricCard accentClassName="border-emerald-200 bg-emerald-50/70" label="Received Amount" value={formatCurrency(totalReceived)} />
            <DetailMetricCard accentClassName="border-amber-200 bg-amber-50/70" label="Pending Amount" value={formatCurrency(pendingAmount)} />
            <DetailMetricCard accentClassName="border-cyan-200 bg-cyan-50/70" label="Receivable Entries" value={formatNumber(receivables.length)} />
          </DetailMetricGrid>

          <DetailSection description="Basic party information available from the current frontend flow." title="Overview">
            <DetailInfoGrid
              items={[
                { label: "Party Name", value: party?.name || summary?.party__name || "-" },
                { label: "Contact", value: party?.contact || "-" },
                { label: "Site", value: siteName || `Site ${parsedSiteId}` },
                { label: "Collections Count", value: formatNumber(collections.length) },
              ]}
            />
          </DetailSection>

          <DetailSection description="Receivable transactions recorded for this party within the selected site." title="Receivables">
            <DataTable
              clientPagination
              columns={[
                { key: "date", header: "Date", accessor: (row) => formatDate(row.date), sortValue: (row) => row.date },
                { key: "amount", header: "Receivable Amount", accessor: (row) => row.amount, sortValue: (row) => row.amount },
                { key: "received", header: "Received", accessor: (row) => row.current_received_amount ?? 0, sortValue: (row) => row.current_received_amount ?? 0 },
                { key: "pending", header: "Pending", accessor: (row) => row.pending_amount ?? row.amount, sortValue: (row) => row.pending_amount ?? row.amount },
                {
                  key: "status",
                  header: "Status",
                  accessor: (row) =>
                    (row.pending_amount ?? row.amount) <= 0
                      ? "Received"
                      : (row.current_received_amount ?? 0) > 0
                        ? "Partial"
                        : "Pending",
                  sortValue: (row) => row.pending_amount ?? row.amount,
                },
              ]}
              data={receivables}
              emptyDescription="No receivable records are available for this party on this site."
              emptyTitle="No Receivables"
              isLoading={isLoading}
              keyExtractor={(row) => row.id}
              page={receivablePage}
              searchValue=""
              totalCount={receivables.length}
              onPageChange={setReceivablePage}
              onSearchChange={() => undefined}
            />
          </DetailSection>

          <DetailSection description="Collection entries inferred from the receivable data already available in the project." title="Collections">
            <DataTable
              clientPagination
              columns={[
                { key: "date", header: "Date", accessor: (row) => formatDate(row.date), sortValue: (row) => row.date },
                { key: "reference", header: "Receivable Ref", accessor: (row) => row.reference, sortValue: (row) => row.reference },
                { key: "amount", header: "Received Amount", accessor: (row) => row.amount, sortValue: (row) => row.amount },
                { key: "receipt", header: "Receipt ID", accessor: (row) => row.receiptId || "-", sortValue: (row) => row.receiptId || -1 },
              ]}
              data={collections}
              emptyDescription="No collection activity is available for this party on this site."
              emptyTitle="No Collections"
              isLoading={isLoading}
              keyExtractor={(row) => row.id}
              page={collectionPage}
              searchValue=""
              totalCount={collections.length}
              onPageChange={setCollectionPage}
              onSearchChange={() => undefined}
            />
          </DetailSection>

          <DetailSection description="Ledger/activity view from the existing party ledger endpoint." title="Ledger">
            <DataTable
              clientPagination
              columns={[
                { key: "date", header: "Date", accessor: (row) => formatDate(row.date), sortValue: (row) => row.date },
                { key: "entry_type", header: "Activity", accessor: (row) => row.entry_type, sortValue: (row) => row.entry_type },
                { key: "site", header: "Site", accessor: (row) => row.site, sortValue: (row) => row.site },
                { key: "debit", header: "Receivable", accessor: (row) => row.debit, sortValue: (row) => row.debit },
                { key: "credit", header: "Received", accessor: (row) => row.credit, sortValue: (row) => row.credit },
                { key: "balance", header: "Pending", accessor: (row) => row.balance, sortValue: (row) => row.balance },
              ]}
              data={ledgerEntries}
              emptyDescription="No ledger entries are available for this party."
              emptyTitle="No Ledger Entries"
              isLoading={isLoading}
              keyExtractor={(row) => row.id}
              page={ledgerPage}
              searchValue=""
              totalCount={ledgerEntries.length}
              onPageChange={setLedgerPage}
              onSearchChange={() => undefined}
            />
          </DetailSection>
        </>
      )}
    </div>
  );
}
