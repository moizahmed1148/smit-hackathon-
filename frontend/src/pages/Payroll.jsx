
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../utils/api";

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const initialForm = () => ({
  employeeId: "",
  payPeriod: currentMonth(),
  baseSalary: "",
  allowances: "0",
  deductions: "0",
});

const money = (value) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const getId = (item) => item?._id || item?.id || "";

const getEmployeeName = (employee) =>
  employee?.name || employee?.email || "Unknown employee";

const getErrorMessage = (error) =>
  error?.message || "Something went wrong. Please try again.";

function StatusBadge({ status }) {
  const paid = status === "Paid";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        paid
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          paid ? "bg-emerald-500" : "bg-amber-500"
        }`}
      />
      {status}
    </span>
  );
}

function SummaryCard({ title, value, description, icon, color }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${color}`}
        >
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{description}</p>
    </article>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50";

function Modal({ title, subtitle, onClose, children, wide = false }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`my-auto w-full rounded-2xl bg-white p-5 shadow-2xl sm:p-7 ${
          wide ? "max-w-2xl" : "max-w-lg"
        }`}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export default function Payroll() {
  const [user, setUser] = useState(null);
  const [payroll, setPayroll] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState(currentMonth());
  const [statusFilter, setStatusFilter] = useState("All");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [payingId, setPayingId] = useState("");
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [payslipLoading, setPayslipLoading] = useState(false);

  const isEmployee = user?.role === "Employee";
  const canManage = ["Admin", "HR"].includes(user?.role);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [meResult, payrollResult] = await Promise.all([
        apiRequest("auth/me"),
        apiRequest("payroll"),
      ]);

      const currentUser = meResult?.user || meResult;
      setUser(currentUser);

      setPayroll(
        Array.isArray(payrollResult?.payroll) ? payrollResult.payroll : []
      );

      if (["Admin", "HR"].includes(currentUser?.role)) {
        const employeeResult = await apiRequest("employees");
        setEmployees(
          Array.isArray(employeeResult?.employees)
            ? employeeResult.employees.filter(
                (employee) => employee.isActive !== false
              )
            : []
        );
      } else {
        setEmployees([]);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const visiblePayroll = useMemo(() => {
    const query = search.trim().toLowerCase();

    return payroll.filter((record) => {
      const matchesPeriod =
        !periodFilter || record.payPeriod === periodFilter;
      const matchesStatus =
        statusFilter === "All" || record.status === statusFilter;

      const employeeName = getEmployeeName(record.employee).toLowerCase();
      const employeeEmail = (record.employee?.email || "").toLowerCase();
      const matchesSearch =
        !query ||
        employeeName.includes(query) ||
        employeeEmail.includes(query) ||
        record.payPeriod?.toLowerCase().includes(query);

      return matchesPeriod && matchesStatus && matchesSearch;
    });
  }, [payroll, periodFilter, statusFilter, search]);

  const summary = useMemo(() => {
    const total = visiblePayroll.reduce(
      (sum, record) => sum + (Number(record.netSalary) || 0),
      0
    );

    const paidRecords = visiblePayroll.filter(
      (record) => record.status === "Paid"
    );

    const paid = paidRecords.reduce(
      (sum, record) => sum + (Number(record.netSalary) || 0),
      0
    );

    return {
      total,
      paid,
      pending: total - paid,
      count: visiblePayroll.length,
      paidCount: paidRecords.length,
    };
  }, [visiblePayroll]);

  const netSalary =
    (Number(form.baseSalary) || 0) +
    (Number(form.allowances) || 0) -
    (Number(form.deductions) || 0);

  const updateForm = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const createPayroll = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.employeeId) {
      setError("Please select an employee.");
      return;
    }

    if (!form.payPeriod || !/^\d{4}-(0[1-9]|1[0-2])$/.test(form.payPeriod)) {
      setError("Please select a valid pay period.");
      return;
    }

    const baseSalary = Number(form.baseSalary);
    const allowances = Number(form.allowances);
    const deductions = Number(form.deductions);

    if (
      ![baseSalary, allowances, deductions].every(
        (value) => Number.isFinite(value) && value >= 0
      )
    ) {
      setError("Salary amounts must be valid non-negative numbers.");
      return;
    }

    if (deductions > baseSalary + allowances) {
      setError("Deductions cannot exceed the total earnings.");
      return;
    }

    setSaving(true);

    try {
      await apiRequest("payroll", {
        method: "POST",
        body: JSON.stringify({
          employeeId: form.employeeId,
          payPeriod: form.payPeriod,
          baseSalary,
          allowances,
          deductions,
        }),
      });

      setShowCreate(false);
      setForm(initialForm());
      setPeriodFilter(form.payPeriod);
      setStatusFilter("All");
      setSearch("");
      setNotice("Payroll record created successfully.");
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const markAsPaid = async (record) => {
    if (
      !window.confirm(
        `Mark ${getEmployeeName(record.employee)}'s payroll for ${
          record.payPeriod
        } as paid?`
      )
    ) {
      return;
    }

    setError("");
    setNotice("");
    setPayingId(getId(record));

    try {
      await apiRequest(`payroll/${getId(record)}/pay`, {
        method: "PATCH",
      });

      setNotice("Payroll marked as paid successfully.");
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPayingId("");
    }
  };

  const openPayslip = async (record) => {
    setPayslipLoading(true);
    setError("");
    setSelectedPayslip(null);

    try {
      const result = await apiRequest(
        `payroll/${getId(record)}/payslip`
      );
      setSelectedPayslip(result?.payslip || null);

      if (!result?.payslip) {
        setError("Payslip data was not returned by the server.");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPayslipLoading(false);
    }
  };

  const closeCreate = useCallback(() => {
    if (!saving) setShowCreate(false);
  }, [saving]);

  const closePayslip = useCallback(() => {
    setSelectedPayslip(null);
  }, []);

  const formatPeriod = (period) => {
    if (!period) return "—";

    const [year, month] = period.split("-");
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
      "en-PK",
      { month: "long", year: "numeric" }
    );
  };

  if (loading && !user) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-32 animate-pulse rounded-2xl bg-slate-100"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  return (
    <section className="space-y-6 pb-8">
      {/* Page header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>People</span>
            <span>/</span>
            <span className="text-indigo-600">Payroll</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Payroll management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage salary records, payment status, and employee payslips.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => {
              setError("");
              setNotice("");
              setForm(initialForm());
              setShowCreate(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-100"
          >
            <span className="text-lg">+</span>
            Create payroll
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="font-semibold"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            className="font-semibold"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total payroll"
          value={money(summary.total)}
          description="Net salary across filtered records"
          icon="◈"
          color="bg-indigo-50 text-indigo-600"
        />
        <SummaryCard
          title="Total paid"
          value={money(summary.paid)}
          description={`${summary.paidCount} paid record(s)`}
          icon="✓"
          color="bg-emerald-50 text-emerald-600"
        />
        <SummaryCard
          title="Pending payment"
          value={money(summary.pending)}
          description="Processed, not yet marked paid"
          icon="◷"
          color="bg-amber-50 text-amber-600"
        />
        <SummaryCard
          title="Payroll records"
          value={summary.count}
          description="Records matching current filters"
          icon="▤"
          color="bg-violet-50 text-violet-600"
        />
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              ⌕
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search employee, email, or period..."
              className={`${inputClass} pl-10`}
              aria-label="Search payroll records"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex">
            <input
              type="month"
              value={periodFilter}
              onChange={(event) => setPeriodFilter(event.target.value)}
              className={`${inputClass} sm:w-44`}
              aria-label="Filter by pay period"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={`${inputClass} sm:w-40`}
              aria-label="Filter by payment status"
            >
              <option value="All">All statuses</option>
              <option value="Processed">Processed</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setPeriodFilter("");
              setStatusFilter("All");
            }}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Clear filters
          </button>
        </div>
      </div>

      {/* Payroll table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-1 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-slate-900">
              {isEmployee ? "My payslips" : "Payroll records"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {visiblePayroll.length} record(s) displayed
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="self-start rounded-lg px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 sm:self-auto"
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        {loading && user ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-12 animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        ) : visiblePayroll.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-500">
              ▤
            </div>
            <h3 className="mt-4 font-semibold text-slate-900">
              No payroll records found
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              {canManage
                ? "Create a payroll record for an active employee, or adjust your filters."
                : "Your payslips will appear here when payroll records are available."}
            </p>
            {canManage && (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="mt-4 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Create first payroll
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Employee</th>
                  <th className="px-5 py-3.5 font-semibold">Pay period</th>
                  <th className="px-5 py-3.5 text-right font-semibold">
                    Base salary
                  </th>
                  <th className="px-5 py-3.5 text-right font-semibold">
                    Allowances
                  </th>
                  <th className="px-5 py-3.5 text-right font-semibold">
                    Deductions
                  </th>
                  <th className="px-5 py-3.5 text-right font-semibold">
                    Net salary
                  </th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visiblePayroll.map((record) => (
                  <tr
                    key={getId(record)}
                    className="transition hover:bg-slate-50/80"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 font-semibold text-indigo-700">
                          {getEmployeeName(record.employee)
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {getEmployeeName(record.employee)}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {record.employee?.department || "No department"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {formatPeriod(record.payPeriod)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-slate-600">
                      {money(record.baseSalary)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-slate-600">
                      {money(record.allowances)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-slate-600">
                      {money(record.deductions)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-slate-900">
                      {money(record.netSalary)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={record.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openPayslip(record)}
                          disabled={payslipLoading}
                          className="whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
                        >
                          Payslip
                        </button>
                        {canManage && record.status === "Processed" && (
                          <button
                            type="button"
                            onClick={() => markAsPaid(record)}
                            disabled={Boolean(payingId)}
                            className="whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {payingId === getId(record)
                              ? "Updating..."
                              : "Mark paid"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create payroll dialog */}
      {showCreate && canManage && (
        <Modal
          title="Create payroll"
          subtitle="Enter salary details for one active employee."
          onClose={closeCreate}
          wide
        >
          <form onSubmit={createPayroll} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Employee">
                <select
                  name="employeeId"
                  value={form.employeeId}
                  onChange={updateForm}
                  className={inputClass}
                  required
                >
                  <option value="">Select an employee</option>
                  {employees.map((employee) => (
                    <option key={getId(employee)} value={getId(employee)}>
                      {employee.name} — {employee.email}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Pay period">
                <input
                  type="month"
                  name="payPeriod"
                  value={form.payPeriod}
                  onChange={updateForm}
                  className={inputClass}
                  required
                />
              </Field>

              <Field label="Base salary (PKR)">
                <input
                  type="number"
                  name="baseSalary"
                  value={form.baseSalary}
                  onChange={updateForm}
                  min="0"
                  step="0.01"
                  placeholder="e.g. 50000"
                  className={inputClass}
                  required
                />
              </Field>

              <Field label="Allowances (PKR)">
                <input
                  type="number"
                  name="allowances"
                  value={form.allowances}
                  onChange={updateForm}
                  min="0"
                  step="0.01"
                  className={inputClass}
                />
              </Field>

              <Field label="Deductions (PKR)">
                <input
                  type="number"
                  name="deductions"
                  value={form.deductions}
                  onChange={updateForm}
                  min="0"
                  step="0.01"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5">
              <p className="text-sm font-medium text-indigo-800">
                Net salary preview
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-indigo-950">
                {money(netSalary)}
              </p>
              <p className="mt-2 text-xs text-indigo-700">
                Base salary + allowances − deductions
              </p>
              {netSalary < 0 && (
                <p className="mt-2 text-sm font-medium text-rose-600">
                  Deductions cannot exceed total earnings.
                </p>
              )}
            </div>

            {employees.length === 0 && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                No active employees were loaded. Add or activate an employee
                before creating payroll.
              </p>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeCreate}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  saving ||
                  employees.length === 0 ||
                  netSalary < 0
                }
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create payroll record"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Payslip dialog */}
      {selectedPayslip && (
        <Modal
          title="Employee payslip"
          subtitle={`Salary statement for ${formatPeriod(
            selectedPayslip.payPeriod
          )}`}
          onClose={closePayslip}
          wide
        >
          <div id="payslip-content" className="space-y-5">
            <div className="rounded-2xl bg-slate-950 p-5 text-white sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-300">Net salary</p>
                  <p className="mt-2 text-3xl font-bold">
                    {money(selectedPayslip.netSalary)}
                  </p>
                </div>
                <StatusBadge status={selectedPayslip.status} />
              </div>
              <p className="mt-4 text-sm text-slate-300">
                {formatPeriod(selectedPayslip.payPeriod)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Employee</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {getEmployeeName(selectedPayslip.employee)}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedPayslip.employee?.email || "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Department / job title</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {selectedPayslip.employee?.department || "—"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedPayslip.employee?.jobTitle || "—"}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="flex justify-between border-b border-slate-100 px-4 py-3 text-sm">
                <span className="text-slate-600">Base salary</span>
                <span className="font-medium text-slate-900">
                  {money(selectedPayslip.baseSalary)}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 px-4 py-3 text-sm">
                <span className="text-slate-600">Allowances</span>
                <span className="font-medium text-emerald-700">
                  + {money(selectedPayslip.allowances)}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 px-4 py-3 text-sm">
                <span className="text-slate-600">Deductions</span>
                <span className="font-medium text-rose-700">
                  − {money(selectedPayslip.deductions)}
                </span>
              </div>
              <div className="flex justify-between bg-slate-50 px-4 py-4 text-sm font-bold">
                <span className="text-slate-900">Net salary</span>
                <span className="text-slate-900">
                  {money(selectedPayslip.netSalary)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <span>
                {selectedPayslip.status === "Paid"
                  ? `Paid on ${
                      selectedPayslip.paidAt
                        ? new Date(selectedPayslip.paidAt).toLocaleDateString(
                            "en-PK"
                          )
                        : "date not recorded"
                    }`
                  : "Payment is not yet marked as paid."}
              </span>
              <span>Currency: PKR</span>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={closePayslip}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Print payslip
            </button>
          </div>
        </Modal>
      )}

      {payslipLoading && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-40 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl"
        >
          Loading payslip...
        </div>
      )}
    </section>
  );
}
