import { useState } from "react";
import { Outlet } from "react-router-dom";

import { Navbar } from "../components/navigation/Navbar";
import { Sidebar } from "../components/navigation/Sidebar";
import { useAuth } from "../hooks/useAuth";

export function DashboardLayout() {
  const { logout, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100">
      <div className="flex min-h-screen">
        <Sidebar
          collapsed={sidebarCollapsed}
          onClose={() => setSidebarOpen(false)}
          onToggleCollapse={() =>
            setSidebarCollapsed((currentValue) => !currentValue)
          }
          open={sidebarOpen}
        />
        <div className="flex flex-1 flex-col">
          <Navbar
            onLogout={logout}
            onMenuClick={() => setSidebarOpen(true)}
            user={user}
          />
          <main className="flex-1 px-5 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
