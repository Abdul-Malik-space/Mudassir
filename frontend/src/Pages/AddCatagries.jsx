import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  ArrowLeft,
  PencilLine,
  Tag,
  Clock
} from 'lucide-react';
import { API_BASE_URL } from "../config/api";

const CategoriesManager = () => {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [categories, setCategories] = useState([]);

  const API_URL = `${API_BASE_URL}/categories`;

  const [formData, setFormData] = useState({
    name: '',
    status: 'Active'
  });

  // ================= FETCH DATA =================
  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/all`);
      const data = await response.json();

      console.log("categories data", data);

      setCategories(data);
    } catch (error) {
      console.error("Fetch Error:", error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // ================= OPEN FORM =================
  const handleEdit = (category) => {
    setEditId(category._id);

    setFormData({
      name: category.name,
      status: category.status
    });

    setShowForm(true);
  };

  // ================= CLOSE FORM =================
  const closeForm = () => {
    setEditId(null);

    setFormData({
      name: '',
      status: 'Active'
    });

    setShowForm(false);
  };

  // ================= SAVE / UPDATE =================
  const handleSave = async () => {
    if (!formData.name) {
      alert("Please enter category name");
      return;
    }

    const url = editId
      ? `${API_URL}/update/${editId}`
      : `${API_URL}/add`;

    const method = editId ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        fetchCategories();
        closeForm();
      } else {
        alert("Server Error while saving category");
      }
    } catch (error) {
      alert("Network Error");
    }
  };

  // ================= DELETE =================
  const deleteCategory = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this category?"
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
        setCategories(
          categories.filter((item) => item._id !== id)
        );
      }
    } catch (error) {
      console.error("Delete Error:", error);
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
                Categories Management
              </h1>

              <p className="text-blue-100 text-xs font-normal">
                Organize and manage product categories
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
            Add New Category
          </button>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

          <div className="p-4 border-b border-slate-100 flex items-center gap-2 font-bold text-sm text-[#1e40af]">
            <Clock size={16} />
            Categories List
          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-xs border-collapse">

              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">#</th>
                  <th className="px-5 py-3.5">Category Name</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Created Date</th>
                  <th className="px-5 py-3.5 text-center">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-700">

                {categories.map((item, index) => (
                  <tr
                    key={item._id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >

                    <td className="px-5 py-3.5 font-medium text-slate-500">
                      {index + 1}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-50 rounded-md">
                          <Tag
                            size={14}
                            className="text-blue-600"
                          />
                        </div>

                        <span className="font-semibold">
                          {item.name}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">

                      <span
                        className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${
                          item.status === "Active"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : "bg-orange-50 text-orange-600 border border-orange-100"
                        }`}
                      >
                        {item.status}
                      </span>

                    </td>

                    <td className="px-5 py-3.5 text-slate-600 font-medium">
                      {item.date || "N/A"}
                    </td>

                    <td className="px-5 py-3.5">

                      <div className="flex justify-center gap-1.5">

                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                        >
                          <PencilLine size={16} />
                        </button>

                        <button
                          onClick={() =>
                            deleteCategory(item._id)
                          }
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
              ? 'Edit Category'
              : 'Create New Category'}
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
              1. Category Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* CATEGORY NAME */}
              <div className="space-y-1.5">

                <label className="text-xs font-semibold text-slate-600">
                  Category Name
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
                  placeholder="e.g. Electronics, Printing..."
                />

              </div>

              {/* STATUS */}
              <div className="space-y-1.5">

                <label className="text-xs font-semibold text-slate-600">
                  Category Status
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
                Preview
              </p>

              <h2 className="text-lg font-bold text-slate-800 mt-1">
                {formData.name || "Category Name"}
              </h2>
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
              : 'Save Category'}
          </button>

        </div>

      </div>

    </div>
  );
};

export default CategoriesManager;
