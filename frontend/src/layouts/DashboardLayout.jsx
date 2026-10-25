
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import Button from "../components/Button";

const navigation = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: "▦",
    roles: ["ADMIN", "HR", "EMPLOYEE"],
    section: "WORKSPACE",
  },
  {
    label: "Employees",
    path: "/employees",
    icon: "♙",
    roles: ["ADMIN", "HR"],
    section: "WORKSPACE",
  },
  {
    label: "Attendance",
    path: "/attendance",
    icon: "◷",
    roles: ["ADMIN", "HR", "EMPLOYEE"],
    section: "WORKSPACE",
  },
  {
    label: "Leave requests",
    path: "/leaves",
    icon: "▤",
    roles: ["ADMIN", "HR", "EMPLOYEE"],
    section: "WORKSPACE",
  },
  {
    label: "Announcements",
    path: "/announcements",
    icon: "◉",
    roles: ["ADMIN", "HR", "EMPLOYEE"],
    section: "WORKSPACE",
  },
  {
    label: "Payroll",
    path: "/payroll",
    icon: "＄",
    roles: ["ADMIN", "HR", "EMPLOYEE"],
    section: "WORKSPACE",
  },
  {
    label: "AI Assistant",
    path: "/ai-assistant",
    icon: "✦",
    roles: ["ADMIN", "HR", "EMPLOYEE"],
    section: "TOOLS",
  },
  {
    label: "Settings",
    path: "/settings",
    icon: "⚙",
    roles: ["ADMIN"],
    section: "ADMINISTRATION",
  },
];

function getInitials(name) {
  return (
    name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U"
  );
}

function getPageTitle(pathname) {
  const page = navigation.find(
    (item) =>
      pathname === item.path || pathname.startsWith(`${item.path}/`)
  );

  if (page) return page.label;

  return pathname
    .split("/")
    .filter(Boolean)
    .pop()
    ?.replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase()) || "Dashboard";
}

export default function DashboardLayout({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const role = String(user?.role || "").toUpperCase();

  const visibleNavigation = navigation.filter((item) =>
    item.roles.includes(role)
  );

  const displayName =
    user?.name ||
    user?.fullName ||
    user?.username ||
    user?.email ||
    "User";

  const pageTitle = getPageTitle(location.pathname);

  function handleLogout() {
    setMobileMenuOpen(false);
    onLogout();
    navigate("/login", { replace: true });
  }

  function renderNavigation(items) {
    return items.map((item) => (
      <NavLink
        key={item.path}
        to={item.path}
        onClick={() => setMobileMenuOpen(false)}
        className={({ isActive }) =>
          `group relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-200 ${
            isActive
              ? "bg-indigo-500/15 text-white shadow-sm ring-1 ring-inset ring-indigo-400/20"
              : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
          }`
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-indigo-400" />
            )}

            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg transition ${
                isActive
                  ? "bg-indigo-500 text-white shadow-lg shadow-indigo-950/30"
                  : "bg-white/[0.04] text-slate-400 group-hover:bg-white/[0.08] group-hover:text-white"
              }`}
              aria-hidden="true"
            >
              {item.icon}
            </span>

            <span className="flex-1">{item.label}</span>

            {item.label === "AI Assistant" && (
              <span className="rounded-md bg-violet-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-300">
                AI
              </span>
            )}

            {isActive && (
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-300" />
            )}
          </>
        )}
      </NavLink>
    ));
  }

  function renderNavigationSections() {
    const sections = ["WORKSPACE", "TOOLS", "ADMINISTRATION"];

    return sections.map((section) => {
      const items = visibleNavigation.filter(
        (item) => item.section === section
      );

      if (!items.length) return null;

      return (
        <div key={section} className="mb-6">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {section}
          </p>

          <div className="space-y-1">{renderNavigation(items)}</div>
        </div>
      );
    });
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-800 md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-[272px] shrink-0 flex-col border-r border-white/5 bg-[#111827] text-white md:sticky md:top-0 md:flex md:h-screen">
        {/* Brand */}
        <div className="flex h-[88px] items-center gap-3 border-b border-white/[0.07] px-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-600 text-xl font-black shadow-lg shadow-indigo-950/40">
            P
          </div>

          <div>
            <h1 className="text-[17px] font-bold tracking-tight text-white">
              PeoplePulse
            </h1>
            <p className="mt-0.5 text-[11px] font-medium tracking-wide text-slate-400">
              HUMAN CAPITAL MANAGEMENT
            </p>
          </div>
        </div>

        {/* Organization label */}
        <div className="mx-4 mt-5 flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-400/10 text-sm font-bold text-indigo-300">
            {getInitials(user?.companyName || "Company")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-200">
              {user?.companyName || "Your Organization"}
            </p>
            <p className="mt-1 text-[10px] text-slate-500">
              HCM Workspace
            </p>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
        </div>

        {/* Navigation */}
<nav className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 pb-4 pt-7">          {renderNavigationSections()}
        </nav>

        {/* Upgrade-free informational footer */}
        <div className="mx-4 mb-4 rounded-2xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/10 to-violet-500/5 p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-400/15 text-lg text-indigo-300">
              ✦
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-200">
                Work smarter
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">
                Your team, one workspace.
              </p>
            </div>
          </div>
        </div>

        {/* Profile and logout */}
        <div className="border-t border-white/[0.07] p-4">
          <div className="flex items-center gap-3 rounded-xl p-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 text-sm font-bold text-white">
              {getInitials(displayName)}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {displayName}
              </p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                {user?.role || "User"}
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg text-slate-400 transition hover:bg-red-400/10 hover:text-red-300"
            >
              ↗
            </button>
          </div>
        </div>
      </aside>

      {/* Main workspace */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="flex min-h-[76px] items-center justify-between gap-4 px-4 sm:px-7 lg:px-9">
            <div className="flex min-w-0 items-center gap-3">
              {/* Mobile menu toggle */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((open) => !open)}
                aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={mobileMenuOpen}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-lg text-slate-600 transition hover:bg-slate-50 md:hidden"
              >
                {mobileMenuOpen ? "×" : "☰"}
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
                  <span className="hidden sm:inline">Workspace</span>
                  <span className="hidden sm:inline">/</span>
                  <span className="truncate text-indigo-600">{pageTitle}</span>
                </div>

                <h2 className="mt-1 truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                  {pageTitle}
                </h2>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3 sm:gap-5">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-semibold text-slate-800">
                  {displayName}
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  {user?.role || "User"} account
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-indigo-400 to-violet-600 text-xs font-bold text-white shadow-md shadow-indigo-900/10 ring-1 ring-slate-200">
                {getInitials(displayName)}
              </div>
            </div>
          </div>

          {/* Mobile navigation dropdown */}
          {mobileMenuOpen && (
            <div className="border-t border-slate-200 bg-[#111827] px-4 pb-4 pt-5 text-white shadow-xl md:hidden">
              <div className="mb-5 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-sm font-bold">
                  {getInitials(displayName)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {displayName}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {user?.role || "User"}
                  </p>
                </div>
              </div>

              {renderNavigationSections()}

              <Button
                variant="secondary"
                onClick={handleLogout}
                className="w-full"
              >
                Sign out
              </Button>
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 py-6 sm:px-7 sm:py-8 lg:px-9 lg:py-9">
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>

        <footer className="border-t border-slate-200/80 px-5 py-4 sm:px-9">
          <div className="flex flex-col justify-between gap-1 text-[11px] text-slate-400 sm:flex-row sm:items-center">
            <p>
              © {new Date().getFullYear()} PeoplePulse · HCM Lite
            </p>
            <p>People operations, simplified.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
