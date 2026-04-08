import { Navigate, Outlet } from "react-router-dom";

import { Loader } from "../components/ui/Loader";
import { useAuth } from "../hooks/useAuth";

export function PublicRoute() {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return <Loader fullscreen label="Preparing sign in..." />;
  }

  if (isAuthenticated) {
    return <Navigate replace to="/dashboard" />;
  }

  return <Outlet />;
}
