import React, { useState, useEffect } from 'react';
import { Plus, Clock, Trash2, ArrowLeft, Printer, PencilLine } from 'lucide-react';
import { API_BASE_URL } from "../config/api";

const PrintingEntry = () => {
  // --- اسٹیٹس (States) ---
  const [showForm, setShowForm] = useState(false);
  const [side, setSide] = useState('1-side');
  const [editId, setEditId] = useState(null);
  const [entries, setEntries] = useState([]); 
  const [loading, setLoading] = useState(false);

  // عارضی طور پر جاب کارڈز کی لسٹ
  const [jobCards, setJobCards] = useState(['JOB-5012', 'JOB-3044', 'JOB-8821']);

  const API_URL = `${API_BASE_URL}/printing`; 

  // فارم کا اپڈیٹڈ ڈیٹا
  const [formData, setFormData] = useState({
    jobCardId: '',
    product: 'Art Card 300gsm',
    employee: '',
    qty: '',         // پرنٹ ہونے والی کل شیٹس
    impressions: '', // کل شاٹس (Impressions)
    platesCount: '4', // کتنی پلیٹیں استعمال ہوئیں
    rate: '',
    wastageQty: '0',  // ویسٹیج شیٹس
    machine: 'Machine 01',
    paperSize: ''
  });

  // --- بیکنڈ سے ڈیٹا حاصل کرنے کا فنکشن (GET) ---
  const fetchEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/all`);
      if (!response.ok) throw new Error("Server error");
      const data = await response.json();
      setEntries(data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  // --- فارم کھلنے پر اسکرول اوپر کرنے کا افیکٹ ---
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [showForm]);

  // ایڈٹ موڈ شروع کرنے کا فنکشن
  const handleEdit = (entry) => {
    setEditId(entry._id); 
    setFormData({
      jobCardId: entry.jobCardId || '',
      product: entry.product,
      employee: entry.employee,
      qty: entry.qty,
      impressions: entry.impressions || entry.qty, 
      platesCount: entry.platesCount || '4',
      rate: entry.rate || '',
      wastageQty: entry.wastageQty || '0',
      machine: entry.machine,
      paperSize: entry.paperSize || ''
    });
    setSide(entry.side);
    setShowForm(true);
  };

  // --- بیکنڈ میں سیو یا اپڈیٹ کرنے کا فنکشن (POST/PUT) ---
  const handleSubmit = async () => {
    if (!formData.jobCardId || !formData.qty || !formData.employee || !formData.rate) {
      alert("Please fill Job Card, Quantity, Rate, and Employee fields!");
      return;
    }

    const existingEntry = editId ? entries.find(e => e._id === editId) : null;
    const calculatedAmount = Number(formData.qty) * Number(formData.rate);

    const payload = {
      ...formData,
      qty: Number(formData.qty),
      impressions: Number(formData.impressions || formData.qty),
      platesCount: Number(formData.platesCount),
      rate: Number(formData.rate),
      wastageQty: Number(formData.wastageQty),
      totalAmount: calculatedAmount,
      side: side,
      time: editId ? existingEntry?.time : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    try {
      const url = editId ? `${API_URL}/update/${editId}` : `${API_URL}/add`;
      const method = editId ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await fetchEntries(); 
        setShowForm(false);
        setEditId(null);
        setFormData({ jobCardId: '', product: 'Art Card 300gsm', employee: '', qty: '', impressions: '', platesCount: '4', rate: '', wastageQty: '0', machine: 'Machine 01', paperSize: '' });
      } else {
        const errorData = await response.json();
        alert(`Server Error: ${errorData.message}`);
      }
    } catch (error) {
      alert("Network error! Please check your connection.");
    }
  };

  // --- بیکنڈ سے ڈیلیٹ کرنے کا فنکشن (DELETE) ---
  const handleDelete = async (id) => {
    if (window.confirm("Delete this entry?")) {
      try {
        const response = await fetch(`${API_URL}/delete/${id}`, { method: "DELETE" });
        if (response.ok) {
          setEntries(entries.filter(e => e._id !== id));
        }
      } catch (error) {
        alert("Could not delete entry.");
      }
    }
  };

  // --- ویو 1: شروع کا بٹن اور حالیہ لسٹ ---
  if (!showForm) {
    return (
      <div className="w-full mx-auto p-6 space-y-6">
        {/* ٹاپ ہیڈر کارڈ بلڈرز اور فونٹس ڈیش بورڈ جیسے */}
        <div className="bg-[#1e40af] text-white p-5 rounded-t-xl flex justify-between items-center relative shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()} className="p-1 hover:bg-blue-700 rounded-lg transition-all">
              <ArrowLeft size={20} className="text-white" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide">Printing Log</h1>
              <p className="text-blue-100 text-xs font-normal">Manage your daily printing records</p>
            </div>
          </div>
          <button 
            onClick={() => { setEditId(null); setShowForm(true); }}
            className="flex items-center gap-1.5 bg-[#2563eb] text-white px-5 py-2.5 rounded-lg font-semibold text-xs hover:bg-blue-700 transition-all shadow-sm border border-blue-400"
          >
            <Plus size={16} /> Add New Entry
          </button>
        </div>

        {/* ریسنٹ ایکٹیویٹی ٹیبل */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2 font-bold text-sm text-[#1e40af]">
            <Clock size={16} /> Recent Printing Jobs
          </div>
          <div className="overflow-x-auto">
            {loading ? <div className="p-10 text-center font-medium text-slate-400 text-sm">Loading records...</div> : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Time/Job No</th>
                  <th className="px-5 py-3.5">Machine/Size</th>
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">Sheets (Wastage)</th>
                  <th className="px-5 py-3.5">Impressions / Plates</th>
                  <th className="px-5 py-3.5">Total Bill</th>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {entries.map((entry) => (
                  <tr key={entry._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold">{entry.time}</div>
                      <div className="text-[11px] font-bold text-blue-600">{entry.jobCardId || 'N/A'}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium">{entry.machine}</div>
                      <div className="text-[11px] text-slate-400">{entry.paperSize || 'Custom'}</div>
                    </td>
                    <td className="px-5 py-3.5 font-medium">{entry.product}</td>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold">{entry.qty}</span>
                      {entry.wastageQty > 0 && <span className="text-rose-500 text-xs ml-1">({entry.wastageQty} W)</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-indigo-600">{entry.impressions || entry.qty} Imp</div>
                      <div className="text-[11px] text-slate-400">{entry.platesCount || 4} Plates ({entry.side})</div>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-emerald-600">Rs. {entry.totalAmount || (entry.qty * entry.rate)}</td>
                    <td className="px-5 py-3.5 text-slate-600">{entry.employee}</td>
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
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- ویو 2: اصل پرنٹنگ فارم (Add/Edit) ---
  return (
    <div className="w-full mx-auto p-6">
      {/* ہیڈر نیلے رنگ کا بالکل ڈیش بورڈ والے اسٹائل میں */}
      <div className="bg-[#1e40af] text-white p-5 rounded-t-xl flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => { setShowForm(false); setEditId(null); }} className="p-1 hover:bg-blue-700 rounded-lg transition-all">
             <ArrowLeft size={20} className="text-white" />
          </button>
          <h1 className="text-lg font-bold tracking-wide">
            {editId ? 'Edit Printing Entry' : 'Create New Printing Entry'}
          </h1>
        </div>
        <button 
          onClick={() => { setShowForm(false); setEditId(null); }}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-xs hover:bg-blue-800 transition-all border border-blue-500"
        >
          Back to List
        </button>
      </div>

      <div className="bg-white rounded-b-xl border-x border-b border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 space-y-8">
          
          {/* سیکشن 1: بنیادی معلومات */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 border-b border-slate-100 pb-1">1. Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* جاب کارڈ سلیکشن */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Select Job Card</label>
                <select 
                  value={formData.jobCardId}
                  onChange={(e) => setFormData({...formData, jobCardId: e.target.value})}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                >
                  <option value="">Choose Job No...</option>
                  {jobCards.map((job) => (
                    <option key={job} value={job}>{job}</option>
                  ))}
                </select>
              </div>

              {/* پروڈکٹ پیپر ٹائپ */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Select Paper/Product</label>
                <select 
                  value={formData.product}
                  onChange={(e) => setFormData({...formData, product: e.target.value})}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                >
                  <option>Art Card 300gsm</option>
                  <option>Offset Paper 80gsm</option>
                  <option>Matt Paper 150gsm</option>
                  <option>Matt Paper 300gsm</option>
                  <option>Sticker Paper</option>
                </select>
              </div>

              {/* ملازم کا نام */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Assigned Operator</label>
                <select 
                  value={formData.employee}
                  onChange={(e) => setFormData({...formData, employee: e.target.value})}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                >
                  <option value="">Choose Employee...</option>
                  <option>Kamran Shehzad</option>
                  <option>Arsalan Ijaz</option>
                  <option>Zeeshan Ali</option>
                </select>
              </div>
            </div>
          </div>

          {/* سیکشن 2: مشین اور سائز کی تفصیلات */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 border-b border-slate-100 pb-1">2. Machine & Specs</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
              {/* کل پیپر شیٹس */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Print Qty (Sheets)</label>
                <input 
                  type="number" 
                  value={formData.qty}
                  onChange={(e) => setFormData({...formData, qty: e.target.value})}
                  placeholder="e.g. 5000" 
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium" 
                />
              </div>

              {/* کل امپریشنز / شاٹس */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Total Impressions</label>
                <input 
                  type="number" 
                  value={formData.impressions}
                  onChange={(e) => setFormData({...formData, impressions: e.target.value})}
                  placeholder="Leave blank to match qty" 
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium" 
                />
              </div>

              {/* پلیٹوں کی تعداد */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Plates Count</label>
                <input 
                  type="number" 
                  value={formData.platesCount}
                  onChange={(e) => setFormData({...formData, platesCount: e.target.value})}
                  placeholder="4" 
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium" 
                />
              </div>

              {/* یونٹ ریٹ */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Unit Rate (Rs.)</label>
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

          {/* سیکشن 3: ویسٹیج اور سائز */}
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* ویسٹیج شیٹس */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Wastage Sheets</label>
                <input 
                  type="number" 
                  value={formData.wastageQty}
                  onChange={(e) => setFormData({...formData, wastageQty: e.target.value})}
                  placeholder="0" 
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium" 
                />
              </div>

              {/* مشین سلیکشن */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Machine</label>
                <select 
                  value={formData.machine}
                  onChange={(e) => setFormData({...formData, machine: e.target.value})}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                >
                  <option>Machine 01</option>
                  <option>Machine 02</option>
                  <option>Machine 03 (Heidelberg)</option>
                </select>
              </div>

              {/* پیپر سائز */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Paper Size</label>
                <input 
                  type="text" 
                  value={formData.paperSize}
                  onChange={(e) => setFormData({...formData, paperSize: e.target.value})}
                  placeholder="e.g. 18x23, 20x30" 
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium" 
                />
              </div>
            </div>
          </div>

          {/* پرنٹنگ سائیڈز سلیکشن */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">Printing Sides</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                type="button"
                onClick={() => setSide('1-side')}
                className={`flex items-center justify-between p-4 rounded-lg border text-left transition-all ${side === '1-side' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 bg-[#f8fafc]'}`}
              >
                <div>
                  <p className="font-bold text-xs text-slate-700">SINGLE SIDE</p>
                  <p className="text-[10px] text-slate-400">Front printing only</p>
                </div>
                {side === '1-side' && <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-white text-[9px]">✓</div>}
              </button>

              <button 
                type="button"
                onClick={() => setSide('2-side')}
                className={`flex items-center justify-between p-4 rounded-lg border text-left transition-all ${side === '2-side' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 bg-[#f8fafc]'}`}
              >
                <div>
                  <p className="font-bold text-xs text-slate-700">DOUBLE SIDE</p>
                  <p className="text-[10px] text-slate-400">Front & back printing</p>
                </div>
                {side === '2-side' && <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-white text-[9px]">✓</div>}
              </button>
            </div>
          </div>

          {/* خود بخود بننے والا بل */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-600">Calculated Printing Cost:</span>
            <span className="text-lg font-bold text-slate-800">
              Rs. {Number(formData.qty || 0) * Number(formData.rate || 0)}
            </span>
          </div>

        </div>

        {/* نچلا بٹن بار ڈیش بورڈ کی تھیم کے مطابق */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
           <button 
              type="button"
              onClick={() => { setShowForm(false); setEditId(null); }}
              className="px-5 py-2 border border-slate-300 text-slate-600 font-medium text-xs rounded-lg bg-white hover:bg-slate-50 transition-all"
           >
              Cancel
           </button>
           <button 
              type="button"
              onClick={handleSubmit}
              className="px-6 py-2 bg-[#0284c7] text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition-all shadow-sm"
           >
              {editId ? 'Update Data' : 'Save Job Card'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default PrintingEntry;
