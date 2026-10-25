
import { useEffect, useState } from "react";
import { apiRequest } from "../utils/api";
import Button from "../components/Button";

const initialSettings = {
  timezone: "Asia/Karachi",
  officeStartTime: "09:00",
  officeEndTime: "17:00",
  gracePeriodMinutes: 10,
  weekendDays: ["Sunday"],
  officeLatitude: "",
  officeLongitude: "",
  attendanceRadiusMeters: 100,
};

const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {hint && (
        <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      )}
      <div className="mt-2">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export default function Settings() {
  const [settings, setSettings] = useState(initialSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [company, setCompany] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const data = await apiRequest("/settings");

        if (!active) return;

        setCompany(data.company || null);
        setSettings({
          ...initialSettings,
          ...(data.settings || {}),
          officeLatitude: data.settings?.officeLatitude ?? "",
          officeLongitude: data.settings?.officeLongitude ?? "",
        });
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to load company settings.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  function updateField(event) {
    const { name, value } = event.target;

    setSettings((current) => ({
      ...current,
      [name]: value,
    }));

    setSuccess("");
    setError("");
  }

  function toggleWeekend(day) {
    setSettings((current) => ({
      ...current,
      weekendDays: current.weekendDays.includes(day)
        ? current.weekendDays.filter((item) => item !== day)
        : [...current.weekendDays, day],
    }));

    setSuccess("");
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (
      (settings.officeLatitude === "") !==
      (settings.officeLongitude === "")
    ) {
      setError("Enter both office coordinates, or leave both empty.");
      return;
    }

    const payload = {
      ...settings,
      gracePeriodMinutes: Number(settings.gracePeriodMinutes),
      attendanceRadiusMeters: Number(settings.attendanceRadiusMeters),
      officeLatitude:
        settings.officeLatitude === ""
          ? null
          : Number(settings.officeLatitude),
      officeLongitude:
        settings.officeLongitude === ""
          ? null
          : Number(settings.officeLongitude),
    };

    setSaving(true);

    try {
      const data = await apiRequest("/settings", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setSettings((current) => ({
        ...current,
        ...(data.settings || {}),
        officeLatitude: data.settings?.officeLatitude ?? "",
        officeLongitude: data.settings?.officeLongitude ?? "",
      }));

      setSuccess(data.message || "Settings saved successfully.");
    } catch (err) {
      setError(err.message || "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
        Loading company settings...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-sm font-medium text-indigo-600">
          Organization
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Company Settings
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Configure your company's working hours and attendance rules.
        </p>
      </div>

      {company && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Company profile
          </p>
          <h2 className="mt-2 text-lg font-bold text-slate-900">
            {company.name}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{company.email}</p>
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

      {success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <h2 className="text-lg font-bold text-slate-900">
            Working hours
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Set the official working schedule for your organization.
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field label="Timezone" hint="Used to interpret office time.">
              <select
                name="timezone"
                value={settings.timezone}
                onChange={updateField}
                className={inputClass}
              >
                <option value="Asia/Karachi">Pakistan — Karachi</option>
                <option value="UTC">UTC</option>
                <option value="Asia/Dubai">United Arab Emirates — Dubai</option>
                <option value="Asia/Kolkata">India — Kolkata</option>
                <option value="Europe/London">United Kingdom — London</option>
                <option value="America/New_York">United States — New York</option>
              </select>
            </Field>

            <Field label="Grace period" hint="Allowed minutes after office start.">
              <input
                type="number"
                name="gracePeriodMinutes"
                min="0"
                max="180"
                required
                value={settings.gracePeriodMinutes}
                onChange={updateField}
                className={inputClass}
              />
            </Field>

            <Field label="Office start time">
              <input
                type="time"
                name="officeStartTime"
                required
                value={settings.officeStartTime}
                onChange={updateField}
                className={inputClass}
              />
            </Field>

            <Field label="Office end time">
              <input
                type="time"
                name="officeEndTime"
                required
                value={settings.officeEndTime}
                onChange={updateField}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold text-slate-700">
              Weekend days
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Select every day your organization treats as a weekend.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {weekdays.map((day) => {
                const selected = settings.weekendDays.includes(day);

                return (
                  <label
                    key={day}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                      selected
                        ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleWeekend(day)}
                      className="accent-indigo-600"
                    />
                    {day}
                  </label>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <h2 className="text-lg font-bold text-slate-900">
            Office location
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Optional coordinates and radius for future location-based attendance.
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field label="Office latitude" hint="A value between -90 and 90.">
              <input
                type="number"
                name="officeLatitude"
                min="-90"
                max="90"
                step="any"
                value={settings.officeLatitude}
                onChange={updateField}
                placeholder="e.g. 24.8607"
                className={inputClass}
              />
            </Field>

            <Field label="Office longitude" hint="A value between -180 and 180.">
              <input
                type="number"
                name="officeLongitude"
                min="-180"
                max="180"
                step="any"
                value={settings.officeLongitude}
                onChange={updateField}
                placeholder="e.g. 67.0011"
                className={inputClass}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field
                label="Attendance radius (meters)"
                hint="Intended for a future GPS attendance check."
              >
                <input
                  type="number"
                  name="attendanceRadiusMeters"
                  min="10"
                  max="10000"
                  required
                  value={settings.attendanceRadiusMeters}
                  onChange={updateField}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="min-w-40"
          >
            {saving ? "Saving..." : "Save settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
