
export default function Input({
  label,
  error,
  id,
  className = "",
  ...props
}) {
  const inputId = id || props.name;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-700"
        >
          {label}
        </label>
      )}

      <input
        id={inputId}
        className={`w-full rounded-xl border bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 ${
          error ? "border-red-400" : "border-slate-200"
        } ${className}`}
        {...props}
      />

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
    