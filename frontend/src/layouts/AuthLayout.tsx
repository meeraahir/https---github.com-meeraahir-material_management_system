import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,107,74,0.12),_transparent_34%),linear-gradient(180deg,#FFF7F3_0%,#F9FAFB_55%,#F3F4F6_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-[#FFD8CD] bg-white/92 shadow-2xl shadow-[#111111]/5 backdrop-blur xl:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden flex-col justify-between bg-gradient-to-br from-[#111111] via-[#1F2937] to-[#FF6B4A] px-10 py-12 text-white xl:flex">
          <div className="space-y-6">
            <div className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#FFE4DB]">
              Material Management ERP
            </div>
            <div className="space-y-4">
              <h1 className="max-w-xl text-4xl font-semibold leading-tight">
                Secure operations access for your sites, vendors, labour, and
                inventory data.
              </h1>
              <p className="max-w-lg text-sm leading-7 text-slate-200">
                Sign in and register with the same visual language as the rest of
                the ERP, so authentication feels like part of the project instead
                of a separate screen.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {[
              "JWT access token stays in memory for stronger session handling.",
              "Refresh token persists securely in local storage across reloads.",
              "Automatic token refresh keeps dashboards available with minimal friction.",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-200"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center bg-white/80 px-5 py-8 sm:px-8 lg:px-12">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </section>
      </div>
    </div>
  );
}
