
const statusStyles = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  inactive: "bg-slate-100 text-slate-600 ring-slate-500/20",
  rejected: "bg-red-50 text-red-700 ring-red-600/20",
  absent: "bg-red-50 text-red-700 ring-red-600/20",
};

export default function StatusBadge({ status }) {
  const normalizedStatus = String(status || "unknown").toLowerCase();

  const styles =
    statusStyles[normalizedStatus] ||
    "bg-slate-100 text-slate-600 ring-slate-500/20";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${styles}`}
    >
      {status || "Unknown"}
    </span>
  );
}
