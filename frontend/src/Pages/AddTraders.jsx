import React, { useState, useEffect } from 'react';
import {
  Plus,
  ArrowLeft,
  PencilLine,
  Trash2,
  UserCircle2,
  Phone,
  MapPin,
  Landmark,
  Mail,
  CreditCard,
  ShieldCheck
} from 'lucide-react';
import { API_BASE_URL } from "../config/api";

const TraderManager = () => {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [traders, setTraders] = useState([]);

  const API_URL = `${API_BASE_URL}/traders`;

  // فارم ڈیٹا
  const [formData, setFormData] = useState({
    traderName: '',
    phoneNumber: '',
    alternatePhone: '',
    email: '',
    address: '',
    city: '',
    openingBalance: '',
    cnic: '',
    status: 'Active',
    notes: ''
  });

  // ---------------- FETCH DATA ----------------
  const fetchTraders = async () => {
    try {
      const response = await fetch(`${API_URL}/all`);
      const data = await response.json();

      if (Array.isArray(data)) {
        setTraders(data);
      } else if (data.traders && Array.isArray(data.traders)) {
        setTraders(data.traders);
      }
    } catch (err) {
      console.error('Fetch Error:', err);
    }
  };

  useEffect(() => {
    fetchTraders();
  }, []);

  // ---------------- EDIT ----------------
  const handleEdit = (trader) => {
    setEditId(trader._id);

    setFormData({
      traderName: trader.traderName || trader.name || '',
      phoneNumber: trader.phoneNumber || trader.phone || '',
      alternatePhone: trader.alternatePhone || '',
      email: trader.email || '',
      address: trader.address || '',
      city: trader.city || '',
      openingBalance: trader.openingBalance || trader.balance || '',
      cnic: trader.cnic || '',
      status: trader.status || 'Active',
      notes: trader.notes || ''
    });

    setShowForm(true);
  };

  // ---------------- SAVE ----------------
  const handleSave = async () => {
    if (
      !formData.traderName ||
      !formData.phoneNumber ||
      !formData.address
    ) {
      alert('Please fill all required fields.');
      return;
    }

    const payload = {
      ...formData,
      openingBalance: Number(formData.openingBalance || 0)
    };

    const url = editId
      ? `${API_URL}/update/${editId}`
      : `${API_URL}/add`;

    const method = editId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        fetchTraders();
        closeForm();
      } else {
        alert('Server Error');
      }
    } catch (err) {
      alert('Network Error');
    }
  };

  // ---------------- DELETE ----------------
  const deleteTrader = async (id) => {
    if (window.confirm('Are you sure you want to delete this trader?')) {
      try {
        const response = await fetch(`${API_URL}/delete/${id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          fetchTraders();
        }
      } catch (err) {
        console.error('Delete Error:', err);
      }
    }
  };

  // ---------------- CLOSE FORM ----------------
  const closeForm = () => {
    setFormData({
      traderName: '',
      phoneNumber: '',
      alternatePhone: '',
      email: '',
      address: '',
      city: '',
      openingBalance: '',
      cnic: '',
      status: 'Active',
      notes: ''
    });

    setEditId(null);
    setShowForm(false);
  };

  // =========================================================
  // ====================== LIST VIEW ========================
  // =========================================================

  if (!showForm) {
    return (
      <div className="w-full mx-auto p-6 space-y-6">

        {/* HEADER */}
        <div className="bg-[#1e40af] text-white p-5 rounded-t-xl flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">

            <button
              onClick={() => window.history.back()}
              className="p-1 hover:bg-blue-700 rounded-lg transition-all"
            >
              <ArrowLeft size={20} className="text-white" />
            </button>

            <div>
              <h1 className="text-lg font-bold tracking-wide">
                Trader Management
              </h1>

              <p className="text-blue-100 text-xs font-normal">
                Manage all traders, balances and contact information
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
            Add New Trader
          </button>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

          <div className="p-4 border-b border-slate-100 flex items-center gap-2 font-bold text-sm text-[#1e40af]">
            <UserCircle2 size={16} />
            Traders Directory
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">

              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Trader</th>
                  <th className="px-5 py-3.5">Contact</th>
                  <th className="px-5 py-3.5">City</th>
                  <th className="px-5 py-3.5">Balance</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-700">

                {traders.map((trader) => (
                  <tr
                    key={trader._id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >

                    {/* TRADER */}
                    <td className="px-5 py-3.5">
                      <div className="font-semibold">
                        {trader.traderName || trader.name}
                      </div>

                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                        <MapPin size={12} />
                        {trader.address}
                      </div>
                    </td>

                    {/* CONTACT */}
                    <td className="px-5 py-3.5">

                      <div className="flex items-center gap-1 text-slate-600">
                        <Phone size={13} />
                        {trader.phoneNumber || trader.phone}
                      </div>

                      {trader.email && (
                        <div className="text-[11px] text-blue-600 mt-1">
                          {trader.email}
                        </div>
                      )}
                    </td>

                    {/* CITY */}
                    <td className="px-5 py-3.5 font-medium">
                      {trader.city || 'N/A'}
                    </td>

                    {/* BALANCE */}
                    <td className="px-5 py-3.5 font-bold text-emerald-600">
                      Rs.{' '}
                      {Number(
                        trader.openingBalance || trader.balance || 0
                      ).toLocaleString()}
                    </td>

                    {/* STATUS */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase ${
                          trader.status === 'Inactive'
                            ? 'bg-red-50 text-red-600 border border-red-100'
                            : 'bg-green-50 text-green-600 border border-green-100'
                        }`}
                      >
                        {trader.status || 'Active'}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-5 py-3.5">
                      <div className="flex justify-center gap-1.5">

                        <button
                          onClick={() => handleEdit(trader)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                        >
                          <PencilLine size={16} />
                        </button>

                        <button
                          onClick={() => deleteTrader(trader._id)}
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

          {traders.length === 0 && (
            <div className="p-10 text-center text-slate-400 text-sm">
              No traders found.
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================
  // ====================== FORM VIEW ========================
  // =========================================================

  return (
    <div className="w-full mx-auto p-6">

      {/* HEADER */}
      <div className="bg-[#1e40af] text-white p-5 rounded-t-xl flex justify-between items-center shadow-sm">

        <div className="flex items-center gap-3">

          <button
            onClick={closeForm}
            className="p-1 hover:bg-blue-700 rounded-lg transition-all"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>

          <h1 className="text-lg font-bold tracking-wide">
            {editId
              ? 'Edit Trader Information'
              : 'Create New Trader'}
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

          {/* BASIC INFO */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 border-b border-slate-100 pb-1">
              1. Trader Basic Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* NAME */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Trader Name
                </label>

                <input
                  type="text"
                  value={formData.traderName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      traderName: e.target.value
                    })
                  }
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="Enter trader/company name"
                />
              </div>

              {/* PHONE */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Phone Number
                </label>

                <input
                  type="text"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      phoneNumber: e.target.value
                    })
                  }
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="03xx-xxxxxxx"
                />
              </div>

            </div>
          </div>

          {/* CONTACT INFO */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 border-b border-slate-100 pb-1">
              2. Contact & Address Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* ALT PHONE */}
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
                      alternatePhone: e.target.value
                    })
                  }
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="Optional"
                />
              </div>

              {/* EMAIL */}
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
                      email: e.target.value
                    })
                  }
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="example@email.com"
                />
              </div>

              {/* ADDRESS */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-600">
                  Trader Address
                </label>

                <textarea
                  rows="3"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: e.target.value
                    })
                  }
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="Enter full address"
                />
              </div>

              {/* CITY */}
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
                      city: e.target.value
                    })
                  }
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="City name"
                />
              </div>

              {/* CNIC */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  CNIC / NTN
                </label>

                <input
                  type="text"
                  value={formData.cnic}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cnic: e.target.value
                    })
                  }
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="Optional"
                />
              </div>

            </div>
          </div>

          {/* FINANCIAL INFO */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 border-b border-slate-100 pb-1">
              3. Financial Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* OPENING BALANCE */}
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
                      openingBalance: e.target.value
                    })
                  }
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="0.00"
                />
              </div>

              {/* STATUS */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Trader Status
                </label>

                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value
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

          {/* NOTES */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 border-b border-slate-100 pb-1">
              4. Additional Notes
            </h3>

            <textarea
              rows="4"
              value={formData.notes}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  notes: e.target.value
                })
              }
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-3 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium"
              placeholder="Any important notes about this trader..."
            />
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
            {editId ? 'Update Trader' : 'Save Trader'}
          </button>

        </div>
      </div>
    </div>
  );
};

export default TraderManager;
