import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { AttendancePage } from "../pages/attendance/AttendancePage";
import { AuthLayout } from "../layouts/AuthLayout";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { LoginPage } from "../pages/auth/Login";
import { RegisterPage } from "../pages/auth/Register";
import { DashboardPage } from "../pages/dashboard/Dashboard";
import { LabourPage } from "../pages/labour/LabourPage";
import { MaterialsPage } from "../pages/materials/MaterialsPage";
import { MaterialReceiptsPage } from "../pages/materialReceipts/MaterialReceiptsPage";
import { PartiesPage } from "../pages/parties/PartiesPage";
import { PaymentsPage } from "../pages/payments/PaymentsPage";
import { ReceivablesPage } from "../pages/receivables/ReceivablesPage";
import { ReportsPage } from "../pages/reports/ReportsPage";
import { SitesPage } from "../pages/sites/SitesPage";
import { VendorsPage } from "../pages/vendors/VendorsPage";
import { VendorPurchasesPage } from "../pages/vendorPurchases/VendorPurchasesPage";
import { ProtectedRoute } from "./ProtectedRoute";
import { PublicRoute } from "./PublicRoute";

function HomeRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate replace to={isAuthenticated ? "/dashboard" : "/login"} />;
}

export function AppRoutes() {
  return (
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
  );
}
