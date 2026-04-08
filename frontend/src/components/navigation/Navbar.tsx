import { useState } from "react";

import { icons } from "../../assets/icons";
import type { AuthUser } from "../../types/auth.types";
import { Breadcrumb } from "./Breadcrumb";

interface NavbarProps {
  onLogout: () => void;
  onMenuClick: () => void;
  user: AuthUser | null;
}

export function Navbar({ onLogout, onMenuClick, user }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100 lg:hidden"
            onClick={onMenuClick}
            type="button"
          >
            {icons.menu({ className: "h-5 w-5" })}
          </button>
          <div className="space-y-2">
            <Breadcrumb />
          </div>
        </div>

        <div className="relative">
          <button
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-left shadow-sm transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"
            onClick={() => setMenuOpen((currentValue) => !currentValue)}
            type="button"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
              {(user?.username?.slice(0, 1) || "U").toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {user?.username ?? "User"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {user?.email ?? "Signed in"}
              </p>
            </div>
          </button>

          {menuOpen ? (
            <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-950">
              <div className="rounded-xl px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                Profile dropdown
              </div>
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={onLogout}
                type="button"
              >
                {icons.logout({ className: "h-4 w-4" })}
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
