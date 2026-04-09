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
const VendorsPage = lazy(() =>
  import("../pages/vendors/VendorsPage").then((module) => ({ default: module.VendorsPage })),
);
const LabourPage = lazy(() =>
  import("../pages/labour/LabourPage").then((module) => ({ default: module.LabourPage })),
);
const PartiesPage = lazy(() =>
  import("../pages/parties/PartiesPage").then((module) => ({ default: module.PartiesPage })),
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
            <Route path="/materials" element={<MaterialsPage />} />
            <Route path="/vendors" element={<VendorsPage />} />
            <Route path="/labour" element={<LabourPage />} />
            <Route path="/parties" element={<PartiesPage />} />
            <Route path="/material-receipts" element={<MaterialReceiptsPage />} />
            <Route path="/vendor-purchases" element={<VendorPurchasesPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/receivables" element={<ReceivablesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
        </Route>

        <Route path="/" element={<HomeRedirect />} />
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </Suspense>
  );
}
