import React, { useState, useEffect } from 'react';
import {
  Plus,
  ArrowLeft,
  PencilLine,
  Trash2,
  UserCircle2,
  Phone,
  MapPin,
} from 'lucide-react';
import { API_BASE_URL } from "../config/api";

const VendorManager = () => {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [vendors, setVendors] = useState([]);

  const API_URL = `${API_BASE_URL}/vendors`;

  const [formData, setFormData] = useState({
    vendorName: '',
    phoneNumber: '',
    alternatePhone: '',
    email: '',
    address: '',
    city: '',
    openingBalance: '',
    status: 'Active',
    notes: ''
  });

  const fetchVendors = async () => {
    try {
      const response = await fetch(`${API_URL}/all`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setVendors(data);
      } else if (data.vendors && Array.isArray(data.vendors)) {
        setVendors(data.vendors);
      }
    } catch (err) {
      console.error('Fetch Error:', err);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleEdit = (vendor) => {
    setEditId(vendor._id);
    setFormData({
      vendorName: vendor.vendorName || vendor.name || '',
      phoneNumber: vendor.phoneNumber || vendor.phone || '',
      alternatePhone: vendor.alternatePhone || '',
      email: vendor.email || '',
      address: vendor.address || '',
      city: vendor.city || '',
      openingBalance: vendor.openingBalance || vendor.balance || '',
      status: vendor.status || 'Active',
      notes: vendor.notes || ''
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.vendorName || !formData.phoneNumber || !formData.address) {
      alert('Please fill all required fields.');
      return;
    }
    const payload = { ...formData, openingBalance: Number(formData.openingBalance || 0) };
    const url = editId ? `${API_URL}/update/${editId}` : `${API_URL}/add`;
    const method = editId ? 'PUT' : 'POST';
    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) { fetchVendors(); closeForm(); }
      else alert('Server Error');
    } catch (err) { alert('Network Error'); }
  };

  const deleteVendor = async (id) => {
    if (window.confirm('Are you sure you want to delete this vendor?')) {
      try {
        const response = await fetch(`${API_URL}/delete/${id}`, { method: 'DELETE' });
        if (response.ok) fetchVendors();
      } catch (err) { console.error('Delete Error:', err); }
    }
  };

  const closeForm = () => {
    setFormData({
      vendorName: '', phoneNumber: '', alternatePhone: '',
      email: '', address: '', city: '', openingBalance: '', status: 'Active', notes: ''
    });
    setEditId(null);
    setShowForm(false);
  };

  // =========================================================
  // ====================== LIST VIEW ========================
  // =========================================================

  if (!showForm) {
    return (
      <div className="w-full mx-auto p-2 sm:p-4 md:p-6 space-y-4">

        {/* HEADER */}
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
                Vendor Management
              </h1>
              <p className="text-blue-100 text-[10px] sm:text-xs font-normal hidden sm:block">
                Manage all vendors, suppliers and contact information
              </p>
            </div>
          </div>

          <button
            onClick={() => { setEditId(null); setShowForm(true); }}
            className="flex items-center gap-1.5 bg-[#2563eb] text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg font-semibold text-xs hover:bg-blue-700 transition-all shadow-sm border border-blue-400 flex-shrink-0"
          >
            <Plus size={14} />
            <span>Add Vendor</span>
          </button>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

          <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center gap-2 font-bold text-xs sm:text-sm text-[#1e40af]">
            <UserCircle2 size={16} />
            Vendors Directory
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse" style={{ minWidth: '500px' }}>

              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-3 sm:px-5 py-3">Vendor</th>
                  <th className="px-3 sm:px-5 py-3">Contact</th>
                  <th className="px-3 sm:px-5 py-3 hidden sm:table-cell">City</th>
                  <th className="px-3 sm:px-5 py-3">Balance</th>
                  <th className="px-3 sm:px-5 py-3">Status</th>
                  <th className="px-3 sm:px-5 py-3 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-700">
                {vendors.map((vendor) => (
                  <tr key={vendor._id} className="hover:bg-slate-50/80 transition-colors">

                    {/* VENDOR */}
                    <td className="px-3 sm:px-5 py-3">
                      <div className="font-semibold text-xs leading-tight">
                        {vendor.vendorName || vendor.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <MapPin size={10} className="flex-shrink-0" />
                        <span className="truncate max-w-[100px] sm:max-w-none">
                          {vendor.address}
                        </span>
                      </div>
                    </td>

                    {/* CONTACT */}
                    <td className="px-3 sm:px-5 py-3">
                      <div className="flex items-center gap-1 text-slate-600 text-xs">
                        <Phone size={11} className="flex-shrink-0" />
                        <span>{vendor.phoneNumber || vendor.phone}</span>
                      </div>
                      {vendor.email && (
                        <div className="text-[10px] text-blue-600 mt-0.5 hidden sm:block">
                          {vendor.email}
                        </div>
                      )}
                    </td>

                    {/* CITY — hidden on mobile */}
                    <td className="px-3 sm:px-5 py-3 font-medium hidden sm:table-cell">
                      {vendor.city || 'N/A'}
                    </td>

                    {/* BALANCE */}
                    <td className="px-3 sm:px-5 py-3 font-bold text-emerald-600 whitespace-nowrap">
                      Rs. {Number(vendor.openingBalance || vendor.balance || 0).toLocaleString()}
                    </td>

                    {/* STATUS */}
                    <td className="px-3 sm:px-5 py-3">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase ${
                        vendor.status === 'Inactive'
                          ? 'bg-red-50 text-red-600 border border-red-100'
                          : 'bg-green-50 text-green-600 border border-green-100'
                      }`}>
                        {vendor.status || 'Active'}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-3 sm:px-5 py-3">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => handleEdit(vendor)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                        >
                          <PencilLine size={14} />
                        </button>
                        <button
                          onClick={() => deleteVendor(vendor._id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {vendors.length === 0 && (
            <div className="p-8 sm:p-10 text-center text-slate-400 text-sm">
              No vendors found.
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
    <div className="w-full mx-auto p-2 sm:p-4 md:p-6">

      {/* FORM HEADER */}
      <div className="bg-[#1e40af] text-white p-3 sm:p-5 rounded-t-xl flex flex-wrap justify-between items-center gap-2 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={closeForm}
            className="p-1 hover:bg-blue-700 rounded-lg transition-all flex-shrink-0"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>
          <h1 className="text-sm sm:text-lg font-bold tracking-wide">
            {editId ? 'Edit Vendor Information' : 'Create New Vendor'}
          </h1>
        </div>

        <button
          onClick={closeForm}
          className="bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium text-xs hover:bg-blue-800 transition-all border border-blue-500"
        >
          Back to List
        </button>
      </div>

      {/* FORM BODY */}
      <div className="bg-white rounded-b-xl border-x border-b border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">

          {/* 1. BASIC INFO */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 border-b border-slate-100 pb-1">
              1. Vendor Basic Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Vendor Name</label>
                <input
                  type="text"
                  value={formData.vendorName}
                  onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="Enter vendor/company name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Phone Number</label>
                <input
                  type="text"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="03xx-xxxxxxx"
                />
              </div>
            </div>
          </div>

          {/* 2. CONTACT INFO */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 border-b border-slate-100 pb-1">
              2. Contact & Address Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Alternate Phone</label>
                <input
                  type="text"
                  value={formData.alternatePhone}
                  onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="example@email.com"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Vendor Address</label>
                <textarea
                  rows="3"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="Enter full address"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="City name"
                />
              </div>
            </div>
          </div>

          {/* 3. FINANCIAL INFO */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 border-b border-slate-100 pb-1">
              3. Financial Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Opening Balance</label>
                <input
                  type="number"
                  value={formData.openingBalance}
                  onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Vendor Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium cursor-pointer"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4. NOTES */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 border-b border-slate-100 pb-1">
              4. Additional Notes
            </h3>
            <textarea
              rows="4"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-3 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium"
              placeholder="Any important notes about this vendor..."
            />
          </div>

        </div>

        {/* FOOTER */}
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
            className="px-4 sm:px-6 py-2 bg-[#0284c7] text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition-all shadow-sm"
          >
            {editId ? 'Update Vendor' : 'Save Vendor'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorManager;
