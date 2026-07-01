import React, { useState, useEffect } from 'react';
import { Plus, Clock, Trash2, ArrowLeft, PencilLine, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from "../config/api";

const PastingEntry = () => {
  // اسٹیٹس مینجمنٹ
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [side, setSide] = useState('1');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  // عارضی طور پر جاب کارڈز کی لسٹ (بیک اینڈ آنے پر ریپلیس کر لیں)
  const [jobCards, setJobCards] = useState(['JOB-3589', 'JOB-1024', 'JOB-7782']);

  const API_URL = `${API_BASE_URL}/pasting`; 

  // فارم ڈیٹا اسٹیٹ بشمول جاب کارڈ اور ریٹ فیلڈز
  const [formData, setFormData] = useState({
    jobCardId: '',
    product: '',
    employee: '',
    pieces: '',
    rate: '',
    adhesive: 'Hot Glue'
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

  // ایڈٹ موڈ میں جانے کا فنکشن
  const handleEdit = (entry) => {
    setEditId(entry._id);
    setFormData({
      jobCardId: entry.jobCardId || '',
      product: entry.product || '',
      employee: entry.employee || '',
      pieces: entry.pieces || '',
      rate: entry.rate || '',
      adhesive: entry.adhesive || 'Hot Glue'
    });
    setSide(entry.side || '1');
    setShowForm(true);
  };

  // ڈیٹا سیو یا اپڈیٹ کرنے کا فنکشن
  const handleSubmit = async () => {
    if (!formData.jobCardId || !formData.product || !formData.pieces || !formData.employee || !formData.rate) {
      alert("Please fill Job Card, Product, Employee, Pieces and Rate!");
      return;
    }

    // رقم کی آٹو کیلکولیشن (Pieces x Rate)
    const calculatedAmount = Number(formData.pieces) * Number(formData.rate);

    const existingEntry = editId ? entries.find(e => e._id === editId) : null;
    const payload = { 
      ...formData, 
      pieces: Number(formData.pieces),
      rate: Number(formData.rate),
      totalAmount: calculatedAmount,
      side,
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
        fetchEntries(); // لسٹ دوبارہ لوڈ کریں
        closeForm();
      } else {
        alert("Server responded with an error");
      }
    } catch (error) {
      alert("Server error! Please check if your backend is running.");
    }
  };

  // ریکارڈ ڈیلیٹ کرنا
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
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
    setFormData({ jobCardId: '', product: '', employee: '', pieces: '', rate: '', adhesive: 'Hot Glue' });
    setSide('1');
    setEditId(null);
    setShowForm(false);
  };

  // --- ویو 1: مین ڈیش بورڈ (لسٹ) ---
  if (!showForm) {
    return (
      <div className="w-full mx-auto p-6 space-y-6">
        
        {/* ٹاپ ہیڈر کارڈ - پرنٹنگ تھیم کے مطابق بلیو لک */}
        <div className="bg-[#1e40af] text-white p-5 rounded-t-xl flex justify-between items-center relative shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()} className="p-1 hover:bg-blue-700 rounded-lg transition-all">
              <ArrowLeft size={20} className="text-white" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide">Pasting Unit Log</h1>
              <p className="text-blue-100 text-xs font-normal">Track bonding and box final assembly logs</p>
            </div>
          </div>
          <button 
            onClick={() => { closeForm(); setShowForm(true); }}
            className="flex items-center gap-1.5 bg-[#2563eb] text-white px-5 py-2.5 rounded-lg font-semibold text-xs hover:bg-blue-700 transition-all shadow-sm border border-blue-400"
          >
            <Plus size={16} /> New Entry
          </button>
        </div>

        {/* ٹیبل سیکشن */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2 font-bold text-sm text-[#1e40af]">
            <Clock size={16} /> Recent Bonding Records
            {loading && <span className="text-blue-500 animate-pulse text-[10px] ml-auto">Syncing...</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Time / Job No</th>
                  <th className="px-5 py-3.5">Product / Adhesive</th>
                  <th className="px-5 py-3.5">Handled By</th>
                  <th className="px-5 py-3.5">Pieces</th>
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
                      <span className="inline-block mt-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                        {entry.adhesive} • {entry.side === '2' ? 'Double' : 'Single'} Side
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium">{entry.employee}</td>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold bg-slate-100 px-2 py-1 rounded text-slate-800">{entry.pieces}</span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-emerald-600">Rs. {entry.totalAmount || (entry.pieces * (entry.rate || 0))}</td>
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

  // --- ویو 2: فارم ویو ---
  return (
    <div className="w-full mx-auto p-6">
      
      {/* ہیڈر نیلے رنگ کا کلاسک لک */}
      <div className="bg-[#1e40af] text-white p-5 rounded-t-xl flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={closeForm} className="p-1 hover:bg-blue-700 rounded-lg transition-all">
             <ArrowLeft size={20} className="text-white" />
          </button>
          <h1 className="text-lg font-bold tracking-wide">
            {editId ? 'Update Pasting Process' : 'Add New Pasting Entry'}
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
          
          {/* سیکشن 1: جاب اور پروڈکٹ سلیکشن */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 border-b border-slate-100 pb-1">1. Job Selection</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* جاب کارڈ سلیکشن ڈراپ ڈاؤن */}
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

              {/* پروڈکٹ سلیکشن */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Finished Product Details</label>
                <select
                  value={formData.product}
                  onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium cursor-pointer"
                >
                  <option value="">Choose Product...</option>
                  <option value="Luxury Paper Bag">Luxury Paper Bag</option>
                  <option value="Folding Carton">Folding Carton</option>
                  <option value="Corrugated Box XL">Corrugated Box XL</option>
                </select>
              </div>

            </div>
          </div>

          {/* سیکشن 2: ملازم اور مٹیریل کی سیٹنگز */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 border-b border-slate-100 pb-1">2. Handled By & Materials</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* ملازم کا نام */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Handled By (Employee)</label>
                <select
                  value={formData.employee}
                  onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium cursor-pointer"
                >
                  <option value="">Assign Employee...</option>
                  <option value="Zubair Ahmed">Zubair Ahmed</option>
                  <option value="Hamza Ali">Hamza Ali</option>
                </select>
              </div>

              {/* ایڈہیسو ٹائپ سلیکشن */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Adhesive Type</label>
                <select
                  value={formData.adhesive}
                  onChange={(e) => setFormData({ ...formData, adhesive: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium cursor-pointer"
                >
                  <option value="Hot Glue">Hot Glue</option>
                  <option value="Cold Glue">Cold Glue</option>
                  <option value="Double Tape">Double Tape</option>
                </select>
              </div>

              {/* پیسٹنگ سائیڈز بٹنز */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Pasting Sides Configuration</label>
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

          {/* سیکشن 3: پیسز تعداد اور ریٹ فیلڈز */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 border-b border-slate-100 pb-1">3. Production Quantities & Billing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* ٹوٹل پیسز تعداد */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Total Pieces Bonded</label>
                <input
                  type="number"
                  value={formData.pieces}
                  onChange={(e) => setFormData({ ...formData, pieces: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="0000"
                />
              </div>

              {/* ریٹ فیلڈ */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Rate per Piece (Rs.)</label>
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

          {/* آٹو کیلکولیٹڈ بلنگ پینل بار */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-600">Estimated Total Pasting Bill:</span>
            <span className="text-lg font-bold text-slate-800">
              Rs. {Number(formData.pieces || 0) * Number(formData.rate || 0)}
            </span>
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
            {editId ? 'Save Changes' : 'Complete Entry'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PastingEntry;
