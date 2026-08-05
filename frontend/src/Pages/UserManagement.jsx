import React, { useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserCog,
  UserRoundCheck,
  UserRoundX,
  X,
} from "lucide-react";

import { API_BASE_URL } from "../config/api";
import { useAuth } from "../auth/AuthContext";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

const emptyCreateForm = {
  username: "",
  email: "",
  role: "viewer",
  password: "",
  status: "Active",
};

const apiRequest = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) {
    throw new Error(data.message || data.error || "Request failed");
  }
  return data;
};

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
      onMouseDown={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <h2 className="text-xl font-black text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="pt-5">{children}</div>
      </div>
    </div>
  );
}

function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [temporaryPassword, setTemporaryPassword] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (roleFilter !== "All") params.set("role", roleFilter);
      if (statusFilter !== "All") params.set("status", statusFilter);

      const [usersData, rolesData] = await Promise.all([
        apiRequest(`${API_BASE_URL}/users/all?${params.toString()}`),
        apiRequest(`${API_BASE_URL}/users/roles`),
      ]);

      setUsers(Array.isArray(usersData.users) ? usersData.users : []);
      setRoles(Array.isArray(rolesData.roles) ? rolesData.roles : []);
    } catch (requestError) {
      setError(requestError.message || "Users could not be loaded.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter, statusFilter]);

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((row) => row.status === "Active").length,
      inactive: users.filter((row) => row.status === "Inactive").length,
      sessions: users.reduce(
        (sum, row) => sum + Number(row.activeSessions || 0),
        0
      ),
    }),
    [users]
  );

  const createUser = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await apiRequest(`${API_BASE_URL}/users/add`, {
        method: "POST",
        body: JSON.stringify(createForm),
      });
      setCreateOpen(false);
      setCreateForm(emptyCreateForm);
      await load();
    } catch (requestError) {
      alert(requestError.message || "User could not be created.");
    } finally {
      setSaving(false);
    }
  };

  const updateUser = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await apiRequest(`${API_BASE_URL}/users/update/${editUser.id}`, {
        method: "PUT",
        body: JSON.stringify({
          username: editUser.username,
          email: editUser.email,
          role: editUser.role,
          status: editUser.status,
          extraPermissions: editUser.extraPermissions || [],
          deniedPermissions: editUser.deniedPermissions || [],
        }),
      });
      setEditUser(null);
      await load();
    } catch (requestError) {
      alert(requestError.message || "User could not be updated.");
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await apiRequest(`${API_BASE_URL}/users/reset-password/${resetUser.id}`, {
        method: "POST",
        body: JSON.stringify({ temporaryPassword }),
      });
      setResetUser(null);
      setTemporaryPassword("");
      await load();
    } catch (requestError) {
      alert(requestError.message || "Password could not be reset.");
    } finally {
      setSaving(false);
    }
  };

  const revokeSessions = async (row) => {
    if (!window.confirm(`Revoke all active sessions for ${row.username}?`)) {
      return;
    }

    try {
      await apiRequest(`${API_BASE_URL}/users/revoke-sessions/${row.id}`, {
        method: "POST",
      });
      await load();
    } catch (requestError) {
      alert(requestError.message || "Sessions could not be revoked.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Users & Roles</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create accounts, assign roles, reset passwords and revoke sessions.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCcw className="h-4 w-4" /> Refresh
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-bold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Add user
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total users", stats.total, UserCog],
          ["Active", stats.active, UserRoundCheck],
          ["Inactive", stats.inactive, UserRoundX],
          ["Active sessions", stats.sessions, ShieldCheck],
        ].map(([label, value, Icon]) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
              </div>
              <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={`${inputClass} pl-10`}
              placeholder="Search username or email"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className={inputClass}
          >
            <option>All</option>
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={inputClass}
          >
            <option>All</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="p-3">Account</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Password</th>
                <th className="p-3">Sessions</th>
                <th className="p-3">Last sign-in</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{row.username}</div>
                      <div className="text-xs text-slate-500">{row.email || "—"}</div>
                    </td>
                    <td className="p-3 font-semibold text-slate-700">{row.roleLabel}</td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          row.status === "Active"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-600">
                      {row.mustChangePassword ? "Change required" : "Current"}
                    </td>
                    <td className="p-3 font-bold text-slate-700">
                      {row.activeSessions || 0}
                    </td>
                    <td className="p-3 text-xs text-slate-600">
                      {row.lastLoginAt
                        ? new Date(row.lastLoginAt).toLocaleString("en-PK")
                        : "Never"}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditUser({ ...row })}
                          className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setResetUser(row)}
                          className="rounded-lg bg-amber-50 p-2 text-amber-700 hover:bg-amber-100"
                          title="Reset password"
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>
                        {row.id !== currentUser?.id ? (
                          <button
                            type="button"
                            onClick={() => revokeSessions(row)}
                            className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                          >
                            Revoke
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {createOpen ? (
        <Modal title="Create user" onClose={() => setCreateOpen(false)}>
          <form onSubmit={createUser} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">
                Username
              </label>
              <input
                value={createForm.username}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    username: event.target.value,
                  }))
                }
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">
                Email
              </label>
              <input
                type="email"
                value={createForm.email}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">
                Role
              </label>
              <select
                value={createForm.role}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    role: event.target.value,
                  }))
                }
                className={inputClass}
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">
                Status
              </label>
              <select
                value={createForm.status}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
                className={inputClass}
              >
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold text-slate-600">
                Temporary password
              </label>
              <input
                type="password"
                value={createForm.password}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                className={inputClass}
                required
              />
              <p className="mt-2 text-xs text-slate-500">
                Minimum 12 characters with upper/lowercase, number and special character.
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 sm:col-span-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create user
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {editUser ? (
        <Modal title="Edit user" onClose={() => setEditUser(null)}>
          <form onSubmit={updateUser} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">
                Username
              </label>
              <input
                value={editUser.username}
                onChange={(event) =>
                  setEditUser((current) => ({
                    ...current,
                    username: event.target.value,
                  }))
                }
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">
                Email
              </label>
              <input
                type="email"
                value={editUser.email || ""}
                onChange={(event) =>
                  setEditUser((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">
                Role
              </label>
              <select
                value={editUser.role}
                onChange={(event) =>
                  setEditUser((current) => ({
                    ...current,
                    role: event.target.value,
                  }))
                }
                className={inputClass}
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">
                Status
              </label>
              <select
                value={editUser.status}
                onChange={(event) =>
                  setEditUser((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
                className={inputClass}
              >
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 sm:col-span-2">
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white disabled:opacity-60"
              >
                Save changes
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {resetUser ? (
        <Modal title="Reset password" onClose={() => setResetUser(null)}>
          <form onSubmit={resetPassword} className="space-y-4">
            <p className="text-sm leading-6 text-slate-600">
              Set a temporary password for <b>{resetUser.username}</b>. All active
              sessions will be revoked and a password change will be required at the
              next sign-in.
            </p>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">
                Temporary password
              </label>
              <input
                type="password"
                value={temporaryPassword}
                onChange={(event) => setTemporaryPassword(event.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setResetUser(null)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-amber-600 px-5 py-2.5 font-bold text-white disabled:opacity-60"
              >
                Reset password
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

export default UserManagement;
