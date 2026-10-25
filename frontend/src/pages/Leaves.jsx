
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../utils/api";
import Button from "../components/Button";
import StatusBadge from "../components/StatusBadge";

const LEAVE_TYPES = ["Annual", "Sick", "Casual", "Unpaid"];

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function getLeaveDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;

  const start = new Date(`${startDate.slice(0, 10)}T00:00:00Z`);
  const end = new Date(`${endDate.slice(0, 10)}T00:00:00Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  return Math.floor((end - start) / 86400000) + 1;
}

function getEmployeeName(leave) {
  const employee = leave.employee;

  if (!employee) return "Employee";
  if (typeof employee === "string") return "Employee";

  return employee.name || employee.email || "Employee";
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export default function Leaves() {
  const [leaves, setLeaves] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewingId, setReviewingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    startDate: "",
    endDate: "",
    leaveType: "Casual",
    reason: "",
  });

  const isEmployee = user?.role === "Employee";

  const loadLeaves = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [userData, leaveData] = await Promise.all([
        apiRequest("auth/me"),
        apiRequest("leaves"),
      ]);

      setUser(userData.user || userData);
      setLeaves(leaveData.leaves || []);
    } catch (err) {
      setError(err.message || "Unable to load leave requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  const summary = useMemo(
    () => ({
      total: leaves.length,
      pending: leaves.filter((leave) => leave.status === "Pending").length,
      approved: leaves.filter((leave) => leave.status === "Approved").length,
      rejected: leaves.filter((leave) => leave.status === "Rejected").length,
    }),
    [leaves]
  );

  const filteredLeaves = useMemo(() => {
    const term = search.trim().toLowerCase();

    return leaves.filter((leave) => {
      const matchesStatus =
        statusFilter === "All" || leave.status === statusFilter;

      const employeeName = getEmployeeName(leave).toLowerCase();
      const department =
        typeof leave.employee === "object"
          ? leave.employee?.department || ""
          : "";

      const matchesSearch =
        !term ||
        employeeName.includes(term) ||
        department.toLowerCase().includes(term) ||
        (leave.leaveType || "").toLowerCase().includes(term) ||
        (leave.reason || "").toLowerCase().includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [leaves, statusFilter, search]);

  function updateForm(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function submitLeave(event) {
    event.preventDefault();

    setError("");
    setNotice("");

    if (form.endDate < form.startDate) {
      setError("The end date cannot be earlier than the start date.");
      return;
    }

    if (form.reason.trim().length < 3) {
      setError("Please provide a reason of at least 3 characters.");
      return;
    }

    setSubmitting(true);

    try {
      const result = await apiRequest("leaves", {
        method: "POST",
        body: JSON.stringify({
          startDate: form.startDate,
          endDate: form.endDate,
          leaveType: form.leaveType,
          reason: form.reason.trim(),
        }),
      });

      setNotice(result.message || "Leave request submitted successfully.");

      setForm({
        startDate: "",
        endDate: "",
        leaveType: "Casual",
        reason: "",
      });

      setShowForm(false);
      await loadLeaves();
    } catch (err) {
      setError(err.message || "Unable to submit your leave request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function reviewLeave(id, status) {
    const action = status === "Approved" ? "approve" : "reject";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} this leave request?`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");
    setReviewingId(id);

    try {
      const result = await apiRequest(`leaves/${id}/review`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setNotice(result.message || `Leave request ${action}d.`);
      await loadLeaves();
    } catch (err) {
      setError(err.message || `Unable to ${action} leave request.`);
    } finally {
      setReviewingId("");
    }
  }

  return (
    <div className="space-y-7 pb-8">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-indigo-600">
            People / Leave management
          </p>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Leave management
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {isEmployee
              ? "Submit leave requests and keep track of their status."
              : "Review employee leave requests and manage approvals."}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {isEmployee && (
            <Button onClick={() => setShowForm((value) => !value)}>
              {showForm ? "Close form" : "+ Request leave"}
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={loadLeaves}
            disabled={loading || submitting || Boolean(reviewingId)}
          >
            ↻ Refresh
          </Button>
        </div>
      </div>

      {/* Feedback messages */}
      {notice && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {notice}
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
            onClick={loadLeaves}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Employee request form */}
      {isEmployee && showForm && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              New leave request
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Submit your dates, leave type, and reason for review.
            </p>
          </div>

          <form onSubmit={submitLeave} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="startDate"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Start date
                </label>
                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  min={todayString()}
                  value={form.startDate}
                  onChange={updateForm}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                />
              </div>

              <div>
                <label
                  htmlFor="endDate"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  End date
                </label>
                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  min={form.startDate || todayString()}
                  value={form.endDate}
                  onChange={updateForm}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="leaveType"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Leave type
                </label>
                <select
                  id="leaveType"
                  name="leaveType"
                  value={form.leaveType}
                  onChange={updateForm}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                >
                  {LEAVE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="reason"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Reason for leave
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  value={form.reason}
                  onChange={updateForm}
                  minLength={3}
                  maxLength={1000}
                  rows={4}
                  required
                  placeholder="Briefly explain why you need leave..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                />
                <p className="mt-1 text-right text-xs text-slate-400">
                  {form.reason.length}/1000 characters
                </p>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowForm(false)}
                disabled={submitting}
              >
                Cancel
              </Button>

              <Button type="submit" loading={submitting} disabled={submitting}>
                Submit request
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total requests"
          value={summary.total}
          detail="Requests in your available history"
          icon="▤"
          color="blue"
        />
        <SummaryCard
          label="Pending review"
          value={summary.pending}
          detail="Awaiting an HR/Admin decision"
          icon="◷"
          color="amber"
        />
        <SummaryCard
          label="Approved"
          value={summary.approved}
          detail="Requests approved"
          icon="✓"
          color="green"
        />
        <SummaryCard
          label="Rejected"
          value={summary.rejected}
          detail="Requests declined"
          icon="×"
          color="rose"
        />
      </div>

      {/* Request list */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {isEmployee ? "My leave requests" : "Leave requests inbox"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isEmployee
                ? "Your submitted requests and their current status."
                : "Search requests and review pending applications."}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                isEmployee
                  ? "Search leave type or reason..."
                  : "Search employee, department, or reason..."
              }
              aria-label="Search leave requests"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter leave status"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
            >
              <option value="All">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4 p-6">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-16 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600">
              ▤
            </div>
            <h3 className="mt-4 font-semibold text-slate-900">
              No leave requests found
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Try a different filter or submit a new request.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("All");
              }}
              className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  {!isEmployee && (
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Employee
                    </th>
                  )}
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Leave details
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Dates
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Days
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  {!isEmployee && (
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredLeaves.map((leave) => (
                  <tr
                    key={leave._id}
                    className="transition hover:bg-slate-50/70"
                  >
                    {!isEmployee && (
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-900">
                          {getEmployeeName(leave)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {typeof leave.employee === "object"
                            ? leave.employee?.department || "General"
                            : "Employee"}
                        </p>
                      </td>
                    )}

                    <td className="max-w-xs px-5 py-4">
                      <p className="font-medium text-slate-900">
                        {leave.leaveType} leave
                      </p>
                      <p
                        className="mt-1 truncate text-sm text-slate-500"
                        title={leave.reason}
                      >
                        {leave.reason}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      <p>{formatDate(leave.startDate)}</p>
                      <p className="mt-1 text-slate-400">
                        to {formatDate(leave.endDate)}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm font-medium text-slate-700">
                      {getLeaveDays(leave.startDate, leave.endDate)}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={leave.status} />
                    </td>

                    {!isEmployee && (
                      <td className="px-5 py-4">
                        {leave.status === "Pending" ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={Boolean(reviewingId)}
                              onClick={() =>
                                reviewLeave(leave._id, "Approved")
                              }
                              className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                            >
                              {reviewingId === leave._id
                                ? "Saving..."
                                : "Approve"}
                            </button>

                            <button
                              type="button"
                              disabled={Boolean(reviewingId)}
                              onClick={() =>
                                reviewLeave(leave._id, "Rejected")
                              }
                              className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Reviewed
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
          Showing {filteredLeaves.length} of {leaves.length} loaded requests.
          The backend returns up to 200 requests.
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, detail, icon, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
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

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${colors[color]}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
        {detail}
      </p>
    </article>
  );
}
