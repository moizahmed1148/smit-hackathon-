
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../utils/api";
import StatCard from "../components/StatCard";

function SectionHeading({ title, subtitle, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

function QuickAction({ icon, title, description, to, color = "blue" }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-xl border border-slate-200/80 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/40"
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg ${
          colors[color] || colors.blue
        }`}
      >
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-800">
          {title}
        </span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>

      <span className="text-lg text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-600">
        →
      </span>
    </Link>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const data = await apiRequest("/dashboard");

        if (active) {
          setStats(data.dashboard || data);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to load dashboard data.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-28 animate-pulse rounded-2xl bg-slate-200/70" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-36 animate-pulse rounded-2xl bg-slate-200/70"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">
          Dashboard couldn't load
        </h2>
        <p className="mt-2 text-sm text-red-600">{error}</p>
        <p className="mt-2 text-xs text-slate-500">
          Check your dashboard endpoint and backend logs.
        </p>
      </div>
    );
  }

  const cards = [
    {
      title: "Total employees",
      value: stats.totalEmployees,
      icon: "♙",
      accent: "blue",
      description: "Employees in your company",
    },
    {
      title: "Active employees",
      value: stats.activeEmployees,
      icon: "✓",
      accent: "green",
      description: "Currently active employee records",
    },
    {
      title: "Today's attendance",
      value: stats.todayAttendance,
      icon: "◷",
      accent: "violet",
      description: "Attendance recorded today",
    },
    {
      title: "Pending leave requests",
      value: stats.pendingLeaves,
      icon: "▤",
      accent: "amber",
      description: "Requests awaiting a decision",
    },
  ];

  const payrollValue =
    stats.monthlyPayroll == null
      ? "—"
      : Number(stats.monthlyPayroll).toLocaleString();

  return (
    <div className="mx-auto max-w-[1600px] space-y-8">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-indigo-600">
            COMPANY OVERVIEW
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Your workforce at a glance
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Here's what's happening across your organization.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium text-slate-500">TODAY</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            {new Date().toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            title="Workforce overview"
            subtitle="A summary of your current team"
          />

          <div className="mt-6 space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm text-slate-600">
                  Active employees
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {stats.activeEmployees ?? "—"}
                </span>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{
                    width: `${
                      Number(stats.totalEmployees) > 0
                        ? Math.min(
                            100,
                            (Number(stats.activeEmployees || 0) /
                              Number(stats.totalEmployees)) *
                              100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Active workforce</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {Number(stats.totalEmployees) > 0
                    ? `${Math.round(
                        (Number(stats.activeEmployees || 0) /
                          Number(stats.totalEmployees)) *
                          100
                      )}%`
                    : "—"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Payroll records</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {stats.payrollCount ?? "—"}
                </p>
              </div>
            </div>

            <p className="text-xs leading-5 text-slate-400">
              Figures are based on the data returned by your backend.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            title="Quick actions"
            subtitle="Get things done faster"
          />

          <div className="space-y-3">
            <QuickAction
              icon="+"
              title="Manage employees"
              description="View and update employee records"
              to="/employees"
              color="blue"
            />
            <QuickAction
              icon="◷"
              title="Attendance"
              description="Check attendance and working records"
              to="/attendance"
              color="green"
            />
            <QuickAction
              icon="▤"
              title="Leave requests"
              description="Review requests and their status"
              to="/leaves"
              color="violet"
            />
            <QuickAction
              icon="＄"
              title="Payroll"
              description="View payroll records and payslips"
              to="/payroll"
              color="amber"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            title="Leave management"
            subtitle="Keep track of requests that need attention"
          />

          <div className="flex items-center gap-4 rounded-xl bg-amber-50/70 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-xl text-amber-700">
              ▤
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800">
                Pending requests
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Requests awaiting review
              </p>
            </div>
            <p className="text-2xl font-semibold text-slate-900">
              {stats.pendingLeaves ?? "—"}
            </p>
          </div>

          <Link
            to="/leaves"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Open leave management <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            title="Payroll summary"
            subtitle="A quick look at the payroll data"
          />

          <p className="text-sm text-slate-500">Monthly payroll</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {payrollValue}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Amount and currency depend on your backend data.
          </p>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <Link
              to="/payroll"
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              View payroll <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
