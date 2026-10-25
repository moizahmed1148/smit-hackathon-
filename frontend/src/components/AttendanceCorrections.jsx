import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../utils/api";
import Button from "./Button";

function localToday() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function formatTime(value) {
  if (!value) return "Not provided";

  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusPill({ status }) {
  const styles = {
    Pending: "bg-amber-50 text-amber-700 ring-amber-200",
    Approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Rejected: "bg-red-50 text-red-700 ring-red-200",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
        styles[status] || "bg-slate-50 text-slate-600 ring-slate-200"
      }`}
    >
      {status}
    </span>
  );
}

export default function AttendanceCorrections({ user }) {
  const isEmployee = user?.role === "Employee";
  const canReview = ["Admin", "HR"].includes(user?.role);

  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewingId, setReviewingId] = useState("");
  const [statusFilter, setStatusFilter] = useState(
    canReview ? "Pending" : "all"
  );

  const [date, setDate] = useState(localToday());
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [reason, setReason] = useState("");
  const [reviewComments, setReviewComments] = useState({});

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true);
    setError("");

    try {
      const query =
        statusFilter === "all"
          ? ""
          : `?status=${encodeURIComponent(statusFilter)}`;

      const result = await apiRequest(
        `attendance-corrections${query}`
      );

      setRequests(result.requests || []);
    } catch (err) {
      setError(err.message || "Unable to load correction requests.");
    } finally {
      setRequestsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  async function submitRequest(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!checkIn && !checkOut) {
      setError("Enter at least a requested check-in or check-out time.");
      return;
    }

    if (checkIn && checkOut && checkOut <= checkIn) {
      setError("Check-out must be later than check-in.");
      return;
    }

    if (checkIn && checkOut) {
      const requestedIn = new Date(`${date}T${checkIn}`);
      const requestedOut = new Date(`${date}T${checkOut}`);

      if (requestedOut <= requestedIn) {
        setError("Check-out must be later than check-in.");
        return;
      }
    }

    setSubmitting(true);

    try {
      const result = await apiRequest("attendance-corrections", {
        method: "POST",
        body: JSON.stringify({
          date,
          requestedCheckIn: checkIn
            ? new Date(`${date}T${checkIn}`).toISOString()
            : null,
          requestedCheckOut: checkOut
            ? new Date(`${date}T${checkOut}`).toISOString()
            : null,
          reason: reason.trim(),
        }),
      });

      setNotice(result.message || "Request submitted successfully.");
      setCheckIn("");
      setCheckOut("");
      setReason("");

      await loadRequests();
    } catch (err) {
      setError(err.message || "Unable to submit correction request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function reviewRequest(id, decision) {
    setError("");
    setNotice("");
    setReviewingId(id);

    try {
      const result = await apiRequest(
        `attendance-corrections/${id}/review`,
        {
          method: "PATCH",
          body: JSON.stringify({
            decision,
            reviewComment: reviewComments[id] || "",
          }),
        }
      );

      setNotice(result.message || `Request ${decision.toLowerCase()}.`);
      await loadRequests();
    } catch (err) {
      setError(err.message || "Unable to review this request.");
    } finally {
      setReviewingId("");
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm font-medium text-indigo-600">
          Attendance / Corrections
        </p>

        <h2 className="mt-1 text-xl font-semibold text-slate-900">
          Attendance correction requests
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {isEmployee
            ? "Request a correction if your attendance record is inaccurate."
            : "Review employee requests and record your decision."}
        </p>
      </div>

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
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {isEmployee && (
        <form
          onSubmit={submitRequest}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div>
            <h3 className="font-semibold text-slate-900">
              Submit a correction
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Your request will remain pending until it is reviewed.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Attendance date
              <input
                type="date"
                value={date}
                max={localToday()}
                onChange={(event) => setDate(event.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              Requested check-in
              <input
                type="time"
                value={checkIn}
                onChange={(event) => setCheckIn(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              Requested check-out
              <input
                type="time"
                value={checkOut}
                onChange={(event) => setCheckOut(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
              Reason for correction
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                required
                minLength={5}
                maxLength={500}
                rows={3}
                placeholder="Explain what happened and why this correction is needed..."
                className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
              />
              <span className="block text-xs font-normal text-slate-500">
                {reason.length}/500 characters
              </span>
            </label>
          </div>

          <Button type="submit" loading={submitting} disabled={submitting}>
            Submit correction request
          </Button>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-semibold text-slate-900">
              {isEmployee ? "My requests" : "Employee requests"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Review request details and decisions.
            </p>
          </div>

          <div className="flex gap-2">
            {canReview && (
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter correction requests"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
              >
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="all">All requests</option>
              </select>
            )}

            <Button
              variant="secondary"
              onClick={loadRequests}
              disabled={requestsLoading}
            >
              Refresh
            </Button>
          </div>
        </div>

        {requestsLoading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-24 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="font-medium text-slate-800">
              No correction requests found
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Requests will appear here when available.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map((request) => (
              <article key={request._id} className="space-y-4 p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {isEmployee
                        ? "Attendance correction"
                        : request.employee?.name || "Employee"}
                    </p>

                    {!isEmployee && (
                      <p className="mt-1 text-xs text-slate-500">
                        {request.employee?.email || ""}
                        {request.employee?.department
                          ? ` · ${request.employee.department}`
                          : ""}
                      </p>
                    )}

                    <p className="mt-1 text-sm text-slate-500">
                      Date: {formatDate(request.date)}
                    </p>
                  </div>

                  <StatusPill status={request.status} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      Requested check-in
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {formatTime(request.requestedCheckIn)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      Requested check-out
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {formatTime(request.requestedCheckOut)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Employee's reason
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                    {request.reason}
                  </p>
                </div>

                {request.reviewComment && (
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs font-semibold text-slate-500">
                      Review comment
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                      {request.reviewComment}
                    </p>
                  </div>
                )}

                {canReview && request.status === "Pending" && (
                  <div className="space-y-3 border-t border-slate-100 pt-4">
                    <label className="block space-y-2 text-sm font-medium text-slate-700">
                      Review comment
                      <textarea
                        rows={2}
                        maxLength={500}
                        value={reviewComments[request._id] || ""}
                        onChange={(event) =>
                          setReviewComments((previous) => ({
                            ...previous,
                            [request._id]: event.target.value,
                          }))
                        }
                        placeholder="Optional explanation for your decision..."
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                      />
                    </label>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={() =>
                          reviewRequest(request._id, "Approved")
                        }
                        loading={reviewingId === request._id}
                        disabled={Boolean(reviewingId)}
                      >
                        Approve request
                      </Button>

                      <Button
                        variant="secondary"
                        onClick={() =>
                          reviewRequest(request._id, "Rejected")
                        }
                        loading={reviewingId === request._id}
                        disabled={Boolean(reviewingId)}
                      >
                        Reject request
                      </Button>
                    </div>
                  </div>
                )}

                {request.reviewedBy && (
                  <p className="text-xs text-slate-500">
                    Reviewed by {request.reviewedBy.name || "HR/Admin"}
                    {request.reviewedAt
                      ? ` on ${new Date(
                          request.reviewedAt
                        ).toLocaleDateString()}`
                      : ""}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
