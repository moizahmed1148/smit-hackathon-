
export default function StatCard({
  title,
  value,
  description,
  icon = "◈",
  accent = "blue",
}) {
  const accents = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <article className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
            {value ?? "—"}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${
            accents[accent] || accents.blue
          }`}
        >
          {icon}
        </div>
      </div>

      {description && (
        <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
          {description}
        </p>
      )}
    </article>
  );
}
