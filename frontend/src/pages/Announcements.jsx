
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../utils/api";
import Button from "../components/Button";
import Input from "../components/Input";

const emptyForm = {
  title: "",
  message: "",
  audience: "All",
  status: "Draft",
};

function formatDate(date) {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusPill({ status }) {
  const styles =
    status === "Published"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
      : "bg-amber-50 text-amber-700 ring-amber-600/20";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles}`}
    >
      {status}
    </span>
  );
}

export default function Announcements({ user }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const canManage = ["Admin", "HR"].includes(user?.role);

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("announcements");
      setAnnouncements(data.announcements || []);
    } catch (err) {
      setError(err.message || "Unable to load announcements.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  function openCreateForm() {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setFormOpen(true);
    
  }

  function openEditForm(announcement) {
    setEditing(announcement);
    setForm({
      title: announcement.title || "",
      message: announcement.message || "",
      audience: announcement.audience || "All",
      status: announcement.status || "Draft",
    });
    setFormError("");
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setEditing(null);
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

    if (form.title.trim().length < 3) {
      setFormError("Title must contain at least 3 characters.");
      return;
    }

    if (form.message.trim().length < 3) {
      setFormError("Message must contain at least 3 characters.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        audience: form.audience,
        status: form.status,
      };

      if (editing) {
        await apiRequest(`announcements/${editing._id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setNotice("Announcement updated successfully.");
      } else {
        await apiRequest("announcements", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice(
          payload.status === "Published"
            ? "Announcement published successfully."
            : "Draft saved successfully."
        );
      }

      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await loadAnnouncements();
    } catch (err) {
      setFormError(err.message || "Unable to save announcement.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(announcement) {
    const confirmed = window.confirm(
      `Delete "${announcement.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await apiRequest(`announcements/${announcement._id}`, {
        method: "DELETE",
      });

      setAnnouncements((current) =>
        current.filter((item) => item._id !== announcement._id)
      );

      setNotice("Announcement deleted successfully.");
    } catch (err) {
      setError(err.message || "Unable to delete announcement.");
    }
  }

  async function togglePublish(announcement) {
    setError("");
    setNotice("");

    const nextStatus =
      announcement.status === "Published" ? "Draft" : "Published";

    try {
      await apiRequest(`announcements/${announcement._id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });

      setNotice(
        nextStatus === "Published"
          ? "Announcement published successfully."
          : "Announcement moved back to draft."
      );

      await loadAnnouncements();
    } catch (err) {
      setError(err.message || "Unable to update announcement status.");
    }
  }

  return (
    <div className="space-y-7 pb-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-indigo-600">
            Company / Communication
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Announcements
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Share important updates and keep your team informed.
          </p>
        </div>

        {canManage && (
          <Button onClick={openCreateForm}>
            + Create announcement
          </Button>
        )}
      </div>

      {notice && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
            className="font-semibold"
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
            onClick={loadAnnouncements}
            className="font-semibold underline"
          >
            Try again
          </button>
        </div>
      )}

      {formOpen && (
        <section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">
              {editing ? "Edit announcement" : "Create announcement"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Save a draft or publish it for the selected audience.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Announcement title"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Office holiday schedule"
              required
            />

            <div>
              <label
                htmlFor="announcement-message"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Message
              </label>
              <textarea
                id="announcement-message"
                name="message"
                value={form.message}
                onChange={handleChange}
                rows={5}
                maxLength={5000}
                required
                placeholder="Write the details for your team..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
              />
              <p className="mt-1 text-right text-xs text-slate-400">
                {form.message.length}/5000
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="announcement-audience"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Audience
                </label>
                <select
                  id="announcement-audience"
                  name="audience"
                  value={form.audience}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                >
                  <option value="All">Everyone</option>
                  <option value="HR">HR only</option>
                  <option value="Employee">Employees only</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="announcement-status"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Status
                </label>
                <select
                  id="announcement-status"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                >
                  <option value="Draft">Save as draft</option>
                  <option value="Published">Publish now</option>
                </select>
              </div>
            </div>

            {formError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {formError}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving} disabled={saving}>
                {saving
                  ? "Saving..."
                  : form.status === "Published"
                    ? "Publish announcement"
                    : "Save draft"}
              </Button>
            </div>
          </form>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {canManage ? "Manage announcements" : "Company updates"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {announcements.length}{" "}
              {announcements.length === 1 ? "announcement" : "announcements"}
            </p>
          </div>
          <button
            type="button"
            onClick={loadAnnouncements}
            disabled={loading}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div className="space-y-4 p-5">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600">
              ◈
            </div>
            <h3 className="mt-4 font-semibold text-slate-900">
              No announcements yet
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              {canManage
                ? "Create an announcement to share an important update with your team."
                : "Published company updates for your account will appear here."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {announcements.map((announcement) => (
              <article
                key={announcement._id}
                className="p-5 transition hover:bg-slate-50/60 sm:p-6"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900">
                        {announcement.title}
                      </h3>
                      {canManage && (
                        <StatusPill status={announcement.status} />
                      )}
                    </div>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {announcement.message}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>
                        Audience: {announcement.audience}
                      </span>
                      <span>
                        {announcement.status === "Published"
                          ? "Published"
                          : "Created"}{" "}
                        {formatDate(
                          announcement.publishedAt || announcement.createdAt
                        )}
                      </span>
                      {announcement.createdBy?.name && (
                        <span>
                          By {announcement.createdBy.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => openEditForm(announcement)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => togglePublish(announcement)}
                      >
                        {announcement.status === "Published"
                          ? "Unpublish"
                          : "Publish"}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleDelete(announcement)}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
