import React, { useState, useEffect } from 'react';

import {
  Plus,
  Trash2,
  ArrowLeft,
  PencilLine,
  Scale,
  Hash,
  Info,
  Clock,
  Ruler
} from 'lucide-react';
import { API_BASE_URL } from "../config/api";

const UnitManager = () => {

  const [showForm, setShowForm] = useState(false);

  const [editId, setEditId] = useState(null);

  const [units, setUnits] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    shortName: "",
    description: ""
  });

  // API URL
  const API_URL = `${API_BASE_URL}/units`;

  // ================= FETCH DATA =================
  const fetchUnits = async () => {

    try {

      const response = await fetch(`${API_URL}/all`);

      const data = await response.json();

      if (response.ok) {
        setUnits(data);
      }

    } catch (error) {
      console.error("Error fetching units:", error);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  // ================= EDIT =================
  const handleEdit = (unit) => {

    setEditId(unit._id);

    setFormData({
      name: unit.name,
      shortName: unit.shortName,
      description: unit.description || ""
    });

    setShowForm(true);
  };

  // ================= CLOSE FORM =================
  const closeForm = () => {

    setEditId(null);

    setFormData({
      name: "",
      shortName: "",
      description: ""
    });

    setShowForm(false);
  };

  // ================= SAVE / UPDATE =================
  const handleSave = async () => {

    if (!formData.name || !formData.shortName) {
      alert("Please fill all required fields");
      return;
    }

    const method = editId ? "PUT" : "POST";

    const url = editId
      ? `${API_URL}/update/${editId}`
      : `${API_URL}/add`;

    try {

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {

        fetchUnits();

        closeForm();

      } else {

        const errData = await response.json();

        alert(
          "Error: " +
          (errData.error || "Failed to save")
        );
      }

    } catch (error) {

      alert("Server connection failed");

    }
  };

  // ================= DELETE =================
  const deleteUnit = async (id) => {

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this unit?"
    );

    if (!confirmDelete) return;

    try {

      const response = await fetch(
        `${API_URL}/delete/${id}`,
        {
          method: "DELETE"
        }
      );

      if (response.ok) {
        fetchUnits();
      }

    } catch (error) {

      alert("Delete failed");

    }
  };

  // ================= LIST VIEW =================
  if (!showForm) {

    return (

      <div className="w-full mx-auto p-6 space-y-6">

        {/* HEADER */}
        <div className="bg-[#1e40af] text-white p-5 rounded-t-xl flex justify-between items-center relative shadow-sm">

          <div className="flex items-center gap-3">

            <button
              onClick={() => window.history.back()}
              className="p-1 hover:bg-blue-700 rounded-lg transition-all"
            >
              <ArrowLeft
                size={20}
                className="text-white"
              />
            </button>

            <div>

              <h1 className="text-lg font-bold text-white tracking-wide">
                Units Management
              </h1>

              <p className="text-blue-100 text-xs font-normal">
                Manage product measurement units
              </p>

            </div>

          </div>

          <button
            onClick={() => {
              setEditId(null);
              setShowForm(true);
            }}
            className="flex items-center gap-1.5 bg-[#2563eb] text-white px-5 py-2.5 rounded-lg font-semibold text-xs hover:bg-blue-700 transition-all shadow-sm border border-blue-400"
          >
            <Plus size={16} />
            Add New Unit
          </button>

        </div>

        {/* TABLE SECTION */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

          {/* TOP BAR */}
          <div className="p-4 border-b border-slate-100 flex items-center gap-2 font-bold text-sm text-[#1e40af]">

            <Clock size={16} />

            Units List

          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">

            <table className="w-full text-left text-xs border-collapse">

              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">

                <tr>

                  <th className="px-5 py-3.5">
                    #
                  </th>

                  <th className="px-5 py-3.5">
                    Unit Name
                  </th>

                  <th className="px-5 py-3.5">
                    Short Name
                  </th>

                  <th className="px-5 py-3.5">
                    Description
                  </th>

                  <th className="px-5 py-3.5 text-center">
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-700">

                {units.map((unit, index) => (

                  <tr
                    key={unit._id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >

                    <td className="px-5 py-3.5 font-medium text-slate-500">
                      {index + 1}
                    </td>

                    <td className="px-5 py-3.5">

                      <div className="flex items-center gap-2">

                        <div className="p-1.5 bg-blue-50 rounded-md">

                          <Ruler
                            size={14}
                            className="text-blue-600"
                          />

                        </div>

                        <span className="font-semibold">
                          {unit.name}
                        </span>

                      </div>

                    </td>

                    <td className="px-5 py-3.5">

                      <span className="font-bold text-blue-700">
                        {unit.shortName}
                      </span>

                    </td>

                    <td className="px-5 py-3.5 text-slate-500 italic">
                      {unit.description || "No description"}
                    </td>

                    <td className="px-5 py-3.5">

                      <div className="flex justify-center gap-1.5">

                        <button
                          onClick={() => handleEdit(unit)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                        >
                          <PencilLine size={16} />
                        </button>

                        <button
                          onClick={() => deleteUnit(unit._id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                        >
                          <Trash2 size={16} />
                        </button>

                      </div>

                    </td>

                  </tr>

                ))}

                {units.length === 0 && (

                  <tr>

                    <td
                      colSpan="5"
                      className="text-center py-10 text-slate-400"
                    >
                      No units found. Please add a new unit.
                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>

    );
  }

  // ================= FORM VIEW =================
  return (

    <div className="w-full mx-auto p-6">

      {/* HEADER */}
      <div className="bg-[#1e40af] text-white p-5 rounded-t-xl flex justify-between items-center shadow-sm">

        <div className="flex items-center gap-3">

          <button
            onClick={closeForm}
            className="p-1 hover:bg-blue-700 rounded-lg transition-all"
          >
            <ArrowLeft
              size={20}
              className="text-white"
            />
          </button>

          <h1 className="text-lg font-bold tracking-wide">

            {editId
              ? 'Edit Unit'
              : 'Create New Unit'}

          </h1>

        </div>

        <button
          onClick={closeForm}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-xs hover:bg-blue-800 transition-all border border-blue-500"
        >
          Back to List
        </button>

      </div>

      {/* FORM BODY */}
      <div className="bg-white rounded-b-xl border-x border-b border-slate-200 shadow-sm overflow-hidden">

        <div className="p-6 space-y-8">

          {/* SECTION */}
          <div>

            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 border-b border-slate-100 pb-1">
              1. Unit Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* UNIT NAME */}
              <div className="space-y-1.5">

                <label className="text-xs font-semibold text-slate-600">
                  Full Unit Name
                </label>

                <div className="relative">

                  <Scale
                    size={16}
                    className="absolute left-3 top-3 text-slate-400"
                  />

                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: e.target.value
                      })
                    }
                    className="w-full pl-10 pr-4 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                    placeholder="e.g. Kilogram"
                  />

                </div>

              </div>

              {/* SHORT NAME */}
              <div className="space-y-1.5">

                <label className="text-xs font-semibold text-slate-600">
                  Short Name / Symbol
                </label>

                <div className="relative">

                  <Hash
                    size={16}
                    className="absolute left-3 top-3 text-slate-400"
                  />

                  <input
                    type="text"
                    value={formData.shortName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        shortName: e.target.value
                      })
                    }
                    className="w-full pl-10 pr-4 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                    placeholder="e.g. kg"
                  />

                </div>

              </div>

            </div>

          </div>

          {/* SECTION 2 */}
          <div>

            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 border-b border-slate-100 pb-1">
              2. Additional Details
            </h3>

            {/* DESCRIPTION */}
            <div className="space-y-1.5">

              <label className="text-xs font-semibold text-slate-600">
                Description
              </label>

              <div className="relative">

                <Info
                  size={16}
                  className="absolute left-3 top-3 text-slate-400"
                />

                <textarea
                  rows="4"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value
                    })
                  }
                  className="w-full pl-10 pr-4 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium resize-none"
                  placeholder="Write short unit description..."
                />

              </div>

            </div>

          </div>

          {/* PREVIEW CARD */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex justify-between items-center">

            <div>

              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Unit Preview
              </p>

              <h2 className="text-lg font-bold text-slate-800 mt-1">
                {formData.name || "Unit Name"}
              </h2>

              <p className="text-xs text-slate-500 mt-1">
                {formData.shortName || "kg"}
              </p>

            </div>

            <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md text-xs font-bold uppercase">
              Measurement
            </div>

          </div>

        </div>

        {/* FOOTER */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">

          <button
            type="button"
            onClick={closeForm}
            className="px-5 py-2 border border-slate-300 text-slate-600 font-medium text-xs rounded-lg bg-white hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 bg-[#0284c7] text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition-all shadow-sm"
          >
            {editId
              ? 'Update Changes'
              : 'Save Unit'}
          </button>

        </div>

      </div>

    </div>

  );
};

export default UnitManager;
