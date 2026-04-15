import clsx from "clsx";

import { TruncatedText } from "../../components/ui/TruncatedText";

export interface LabourAttendanceRow {
  isPresent: boolean;
  key: string;
  labourId: number;
  labourName: string;
  siteId: number;
}

interface LabourAttendanceListProps {
  isLoading?: boolean;
  onSelectAllPresent: () => void;
  onToggle: (rowKey: string) => void;
  rows: LabourAttendanceRow[];
}

export function LabourAttendanceList({
  isLoading = false,
  onSelectAllPresent,
  onToggle,
  rows,
}: LabourAttendanceListProps) {
  const isAllSelected = rows.length > 0 && rows.every((row) => row.isPresent);

  if (isLoading) {
    return <div className="px-4 py-5 text-sm text-slate-500">Loading...</div>;
  }

  if (rows.length === 0) {
    return <div className="px-4 py-5 text-sm text-slate-500">No labour found.</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-[#E5E7EB] px-4 py-3">
        <input
          checked={isAllSelected}
          className="h-4 w-4 rounded border-blue-200 text-blue-600 focus:ring-blue-500"
          type="checkbox"
          onChange={onSelectAllPresent}
        />
        <span className="text-sm font-medium text-[#111111]">Select All</span>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        <div className="grid gap-2 p-4 md:hidden">
          {rows.map((row) => (
            <label
              className={clsx(
                "flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition",
                row.isPresent ? "border-emerald-200 bg-emerald-50/60" : "border-[#E5E7EB] bg-white",
              )}
              key={row.key}
            >
              <span className="min-w-0 truncate font-medium text-[#111111]">{row.labourName}</span>
              <input
                checked={row.isPresent}
                className="h-4 w-4 rounded border-blue-200 text-blue-600 focus:ring-blue-500"
                type="checkbox"
                onChange={() => onToggle(row.key)}
              />
            </label>
          ))}
        </div>

        <div className="hidden md:block">
          <table className="min-w-full table-fixed divide-y divide-[#E5E7EB]">
            <thead className="bg-[#F9FAFB]">
              <tr>
                <th className="px-4 py-3 text-left text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
                  Labour Name
                </th>
                <th className="px-4 py-3 text-center text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
                  Present
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {rows.map((row) => (
                <tr
                  className={clsx("transition", row.isPresent ? "bg-emerald-50/45" : "bg-white")}
                  key={row.key}
                >
                  <td className="px-4 py-3 text-sm font-medium text-[#111111]">
                    <TruncatedText value={row.labourName} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      checked={row.isPresent}
                      className="h-4 w-4 rounded border-blue-200 text-blue-600 focus:ring-blue-500"
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
