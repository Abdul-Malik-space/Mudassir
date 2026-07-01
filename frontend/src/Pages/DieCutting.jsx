import React, { useState, useEffect } from 'react';
import { Plus, Clock, Trash2, ArrowLeft, PencilLine, Layers } from 'lucide-react';
import { API_BASE_URL } from "../config/api";

const DieCuttingEntry = () => {
  const [showForm, setShowForm] = useState(false);
  const [side, setSide] = useState('1');
  const [editId, setEditId] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  // عارضی طور پر جاب کارڈز کی لسٹ (بیک اینڈ آنے پر ریپلیس کر لیں)
  const [jobCards, setJobCards] = useState(['JOB-3589', 'JOB-1024', 'JOB-7782']);

  const API_URL = `${API_BASE_URL}/diecutting`;

  // فارم کا اپڈیٹڈ ڈیٹا بشمول جاب کارڈ، گنتی، ریٹ اور پریشر
  const [formData, setFormData] = useState({
    jobCardId: '',
    product: '',
    operator: '',
    qty: '',
    rate: '',
    pressure: '',
    time: ''
  });

  // --- بیکنڈ سے ڈیٹا حاصل کرنا ---
  const fetchEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/all`);
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

  // ایڈٹ بٹن کا فنکشن
  const handleEdit = (entry) => {
    setEditId(entry._id);
    setFormData({
      jobCardId: entry.jobCardId || '',
      product: entry.product || '',
      operator: entry.operator || '',
      qty: entry.qty || '',
      rate: entry.rate || '',
      pressure: entry.pressure === 'N/A' ? '' : entry.pressure || '',
      time: entry.time || ''
    });
    setSide(entry.type === 'Single Side' ? '1' : '2');
    setShowForm(true);
  };

  // --- بیکنڈ میں ڈیٹا سیو یا اپڈیٹ کرنا ---
  const handleSubmit = async () => {
    if (!formData.jobCardId || !formData.product || !formData.qty || !formData.operator || !formData.rate) {
      alert("Please fill Job Card, Product, Operator, Quantity and Rate!");
      return;
    }

    // رقم کی آٹو کیلکولیشن (Qty x Rate)
    const calculatedAmount = Number(formData.qty) * Number(formData.rate);

    const existingEntry = editId ? entries.find(e => e._id === editId) : null;
    const payload = {
      ...formData,
      qty: Number(formData.qty),
      rate: Number(formData.rate),
      totalAmount: calculatedAmount,
      type: side === '1' ? 'Single Side' : 'Double Side',
      pressure: formData.pressure || 'N/A',
      time: editId ? existingEntry?.time : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    try {
      const method = editId ? "PUT" : "POST";
      const url = editId ? `${API_URL}/update/${editId}` : `${API_URL}/add`;

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        fetchEntries();
        closeForm();
      } else {
        alert("Server Error while saving data");
      }
    } catch (error) {
      alert("Network error!");
    }
  };

  // --- ریکارڈ ڈیلیٹ کرنا ---
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this?")) {
      try {
        const response = await fetch(`${API_URL}/delete/${id}`, { method: "DELETE" });
        if (response.ok) {
          setEntries(entries.filter(e => e._id !== id));
        }
      } catch (error) {
        alert("Delete failed!");
      }
    }
  };

  const closeForm = () => {
    setFormData({ jobCardId: '', product: '', operator: '', qty: '', rate: '', pressure: '', time: '' });
    setEditId(null);
    setShowForm(false);
  };

  // --- لسٹ ویو (Main Page) ---
  if (!showForm) {
    return (
      <div className="w-full mx-auto p-6 space-y-6">
        
        {/* ٹاپ ہیڈر کارڈ - پرنٹنگ اور لیمینیشن تھیم کے مطابق */}
        <div className="bg-[#1e40af] text-white p-5 rounded-t-xl flex justify-between items-center relative shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()} className="p-1 hover:bg-blue-700 rounded-lg transition-all">
              <ArrowLeft size={20} className="text-white" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide">Die Cutting Log</h1>
              <p className="text-blue-100 text-xs font-normal">Manage and track shape cutting processes</p>
            </div>
          </div>
          <button 
            onClick={() => { setEditId(null); setShowForm(true); }}
            className="flex items-center gap-1.5 bg-[#2563eb] text-white px-5 py-2.5 rounded-lg font-semibold text-xs hover:bg-blue-700 transition-all shadow-sm border border-blue-400"
          >
            <Plus size={16} /> Add New Process
          </button>
        </div>

        {/* ٹیبل سیکشن */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2 font-bold text-sm text-[#1e40af]">
            <Clock size={16} /> Recent Cutting Records
            {loading && <span className="text-blue-500 animate-pulse text-[10px] ml-auto">Syncing...</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Time / Job No</th>
                  <th className="px-5 py-3.5">Product Details</th>
                  <th className="px-5 py-3.5">Operator</th>
                  <th className="px-5 py-3.5">Qty</th>
                  <th className="px-5 py-3.5">Pressure</th>
                  <th className="px-5 py-3.5">Total Bill</th>
                  <th className="px-5 py-3.5 text-center">Actions</th>
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
                      <div className="font-medium text-slate-800">{entry.product}</div>
                      <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${entry.type === 'Double Side' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                        {entry.type || 'Single Side'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium">{entry.operator}</td>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold bg-slate-100 px-2 py-1 rounded text-slate-800">{entry.qty}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 font-medium">{entry.pressure || 'N/A'}</td>
                    <td className="px-5 py-3.5 font-bold text-emerald-600">Rs. {entry.totalAmount || (entry.qty * (entry.rate || 0))}</td>
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
        </div>
      </div>
    );
  }

  // --- فارم ویو (Add/Edit) ---
  return (
    <div className="w-full mx-auto p-6">
      
      {/* ہیڈر نیلے رنگ کا کلاسک لک */}
      <div className="bg-[#1e40af] text-white p-5 rounded-t-xl flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={closeForm} className="p-1 hover:bg-blue-700 rounded-lg transition-all">
             <ArrowLeft size={20} className="text-white" />
          </button>
          <h1 className="text-lg font-bold tracking-wide">
            {editId ? 'Edit Die Cutting Entry' : 'Create New Die Cutting Entry'}
          </h1>
        </div>
        <button 
          onClick={closeForm}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-xs hover:bg-blue-800 transition-all border border-blue-500"
        >
          Back to List
        </button>
      </div>

      <div className="bg-white rounded-b-xl border-x border-b border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 space-y-8">
          
          {/* سیکشن 1: بنیادی معلومات جو پچھلے فارمز سے جڑتی ہے */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 border-b border-slate-100 pb-1">1. Job Selection</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* جاب کارڈ سلیکشن */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Select Job Card</label>
                <select
                  value={formData.jobCardId}
                  onChange={(e) => setFormData({...formData, jobCardId: e.target.value})}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium cursor-pointer"
                >
                  <option value="">Select Job No</option>
                  {jobCards.map((job) => (
                    <option key={job} value={job}>{job}</option>
                  ))}
                </select>
              </div>

              {/* پروڈکٹ سلیکشن ڈراپ ڈاؤن یا ان پٹ */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Product Details</label>
                <select
                  value={formData.product}
                  onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium cursor-pointer"
                >
                  <option value="">Choose Product...</option>
                  <option value="Corrugated Box XL">Corrugated Box XL</option>
                  <option value="Gift Box Sleeve">Gift Box Sleeve</option>
                </select>
              </div>

            </div>
          </div>

          {/* سیکشن 2: آپریٹر اور سیٹنگز */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 border-b border-slate-100 pb-1">2. Machine Settings & Operator</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* آپریٹر سلیکشن */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Operator</label>
                <select
                  value={formData.operator}
                  onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium cursor-pointer"
                >
                  <option value="">Assign Employee...</option>
                  <option value="M. Naveed">M. Naveed</option>
                  <option value="Sajid Ali">Sajid Ali</option>
                </select>
              </div>

              {/* پریشر بار / پریشر سیٹنگز */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Pressure Settings (Optional)</label>
                <input 
                  type="text"
                  value={formData.pressure}
                  onChange={(e) => setFormData({...formData, pressure: e.target.value})}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium" 
                  placeholder="e.g., 70 Bar / Heavy" 
                />
              </div>

              {/* ڈائی سائیڈ ٹائپ سلیکشن بٹنز */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Die Selection Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => setSide('1')}
                    className={`p-2 rounded-lg border text-xs font-bold transition-all ${side === '1' ? 'border-blue-600 bg-blue-50/50 text-blue-700' : 'border-slate-200 bg-[#f8fafc] text-slate-600'}`}
                  >
                    Single Side {side === '1' && '✓'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSide('2')}
                    className={`p-2 rounded-lg border text-xs font-bold transition-all ${side === '2' ? 'border-blue-600 bg-blue-50/50 text-blue-700' : 'border-slate-200 bg-[#f8fafc] text-slate-600'}`}
                  >
                    Double Side {side === '2' && '✓'}
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* سیکشن 3: کوانٹٹی اور بلنگ ریٹ */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 border-b border-slate-100 pb-1">3. Production Quantities & Rates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* کٹنگ تعداد */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Cutting Quantity</label>
                <input
                  type="number"
                  value={formData.qty}
                  onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="0000"
                />
              </div>

              {/* یونٹ ریٹ فیلڈ (جو پہلے مس تھا) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Unit Rate (Rs.)</label>
                <input
                  type="number"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="0.00"
                />
              </div>

            </div>
          </div>

          {/* خود بخود بننے والا بل بار */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-600">Estimated Total Cutting Bill:</span>
            <span className="text-lg font-bold text-slate-800">
              Rs. {Number(formData.qty || 0) * Number(formData.rate || 0)}
            </span>
          </div>

        </div>

        {/* نیچلا بٹن بار پینل */}
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
            className="px-6 py-2 bg-[#0284c7] text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition-all shadow-sm"
          >
            {editId ? 'Save Changes' : 'Submit Record'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DieCuttingEntry;
