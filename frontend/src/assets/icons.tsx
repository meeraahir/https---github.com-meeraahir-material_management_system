import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function iconPath(path: string, props?: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
      {...props}
    >
      <path d={path} />
    </svg>
  );
}

export const icons = {
  dashboard: (props?: IconProps) =>
    iconPath("M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-10h8V3h-8z", props),
  sites: (props?: IconProps) =>
    iconPath("M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6", props),
  materials: (props?: IconProps) =>
    iconPath("M4 7l8-4 8 4-8 4-8-4zm0 0v10l8 4 8-4V7", props),
  vendors: (props?: IconProps) =>
    iconPath("M3 21h18M7 21V8h10v13M9 11h.01M15 11h.01M9 15h.01M15 15h.01", props),
  labour: (props?: IconProps) =>
    iconPath("M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m14-10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm6 10v-2a4 4 0 0 0-3-3.87", props),
  parties: (props?: IconProps) =>
    iconPath("M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m12-10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm11 10v-2a4 4 0 0 0-4-4h-2", props),
  receipts: (props?: IconProps) =>
    iconPath("M6 3h12v18l-3-2-3 2-3-2-3 2V3zm3 5h6m-6 4h6m-6 4h4", props),
  purchases: (props?: IconProps) =>
    iconPath("M6 6h15l-1.5 9h-11zM6 6 4 3H1m8 18a1 1 0 1 0 0 .01M18 24a1 1 0 1 0 0 .01", props),
  attendance: (props?: IconProps) =>
    iconPath("M8 2v4M16 2v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12H3V7a2 2 0 0 1 2-2Zm4 9 2 2 4-4", props),
  payments: (props?: IconProps) =>
    iconPath("M3 7h18v10H3zm5 5h8M12 9v6", props),
  receivables: (props?: IconProps) =>
    iconPath("M12 1v22M17 5H9a3 3 0 0 0 0 6h6a3 3 0 1 1 0 6H6", props),
  reports: (props?: IconProps) =>
    iconPath("M6 3h9l5 5v13H6zM14 3v5h5M9 13h6M9 17h6M9 9h2", props),
  plus: (props?: IconProps) => iconPath("M12 5v14M5 12h14", props),
  pencil: (props?: IconProps) =>
    iconPath("M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z", props),
  trash: (props?: IconProps) =>
    iconPath("M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14", props),
  menu: (props?: IconProps) => iconPath("M4 7h16M4 12h16M4 17h16", props),
  chevronLeft: (props?: IconProps) => iconPath("m15 18-6-6 6-6", props),
  chevronRight: (props?: IconProps) => iconPath("m9 18 6-6-6-6", props),
  logout: (props?: IconProps) =>
    iconPath("M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9", props),
  search: (props?: IconProps) =>
    iconPath("m21 21-4.35-4.35M17 10.5A6.5 6.5 0 1 1 4 10.5a6.5 6.5 0 0 1 13 0Z", props),
};
