import React, { useState, useEffect } from 'react';
import { Plus, Clock, Trash2, ArrowLeft, PencilLine, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { API_BASE_URL } from "../config/api";

const SaleEntry = () => {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  const [jobCards, setJobCards] = useState([]);

  // بیکنڈ API کا URL
  const API_URL = `${API_BASE_URL}/sales`;
  const JOBS_API_URL = `${API_BASE_URL}/jobs/active`;

  // فارم ڈیٹا اسٹیٹ بشمول نئی ضروری فیلڈز
  const [formData, setFormData] = useState({
    customerName: '',
    invoiceNo: '',
    jobCardId: '',
    product: '',
    qty: '',
    rate: '',
    received: '',
    paymentMethod: 'Cash'
  });

  // --- API سے ڈیٹا حاصل کرنا ---
  const fetchEntries = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/all`);
      const data = await response.json();
      setEntries(data);
    } catch (error) {
      console.error("Error fetching sales data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobCards = async () => {
    try {
      const response = await fetch(JOBS_API_URL);
      if (response.ok) {
        const data = await response.json();
        setJobCards(data.map((job) => job.jobCode).filter(Boolean));
      }
    } catch (error) {
      console.error("Error fetching job cards:", error);
    }
  };

  useEffect(() => {
    fetchEntries();
    fetchJobCards();
  }, []);

  // خودکار بلنگ کا حساب کتاب
  const totalAmount = Number(formData.qty || 0) * Number(formData.rate || 0);
  const balanceAmount = totalAmount - Number(formData.received || 0);

  // ڈیش بورڈ کے لیے ٹوٹل سیلز کا حساب
  const totalSalesRevenue = entries.reduce((acc, curr) => acc + Number(curr.totalAmount || 0), 0);

  // --- سبمٹ فنکشن (Create & Update) ---
  const handleSubmit = async () => {
    if (!formData.customerName || !formData.invoiceNo || !formData.qty || !formData.rate) {
      alert("Please fill Customer Name, Invoice No, Quantity and Rate!");
      return;
    }

    const existingEntry = editId ? entries.find(e => e._id === editId) : null;
    const payload = {
      ...formData,
      qty: Number(formData.qty),
      rate: Number(formData.rate),
      totalAmount: totalAmount,
      received: Number(formData.received || 0),
      balance: balanceAmount,
      time: editId ? existingEntry?.time : new Date().toLocaleDateString('en-GB') // تاریخ یا وقت
    };

    try {
      const method = editId ? 'PUT' : 'POST';
      const url = editId ? `${API_URL}/update/${editId}` : `${API_URL}/add`;

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        fetchEntries();
        closeForm();
      } else {
        alert("Server responded with an error");
      }
    } catch (error) {
      alert("Error saving sales record!");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this invoice record?")) {
      try {
        const response = await fetch(`${API_URL}/delete/${id}`, { method: 'DELETE' });
        if (response.ok) {
          fetchEntries();
        } else {
          alert("Delete failed on server!");
        }
      } catch (error) {
        alert("Error deleting record!");
      }
    }
  };

  const handleEdit = (entry) => {
    setEditId(entry._id);
    setFormData({
      customerName: entry.customerName || '',
      invoiceNo: entry.invoiceNo || '',
      jobCardId: entry.jobCardId || '',
      product: entry.product || '',
      qty: entry.qty || '',
      rate: entry.rate || '',
      received: entry.received || '',
      paymentMethod: entry.paymentMethod || 'Cash'
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setFormData({ customerName: '', invoiceNo: '', jobCardId: '', product: '', qty: '', rate: '', received: '', paymentMethod: 'Cash' });
    setEditId(null);
    setShowForm(false);
  };

  // --- ویو 1: مین ڈیش بورڈ (سیلز لسٹ) ---
  if (!showForm) {
    return (
      <div className="w-full mx-auto p-6 space-y-6">
        
        {/* ٹاپ ہیڈر کارڈ - کلاسک مینوفیکچرنگ بلیو تھیم */}
        <div className="bg-[#1e40af] text-white p-5 rounded-t-xl flex justify-between items-center relative shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()} className="p-1 hover:bg-blue-700 rounded-lg transition-all">
              <ArrowLeft size={20} className="text-white" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide">Sales & Invoice Book</h1>
              <p className="text-blue-100 text-xs font-normal">Track client shipments, invoice billing, and balances</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* ٹوٹل ریوینیو کاؤنٹر */}
            <div className="hidden md:flex bg-blue-800/50 border border-blue-500 px-4 py-1.5 rounded-lg items-center gap-2">
              <div className="text-right">
                <p className="text-[9px] font-bold text-blue-200 uppercase tracking-wider">Total Sales Volume</p>
                <p className="text-sm font-black text-white">Rs. {totalSalesRevenue.toLocaleString()}</p>
              </div>
            </div>

            <button 
              onClick={() => { closeForm(); setShowForm(true); }}
              className="flex items-center gap-1.5 bg-[#2563eb] text-white px-5 py-2.5 rounded-lg font-semibold text-xs hover:bg-blue-700 transition-all shadow-sm border border-blue-400"
            >
              <Plus size={16} /> New Invoice
            </button>
          </div>
        </div>

        {/* ٹیبل سیکشن */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center p-20">
              <Loader2 className="animate-spin text-blue-600" size={36} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Invoice / Date</th>
                    <th className="px-5 py-3.5">Customer & Job No</th>
                    <th className="px-5 py-3.5">Product Details</th>
                    <th className="px-5 py-3.5">Total Bill</th>
                    <th className="px-5 py-3.5">Received</th>
                    <th className="px-5 py-3.5">Balance</th>
                    <th className="px-5 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {entries.map((entry) => (
                    <tr key={entry._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold font-mono text-slate-800 flex items-center gap-1">
                          <FileText size={13} className="text-slate-400" />
                          {entry.invoiceNo}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">{entry.time}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900">{entry.customerName}</div>
                        <div className="text-[10px] font-bold text-blue-600 uppercase">{entry.jobCardId || 'No Job Link'}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-700">{entry.product || 'General Box Item'}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{entry.qty} pcs × Rs.{entry.rate}</div>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-900">Rs. {Number(entry.totalAmount).toLocaleString()}</td>
                      <td className="px-5 py-3.5 font-semibold text-emerald-600">Rs. {Number(entry.received || 0).toLocaleString()}</td>
                      <td className="px-5 py-3.5">
                        <span className={`font-bold ${Number(entry.balance) > 0 ? 'text-red-500' : 'text-slate-500'}`}>
                          Rs. {Number(entry.balance || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-center gap-1.5">
                          <button 
                            onClick={() => handleEdit(entry)} 
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                          >
                            <PencilLine size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(entry._id)} 
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
          )}
        </div>
      </div>
    );
  }

  // --- ویو 2: انٹری فارم ویو ---
  return (
    <div className="w-full mx-auto p-6">
      
      {/* فارم ہیڈر نیلے رنگ کا کلاسک لک */}
      <div className="bg-[#1e40af] text-white p-5 rounded-t-xl flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={closeForm} className="p-1 hover:bg-blue-700 rounded-lg transition-all">
             <ArrowLeft size={20} className="text-white" />
          </button>
          <h1 className="text-lg font-bold tracking-wide">
            {editId ? 'Edit Invoice Entry' : 'Create New Commercial Sale Invoice'}
          </h1>
        </div>
        <button 
          onClick={closeForm}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-xs hover:bg-blue-800 transition-all border border-blue-500"
        >
          Back to Book
        </button>
      </div>

      <div className="bg-white rounded-b-xl border-x border-b border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 space-y-8">
          
          {/* سیکشن 1: کسٹمر اور انوائس بنیادی معلومات */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 tracking-wider uppercase mb-4 border-b border-slate-100 pb-1">1. Customer & Invoice References</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* کسٹمر کا نام */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Customer / Client Name</label>
                <input 
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                  placeholder="Search or enter Client Name..."
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                />
              </div>

              {/* انوائس نمبر */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Invoice Number</label>
                <input 
                  type="text"
                  value={formData.invoiceNo}
                  onChange={(e) => setFormData({...formData, invoiceNo: e.target.value})}
                  placeholder="e.g. INV-2026-001"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 font-mono outline-none focus:border-blue-500 focus:bg-white font-bold"
                />
              </div>

              {/* جاب کارڈ لنک ڈراپ ڈاؤن */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Link to Job Card Order</label>
                <select
                  value={formData.jobCardId}
                  onChange={(e) => setFormData({...formData, jobCardId: e.target.value})}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium cursor-pointer"
                >
                  <option value="">Select Job No (Optional)</option>
                  {jobCards.map((job) => (
                    <option key={job} value={job}>{job}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* سیکشن 2: پروڈکٹ تفصیلات، کوانٹٹی اور ریٹ */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 tracking-wider uppercase mb-4 border-b border-slate-100 pb-1">2. Dispatched Items & Rates</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* پروڈکٹ ڈسکریپشن */}
              <div className="space-y-1.5 md:col-span-1">
                <label className="text-xs font-semibold text-slate-600">Product / Item Dispatched</label>
                <input 
                  type="text" 
                  value={formData.product}
                  onChange={(e) => setFormData({...formData, product: e.target.value})}
                  placeholder="e.g. Luxury Paper Bags XL" 
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium" 
                />
              </div>

              {/* کوانٹٹی */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Quantity (pcs)</label>
                <input 
                  type="number" 
                  value={formData.qty}
                  onChange={(e) => setFormData({...formData, qty: e.target.value})}
                  placeholder="0" 
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium" 
                />
              </div>

              {/* ریٹ فی پیس */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Unit Price / Rate (Rs.)</label>
                <input 
                  type="number" 
                  value={formData.rate}
                  onChange={(e) => setFormData({...formData, rate: e.target.value})}
                  placeholder="0.00" 
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium" 
                />
              </div>

            </div>
          </div>

          {/* سیکشن 3: فنانس اور بلنگ پینل (حساب کتاب) */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 tracking-wider uppercase mb-4 border-b border-slate-100 pb-1">3. Financial Ledger Accounts</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-50 p-5 rounded-lg border border-slate-200 mb-5">
              
              {/* ٹوٹل رقم - آٹو کیلکولیٹڈ */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Invoice Amount</label>
                <div className="text-2xl font-black text-slate-800 py-1.5">
                  Rs. {totalAmount.toLocaleString()}
                </div>
              </div>

              {/* کتنے وصول ہوئے ان پٹ فیلڈ */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Amount Received (Rs.)</label>
                <input 
                  type="number"
                  value={formData.received}
                  onChange={(e) => setFormData({...formData, received: e.target.value})}
                  placeholder="0.00"
                  className="w-full bg-transparent border-b border-slate-300 py-1.5 outline-none focus:border-blue-500 text-2xl font-bold text-slate-800"
                />
              </div>

              {/* بقایا رقم - آٹو کیلکولیٹڈ */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Remaining Balance</label>
                <div className={`text-2xl font-black py-1.5 ${balanceAmount > 0 ? 'text-red-500' : 'text-slate-600'}`}>
                  Rs. {balanceAmount.toLocaleString()}
                </div>
              </div>

            </div>

            {/* پیمنٹ میتھڈ سلیکشن */}
            <div className="space-y-1.5 max-w-xs">
              <label className="text-xs font-semibold text-slate-600">Payment Mode</label>
              <select 
                value={formData.paymentMethod}
                onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 font-medium cursor-pointer"
              >
                <option>Cash</option>
                <option>Bank Transfer</option>
                <option>Cheque</option>
                <option>On Account (Udhaar)</option>
              </select>
            </div>

          </div>

        </div>

        {/* بوٹم پینل بٹنز بار */}
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
            onClick={handleSubmit}
            className="px-6 py-2 bg-[#0284c7] text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition-all shadow-sm flex items-center gap-1.5"
          >
            <CheckCircle2 size={14} />
            {editId ? 'Update Invoice' : 'Post & Save Invoice'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default SaleEntry;
