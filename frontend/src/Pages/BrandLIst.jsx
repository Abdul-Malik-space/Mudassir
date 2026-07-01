import React, { useState, useEffect } from 'react';

import {
  Plus,
  Trash2,
  ArrowLeft,
  PencilLine,
  Search,
  BadgeInfo,
  Clock,
  Layers
} from 'lucide-react';
import { API_BASE_URL } from "../config/api";

const BrandsManager = () => {

  const [showForm, setShowForm] = useState(false);

  const [editId, setEditId] = useState(null);

  const [brands, setBrands] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");

  const API_URL = `${API_BASE_URL}/brands`;

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    status: "Active"
  });

  // ================= FETCH DATA =================
  const fetchBrands = async () => {
    try {

      const response = await fetch(`${API_URL}/all`);

      const data = await response.json();

      console.log("brand list data is", data);

      setBrands(data);

    } catch (error) {
      console.error("Fetch Error:", error);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  // ================= EDIT =================
  const handleEdit = (brand) => {

    setEditId(brand._id);

    setFormData({
      code: brand.code,
      name: brand.name,
      description: brand.description,
      status: brand.status
    });

    setShowForm(true);
  };

  // ================= CLOSE FORM =================
  const closeForm = () => {

    setEditId(null);

    setFormData({
      code: "",
      name: "",
      description: "",
      status: "Active"
    });

    setShowForm(false);
  };

  // ================= SAVE / UPDATE =================
  const handleSave = async () => {

    if (!formData.code || !formData.name) {
      alert("Please fill Brand Code and Brand Name");
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

      const result = await response.json();

      if (response.ok) {

        fetchBrands();

        closeForm();

      } else {

        alert(
          "Error: " +
          (result.error || "Something went wrong")
        );

        console.error("Backend Error:", result);
      }

    } catch (error) {

      console.error("Network Error:", error);

      alert("Server connection failed");

    }
  };

  // ================= DELETE =================
  const deleteBrand = async (id) => {

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this brand?"
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
        fetchBrands();
      }

    } catch (error) {
      console.error("Delete Error:", error);
    }
  };

  // ================= FILTER =================
  const filteredBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    brand.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                Brands Management
              </h1>

              <p className="text-blue-100 text-xs font-normal">
                Manage and organize your product brands
              </p>
            </div>

          </div>

          <button
            onClick={() => {
              setEditId(null);

              setFormData({
                code: `BR${Math.floor(1000 + Math.random() * 9000)}`,
                name: "",
                description: "",
                status: "Active"
              });

              setShowForm(true);
            }}
            className="flex items-center gap-1.5 bg-[#2563eb] text-white px-5 py-2.5 rounded-lg font-semibold text-xs hover:bg-blue-700 transition-all shadow-sm border border-blue-400"
          >
            <Plus size={16} />
            Add New Brand
          </button>

        </div>

        {/* TABLE SECTION */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

          {/* TOP BAR */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-3">

            <div className="flex items-center gap-2 font-bold text-sm text-[#1e40af]">
              <Clock size={16} />
              Brands List
            </div>

            {/* SEARCH */}
            <div className="relative w-full md:w-72">

              <Search
                size={16}
                className="absolute left-3 top-3 text-slate-400"
              />

              <input
                type="text"
                placeholder="Search brand..."
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(e.target.value)
                }
                className="w-full pl-9 pr-4 py-2 bg-[#f8fafc] border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
              />

            </div>

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
                    Brand Code
                  </th>

                  <th className="px-5 py-3.5">
                    Brand Name
                  </th>

                  <th className="px-5 py-3.5">
                    Description
                  </th>

                  <th className="px-5 py-3.5 text-center">
                    Status
                  </th>

                  <th className="px-5 py-3.5 text-center">
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-700">

                {filteredBrands.map((brand, index) => (

                  <tr
                    key={brand._id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >

                    <td className="px-5 py-3.5 font-medium text-slate-500">
                      {index + 1}
                    </td>

                    <td className="px-5 py-3.5">

                      <span className="font-bold text-blue-700">
                        {brand.code}
                      </span>

                    </td>

                    <td className="px-5 py-3.5">

                      <div className="flex items-center gap-2">

                        <div className="p-1.5 bg-blue-50 rounded-md">
                          <Layers
                            size={14}
                            className="text-blue-600"
                          />
                        </div>

                        <span className="font-semibold">
                          {brand.name}
                        </span>

                      </div>

                    </td>

                    <td className="px-5 py-3.5 text-slate-500 italic">
                      {brand.description || "No description"}
                    </td>

                    <td className="px-5 py-3.5 text-center">

                      <span
                        className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${
                          brand.status === "Active"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : "bg-orange-50 text-orange-600 border border-orange-100"
                        }`}
                      >
                        {brand.status}
                      </span>

                    </td>

                    <td className="px-5 py-3.5">

                      <div className="flex justify-center gap-1.5">

                        <button
                          onClick={() => handleEdit(brand)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                        >
                          <PencilLine size={16} />
                        </button>

                        <button
                          onClick={() => deleteBrand(brand._id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                        >
                          <Trash2 size={16} />
                        </button>

                      </div>

                    </td>

                  </tr>

                ))}

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
              ? 'Edit Brand'
              : 'Create New Brand'}

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
              1. Brand Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* BRAND CODE */}
              <div className="space-y-1.5">

                <label className="text-xs font-semibold text-slate-600">
                  Brand Code
                </label>

                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value
                    })
                  }
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="BR1001"
                />

              </div>

              {/* BRAND NAME */}
              <div className="space-y-1.5">

                <label className="text-xs font-semibold text-slate-600">
                  Brand Name
                </label>

                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value
                    })
                  }
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="Enter brand name..."
                />

              </div>

            </div>

          </div>

          {/* SECTION 2 */}
          <div>

            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 border-b border-slate-100 pb-1">
              2. Additional Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* DESCRIPTION */}
              <div className="space-y-1.5">

                <label className="text-xs font-semibold text-slate-600">
                  Description
                </label>

                <textarea
                  rows="4"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value
                    })
                  }
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium resize-none"
                  placeholder="Write short brand description..."
                />

              </div>

              {/* STATUS */}
              <div className="space-y-1.5">

                <label className="text-xs font-semibold text-slate-600">
                  Brand Status
                </label>

                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value
                    })
                  }
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium cursor-pointer"
                >
                  <option value="Active">
                    Active
                  </option>

                  <option value="Inactive">
                    Inactive
                  </option>

                </select>

              </div>

            </div>

          </div>

          {/* PREVIEW CARD */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex justify-between items-center">

            <div>

              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Brand Preview
              </p>

              <h2 className="text-lg font-bold text-slate-800 mt-1">
                {formData.name || "Brand Name"}
              </h2>

              <p className="text-xs text-slate-500 mt-1">
                {formData.code || "BR0000"}
              </p>

            </div>

            <span
              className={`inline-block px-3 py-1 rounded-md text-xs font-bold uppercase ${
                formData.status === "Active"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-orange-100 text-orange-700"
              }`}
            >
              {formData.status}
            </span>

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
              : 'Save Brand'}
          </button>

        </div>

      </div>

    </div>

  );
};

export default BrandsManager;
