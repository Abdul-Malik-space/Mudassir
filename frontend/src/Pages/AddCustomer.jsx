import React, { useState, useEffect } from "react";
import {
  Plus,
  ArrowLeft,
  PencilLine,
  Trash2,
  UserCircle2,
  Phone,
  MapPin,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

const getDefaultForm = () => ({
  customerName: "",
  phoneNumber: "",
  alternatePhone: "",
  email: "",
  address: "",
  city: "",
  openingBalance: "",
  status: "Active",
  notes: "",
});

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

const normalizeCustomers = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.customers)) return data.customers;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const apiRequest = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || "Request failed");
  }

  return data;
};

const CustomerManager = () => {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [customers, setCustomers] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const API_URL = `${API_BASE_URL}/customers`;

  const [formData, setFormData] = useState(getDefaultForm());

  const fetchCustomers = async () => {
    try {
      setLoading(true);

      const data = await apiRequest(`${API_URL}/all`);
      setCustomers(normalizeCustomers(data));
    } catch (err) {
      console.error("Customer Fetch Error:", err);
      alert(err.message || "Customers load nahi huay");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const openNewForm = () => {
    setEditId(null);
    setFormData(getDefaultForm());
    setShowForm(true);
  };

  const closeForm = () => {
    setFormData(getDefaultForm());
    setEditId(null);
    setShowForm(false);
  };

  const handleEdit = (customer) => {
    setEditId(customer._id);

    setFormData({
      customerName: customer.customerName || customer.name || "",
      phoneNumber: customer.phoneNumber || customer.phone || "",
      alternatePhone: customer.alternatePhone || "",
      email: customer.email || "",
      address: customer.address || "",
      city: customer.city || "",
      openingBalance: customer.openingBalance || customer.balance || "",
      status: customer.status || "Active",
      notes: customer.notes || "",
    });

    setShowForm(true);
  };

  const validateForm = () => {
    if (!formData.customerName.trim()) {
      alert("Customer name required hai");
      return false;
    }

    if (!formData.phoneNumber.trim()) {
      alert("Phone number required hai");
      return false;
    }

    if (!formData.address.trim()) {
      alert("Address required hai");
      return false;
    }

    return true;
  };

  const buildPayload = () => {
    const customerName = String(formData.customerName || "").trim();
    const phoneNumber = String(formData.phoneNumber || "").trim();
    const openingBalance = Number(formData.openingBalance || 0);

    const payload = {
      customerName,
      phoneNumber,
      alternatePhone: String(formData.alternatePhone || "").trim(),
      address: String(formData.address || "").trim(),
      city: String(formData.city || "").trim(),
      openingBalance,
      status: formData.status || "Active",
      notes: String(formData.notes || "").trim(),

      // Old backend compatibility
      // Agar deployed backend abhi bhi req.body.name / req.body.phone use kar raha ho
      // to charAt undefined error nahi aaye ga.
      name: customerName,
      phone: phoneNumber,
      balance: openingBalance,
    };

    const email = String(formData.email || "").trim().toLowerCase();

    if (email) {
      payload.email = email;
    }

    return payload;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = buildPayload();

      const url = editId ? `${API_URL}/update/${editId}` : `${API_URL}/add`;
      const method = editId ? "PUT" : "POST";

      await apiRequest(url, {
        method,
        body: JSON.stringify(payload),
      });

      await fetchCustomers();
      closeForm();
    } catch (err) {
      console.error("Customer Save Error:", err);
      alert(err.message || "Customer save nahi hua");
    } finally {
      setSaving(false);
    }
  };

  const deleteCustomer = async (id) => {
    if (!window.confirm("Are you sure you want to delete this customer?")) {
      return;
    }

    try {
      await apiRequest(`${API_URL}/delete/${id}`, {
        method: "DELETE",
      });

      await fetchCustomers();
    } catch (err) {
      console.error("Customer Delete Error:", err);
      alert(err.message || "Customer delete nahi hua");
    }
  };

  if (!showForm) {
    return (
      <div className="w-full mx-auto p-2 sm:p-4 md:p-6 space-y-4">
        <div className="bg-[#1e40af] text-white p-3 sm:p-5 rounded-t-xl flex flex-wrap justify-between items-center gap-2 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => window.history.back()}
              className="p-1 hover:bg-blue-700 rounded-lg transition-all flex-shrink-0"
            >
              <ArrowLeft size={20} className="text-white" />
            </button>

            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-bold tracking-wide truncate">
                Customer Management
              </h1>

              <p className="text-blue-100 text-[10px] sm:text-xs font-normal hidden sm:block">
                Manage all customers, balances and contact information
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchCustomers}
              disabled={loading}
              className="flex items-center gap-1.5 bg-blue-700 text-white px-3 py-2 rounded-lg font-semibold text-xs hover:bg-blue-800 transition-all border border-blue-400 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCcw size={14} />
              )}
              Refresh
            </button>

            <button
              onClick={openNewForm}
              className="flex items-center gap-1.5 bg-[#2563eb] text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg font-semibold text-xs hover:bg-blue-700 transition-all shadow-sm border border-blue-400 flex-shrink-0"
            >
              <Plus size={14} />
              <span>Add Customer</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center gap-2 font-bold text-xs sm:text-sm text-[#1e40af]">
            <UserCircle2 size={16} />
            Customers Directory
          </div>

          <div className="overflow-x-auto w-full">
            <table
              className="w-full text-left text-xs border-collapse"
              style={{ minWidth: "500px" }}
            >
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-3 sm:px-5 py-3">Customer</th>
                  <th className="px-3 sm:px-5 py-3">Contact</th>
                  <th className="px-3 sm:px-5 py-3 hidden sm:table-cell">
                    City
                  </th>
                  <th className="px-3 sm:px-5 py-3">Balance</th>
                  <th className="px-3 sm:px-5 py-3">Status</th>
                  <th className="px-3 sm:px-5 py-3 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-10 text-center">
                      <Loader2 className="animate-spin mx-auto text-blue-600" />
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="p-8 sm:p-10 text-center text-slate-400 text-sm"
                    >
                      No customers found.
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr
                      key={customer._id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-3 sm:px-5 py-3">
                        <div className="font-semibold text-xs leading-tight">
                          {customer.customerName || customer.name || "-"}
                        </div>

                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <MapPin size={10} className="flex-shrink-0" />
                          <span className="truncate max-w-[100px] sm:max-w-none">
                            {customer.address || "-"}
                          </span>
                        </div>
                      </td>

                      <td className="px-3 sm:px-5 py-3">
                        <div className="flex items-center gap-1 text-slate-600 text-xs">
                          <Phone size={11} className="flex-shrink-0" />
                          <span>{customer.phoneNumber || customer.phone || "-"}</span>
                        </div>

                        {customer.email && (
                          <div className="text-[10px] text-blue-600 mt-0.5 hidden sm:block">
                            {customer.email}
                          </div>
                        )}
                      </td>

                      <td className="px-3 sm:px-5 py-3 font-medium hidden sm:table-cell">
                        {customer.city || "N/A"}
                      </td>

                      <td className="px-3 sm:px-5 py-3 font-bold text-emerald-600 whitespace-nowrap">
                        {money(customer.openingBalance || customer.balance || 0)}
                      </td>

                      <td className="px-3 sm:px-5 py-3">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase ${
                            customer.status === "Inactive"
                              ? "bg-red-50 text-red-600 border border-red-100"
                              : "bg-green-50 text-green-600 border border-green-100"
                          }`}
                        >
                          {customer.status || "Active"}
                        </span>
                      </td>

                      <td className="px-3 sm:px-5 py-3">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => handleEdit(customer)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                            title="Edit"
                          >
                            <PencilLine size={14} />
                          </button>

                          <button
                            onClick={() => deleteCustomer(customer._id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto p-2 sm:p-4 md:p-6">
      <div className="bg-[#1e40af] text-white p-3 sm:p-5 rounded-t-xl flex flex-wrap justify-between items-center gap-2 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={closeForm}
            className="p-1 hover:bg-blue-700 rounded-lg transition-all flex-shrink-0"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>

          <h1 className="text-sm sm:text-lg font-bold tracking-wide">
            {editId ? "Edit Customer" : "Create New Customer"}
          </h1>
        </div>

        <button
          onClick={closeForm}
          className="bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium text-xs hover:bg-blue-800 transition-all border border-blue-500"
        >
          Back to List
        </button>
      </div>

      <div className="bg-white rounded-b-xl border-x border-b border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
          <div>
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 border-b border-slate-100 pb-1">
              1. Customer Basic Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Customer Name <span className="text-red-600">*</span>
                </label>

                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      customerName: e.target.value,
                    })
                  }
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="Enter customer name"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Phone Number <span className="text-red-600">*</span>
                </label>

                <input
                  type="text"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      phoneNumber: e.target.value,
                    })
                  }
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="03xx-xxxxxxx"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 border-b border-slate-100 pb-1">
              2. Contact & Address Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Alternate Phone
                </label>

                <input
                  type="text"
                  value={formData.alternatePhone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      alternatePhone: e.target.value,
                    })
                  }
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Email Address
                </label>

                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      email: e.target.value,
                    })
                  }
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="example@email.com"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600">
                  Customer Address <span className="text-red-600">*</span>
                </label>

                <textarea
                  rows="3"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: e.target.value,
                    })
                  }
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="Enter full address"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  City
                </label>

                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      city: e.target.value,
                    })
                  }
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="City name"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 border-b border-slate-100 pb-1">
              3. Financial Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Opening Balance
                </label>

                <input
                  type="number"
                  value={formData.openingBalance}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      openingBalance: e.target.value,
                    })
                  }
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Customer Status
                </label>

                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value,
                    })
                  }
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium cursor-pointer"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 border-b border-slate-100 pb-1">
              4. Additional Notes
            </h3>

            <textarea
              rows="4"
              value={formData.notes}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  notes: e.target.value,
                })
              }
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-3 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium"
              placeholder="Any important notes about this customer..."
            />
          </div>
        </div>

        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={closeForm}
            className="px-4 sm:px-5 py-2 border border-slate-300 text-slate-600 font-medium text-xs rounded-lg bg-white hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 sm:px-6 py-2 bg-[#0284c7] text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition-all shadow-sm disabled:opacity-60 flex items-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving
              ? "Saving..."
              : editId
              ? "Update Customer"
              : "Save Customer"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerManager;