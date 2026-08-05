import React from "react";
import { ShieldX } from "lucide-react";

function AccessDenied({ onBack }) {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="max-w-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <ShieldX className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-2xl font-black text-slate-900">Access denied</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Your assigned role does not include permission for this module.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-6 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white hover:bg-slate-800"
        >
          Return to an allowed page
        </button>
      </div>
    </div>
  );
}

export default AccessDenied;
