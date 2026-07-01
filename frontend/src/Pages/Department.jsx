import React, { useState } from "react";
import { Building2, User, MapPin, Clock, CheckCircle } from "lucide-react";

export default function ProDepartmentForm() {
  const [deptColor, setDeptColor] = useState("#6366f1");
  const [success, setSuccess] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-indigo-100 p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-3xl shadow-xl flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Department Setup</h1>
            <p className="text-xs opacity-80">Create and manage departments easily</p>
          </div>
          <Building2 size={40} />
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 space-y-8">

          {/* Row 1 */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500">Department Name</label>
              <div className="flex items-center border rounded-xl px-3 focus-within:border-indigo-500">
                <Building2 className="text-gray-400" size={18} />
                <input className="w-full p-3 outline-none" placeholder="Quality Control" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500">Dept Code</label>
              <input className="w-full border rounded-xl p-3 outline-none focus:border-indigo-500" placeholder="DEPT-001" />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid md:grid-cols-3 gap-6">

            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-gray-500">Manager</label>
              <div className="flex items-center border rounded-xl px-3 focus-within:border-indigo-500">
                <User className="text-gray-400" size={18} />
                <select className="w-full p-3 outline-none bg-transparent">
                  <option>Select Manager</option>
                  <option>Irfan Ullah</option>
                  <option>M. Bilal</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500">Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={deptColor}
                  onChange={(e) => setDeptColor(e.target.value)}
                  className="h-12 w-12 rounded-lg"
                />
                <span className="text-xs font-mono">{deptColor}</span>
              </div>
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500">Location</label>
              <div className="flex items-center border rounded-xl px-3 focus-within:border-indigo-500">
                <MapPin className="text-gray-400" size={18} />
                <input className="w-full p-3 outline-none" placeholder="2nd Floor" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500">Shift</label>
              <div className="flex items-center border rounded-xl px-3 focus-within:border-indigo-500">
                <Clock className="text-gray-400" size={18} />
                <select className="w-full p-3 outline-none bg-transparent">
                  <option>Morning</option>
                  <option>Night</option>
                </select>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 rounded-xl border flex items-center gap-4" style={{ borderColor: deptColor }}>
            <div className="h-10 w-10 rounded-full" style={{ background: deptColor }}></div>
            <div>
              <p className="font-bold">Live Preview</p>
              <p className="text-xs text-gray-500">Color & style preview</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-4">
            <button className="px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200">Cancel</button>
            <button
              onClick={() => setSuccess(true)}
              className="px-8 py-3 rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-105 transition"
            >
              Create
            </button>
          </div>
        </div>

        {/* Success */}
        {success && (
          <div className="flex items-center gap-3 bg-green-100 text-green-700 p-4 rounded-xl">
            <CheckCircle /> Department Created Successfully
          </div>
        )}
      </div>
    </div>
  );
}
