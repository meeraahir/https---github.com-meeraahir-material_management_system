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
    <header className="app-topbar sticky top-0 z-20 border-b border-[#E5E7EB] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(17,24,39,0.04)] backdrop-blur-xl sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            className="rounded-xl p-2 text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111111] lg:hidden"
            onClick={onMenuClick}
            type="button"
          >
            {icons.menu({ className: "h-5 w-5" })}
          </button>
          <Breadcrumb />
        </div>

        <div className="relative">
          <button
            className="app-user-menu flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-3 py-2 text-left shadow-sm transition hover:border-[#D1D5DB] hover:shadow-md"
            onClick={() => setMenuOpen((currentValue) => !currentValue)}
            type="button"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111111] text-sm font-semibold text-white">
              {(user?.username?.slice(0, 1) || "U").toUpperCase()}
            </div>
            <div>
              <p className="app-user-name text-sm font-semibold text-[#111111]">
                {user?.username ?? "User"}
              </p>
              <p className="app-user-email text-xs text-[#6B7280]">
                {user?.email ?? "Signed in"}
              </p>
            </div>
          </button>

          {menuOpen ? (
            <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-[#E5E7EB] bg-white p-2 shadow-xl">
              <div className="rounded-xl px-3 py-2 text-sm text-[#6B7280]">
                Profile dropdown
              </div>
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#374151] transition hover:bg-[#F3F4F6] hover:text-[#111111]"
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
