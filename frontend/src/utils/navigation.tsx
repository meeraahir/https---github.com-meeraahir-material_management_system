import type { ReactNode } from "react";

import { icons } from "../assets/icons";

export interface NavigationItem {
  icon: ReactNode;
  label: string;
  to: string;
}

export const navigationItems: NavigationItem[] = [
  { icon: icons.dashboard({ className: "h-5 w-5" }), label: "Dashboard", to: "/dashboard" },
  { icon: icons.sites({ className: "h-5 w-5" }), label: "Sites", to: "/sites" },
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
