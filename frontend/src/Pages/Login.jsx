import React, { useState } from "react";
import {
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { useAuth } from "../auth/AuthContext";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

function Login() {
  const { login, sessionMessage, setSessionMessage } = useAuth();
  const [form, setForm] = useState({
    login: "",
    password: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSessionMessage("");

    if (!form.login.trim() || !form.password) {
      setError("Enter your username/email and password.");
      return;
    }

    try {
      setLoading(true);
      await login({
        login: form.login.trim(),
        password: form.password,
        rememberMe: form.rememberMe,
      });
    } catch (requestError) {
      setError(requestError.message || "Sign-in could not be completed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-2xl lg:grid-cols-[1.05fr_0.95fr]">
          <section className="hidden bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <ShieldCheck className="h-6 w-6 text-blue-300" />
                <span className="font-bold">Secure ERP Workspace</span>
              </div>

              <h1 className="mt-10 max-w-xl text-4xl font-black leading-tight">
                Controlled access for every operational role.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
                Permissions are verified on both the interface and the server. Every
                account receives only the modules required for its assigned role.
              </p>
            </div>

            <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                HttpOnly session security
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                Role-based permissions
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                Account lock protection
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                Security audit history
              </div>
            </div>
          </section>

          <section className="p-6 sm:p-10 lg:p-12">
            <div className="mx-auto max-w-md">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
                <LockKeyhole className="h-7 w-7" />
              </div>

              <h2 className="mt-7 text-3xl font-black text-slate-900">
                Sign in
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Use the account issued by an authorized administrator.
              </p>

              {(error || sessionMessage) && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error || sessionMessage}
                </div>
              )}

              <form onSubmit={submit} className="mt-7 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Username or email
                  </label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      autoComplete="username"
                      value={form.login}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          login: event.target.value,
                        }))
                      }
                      className={`${inputClass} pl-12`}
                      placeholder="Enter username or email"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Password
                  </label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={form.password}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      className={`${inputClass} pl-12 pr-12`}
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.rememberMe}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        rememberMe: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Keep this device signed in
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                  {loading ? "Signing in..." : "Sign in securely"}
                </button>
              </form>

              <p className="mt-6 text-center text-xs leading-5 text-slate-400">
                Repeated invalid attempts may temporarily lock an account.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Login;
