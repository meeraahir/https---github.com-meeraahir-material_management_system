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
    <header className="app-topbar sticky top-0 z-20 border-b border-[#8fb0bd]/70 bg-[#c5d8df]/88 px-5 py-3 shadow-sm shadow-teal-950/10 backdrop-blur-xl dark:border-[#8fb0bd]/70 dark:bg-[#c5d8df]/88">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            className="rounded-xl p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 lg:hidden"
            onClick={onMenuClick}
            type="button"
          >
            {icons.menu({ className: "h-5 w-5" })}
          </button>
          <Breadcrumb />
        </div>

        <div className="relative">
          <button
            className="app-user-menu flex items-center gap-3 rounded-2xl border border-[#8fb0bd]/60 bg-[#d4e2e7]/85 px-3 py-2 text-left shadow-sm shadow-teal-950/10 transition hover:border-teal-600/30 hover:shadow-md dark:border-[#8fb0bd]/60 dark:bg-[#d4e2e7]/85"
            onClick={() => setMenuOpen((currentValue) => !currentValue)}
            type="button"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
              {(user?.username?.slice(0, 1) || "U").toUpperCase()}
            </div>
            <div>
              <p className="app-user-name text-sm font-semibold text-slate-900 dark:text-slate-900">
                {user?.username ?? "User"}
              </p>
              <p className="app-user-email text-xs text-slate-500 dark:text-slate-500">
                {user?.email ?? "Signed in"}
              </p>
            </div>
          </button>

          {menuOpen ? (
            <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-blue-100 bg-white p-2 shadow-xl shadow-blue-950/10 dark:border-blue-100 dark:bg-white">
              <div className="rounded-xl px-3 py-2 text-sm text-slate-500 dark:text-slate-500">
                Profile dropdown
              </div>
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 dark:text-slate-700 dark:hover:bg-blue-50"
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
