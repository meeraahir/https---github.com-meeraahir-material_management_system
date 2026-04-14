import clsx from "clsx";

import { Button } from "../../components/ui/Button";

export interface LabourAttendanceRow {
  attendanceId?: number;
  disabledReason?: string;
  isPresent: boolean;
  isSelectable: boolean;
  key: string;
  labourId: number | null;
  labourName: string;
  role?: string | null;
  siteId: number;
  siteName: string;
  type: "Casual" | "Regular";
}

interface LabourAttendanceListProps {
  isLoading?: boolean;
  onSelectAllPresent: () => void;
  onToggle: (rowKey: string) => void;
  rows: LabourAttendanceRow[];
  showSiteColumn: boolean;
}

export function LabourAttendanceList({
  isLoading = false,
  onSelectAllPresent,
  onToggle,
  rows,
  showSiteColumn,
}: LabourAttendanceListProps) {
  const selectableRows = rows.filter((row) => row.isSelectable);
  const presentCount = selectableRows.filter((row) => row.isPresent).length;

  if (isLoading) {
    return (
      <div className="px-4 py-5 text-sm text-slate-500">
        Loading attendance rows...
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="px-4 py-5 text-sm text-slate-500">
        No labour rows are available for the selected attendance scope.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {presentCount} of {selectableRows.length} eligible labour rows marked present
          </p>
          <p className="text-xs text-slate-500">
            Regular labour rows can be saved through the current attendance API.
          </p>
        </div>
        <Button
          disabled={selectableRows.length === 0}
          onClick={onSelectAllPresent}
          size="sm"
          type="button"
          variant="secondary"
        >
          Select All Present
        </Button>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        <div className="grid gap-3 p-4 md:hidden">
          {rows.map((row) => (
            <article
              className={clsx(
                "rounded-2xl border p-4 shadow-sm transition duration-200",
                row.isPresent
                  ? "border-emerald-200 bg-emerald-50/60"
                  : "border-[#E5E7EB] bg-white",
                row.isSelectable && "hover:border-[#D1D5DB] hover:shadow-md",
              )}
              key={row.key}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-semibold text-[#111111]">{row.labourName}</h4>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#6B7280]">
                    {row.type}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Present
                  <input
                    checked={row.isPresent}
                    className="h-4 w-4 rounded border-blue-200 text-blue-600 focus:ring-blue-500"
                    disabled={!row.isSelectable}
                    type="checkbox"
                    onChange={() => onToggle(row.key)}
                  />
                </label>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-[#4B5563]">
                {showSiteColumn ? (
                  <div className="flex items-center justify-between gap-4">
                    <span>Site</span>
                    <span className="font-medium text-[#111111]">{row.siteName}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-4">
                  <span>Role / Work Type</span>
                  <span className="font-medium text-[#111111]">{row.role || "-"}</span>
                </div>
                {!row.isSelectable && row.disabledReason ? (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {row.disabledReason}
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        <div className="hidden md:block">
          <table className="min-w-full divide-y divide-[#E5E7EB]">
            <thead className="bg-[#F9FAFB]">
              <tr>
                <th className="px-4 py-3 text-left text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">Labour Name</th>
                {showSiteColumn ? (
                  <th className="px-4 py-3 text-left text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">Site</th>
                ) : null}
                <th className="px-4 py-3 text-left text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">Type</th>
                <th className="px-4 py-3 text-left text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">Role / Work Type</th>
                <th className="px-4 py-3 text-center text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">Present</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {rows.map((row) => (
                <tr
                  className={clsx(
                    "transition duration-200",
                    row.isPresent ? "bg-emerald-50/45" : "bg-white",
                    row.isSelectable ? "hover:bg-[#FAFAFA]" : "opacity-90",
                  )}
                  key={row.key}
                >
                  <td className="px-4 py-3 text-sm font-semibold text-[#111111]">
                    <div className="space-y-1">
                      <div>{row.labourName}</div>
                      {!row.isSelectable && row.disabledReason ? (
                        <div className="text-xs font-normal text-amber-700">{row.disabledReason}</div>
                      ) : null}
                    </div>
                  </td>
                  {showSiteColumn ? (
                    <td className="px-4 py-3 text-sm text-[#374151]">{row.siteName}</td>
                  ) : null}
                  <td className="px-4 py-3 text-sm text-[#374151]">{row.type}</td>
                  <td className="px-4 py-3 text-sm text-[#374151]">{row.role || "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <input
                      checked={row.isPresent}
                      className="h-4 w-4 rounded border-blue-200 text-blue-600 focus:ring-blue-500"
                      disabled={!row.isSelectable}
                      type="checkbox"
                      onChange={() => onToggle(row.key)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
