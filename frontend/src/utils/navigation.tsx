import type { ReactNode } from "react";

import { icons } from "../assets/icons";

export interface NavigationItem {
  icon: ReactNode;
  label: string;
  to: string;
}

export interface NavigationGroup {
  icon: ReactNode;
  id: string;
  items: NavigationItem[];
  label: string;
}

export const navigationPrimaryItems: NavigationItem[] = [
  { icon: icons.dashboard({ className: "h-5 w-5" }), label: "Dashboard", to: "/dashboard" },
  { icon: icons.sites({ className: "h-5 w-5" }), label: "Sites", to: "/sites" },
];

export const navigationGroups: NavigationGroup[] = [
  {
    icon: icons.materials({ className: "h-5 w-5" }),
    id: "inventory",
    items: [
      { icon: icons.materials({ className: "h-4 w-4" }), label: "Materials", to: "/materials" },
      { icon: icons.receipts({ className: "h-4 w-4" }), label: "Material Receipts", to: "/material-receipts" },
    ],
    label: "Inventory",
  },
  {
    icon: icons.purchases({ className: "h-5 w-5" }),
    id: "procurement",
    items: [
      { icon: icons.vendors({ className: "h-4 w-4" }), label: "Vendors", to: "/vendors" },
      { icon: icons.purchases({ className: "h-4 w-4" }), label: "Vendor Purchases", to: "/vendor-purchases" },
    ],
    label: "Procurement",
  },
  {
    icon: icons.labour({ className: "h-5 w-5" }),
    id: "workforce",
    items: [
      { icon: icons.labour({ className: "h-4 w-4" }), label: "Labour", to: "/labour" },
      { icon: icons.attendance({ className: "h-4 w-4" }), label: "Attendance", to: "/attendance" },
    ],
    label: "Workforce",
  },
  {
    icon: icons.payments({ className: "h-5 w-5" }),
    id: "finance",
    items: [
      { icon: icons.payments({ className: "h-4 w-4" }), label: "Payments", to: "/payments" },
      { icon: icons.receivables({ className: "h-4 w-4" }), label: "Receivables", to: "/receivables" },
    ],
    label: "Finance",
  },
  {
    icon: icons.reports({ className: "h-5 w-5" }),
    id: "analytics",
    items: [
      { icon: icons.parties({ className: "h-4 w-4" }), label: "Parties", to: "/parties" },
      { icon: icons.reports({ className: "h-4 w-4" }), label: "Reports", to: "/reports" },
    ],
    label: "Analytics",
  },
];

export const navigationItems: NavigationItem[] = [
  ...navigationPrimaryItems,
  { icon: icons.materials({ className: "h-5 w-5" }), label: "Materials", to: "/materials" },
  { icon: icons.vendors({ className: "h-5 w-5" }), label: "Vendors", to: "/vendors" },
  { icon: icons.labour({ className: "h-5 w-5" }), label: "Labour", to: "/labour" },
  { icon: icons.parties({ className: "h-5 w-5" }), label: "Parties", to: "/parties" },
  { icon: icons.receipts({ className: "h-5 w-5" }), label: "Material Receipts", to: "/material-receipts" },
  { icon: icons.purchases({ className: "h-5 w-5" }), label: "Vendor Purchases", to: "/vendor-purchases" },
  { icon: icons.attendance({ className: "h-5 w-5" }), label: "Attendance", to: "/attendance" },
  { icon: icons.payments({ className: "h-5 w-5" }), label: "Payments", to: "/payments" },
  { icon: icons.receivables({ className: "h-5 w-5" }), label: "Receivables", to: "/receivables" },
  { icon: icons.reports({ className: "h-5 w-5" }), label: "Reports", to: "/reports" },
];

export const routeLabelMap = new Map(
  navigationItems.map((item) => [item.to.replace("/", ""), item.label]),
);
