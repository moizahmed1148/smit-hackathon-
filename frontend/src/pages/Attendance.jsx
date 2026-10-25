
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../utils/api";
import Button from "../components/Button";
import StatusBadge from "../components/StatusBadge";
import AttendanceCorrections from "../components/AttendanceCorrections.jsx";

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00Z`);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
}

function durationBetween(start, end) {
  if (!start || !end) return "In progress";

  const milliseconds = new Date(end) - new Date(start);

  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    return "—";
  }

  const totalMinutes = Math.floor(milliseconds / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}

function getEmployeeName(record) {
  if (!record.employee) return "Unknown employee";

  if (typeof record.employee === "string") {
    return "Employee";
  }

  return record.employee.name || record.employee.email || "Employee";
}

export default function Attendance() {
  const [records, setRecords] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayUTC());
  const [statusFilter, setStatusFilter] = useState("all");

  const isEmployee = user?.role === "Employee";

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [userData, attendanceData] = await Promise.all([
        apiRequest("auth/me"),
        apiRequest("attendance"),
      ]);

      setUser(userData.user || userData);
      setRecords(attendanceData.attendance || []);
    } catch (err) {
      setError(err.message || "Unable to load attendance records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const todayRecords = useMemo(
    () => records.filter((record) => record.date === todayUTC()),
    [records]
  );

  const openRecords = todayRecords.filter(
    (record) => record.checkIn && !record.checkOut
  );

  const completedRecords = todayRecords.filter(
    (record) => record.checkIn && record.checkOut
  );

  const myTodayRecord = todayRecords.find(
    (record) =>
      record.employee &&
      typeof record.employee === "object" &&
      String(record.employee._id || record.employee.id) ===
        String(user?.id || user?._id || user?.userId)
  );

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();

    return records.filter((record) => {
      const employee = record.employee || {};

      const matchesSearch = [
        employee.name,
        employee.email,
        employee.department,
      ].some((value) => value?.toLowerCase().includes(term));

      const matchesDate =
        !selectedDate || record.date === selectedDate;

      const status = record.checkOut
        ? "completed"
        : record.checkIn
          ? "open"
          : "missing";

      const matchesStatus =
        statusFilter === "all" || statusFilter === status;

      return matchesSearch && matchesDate && matchesStatus;
    });
  }, [records, search, selectedDate, statusFilter]);

  async function performAttendanceAction(action) {
    setActionLoading(true);
    setError("");
    setNotice("");

    try {
      const result = await apiRequest(
        `attendance/${action}`,
        { method: action === "check-in" ? "POST" : "PATCH" }
      );

      setNotice(result.message || "Attendance updated successfully.");

      await loadAttendance();
    } catch (err) {
      setError(err.message || "Unable to update attendance.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-7 pb-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-indigo-600">
            People / Attendance
          </p>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Attendance management
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Monitor daily attendance and manage employee check-in records.
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={loadAttendance}
          disabled={loading || actionLoading}
        >
          ↻ Refresh records
        </Button>
      </div>

      {/* Feedback */}
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
            onClick={loadAttendance}
            className="font-semibold underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Employee check-in panel */}
      {isEmployee && (
        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-indigo-200">
                YOUR ATTENDANCE
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                {myTodayRecord?.checkOut
                  ? "Your workday is complete"
                  : myTodayRecord?.checkIn
                    ? "You're checked in"
                    : "Ready to start your day?"}
              </h2>

              <p className="mt-2 text-sm text-slate-300">
                {myTodayRecord?.checkIn
                  ? `Checked in at ${formatTime(myTodayRecord.checkIn)}`
                  : "Record your attendance when you start work."}
              </p>

              {myTodayRecord?.checkOut && (
                <p className="mt-1 text-sm text-slate-300">
                  Checked out at {formatTime(myTodayRecord.checkOut)}
                </p>
              )}
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:min-w-40">
              {!myTodayRecord ? (
                <Button
                  onClick={() => performAttendanceAction("check-in")}
                  loading={actionLoading}
                  disabled={loading || actionLoading}
                >
                  Check in now
                </Button>
              ) : !myTodayRecord.checkOut ? (
                <Button
                  onClick={() => performAttendanceAction("check-out")}
                  loading={actionLoading}
                  disabled={loading || actionLoading}
                >
                  Check out
                </Button>
              ) : (
                <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-center text-sm text-emerald-200">
                  Day completed
                </div>
              )}
            </div>
          </div>
        </section>
      )}
        <AttendanceCorrections user={user} />
      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Present today"
          value={todayRecords.filter((record) => record.checkIn).length}
          detail="Records with a check-in"
          icon="✓"
          color="emerald"
        />

        <SummaryCard
          label="Currently checked in"
          value={openRecords.length}
          detail="Check-out not recorded yet"
          icon="◷"
          color="indigo"
        />

        <SummaryCard
          label="Completed check-outs"
          value={completedRecords.length}
          detail="Check-in and check-out recorded"
          icon="↗"
          color="violet"
        />
      </div>

      {/* Attendance table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Attendance records
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Review check-in times, check-out times, and recorded hours.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {!isEmployee && (
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search employee..."
                aria-label="Search employee"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
              />
            )}

            <input
              type="date"
              value={selectedDate}
              max={todayUTC()}
              onChange={(event) => setSelectedDate(event.target.value)}
              aria-label="Filter by date"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by check-out status"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
            >
              <option value="all">All records</option>
              <option value="open">Awaiting check-out</option>
              <option value="completed">Completed</option>
              <option value="missing">Missing check-in</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4 p-6">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-14 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600">
              ◷
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
              No attendance records found
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Try another date or clear your filters.
            </p>

            <button
              type="button"
              onClick={() => {
                setSelectedDate("");
                setSearch("");
                setStatusFilter("all");
              }}
              className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  {[
                    "Employee",
                    "Date",
                    "Check-in",
                    "Check-out",
                    "Duration",
                    "Status",
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
                {filteredRecords.map((record) => {
                  const completed = Boolean(
                    record.checkIn && record.checkOut
                  );

                  return (
                    <tr
                      key={record._id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-semibold text-indigo-700">
                            {getEmployeeName(record)
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((part) => part[0]?.toUpperCase())
                              .join("")}
                          </div>

                          <div>
                            <p className="font-medium text-slate-900">
                              {isEmployee
                                ? "My attendance"
                                : getEmployeeName(record)}
                            </p>

                            {!isEmployee && (
                              <p className="mt-1 text-xs text-slate-500">
                                {record.employee?.department || "General"}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        {formatDate(record.date)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-700">
                        {formatTime(record.checkIn)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        {formatTime(record.checkOut)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        {durationBetween(record.checkIn, record.checkOut)}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={
                            completed
                              ? "completed"
                              : record.checkIn
                                ? "pending"
                                : "absent"
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
          Showing up to 200 records returned by the backend.
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, detail, icon, color }) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-600",
    indigo: "bg-indigo-50 text-indigo-600",
    violet: "bg-violet-50 text-violet-600",
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
