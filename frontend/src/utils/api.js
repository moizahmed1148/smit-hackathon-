
const configuredUrl =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const API_BASE_URL = `${configuredUrl.replace(/\/+$/, "").replace(/\/api$/, "")}/api`;

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(
    `${API_BASE_URL}/${path.replace(/^\/+/, "")}`,
    {
      ...options,
      headers,
    }
  );

  const contentType = response.headers.get("content-type");
  const data = contentType?.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null
        ? data.message || data.error
        : data;

    throw new Error(message || `Request failed (${response.status})`);
  }

  return data;
}
