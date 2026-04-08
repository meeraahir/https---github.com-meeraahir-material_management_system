import { Navigate, Outlet, useLocation } from "react-router-dom";

import { Loader } from "../components/ui/Loader";
import { useAuth } from "../hooks/useAuth";

export function ProtectedRoute() {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <Loader fullscreen label="Restoring your secure session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  return <Outlet />;
}
