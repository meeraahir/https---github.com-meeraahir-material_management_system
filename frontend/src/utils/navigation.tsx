import type { ReactNode } from "react";

import { icons } from "../assets/icons";

export interface NavigationItem {
  icon: ReactNode;
  label: string;
  to: string;
}

export interface NavigationGroup {
  description: string;
  icon: ReactNode;
  id: string;
  items: NavigationItem[];
  label: string;
  theme: "amber" | "emerald" | "rose" | "sky" | "slate";
}

export const navigationPrimaryItems: NavigationItem[] = [
  { icon: icons.dashboard({ className: "h-5 w-5" }), label: "Dashboard", to: "/dashboard" },
  { icon: icons.dashboard({ className: "h-5 w-5" }), label: "Owner Dashboard", to: "/owner-dashboard" },
  { icon: icons.sites({ className: "h-5 w-5" }), label: "Sites", to: "/sites" },
];

export const navigationGroups: NavigationGroup[] = [
  {
    description: "Stock masters and receipts",
    icon: icons.materials({ className: "h-5 w-5" }),
    id: "inventory",
    items: [
      { icon: icons.materials({ className: "h-4 w-4" }), label: "Materials", to: "/materials" },
      { icon: icons.receipts({ className: "h-4 w-4" }), label: "Material Receipts", to: "/material-receipts" },
      { icon: icons.reports({ className: "h-4 w-4" }), label: "Material Usage", to: "/material-usage" },
    ],
    label: "Inventory",
    theme: "amber",
  },
  {
    description: "Suppliers and purchase flow",
    icon: icons.purchases({ className: "h-5 w-5" }),
    id: "procurement",
    items: [
      { icon: icons.vendors({ className: "h-4 w-4" }), label: "Vendors", to: "/vendors" },
      { icon: icons.purchases({ className: "h-4 w-4" }), label: "Vendor Purchases", to: "/vendor-purchases" },
      { icon: icons.payments({ className: "h-4 w-4" }), label: "Vendor Payments", to: "/vendor-payments" },
      { icon: icons.reports({ className: "h-4 w-4" }), label: "Vendor Ledger", to: "/vendor-ledger" },
      { icon: icons.reports({ className: "h-4 w-4" }), label: "Vendor Dues", to: "/vendor-dues" },
    ],
    label: "Procurement",
    theme: "sky",
  },
  {
    description: "Labour records and attendance",
    icon: icons.labour({ className: "h-5 w-5" }),
    id: "workforce",
    items: [
      { icon: icons.labour({ className: "h-4 w-4" }), label: "Labour", to: "/labour" },
      { icon: icons.labour({ className: "h-4 w-4" }), label: "Casual Labour", to: "/casual-labour" },
      { icon: icons.attendance({ className: "h-4 w-4" }), label: "Attendance", to: "/attendance" },
      { icon: icons.payments({ className: "h-4 w-4" }), label: "Labour Payments", to: "/payments" },
      { icon: icons.attendance({ className: "h-4 w-4" }), label: "Monthly Attendance", to: "/monthly-attendance" },
    ],
    label: "Workforce",
    theme: "emerald",
  },
  {
    description: "Payments and receivables",
    icon: icons.payments({ className: "h-5 w-5" }),
    id: "finance",
    items: [
      { icon: icons.parties({ className: "h-4 w-4" }), label: "Parties", to: "/parties" },
      { icon: icons.receivables({ className: "h-4 w-4" }), label: "Receivables", to: "/receivables" },
      { icon: icons.reports({ className: "h-4 w-4" }), label: "Party Ledger", to: "/party-ledger" },
      { icon: icons.reports({ className: "h-4 w-4" }), label: "Site Receivables", to: "/site-receivables" },
    ],
    label: "Finance",
    theme: "rose",
  },
  {
    description: "Parties and reporting",
    icon: icons.reports({ className: "h-5 w-5" }),
    id: "analytics",
    items: [
      { icon: icons.reports({ className: "h-4 w-4" }), label: "Reports", to: "/reports" },
    ],
    label: "Analytics",
    theme: "slate",
  },
];

export const navigationItems: NavigationItem[] = [
  ...navigationPrimaryItems,
  { icon: icons.materials({ className: "h-5 w-5" }), label: "Materials", to: "/materials" },
  { icon: icons.materials({ className: "h-5 w-5" }), label: "Material Variants", to: "/material-variants" },
  { icon: icons.reports({ className: "h-5 w-5" }), label: "Variant Prices", to: "/material-variant-prices" },
  { icon: icons.vendors({ className: "h-5 w-5" }), label: "Vendors", to: "/vendors" },
  { icon: icons.reports({ className: "h-5 w-5" }), label: "Vendor Ledger", to: "/vendor-ledger" },
  { icon: icons.labour({ className: "h-5 w-5" }), label: "Labour", to: "/labour" },
  { icon: icons.labour({ className: "h-5 w-5" }), label: "Casual Labour", to: "/casual-labour" },
  { icon: icons.parties({ className: "h-5 w-5" }), label: "Parties", to: "/parties" },
  { icon: icons.reports({ className: "h-5 w-5" }), label: "Party Ledger", to: "/party-ledger" },
  { icon: icons.receipts({ className: "h-5 w-5" }), label: "Material Receipts", to: "/material-receipts" },
  { icon: icons.reports({ className: "h-5 w-5" }), label: "Material Usage", to: "/material-usage" },
  { icon: icons.purchases({ className: "h-5 w-5" }), label: "Vendor Purchases", to: "/vendor-purchases" },
  { icon: icons.payments({ className: "h-5 w-5" }), label: "Vendor Payments", to: "/vendor-payments" },
  { icon: icons.reports({ className: "h-5 w-5" }), label: "Vendor Dues", to: "/vendor-dues" },
  { icon: icons.attendance({ className: "h-5 w-5" }), label: "Attendance", to: "/attendance" },
  { icon: icons.attendance({ className: "h-5 w-5" }), label: "Monthly Attendance", to: "/monthly-attendance" },
  { icon: icons.payments({ className: "h-5 w-5" }), label: "Labour Payments", to: "/payments" },
  { icon: icons.payments({ className: "h-5 w-5" }), label: "Misc Expenses", to: "/miscellaneous-expenses" },
  { icon: icons.receivables({ className: "h-5 w-5" }), label: "Receivables", to: "/receivables" },
  { icon: icons.reports({ className: "h-5 w-5" }), label: "Site Receivables", to: "/site-receivables" },
  { icon: icons.reports({ className: "h-5 w-5" }), label: "Reports", to: "/reports" },
];

export const routeLabelMap = new Map(
  navigationItems.map((item) => [item.to.replace("/", ""), item.label]),
);
