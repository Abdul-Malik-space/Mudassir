import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  ShieldAlert,
} from "lucide-react";

import { useAuth } from "../auth/AuthContext";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

const passwordChecks = (value) => [
  { label: "At least 12 characters", passed: value.length >= 12 },
  { label: "Uppercase and lowercase letters", passed: /[A-Z]/.test(value) && /[a-z]/.test(value) },
  { label: "At least one number", passed: /[0-9]/.test(value) },
  { label: "At least one special character", passed: /[^A-Za-z0-9]/.test(value) },
];

function ChangePassword({ onComplete, embedded = false }) {
  const { user, changePassword, logout } = useAuth();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [visible, setVisible] = useState({ current: false, next: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const checks = useMemo(
    () => passwordChecks(form.newPassword),
    [form.newPassword]
  );
  const validPassword = checks.every((item) => item.passed);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!validPassword) {
      setError("The new password does not meet the security requirements.");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    try {
      setSaving(true);
      const data = await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess(data.message || "Password changed successfully.");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      if (onComplete) onComplete();
    } catch (requestError) {
      setError(requestError.message || "Password could not be changed.");
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <div className="mx-auto w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/30 sm:p-8">
      <div className="flex items-start gap-4 border-b border-slate-200 pb-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
          <KeyRound className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Change password</h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Choose a unique password that is not used for another service.
          </p>
        </div>
      </div>

      {user?.mustChangePassword ? (
        <div className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            A temporary password is active. Change it before accessing the workspace.
          </span>
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <form onSubmit={submit} className="mt-6 space-y-5">
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">
            Current password
          </label>
          <div className="relative">
            <input
              type={visible.current ? "text" : "password"}
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  currentPassword: event.target.value,
                }))
              }
              className={`${inputClass} pr-12`}
            />
            <button
              type="button"
              onClick={() =>
                setVisible((current) => ({ ...current, current: !current.current }))
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100"
            >
              {visible.current ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">
            New password
          </label>
          <div className="relative">
            <input
              type={visible.next ? "text" : "password"}
              autoComplete="new-password"
              value={form.newPassword}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  newPassword: event.target.value,
                }))
              }
              className={`${inputClass} pr-12`}
            />
            <button
              type="button"
              onClick={() =>
                setVisible((current) => ({ ...current, next: !current.next }))
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100"
            >
              {visible.next ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="grid gap-2 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
          {checks.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-2 text-xs font-semibold ${
                item.passed ? "text-emerald-700" : "text-slate-500"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              {item.label}
            </div>
          ))}
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">
            Confirm new password
          </label>
          <input
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                confirmPassword: event.target.value,
              }))
            }
            className={inputClass}
          />
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
          >
            <LogOut className="h-5 w-5" /> Sign out
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            {saving ? "Updating..." : "Update password"}
          </button>
        </div>
      </form>
    </div>
  );

  if (embedded) return content;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6">
      <div className="flex min-h-[calc(100vh-5rem)] items-center">{content}</div>
    </div>
  );
}

export default ChangePassword;
