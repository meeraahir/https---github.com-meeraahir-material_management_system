import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { Loader } from "../components/common/Loader";
import { useAuth } from "../hooks/useAuth";
import { AuthLayout } from "../layouts/AuthLayout";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { PublicRoute } from "./PublicRoute";

const LoginPage = lazy(() =>
  import("../pages/auth/Login").then((module) => ({ default: module.LoginPage })),
);
const RegisterPage = lazy(() =>
  import("../pages/auth/Register").then((module) => ({ default: module.RegisterPage })),
);
const DashboardPage = lazy(() =>
  import("../pages/dashboard/Dashboard").then((module) => ({
    default: module.DashboardPage,
  })),
);
const SitesPage = lazy(() =>
  import("../pages/sites/SitesPage").then((module) => ({ default: module.SitesPage })),
);
const MaterialsPage = lazy(() =>
  import("../pages/materials/MaterialsPage").then((module) => ({
    default: module.MaterialsPage,
  })),
);
const MaterialUsagePage = lazy(() =>
  import("../pages/materialUsage/MaterialUsagePage").then((module) => ({
    default: module.MaterialUsagePage,
  })),
);
const VendorsPage = lazy(() =>
  import("../pages/vendors/VendorsPage").then((module) => ({ default: module.VendorsPage })),
);
const VendorLedgerPage = lazy(() =>
  import("../pages/vendorLedger/VendorLedgerPage").then((module) => ({
    default: module.VendorLedgerPage,
  })),
);
const LabourPage = lazy(() =>
  import("../pages/labour/LabourPage").then((module) => ({ default: module.LabourPage })),
);
const LabourLedgerPage = lazy(() =>
  import("../pages/labourLedger/LabourLedgerPage").then((module) => ({
    default: module.LabourLedgerPage,
  })),
);
const LabourAttendanceReportPage = lazy(() =>
  import("../pages/labourAttendanceReport/LabourAttendanceReportPage").then(
    (module) => ({
      default: module.LabourAttendanceReportPage,
    }),
  ),
);
const PartiesPage = lazy(() =>
  import("../pages/parties/PartiesPage").then((module) => ({ default: module.PartiesPage })),
);
const PartyLedgerPage = lazy(() =>
  import("../pages/partyLedger/PartyLedgerPage").then((module) => ({
    default: module.PartyLedgerPage,
  })),
);
const MaterialReceiptsPage = lazy(() =>
  import("../pages/materialReceipts/MaterialReceiptsPage").then((module) => ({
    default: module.MaterialReceiptsPage,
  })),
);
const VendorPurchasesPage = lazy(() =>
  import("../pages/vendorPurchases/VendorPurchasesPage").then((module) => ({
    default: module.VendorPurchasesPage,
  })),
);
const VendorPaymentsPage = lazy(() =>
  import("../pages/vendorPayments/VendorPaymentsPage").then((module) => ({
    default: module.VendorPaymentsPage,
  })),
);
const VendorPendingReportPage = lazy(() =>
  import("../pages/vendorPending/VendorPendingReportPage").then((module) => ({
    default: module.VendorPendingReportPage,
  })),
);
const AttendancePage = lazy(() =>
  import("../pages/attendance/AttendancePage").then((module) => ({
    default: module.AttendancePage,
  })),
);
const PaymentsPage = lazy(() =>
  import("../pages/payments/PaymentsPage").then((module) => ({
    default: module.PaymentsPage,
  })),
);
const ReceivablesPage = lazy(() =>
  import("../pages/receivables/ReceivablesPage").then((module) => ({
    default: module.ReceivablesPage,
  })),
);
const ReceivablesSiteReportPage = lazy(() =>
  import("../pages/receivablesSiteReport/ReceivablesSiteReportPage").then(
    (module) => ({
      default: module.ReceivablesSiteReportPage,
    }),
  ),
);
const SiteDashboardPage = lazy(() =>
  import("../pages/siteDashboard/SiteDashboardPage").then((module) => ({
    default: module.SiteDashboardPage,
  })),
);
const ReportsPage = lazy(() =>
  import("../pages/reports/ReportsPage").then((module) => ({ default: module.ReportsPage })),
);

function HomeRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate replace to={isAuthenticated ? "/dashboard" : "/login"} />;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<Loader fullscreen label="Loading page..." />}>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/sites" element={<SitesPage />} />
            <Route path="/sites/:siteId/dashboard" element={<SiteDashboardPage />} />
            <Route path="/materials" element={<MaterialsPage />} />
            <Route path="/material-usage" element={<MaterialUsagePage />} />
            <Route path="/vendors" element={<VendorsPage />} />
            <Route path="/vendor-ledger" element={<VendorLedgerPage />} />
            <Route path="/vendor-dues" element={<VendorPendingReportPage />} />
            <Route path="/labour" element={<LabourPage />} />
            <Route path="/labour-ledger" element={<LabourLedgerPage />} />
            <Route path="/monthly-attendance" element={<LabourAttendanceReportPage />} />
            <Route path="/parties" element={<PartiesPage />} />
            <Route path="/party-ledger" element={<PartyLedgerPage />} />
            <Route path="/material-receipts" element={<MaterialReceiptsPage />} />
            <Route path="/vendor-purchases" element={<VendorPurchasesPage />} />
            <Route path="/vendor-payments" element={<VendorPaymentsPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/receivables" element={<ReceivablesPage />} />
            <Route path="/site-receivables" element={<ReceivablesSiteReportPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
        </Route>

        <Route path="/" element={<HomeRedirect />} />
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </Suspense>
  );
}
