
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../utils/api";
import Button from "../components/Button";
import Input from "../components/Input";
import StatusBadge from "../components/StatusBadge";

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "Employee",
  department: "",
  jobTitle: "",
  phone: "",
};

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDate(date) {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState(null);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("employees");
      setEmployees(data.employees || []);
    } catch (err) {
      setError(err.message || "Unable to load employees.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const counts = useMemo(() => ({
    total: employees.length,
    active: employees.filter((employee) => employee.isActive).length,
    inactive: employees.filter((employee) => !employee.isActive).length,
  }), [employees]);

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch = [
        employee.name,
        employee.email,
        employee.department,
        employee.jobTitle,
      ].some((value) => value?.toLowerCase().includes(term));

      const matchesStatus =
        filter === "all" ||
        (filter === "active" && employee.isActive) ||
        (filter === "inactive" && !employee.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [employees, search, filter]);

  function openAddModal() {
    setEditingEmployee(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  }

  function openEditModal(employee) {
    setEditingEmployee(employee);
    setForm({
      name: employee.name || "",
      email: employee.email || "",
      password: "",
      department: employee.department || "",
      jobTitle: employee.jobTitle || "",
      phone: employee.phone || "",
    });
    setFormError("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingEmployee(null);
    setForm(emptyForm);
    setFormError("");
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setNotice("");

    if (form.name.trim().length < 2) {
      setFormError("Please enter a name with at least 2 characters.");
      return;
    }

    if (!editingEmployee && form.password.length < 8) {
      setFormError("Password must contain at least 8 characters.");
      return;
    }

   const payload = {
  name: form.name.trim(),
  department: form.department.trim() || "General",
  jobTitle: form.jobTitle.trim() || "Employee",
  phone: form.phone.trim(),
};

if (!editingEmployee) {
  payload.email = form.email.trim().toLowerCase();
  payload.password = form.password;
  payload.role = form.role;
}

    if (!editingEmployee) {
      payload.email = form.email.trim().toLowerCase();
      payload.password = form.password;
    }

    setSaving(true);

    try {
      if (editingEmployee) {
        const data = await apiRequest(
          `employees/${editingEmployee.id}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );

        setEmployees((current) =>
          current.map((employee) =>
            employee.id === editingEmployee.id
              ? data.employee
              : employee
          )
        );

        setNotice("Employee details updated successfully.");
      } else {
        const data = await apiRequest("employees", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setEmployees((current) => [
          data.employee,
          ...current,
        ]);

        setNotice("Employee added successfully.");
      }

      setModalOpen(false);
      setEditingEmployee(null);
      setForm(emptyForm);
    } catch (err) {
      setFormError(err.message || "Unable to save employee.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(employee) {
    const confirmed = window.confirm(
      `Deactivate ${employee.name}? They will remain in your records, but their account should no longer be used.`
    );

    if (!confirmed) return;

    setNotice("");
    setError("");
    setDeactivatingId(employee.id);

    try {
      await apiRequest(
        `employees/${employee.id}/deactivate`,
        { method: "PATCH" }
      );

      setEmployees((current) =>
        current.map((item) =>
          item.id === employee.id
            ? { ...item, isActive: false }
            : item
        )
      );

      setNotice(`${employee.name} has been deactivated.`);
    } catch (err) {
      setError(err.message || "Unable to deactivate employee.");
    } finally {
      setDeactivatingId(null);
    }
  }

  return (
    <div className="space-y-7 pb-8">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-indigo-600">
            People / Directory
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Employee management
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage your workforce, employee details, and account status.
          </p>
        </div>

        <Button onClick={openAddModal}>
          + Add employee
        </Button>
      </div>

      {/* Notifications */}
      {notice && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            className="font-semibold"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={loadEmployees}
            className="font-semibold underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Total employees"
          value={counts.total}
          detail="All employee accounts"
          icon="◎"
          color="indigo"
        />
        <SummaryCard
          label="Active employees"
          value={counts.active}
          detail="Currently marked active"
          icon="↗"
          color="emerald"
        />
        <SummaryCard
          label="Inactive employees"
          value={counts.inactive}
          detail="Retained in your records"
          icon="◷"
          color="amber"
        />
      </div>

      {/* Directory */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              All employees
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredEmployees.length}{" "}
              {filteredEmployees.length === 1 ? "person" : "people"} found
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 sm:w-72">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                ⌕
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search people..."
                aria-label="Search employees"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
              />
            </div>

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="Filter employees by status"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
            >
              <option value="all">All statuses</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4 p-6">
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="h-14 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600">
              ◎
            </div>
            <h3 className="mt-4 font-semibold text-slate-900">
              {employees.length === 0
                ? "No employees yet"
                : "No matching employees"}
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              {employees.length === 0
                ? "Add your first employee to start building your workforce directory."
                : "Try a different name, email, department, or status filter."}
            </p>
            {employees.length === 0 && (
              <div className="mt-5">
                <Button onClick={openAddModal}>
                  + Add first employee
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  {[
                    "Employee",
                    "Department",
                    "Job title",
                    "Joined",
                    "Status",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((employee) => (
                  <tr
                    key={employee.id}
                    className="transition hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-semibold text-indigo-700">
                          {getInitials(employee.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">
                            {employee.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {employee.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {employee.department || "General"}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {employee.jobTitle || "Employee"}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                      {formatDate(employee.joinDate)}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge
                        status={employee.isActive ? "active" : "inactive"}
                      />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openEditModal(employee)}
                          className="text-sm font-medium text-indigo-600 transition hover:text-indigo-800"
                        >
                          Edit
                        </button>

                        {employee.isActive && (
                          <button
                            type="button"
                            onClick={() => handleDeactivate(employee)}
                            disabled={deactivatingId === employee.id}
                            className="text-sm font-medium text-red-600 transition hover:text-red-800 disabled:opacity-50"
                          >
                            {deactivatingId === employee.id
                              ? "Working..."
                              : "Deactivate"}
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

        <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>Employee records are scoped to your company.</span>
          <button
            type="button"
            onClick={loadEmployees}
            disabled={loading}
            className="self-start font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 sm:self-auto"
          >
            ↻ Refresh directory
          </button>
        </div>
      </section>

      {/* Add / edit modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-modal-title"
            className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-sm font-medium text-indigo-600">
                  Workforce
                </p>
                <h2
                  id="employee-modal-title"
                  className="mt-1 text-xl font-semibold text-slate-900"
                >
                  {editingEmployee ? "Edit employee" : "Add new employee"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingEmployee
                    ? "Update this employee's information."
                    : "Create an employee account for your company."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close form"
                className="rounded-lg px-3 py-1 text-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Input
                    label="Full name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Ahmed Khan"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <Input
                    label="Email address"
                    name="email"
                    inputType="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="employee@company.com"
                    required
                    disabled={Boolean(editingEmployee)}
                  />
                  {editingEmployee && (
                    <p className="mt-1.5 text-xs text-slate-500">
                      Email editing isn't supported by the current backend route.
                    </p>
                  )}
                </div>

                {!editingEmployee && (
                  <div className="sm:col-span-2">
                    <Input
                      label="Temporary password"
                      name="password"
                      inputType="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="At least 8 characters"
                      required
                    />
                    <p className="mt-1.5 text-xs text-slate-500">
                      Share this securely with the employee. Password reset can be added separately.
                    </p>
                  </div>
                )}

                {!editingEmployee && (
  <div className="flex flex-col gap-2">
    <label
      htmlFor="role"
      className="text-sm font-medium text-slate-700"
    >
      Account role
    </label>

    <select
      id="role"
      name="role"
      value={form.role}
      onChange={handleChange}
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
    >
      <option value="Employee">Employee</option>
      <option value="HR">HR</option>
    </select>

    <p className="text-xs text-slate-500">
      HR accounts can manage permitted HR operations.
      Only an Admin can create HR accounts.
    </p>
  </div>
)}

                <Input
                  label="Department"
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  placeholder="e.g. Engineering"
                />

                <Input
                  label="Job title"
                  name="jobTitle"
                  value={form.jobTitle}
                  onChange={handleChange}
                  placeholder="e.g. Software Developer"
                />

                <div className="sm:col-span-2">
                  <Input
                    label="Phone number"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Optional"
                  />
                </div>

                {formError && (
                  <div
                    role="alert"
                    className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {formError}
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={saving} disabled={saving}>
                  {saving
                    ? "Saving..."
                    : editingEmployee
                      ? "Save changes"
                      : "Create employee"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, detail, icon, color }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${colors[color]}`}>
          {icon}
        </div>
      </div>
      <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
        {detail}
      </p>
    </article>
  );
}
