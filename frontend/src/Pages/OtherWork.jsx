import React, { useState, useEffect } from 'react';
import { Plus, Clock, Trash2, ArrowLeft, Edit3, Save, Info, Loader2, Layers, Briefcase, DollarSign } from 'lucide-react';
import { API_BASE_URL } from "../config/api";

const OtherWorkEntry = () => {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [entries, setEntries] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]); // سسٹم کے ایکٹو جاب کارڈز کے لیے
  const [loading, setLoading] = useState(false);

  const API_URL = `${API_BASE_URL}/otherwork`; 
  const JOBS_API_URL = `${API_BASE_URL}/jobs/active`; 

  // --- بیکنڈ سے ڈیٹا لوڈ کرنا ---
  const fetchEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/all`);
      const data = await response.json();
      setEntries(data);
    } catch (error) {
      console.error("Error fetching factory ledger data:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- بیکنڈ سے ایکٹو جاب کارڈز کی لسٹ لانا ---
  const fetchActiveJobs = async () => {
    try {
      const response = await fetch(JOBS_API_URL);
      if (response.ok) {
        const data = await response.json();
        setActiveJobs(data); 
      }
    } catch (error) {
      console.error("Error fetching active job codes:", error);
      // عارضی طور پر ٹیسٹنگ کے لیے ڈمی ڈیٹا:
      setActiveJobs([
        { jobCode: 'JOB-9904', itemName: 'Medicine Box 10ml' },
        { jobCode: 'JOB-9905', itemName: 'Urwa Perfume Outer Box' },
        { jobCode: 'JOB-9906', itemName: 'Cake Delice Large Box' }
      ]);
    }
  };

  useEffect(() => {
    fetchEntries();
    fetchActiveJobs();
  }, []);

  const [formData, setFormData] = useState({
    jobCode: '', 
    item: '',
    processType: 'UV Coating', 
    vendor: '',
    quantity: '', 
    rate: '', 
    cost: '', 
    status: 'Pending',
    date: new Date().toISOString().split('T')[0], 
    desc: ''
  });

  // جب ڈراپ ڈاؤن سے جاب کوڈ سلیکٹ ہو تو آئٹم نیم خود بخود سیٹ ہو جائے
  const handleJobChange = (selectedCode) => {
    const selectedJob = activeJobs.find(j => j.jobCode === selectedCode);
    setFormData(prev => ({
      ...prev,
      jobCode: selectedCode,
      item: selectedJob ? selectedJob.itemName : '' // آٹو فل آئٹم نیم
    }));
  };

  // جب ریٹ یا کوانٹیٹی تبدیل ہو تو ٹوٹل کاسٹ خود بخود کیلکولیٹ ہو
  useEffect(() => {
    const qty = parseFloat(formData.quantity) || 0;
    const rate = parseFloat(formData.rate) || 0;
    setFormData(prev => ({
      ...prev,
      cost: (qty * rate).toFixed(2)
    }));
  }, [formData.quantity, formData.rate]);

  // --- سبمٹ فنکشن ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.jobCode || !formData.item || !formData.quantity || !formData.rate) {
      alert("Operational Error: Please fill all mandatory parameters.");
      return;
    }

    try {
      setLoading(true);
      const method = editId ? "PUT" : "POST";
      const url = editId ? `${API_URL}/update/${editId}` : `${API_URL}/add`;

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        fetchEntries(); 
        setShowForm(false);
        resetForm();
      } else {
        alert("Server validation failed. Could not save database record.");
      }
    } catch (error) {
      alert("Server Error! Pipeline connection breakdown.");
    } finally {
      setLoading(false);
    }
  };

  // --- ڈیلیٹ فنکشن ---
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to purge this record from history?")) {
      try {
        const response = await fetch(`${API_URL}/delete/${id}`, { method: "DELETE" });
        if (response.ok) {
          setEntries(entries.filter(e => e._id !== id));
        }
      } catch (error) {
        alert("Delete pipeline failure!");
      }
    }
  };

  const handleEdit = (entry) => {
    setEditId(entry._id);
    setFormData({ ...entry });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ 
      jobCode: '', 
      item: '', 
      processType: 'UV Coating', 
      vendor: '', 
      quantity: '', 
      rate: '', 
      cost: '', 
      status: 'Pending', 
      date: new Date().toISOString().split('T')[0], 
      desc: '' 
    });
    setEditId(null);
  };

  // --- ویو 1: مین لسٹ ڈیش بورڈ ---
  if (!showForm) {
    return (
      <div className="w-full mx-auto p-6 space-y-6">
        
        {/* ہیڈر پینل */}
        <div className="bg-[#1e40af] text-white p-5 rounded-t-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
          <div>
            <span className="text-blue-200 font-bold text-[10px] uppercase tracking-wider block mb-0.5">Post-Production Logs</span>
            <h1 className="text-lg font-bold tracking-wide">External Services & Other Work</h1>
          </div>
          <button 
            onClick={() => { resetForm(); setShowForm(true); }}
            className="w-full sm:w-auto bg-[#0284c7] text-white px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus size={14} /> Add Process Entry
          </button>
        </div>

        {/* ڈیٹا لاگ ٹیبل کارڈ */}
        <div className="bg-white border border-slate-200 rounded-b-xl shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Clock size={12} className="text-blue-600" /> Recent Miscellaneous Pipeline Logs
            {loading && <span className="ml-auto text-blue-600 text-[9px] font-bold animate-pulse">Syncing Engine...</span>}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-bold text-slate-500 bg-slate-50/50 uppercase border-b border-slate-200">
                  <th className="px-6 py-3.5">Job Code</th>
                  <th className="px-6 py-3.5">Job / Item Name</th>
                  <th className="px-6 py-3.5">Process Type</th>
                  <th className="px-6 py-3.5">Vendor</th>
                  <th className="px-6 py-3.5 text-center">Qty</th>
                  <th className="px-6 py-3.5 text-center">Total Cost</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center p-8 text-xs font-medium text-slate-400">No external process records found in database.</td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry._id} className="hover:bg-slate-50/60 transition-all group text-xs font-semibold text-slate-700">
                      <td className="px-6 py-4 text-blue-600 font-bold">{entry.jobCode}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{entry.item}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{entry.date}</div>
                      </td>
                      <td className="px-6 py-4"><span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px] font-bold">{entry.processType}</span></td>
                      <td className="px-6 py-4 text-slate-500">{entry.vendor || 'Internal/Custom'}</td>
                      <td className="px-6 py-4 text-center text-slate-600">{entry.quantity}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-900">₨ {entry.cost}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${entry.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : entry.status === 'Partial' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                          {entry.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2.5 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(entry)} className="text-slate-400 hover:text-blue-600 transition-colors"><Edit3 size={15} /></button>
                          <button onClick={() => handleDelete(entry._id)} className="text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={15} /></button>
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

  // --- ویو 2: فارم ڈیزائن ---
  return (
    <div className="w-full mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <button onClick={() => { setShowForm(false); resetForm(); }} className="p-2 bg-white rounded-lg text-slate-400 hover:text-blue-600 border border-slate-200 shadow-sm transition-all">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">
            {editId ? 'Modify External Operation Log' : 'Create Post-Production Job Segment'}
          </h1>
          <p className="text-xs text-slate-400 font-normal">Record outsource services, custom finishing, and miscellaneous production costs</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 space-y-6">
          
          {/* سیکشن 1: بنیادی معلومات */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#1e40af] uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1"><Briefcase size={14}/> 1. Base Assignment Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* اپڈیٹڈ ڈراپ ڈاؤن: اب اس میں کوڈ اور نام دونوں واضح نظر آئیں گے */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Linked Job Code <span className="text-red-500">*</span></label>
                <select 
                  required
                  value={formData.jobCode}
                  onChange={(e) => handleJobChange(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 bg-[#f8fafc] text-xs font-bold text-slate-700 rounded-lg outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
                >
                  <option value="">Select Job Card...</option>
                  
                  {/* اگر ایڈٹ موڈ ہو اور وہ جاب ایکٹو لسٹ میں نہ ہو تو اسے غائب ہونے سے بچانے کے لیے محفوظ کرنا */}
                  {editId && formData.jobCode && !activeJobs.some(j => j.jobCode === formData.jobCode) && (
                    <option value={formData.jobCode}>{formData.jobCode} | {formData.item}</option>
                  )}

                  {activeJobs.map((job, idx) => (
                    <option key={idx} value={job.jobCode}>
                      {job.jobCode} &nbsp; | &nbsp; {job.itemName}
                    </option>
                  ))}
                </select>
              </div>

              {/* آئٹم نیم فیلڈ: اب یہ ڈراپ ڈاؤن کی وجہ سے آٹو فل اور ڈس ایبلڈ رہے گی */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Item / Job Name</label>
                <input 
                  type="text" 
                  disabled
                  value={formData.item}
                  placeholder="Auto-filled from job selection" 
                  className="w-full p-2.5 border border-slate-200 bg-slate-100 rounded-lg text-xs font-bold text-slate-800 outline-none placeholder:text-slate-400" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Process Type / Operation</label>
                <select 
                  value={formData.processType}
                  onChange={(e) => setFormData({...formData, processType: e.target.value})}
                  className="w-full p-2.5 border border-slate-200 bg-[#f8fafc] text-xs font-bold text-slate-700 rounded-lg outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
                >
                  <option>UV Coating</option>
                  <option>Spot UV</option>
                  <option>Hot Foil Stamping</option>
                  <option>Embossing/Debossing</option>
                  <option>Hologram Pasting</option>
                  <option>Special Manual Pasting</option>
                  <option>Transportation/Logistics</option>
                </select>
              </div>

            </div>
          </div>

          {/* سیکشن 2: وینڈر اور آپریشن مینوفیکچرنگ ویلیوز */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#1e40af] uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1"><Layers size={14}/> 2. Operation Cost Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50/50 p-4 border border-slate-100 rounded-xl">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Assigned Vendor</label>
                <select 
                  value={formData.vendor}
                  onChange={(e) => setFormData({...formData, vendor: e.target.value})}
                  className="w-full p-2.5 border border-slate-200 bg-white text-xs font-bold text-slate-700 rounded-lg outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">Select Vendor...</option>
                  <option>External Press Ltd</option>
                  <option>Local Courier Service</option>
                  <option>Al-Maqsood UV Block Makers</option>
                  <option>Lahore Foil Masters</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Process Qty (Sheets/Pcs) <span className="text-red-500">*</span></label>
                <input 
                  type="number" 
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  placeholder="e.g. 5000" 
                  className="w-full p-2.5 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 transition-all placeholder:text-slate-300" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Rate Per Unit (₨) <span className="text-red-500">*</span></label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={formData.rate}
                  onChange={(e) => setFormData({...formData, rate: e.target.value})}
                  placeholder="e.g. 1.25" 
                  className="w-full p-2.5 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 transition-all placeholder:text-slate-300" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-0.5"><DollarSign size={13} className="text-slate-400"/> Calculated Total Cost</label>
                <input 
                  type="text" 
                  disabled
                  value={`₨ ${formData.cost}`}
                  className="w-full p-2.5 border border-slate-200 bg-slate-100 rounded-lg text-xs font-bold text-slate-800 outline-none" 
                />
              </div>

            </div>
          </div>

          {/* سیکشن 3: ٹائم لائن اور لیجر سٹیٹس */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">Operation Execution Date</label>
              <input 
                type="date" 
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full p-2.5 border border-slate-200 bg-[#f8fafc] rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-blue-500 transition-all" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">Vendor Billing Status</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full p-2.5 border border-slate-200 bg-[#f8fafc] text-xs font-bold text-slate-700 rounded-lg outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
              >
                <option value="Pending">Pending Invoice</option>
                <option value="Paid">Fully Paid</option>
                <option value="Partial">Partial Settlement</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600">Operation Remarks / Production Specifications</label>
            <textarea 
              rows="2" 
              value={formData.desc}
              onChange={(e) => setFormData({...formData, desc: e.target.value})}
              placeholder="Enter specific chemical details or constraints (e.g. Matt UV with high gloss contrast)..." 
              className="w-full p-2.5 border border-slate-200 bg-[#f8fafc] rounded-lg text-xs font-medium text-slate-600 outline-none focus:bg-white focus:border-blue-500 transition-all resize-none placeholder:text-slate-300"
            ></textarea>
          </div>
        </div>

        {/* نیچلا ایکشن فوٹر بار */}
        <div className="bg-slate-900 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Info size={16} />
            </div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider max-w-[280px]">Outsourced cost values are directly ledger-bonded with accounts module.</p>
          </div>
          
          <div className="flex gap-3 w-full sm:w-auto justify-end">
            <button 
              type="button"
              onClick={() => { setShowForm(false); resetForm(); }} 
              className="px-6 py-2 text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 py-2.5 bg-[#0284c7] text-white font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {editId ? 'Commit Changes' : 'Write Record'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default OtherWorkEntry;
