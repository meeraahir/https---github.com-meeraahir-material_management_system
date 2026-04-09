import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency, formatNumber } from "../../utils/format";

const palette = ["#2563eb", "#0f766e", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];

function getNumericValue(
  value: number | string | ReadonlyArray<number | string> | undefined,
) {
  if (Array.isArray(value)) {
    return Number(value[0] ?? 0);
  }

  return Number(value ?? 0);
}

function truncateLabel(value: string, maxLength = 12) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

function renderTickWithTooltip(props: {
  payload?: { value?: string | number };
  x?: number | string;
  y?: number | string;
}) {
  const { payload, x = 0, y = 0 } = props;
  const rawValue = String(payload?.value ?? "");
  const displayValue = truncateLabel(rawValue);

  return (
    <g transform={`translate(${x},${y})`}>
      <title>{rawValue}</title>
      <text
        dy={16}
        fill="currentColor"
        textAnchor="middle"
        className="fill-slate-500 text-[11px] dark:fill-slate-400"
      >
        {displayValue}
      </text>
    </g>
  );
}

function renderLegendLabel(value: string) {
  const displayValue = truncateLabel(value, 18);

  return <span title={value}>{displayValue}</span>;
}

interface MaterialUsageDatum {
  material: string;
  used: number;
}

interface CostTrackingDatum {
  label: string;
  cost: number;
}

interface SiteDistributionDatum {
  site: string;
  value: number;
}

interface StockComparisonDatum {
  name: string;
  value: number;
}

export function MaterialUsageBarChart({
  data,
}: {
  data: MaterialUsageDatum[];
}) {
  return (
    <ResponsiveContainer height="100%" width="100%">
      <BarChart data={data} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
        <CartesianGrid stroke="#cbd5e1" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="material" tick={renderTickWithTooltip} tickLine={false} axisLine={false} interval={0} height={48} />
        <YAxis tickFormatter={(value) => formatNumber(value)} tickLine={false} axisLine={false} />
        <Tooltip formatter={(value) => formatNumber(getNumericValue(value))} />
        <Legend formatter={renderLegendLabel} />
        <Bar dataKey="used" fill="#2563eb" name="Used Quantity" radius={[12, 12, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CostTrackingLineChart({
  data,
}: {
  data: CostTrackingDatum[];
}) {
  return (
    <ResponsiveContainer height="100%" width="100%">
      <LineChart data={data} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
        <CartesianGrid stroke="#cbd5e1" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={renderTickWithTooltip} tickLine={false} axisLine={false} interval={0} height={48} />
        <YAxis tickFormatter={(value) => formatCurrency(value)} tickLine={false} axisLine={false} />
        <Tooltip formatter={(value) => formatCurrency(getNumericValue(value))} />
        <Legend formatter={renderLegendLabel} />
        <Line
          dataKey="cost"
          dot={{ fill: "#0f766e", r: 4 }}
          name="Cost"
          stroke="#0f766e"
          strokeWidth={3}
          type="monotone"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SiteDistributionPieChart({
  data,
}: {
  data: SiteDistributionDatum[];
}) {
  return (
    <ResponsiveContainer height="100%" width="100%">
      <PieChart>
        <Tooltip formatter={(value, _name, item) => [formatNumber(getNumericValue(value)), item.payload.site]} />
        <Legend formatter={renderLegendLabel} />
        <Pie
          cx="50%"
          cy="50%"
          data={data}
          dataKey="value"
          innerRadius={60}
          label={({ name, percent }) =>
            `${truncateLabel(String(name ?? ""), 10)} ${(((percent ?? 0) as number) * 100).toFixed(0)}%`
          }
          nameKey="site"
          outerRadius={96}
          paddingAngle={3}
        >
          {data.map((entry, index) => (
            <Cell fill={palette[index % palette.length]} key={`${entry.site}-${index}`} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

export function StockComparisonChart({
  data,
}: {
  data: StockComparisonDatum[];
}) {
  return (
    <ResponsiveContainer height="100%" width="100%">
      <PieChart>
        <Tooltip formatter={(value, name) => [formatNumber(getNumericValue(value)), String(name)]} />
        <Legend formatter={renderLegendLabel} />
        <Pie
          cx="50%"
          cy="50%"
          data={data}
          dataKey="value"
          innerRadius={70}
          label={({ name, value }) => `${name}: ${formatNumber(value)}`}
          nameKey="name"
          outerRadius={104}
          paddingAngle={4}
        >
          {data.map((entry, index) => (
            <Cell fill={palette[index % palette.length]} key={`${entry.name}-${index}`} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

export function LabourLedgerChart({
  data,
}: {
  data: Array<{ credit: number; date: string; debit: number; balance: number }>;
}) {
  return (
    <ResponsiveContainer height="100%" width="100%">
      <BarChart data={data} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
        <CartesianGrid stroke="#cbd5e1" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tick={renderTickWithTooltip} tickLine={false} axisLine={false} interval={0} height={48} />
        <YAxis tickFormatter={(value) => formatCurrency(value)} tickLine={false} axisLine={false} />
        <Tooltip formatter={(value) => formatCurrency(getNumericValue(value))} />
        <Legend formatter={renderLegendLabel} />
        <Bar dataKey="debit" fill="#d97706" name="Wage Debit" radius={[10, 10, 0, 0]} />
        <Bar dataKey="credit" fill="#2563eb" name="Payment Credit" radius={[10, 10, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
