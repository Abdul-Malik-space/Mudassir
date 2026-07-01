import React, { useState, useEffect } from 'react';
import {
  PencilSquareIcon, TrashIcon, PlusIcon, XMarkIcon,
  ShoppingBagIcon, UserIcon, MagnifyingGlassIcon,
  CheckCircleIcon, ClockIcon, DocumentTextIcon,
  ChevronDownIcon, ArrowPathIcon, BanknotesIcon,
  CalendarIcon, TagIcon
} from '@heroicons/react/24/outline';
import { CheckBadgeIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { API_BASE_URL } from "../config/api";

// ─── Static Constants ───────────────────────────────────────────────────────
const STATIC_ITEMS = [
  { id: 1, name: 'Corrugated Box A4' }, { id: 2, name: 'Kraft Paper Roll' },
  { id: 3, name: 'Bubble Wrap Sheet' }, { id: 4, name: 'Foam Sheet 5mm' },
  { id: 5, name: 'Cardboard Sheet' }, { id: 6, name: 'Packing Tape' },
  { id: 7, name: 'Stretch Film' }, { id: 8, name: 'Wooden Pallet' },
];

const STATUS_OPTIONS = ['Pending', 'Received', 'Cancelled'];
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Debit Card', 'Credit Card', 'Cheque'];

const emptyItem = () => ({ itemId: '', itemName: '', unit: '', rate: '', quantity: '', type: 'debit' });

const PurchaseManager = () => {
  // ─── States ─────────────────────────────────────────────────────────────────
  const [purchases, setPurchases] = useState([]);
  const [units, setUnits] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    vendor: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Pending',
    poNumber: `PO-${Date.now().toString().slice(-6)}`,
    paymentMethod: 'Cash',
    paidAmount: '',
    items: [emptyItem()],
  });




const API_URL = `${API_BASE_URL}/purchases`;

  // ─── Data Fetching ──────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, uRes, vRes] = await Promise.all([
        fetch(`${API_URL}/all`),
        fetch(`${API_BASE_URL}/units/all`),
        fetch(`${API_BASE_URL}/vendors/all`)
      ]);

      const pData = await pRes.json();
      const uData = await uRes.json();
      const vData = await vRes.json();

      setPurchases(Array.isArray(pData) ? pData : []);
      setUnits(Array.isArray(uData) ? uData : []);

      // یہاں تبدیلی: اکثر API براہ راست Array بھیجتی ہے
      console.log("Vendors Data:", vData); // کنسول میں چیک کریں ڈیٹا آ رہا ہے؟
      setVendors(Array.isArray(vData) ? vData : (vData.vendors || []));

    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintInvoice = (p) => {
    const printWindow = window.open('', '_blank');
    const invoiceContent = `
    <html>
      <head>
        <title>Invoice - ${p.poNumber}</title>
        <style>
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }
          .vendor-info { margin: 20px 0; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #f8fafc; text-align: left; padding: 12px; font-size: 12px; text-transform: uppercase; color: #64748b; }
          td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
          .totals { text-align: right; margin-top: 30px; }
          .grand-total { font-size: 20px; font-weight: 900; color: #2563eb; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; }
          @media print { .print-btn { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 style="margin:0; color:#2563eb;">PURCHASE INVOICE</h1>
            <p style="margin:5px 0;">REF: #<b>${p.poNumber}</b></p>
          </div>
          <div style="text-align: right;">
            <p>Date: ${new Date(p.date).toLocaleDateString()}</p>
            <p>Status: <b>${p.status}</b></p>
          </div>
        </div>

        <div class="vendor-info">
          <h3 style="margin-bottom:5px;">Vendor:</h3>
          <p style="margin:0; font-size: 18px; font-weight: bold;">${p.vendor}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Description</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${p.items.map(item => `
              <tr>
                <td>${item.itemName}</td>
                <td>${item.quantity} ${item.unit}</td>
                <td>Rs. ${Number(item.rate).toLocaleString()}</td>
                <td>Rs. ${(item.quantity * item.rate).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <p>Sub Total: Rs. ${Number(p.total).toLocaleString()}</p>
          <p>Paid Amount: Rs. ${Number(p.paidAmount || 0).toLocaleString()}</p>
          <div class="grand-total">Total Balance: Rs. ${(p.total - (p.paidAmount || 0)).toLocaleString()}</div>
        </div>

        <div class="footer">
          <p>Thank you for your business!</p>
          <button class="print-btn" onclick="window.print()" style="margin-top:20px; padding:10px 25px; background:#2563eb; color:white; border:none; border-radius:8px; cursor:pointer;">Print Invoice</button>
        </div>
      </body>
    </html>
  `;
    printWindow.document.write(invoiceContent);
    printWindow.document.close();
  };

  useEffect(() => { fetchData(); }, []);

  // ─── Calculations ───────────────────────────────────────────────────────────
  const computeTotal = (items) =>
    items.reduce((sum, it) => {
      const val = (parseFloat(it.rate) || 0) * (parseFloat(it.quantity) || 0);
      return it.type === 'credit' ? sum - val : sum + val;
    }, 0);

  const grandTotal = computeTotal(formData.items);
  const paidAmt = parseFloat(formData.paidAmount) || 0;
  const remaining = grandTotal - paidAmt;

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const updateItem = (idx, field, value) => {
    const newItems = [...formData.items];
    if (field === 'itemId') {
      const found = STATIC_ITEMS.find(i => i.id === parseInt(value));
      newItems[idx] = { ...newItems[idx], itemId: value, itemName: found?.name || '' };
    } else {
      newItems[idx] = { ...newItems[idx], [field]: value };
    }
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault(); 

    setSubmitting(true);

  
    const payload = {
      ...formData,
      total: grandTotal,
      itemCount: formData.items.length
    };

    const url = editId ? `${API_URL}/update/${editId}` : `${API_URL}/add`;

    try {
      const res = await fetch(url, {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // 1. ڈیٹا بیس اپڈیٹ کریں
        await fetchData();

        // 2. انوائس ونڈو کھولیں (بغیر الگ بٹن دبائے)
        handlePrintInvoice(payload);

        // 3. فارم بند کریں
        setShowForm(false);

      } else {
        alert('Error saving order');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to connect to server');
    } finally {
      setSubmitting(false);
    }
  };
  // ─── Helper Components ─────────────────────────────────────────────────────
  const StatusBadge = ({ status }) => {
    const styles = {
      Received: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20',
      Pending: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20',
      Cancelled: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/20',
    };
    return (
      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase border ring-1 ${styles[status] || styles.Pending}`}>
        {status}
      </span>
    );
  };

  // ─── FORM VIEW ────────────────────────────────────────────────────────────────
  if (showForm) return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      {/* Sticky Form Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 mb-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <XMarkIcon className="w-6 h-6 text-slate-500" />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {editId ? 'Modify Purchase Order' : 'Create New Purchase'}
              </h1>
              {/* <p className="text-xs text-slate-500 font-medium">{formData.poNumber}</p> */}
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="text-right mr-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Grand Total</p>
              <p className="text-lg font-black text-blue-600">Rs. {grandTotal.toLocaleString()}</p>
            </div>
            <button onClick={handleSubmit} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center gap-2 disabled:opacity-50">
              {submitting ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <CheckBadgeIcon className="w-5 h-5" />}
              {editId ? 'Update Order' : 'Save Order'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section: Basic Info */}
          {/* Section: Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-6">
                <UserIcon className="w-5 h-5 text-blue-500" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Vendor & Contact Details</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Supplier Selection */}
                {/* Supplier Selection */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Select Supplier</label>
                  <div className="relative">
                    <select
                      value={formData.vendor}
                      onChange={e => setFormData({ ...formData, vendor: e.target.value })}
                      className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-50 outline-none transition-all appearance-none font-semibold"
                      required
                    >
                      <option value="">Choose a vendor...</option>
                     
                      {vendors.map(v => (
                        <option key={v._id} value={v.name}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className="w-5 h-5 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Phone Number Field */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Phone Number</label>
                  <div className="relative">
                    <input
                      type="tel"
                      placeholder="+92 300 1234567"
                      value={formData.vendorPhone || ''}
                      onChange={e => setFormData({ ...formData, vendorPhone: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-50 outline-none transition-all font-semibold"
                    />
                  </div>
                </div>

                {/* Order Date */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Order Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-50 outline-none transition-all font-semibold"
                      required
                    />
                  </div>
                </div>

                {/* Address or Location (Extra Field for completeness) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Vendor Address (Optional)</label>
                  <input
                    type="text"
                    placeholder="Shop #, City, etc."
                    value={formData.vendorAddress || ''}
                    onChange={e => setFormData({ ...formData, vendorAddress: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-50 outline-none transition-all font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Status Section */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-6">
                <TagIcon className="w-5 h-5 text-blue-500" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Status</h3>
              </div>
              <div className="space-y-4">
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFormData({ ...formData, status: opt })}
                    className={`w-full py-3 px-4 rounded-2xl border text-sm font-bold transition-all flex items-center justify-between ${formData.status === opt ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-300'
                      }`}
                  >
                    {opt}
                    {formData.status === opt && <CheckCircleIcon className="w-5 h-5" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Items Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingBagIcon className="w-5 h-5 text-slate-400" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Purchase Items</h3>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, items: [...formData.items, emptyItem()] })}
                className="bg-white hover:bg-slate-50 text-blue-600 border border-slate-200 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-sm transition-all"
              >
                <PlusIcon className="w-4 h-4 stroke-[3]" /> Add Row
              </button>
            </div>

            <div className="p-6 space-y-4">
              {formData.items.map((item, idx) => (
                <div key={idx} className="group relative grid grid-cols-1 md:grid-cols-12 gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/30 hover:bg-white hover:border-blue-200 hover:shadow-md transition-all">
                  <div className="md:col-span-4">
                    <label className="md:hidden text-[10px] font-bold text-slate-400 uppercase mb-1 block">Item Name</label>
                    <select
                      value={item.itemId}
                      onChange={e => updateItem(idx, 'itemId', e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 transition-colors"
                      required
                    >
                      <option value="">Select Item...</option>
                      {STATIC_ITEMS.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="md:hidden text-[10px] font-bold text-slate-400 uppercase mb-1 block">Unit</label>
                    <select
                      value={item.unit}
                      onChange={e => updateItem(idx, 'unit', e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500"
                    >
                      <option value="">Unit</option>
                      {['pcs', 'kg', 'box', 'roll', 'sheet'].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="md:hidden text-[10px] font-bold text-slate-400 uppercase mb-1 block">Purchase Rate</label>
                    <input
                      type="number"
                      placeholder="Rate"
                      value={item.rate}
                      onChange={e => updateItem(idx, 'rate', e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="md:hidden text-[10px]  font-bold text-slate-400 uppercase mb-1 block">Qty</label>
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={e => updateItem(idx, 'quantity', e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2 flex bg-white rounded-xl border border-slate-200 p-1">
                    <button
                      type="button"
                      onClick={() => updateItem(idx, 'type', 'debit')}
                      className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${item.type === 'debit' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400'}`}
                    >DR</button>
                    <button
                      type="button"
                      onClick={() => updateItem(idx, 'type', 'credit')}
                      className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${item.type === 'credit' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400'}`}
                    >CR</button>
                  </div>

                  <div className="md:col-span-1 flex items-center justify-center">
                    {/* <button
                      type="button"
                      onClick={() => setFormData({ ...formData, items: formData.items.filter((_, i) => i !== idx) })}
                      disabled={formData.items.length === 1}
                      className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-0"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button> */}
                  </div>

                  {/* Subtotal Indicator */}
                  {item.rate && item.quantity && (
                    <div className="md:absolute -bottom-3 right-8 px-3 py-1 bg-white border border-slate-100 rounded-full shadow-sm">
                      <p className={`text-[10px] font-black ${item.type === 'credit' ? 'text-rose-500' : 'text-blue-600'}`}>
                        {item.type === 'credit' ? '-' : '+'} Rs. {(item.rate * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section: Payment Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-6">
                <BanknotesIcon className="w-5 h-5 text-blue-500" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Payment Details</h3>
              </div>
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Method</label>
                    <select
                      value={formData.paymentMethod}
                      onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none"
                    >
                      {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Paid Amount</label>
                    <input
                      type="number"
                      value={formData.paidAmount}
                      onChange={e => setFormData({ ...formData, paidAmount: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-emerald-600 outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className={`p-4 rounded-2xl border flex items-center justify-between ${remaining <= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Balance Due</p>
                    <p className={`text-xl font-black ${remaining <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      Rs. {Math.abs(remaining).toLocaleString()}
                    </p>
                  </div>
                  {remaining <= 0 ? (
                    <div className="bg-emerald-500 text-white p-2 rounded-full shadow-lg shadow-emerald-100">
                      <CheckCircleIcon className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="bg-rose-500 text-white p-2 rounded-full shadow-lg shadow-rose-100 animate-pulse">
                      <ExclamationTriangleIcon className="w-6 h-6" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-blue-600 rounded-3xl p-8 shadow-xl shadow-blue-100 text-white flex flex-col justify-between">
              <div>
                <h3 className="text-blue-100 text-xs font-black uppercase tracking-[0.2em] mb-1">Order Summary</h3>
                <p className="text-4xl font-black mb-6">Rs. {grandTotal.toLocaleString()}</p>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm font-bold py-2 border-b border-blue-500/50">
                    <span className="text-blue-200">Total Items</span>
                    <span>{formData.items.length}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold py-2 border-b border-blue-500/50">
                    <span className="text-blue-200">Amount Paid</span>
                    <span>Rs. {paidAmt.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold py-2">
                    <span className="text-blue-200">Payment Method</span>
                    <span>{formData.paymentMethod}</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-8 w-full bg-white text-blue-600 py-4 rounded-2xl font-black shadow-lg hover:bg-blue-50 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70"
              >
                {submitting ? <ArrowPathIcon className="w-6 h-6 animate-spin" /> : <CheckBadgeIcon className="w-6 h-6" />}
                {editId ? 'UPDATE PURCHASE' : 'CONFIRM PURCHASE'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  // ─── LIST VIEW ────────────────────────────────────────────────────────────────
return (
  <div className="min-h-screen bg-[#f8fafc] p-4 md:p-10">
    <div className="max-w-6xl mx-auto">

      {/* Modern Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div className="flex items-center gap-5">
          <div className="bg-white p-4 rounded-[2rem] shadow-xl shadow-blue-50 border border-slate-100">
            <ShoppingBagIcon className="w-10 h-10 text-blue-600" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Purchases</h2>
            <p className="text-slate-500 font-bold flex items-center gap-2 uppercase text-[10px] tracking-widest mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              {purchases.length} Records Found
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative group flex-1 md:w-80">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Search vendor, PO or status..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-[1.25rem] text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all shadow-sm"
            />
          </div>
          
          {/* ─── بدلا ہوا بٹن: Purchase Order ─────────────────────────────────── */}
          <button
            onClick={() => {
              setEditId(null);
              setFormData({
                vendor: '',
                date: new Date().toISOString().split('T')[0],
                status: 'Pending',
                poNumber: `PO-${Date.now().toString().slice(-6)}`,
                paymentMethod: 'Cash',
                paidAmount: '',
                items: [emptyItem()],
              });
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white p-3.5 md:px-6 rounded-[1.25rem] shadow-xl shadow-blue-100 flex items-center gap-2 font-black text-sm transition-all active:scale-95 group"
          >
            <PlusIcon className="w-5 h-5 stroke-[3] group-hover:rotate-90 transition-transform" />
            <span className="hidden md:inline uppercase tracking-wider">Purchase Order</span>
          </button>
        </div>
      </div>

      {/* Dynamic List */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="bg-white rounded-3xl p-20 border border-slate-100 flex flex-col items-center justify-center shadow-sm">
            <ArrowPathIcon className="w-12 h-12 text-blue-200 animate-spin mb-4" />
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Loading Purchases...</p>
          </div>
        ) : purchases.length === 0 ? (
          <div className="bg-white rounded-3xl p-20 border border-slate-100 flex flex-col items-center justify-center shadow-sm">
            <ShoppingBagIcon className="w-16 h-16 text-slate-100 mb-4" />
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">No orders found</p>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Ref #</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Vendor Details</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Date</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] text-center">Items</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Status</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] text-right">Grand Total</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] text-center">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {purchases
                  .filter(p => (p.vendor || '').toLowerCase().includes(search.toLowerCase()) || (p.poNumber || '').toLowerCase().includes(search.toLowerCase()))
                  .map((p) => (
                    <tr key={p._id} className="group hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg self-start">
                            {p.poNumber}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-black text-[10px]">
                            {p.vendor?.[0] || 'V'}
                          </div>
                          <span className="font-black text-slate-800 text-sm">{p.vendor || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                          <CalendarIcon className="w-4 h-4 text-slate-300" />
                          {p.date}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2.5 py-1 rounded-full border border-slate-200">
                          {p.itemCount || p.items?.length || 0} SKUs
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-6 py-5 text-right font-black text-slate-900 text-sm">
                        Rs. {Number(p.total || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          
                          {/* ایڈٹ بٹن */}
                          <button
                            onClick={() => {
                              setEditId(p._id);
                              const formattedDate = p.date ? new Date(p.date).toISOString().split('T')[0] : '';

                              setFormData({
                                vendor: p.vendor || '',
                                vendorPhone: p.vendorPhone || '',   
                                vendorAddress: p.vendorAddress || '', 
                                date: formattedDate,
                                status: p.status || 'Pending',
                                poNumber: p.poNumber || '',
                                paymentMethod: p.paymentMethod || 'Cash',
                                paidAmount: p.paidAmount || '',
                                items: p.items?.length
                                  ? p.items.map(item => ({
                                      itemId: item.itemId || '',
                                      itemName: item.itemName || '',
                                      unit: item.unit || '',
                                      rate: item.rate || '',
                                      quantity: item.quantity || '',
                                      type: item.type || 'debit'
                                    }))
                                  : [emptyItem()],
                              });

                              setShowForm(true);
                            }}
                            className="p-2 text-blue-600 bg-white hover:bg-blue-600 hover:text-white rounded-xl shadow-sm border border-slate-100 transition-all"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>

                          {/* ڈیلیٹ بٹن */}
                          <button
                            onClick={async () => {
                              if (window.confirm('کیا آپ واقعی یہ پرچیز آرڈر ڈیلیٹ کرنا چاہتے ہیں؟')) {
                                try {
                                  const res = await fetch(`${API_URL}/delete/${p._id}`, { method: 'DELETE' });
                                  if(res.ok) {
                                    fetchData();
                                  } else {
                                    alert("ڈیلیٹ کرنے میں مسئلہ آیا ہے!");
                                  }
                                } catch(err) {
                                  console.error(err);
                                }
                              }
                            }}
                            className="p-2 text-rose-500 bg-white hover:bg-rose-500 hover:text-white rounded-xl shadow-sm border border-slate-100 transition-all"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  </div>
);
};

export default PurchaseManager;
