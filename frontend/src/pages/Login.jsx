
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";
import { apiRequest } from "../utils/api";

export default function Login({ onLogin }) {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (!data.token || !data.user) {
        throw new Error("The server returned an unexpected login response.");
      }

      localStorage.setItem("token", data.token);
      onLogin(data.user);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/60 md:grid-cols-2">
        <section className="hidden flex-col justify-between bg-indigo-700 p-10 text-white md:flex">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold">
              P
            </div>
            <h1 className="mt-8 text-4xl font-bold tracking-tight">
              PeoplePulse
            </h1>
            <p className="mt-4 max-w-sm leading-7 text-indigo-100">
              A simpler way to manage your people, attendance, leave requests,
              and payroll.
            </p>
          </div>

          <p className="text-sm text-indigo-200">
            Human Capital Management · HCM Lite
          </p>
        </section>

        <section className="p-7 sm:p-10">
          <div className="mb-8">
            <p className="text-sm font-semibold text-indigo-600">
              PEOPLEPULSE HCM
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Sign in to access your workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email address"
              name="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <Input
              label="Password"
              name="password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full">
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-slate-400">
            Access is provided by your company administrator.
          </p>
        </section>
      </div>
    </main>
  );
}
