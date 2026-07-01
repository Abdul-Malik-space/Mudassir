import React, { useState, useEffect } from 'react';
import { Plus, Package, Trash2, ArrowLeft, PencilLine, CheckCircle2, Database, Loader2 } from 'lucide-react';
import { API_BASE_URL } from "../config/api";

const ReadyProductEntry = () => {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  // عارضی جاب کارڈ لسٹ (بیک اینڈ آنے پر ریپلیس کر لیں)
  const [jobCards, setJobCards] = useState(['JOB-3589', 'JOB-1024', 'JOB-7782']);

  // بیکنڈ API کا URL
  const API_URL = `${API_BASE_URL}/ready-products`;

  // --- API سے ڈیٹا لوڈ کرنا ---
  const fetchEntries = async () => {
    setLoading(true);
    try {
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

  const [formData, setFormData] = useState({
    jobCardId: '',
    product: '',
    process: 'Pasting',
    qty: '',
    location: 'Main Store',
    packaging: '',
    employee: ''
  });

  const totalStock = entries.reduce((acc, curr) => acc + Number(curr.qty || 0), 0);

  // --- سبمٹ فنکشن (Create & Update) ---
  const handleSubmit = async () => {
    if (!formData.jobCardId || !formData.product || !formData.qty || !formData.employee) {
      alert("Please fill Job Card, Product Name, Quantity and Employee!");
      return;
    }

    const existingEntry = editId ? entries.find(e => e._id === editId) : null;
    const payload = {
      ...formData,
      qty: Number(formData.qty),
      time: editId ? existingEntry?.time : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
      alert("Error saving record!");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
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
      jobCardId: entry.jobCardId || '',
      product: entry.product || '',
      process: entry.process || 'Pasting',
      qty: entry.qty || '',
      location: entry.location || 'Main Store',
      packaging: entry.packaging || '',
      employee: entry.employee || ''
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setFormData({ jobCardId: '', product: '', process: 'Pasting', qty: '', location: 'Main Store', packaging: '', employee: '' });
    setEditId(null);
    setShowForm(false);
  };

  // --- ویو 1: مین ڈیش بورڈ (لسٹ) ---
  if (!showForm) {
    return (
      <div className="w-full mx-auto p-6 space-y-6">
        
        {/* ٹاپ ہیڈر کارڈ - کلاسک بلیو تھیم */}
        <div className="bg-[#1e40af] text-white p-5 rounded-t-xl flex justify-between items-center relative shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()} className="p-1 hover:bg-blue-700 rounded-lg transition-all">
              <ArrowLeft size={20} className="text-white" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide">Ready Inventory Log</h1>
              <p className="text-blue-100 text-xs font-normal">Manage final packed products and warehouse stock</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* ٹوٹل اسٹاک کاؤنٹر */}
            <div className="hidden md:flex bg-blue-800/50 border border-blue-500 px-4 py-1.5 rounded-lg items-center gap-3">
              <div className="text-right">
                <p className="text-[9px] font-bold text-blue-200 uppercase tracking-wider">Total Ready Stock</p>
                <p className="text-sm font-black text-white">{totalStock.toLocaleString()} <span className="text-[10px] font-normal text-blue-200">units</span></p>
              </div>
              <Database size={16} className="text-blue-200" />
            </div>

            <button 
              onClick={() => { closeForm(); setShowForm(true); }}
              className="flex items-center gap-1.5 bg-[#2563eb] text-white px-5 py-2.5 rounded-lg font-semibold text-xs hover:bg-blue-700 transition-all shadow-sm border border-blue-400"
            >
              <Plus size={16} /> Add to Stock
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
                    <th className="px-5 py-3.5">Job No / Process</th>
                    <th className="px-5 py-3.5">Product Details</th>
                    <th className="px-5 py-3.5">Ready Qty</th>
                    <th className="px-5 py-3.5">Warehouse Location</th>
                    <th className="px-5 py-3.5">Packed By</th>
                    <th className="px-5 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {entries.map((entry) => (
                    <tr key={entry._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-blue-600">{entry.jobCardId || 'N/A'}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{entry.process}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <Package size={14} className="text-slate-400" />
                          {entry.product}
                        </div>
                        {entry.packaging && <div className="text-[11px] text-slate-400 font-medium mt-0.5">{entry.packaging}</div>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-1 rounded">
                          {Number(entry.qty).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[10px] font-bold uppercase text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded">
                          {entry.location}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium">{entry.employee}</div>
                        <div className="text-[10px] text-slate-400">{entry.time}</div>
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
            {editId ? 'Edit Inventory Stock' : 'Add Ready Stock to Warehouse'}
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
          
          {/* سیکشن 1: جاب لنک اور پروڈکٹ نام */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 tracking-wider uppercase mb-4 border-b border-slate-100 pb-1">1. Job & Product Information</h3>
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

              {/* پروڈکٹ نیم ان پٹ */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Product Name</label>
                <input 
                  type="text" 
                  value={formData.product}
                  onChange={(e) => setFormData({...formData, product: e.target.value})}
                  placeholder="e.g. Premium Perfume Box" 
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium" 
                />
              </div>

            </div>
          </div>

          {/* سیکشن 2: مینوفیکچرنگ فلو کا آخری عمل */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 tracking-wider uppercase mb-4 border-b border-slate-100 pb-1">2. Verification & Final Process</h3>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600">Final Processing Stage Applied</label>
              <div className="flex flex-wrap gap-2">
                {['UV Coating', 'Die Cutting', 'Pasting', 'Embossing'].map((tag) => (
                  <button 
                    type="button"
                    key={tag} 
                    onClick={() => setFormData({...formData, process: tag})}
                    className={`px-4 py-2 rounded-lg border text-xs font-bold transition-all ${formData.process === tag ? 'border-blue-600 bg-blue-50/50 text-blue-700' : 'border-slate-200 bg-[#f8fafc] text-slate-500 hover:border-slate-300'}`}
                  >
                    {formData.process === tag ? '✓ ' : '+ '} {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* سیکشن 3: اسٹاک تعداد اور ویئر ہاؤس لوکیشن */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 tracking-wider uppercase mb-4 border-b border-slate-100 pb-1">3. Stock Logistics & Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-50 p-5 rounded-lg border border-slate-200">
              
              {/* تیار کوانٹٹی تعداد */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Finished Quantity (Units)</label>
                <input 
                  type="number" 
                  value={formData.qty}
                  onChange={(e) => setFormData({...formData, qty: e.target.value})}
                  placeholder="0" 
                  className="w-full bg-transparent border-b border-slate-300 py-1.5 outline-none focus:border-blue-500 text-2xl font-bold text-slate-800" 
                />
              </div>
              
              {/* ویئر ہاؤس لوکیشن سلیکٹر */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Warehouse Storage Location</label>
                <select 
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full bg-transparent border-b border-slate-300 py-2 outline-none focus:border-blue-500 font-bold text-slate-600 text-xs cursor-pointer"
                >
                  <option>Main Store</option>
                  <option>Finished Goods Area</option>
                  <option>Dispatch Floor</option>
                </select>
              </div>

              {/* کوالٹی کا خودکار اسٹیٹس پینل */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Quality Control</label>
                <div className="flex items-center gap-2 py-2">
                  <span className="h-2.5 w-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="text-xs font-bold text-slate-700 tracking-tight">QC Passed & Secured</span>
                </div>
              </div>

            </div>
          </div>

          {/* سیکشن 4: پیکنگ اور ہینڈلر تفصیلات */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 tracking-wider uppercase mb-4 border-b border-slate-100 pb-1">4. Packaging & Handler Assignment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* پیکیجنگ انفارمیشن */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Packaging Type / Box Counts</label>
                <input 
                  type="text" 
                  value={formData.packaging}
                  onChange={(e) => setFormData({...formData, packaging: e.target.value})}
                  placeholder="e.g. 50 Master Cartons" 
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500" 
                />
              </div>
              
              {/* پیکنگ ملازم */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Packing Employee (Incharge)</label>
                <select 
                  value={formData.employee}
                  onChange={(e) => setFormData({...formData, employee: e.target.value})}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 font-medium cursor-pointer"
                >
                  <option value="">Select Employee...</option>
                  <option>Rashid Khan</option>
                  <option>M. Salman</option>
                </select>
              </div>

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
            {editId ? 'Update Stock' : 'Add to Inventory'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ReadyProductEntry;
