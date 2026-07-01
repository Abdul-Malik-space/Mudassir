import React, { useState, useEffect } from 'react';
import { 
  HomeModernIcon, 
  PlusIcon, 
  PencilSquareIcon, 
  TrashIcon, 
  MapPinIcon, 
  InboxStackIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import { API_BASE_URL } from "../config/api";

const WarehousePage = () => {
  // اسٹیٹ مینجمنٹ
  const [warehouses, setWarehouses] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // فارم ڈیٹا کے لیے کلین فیلڈز
  const [currentWarehouse, setCurrentWarehouse] = useState({ name: '', location: '', capacity: '0', status: 'Active' });
  const [editId, setEditId] = useState(null);

  const API_URL = `${API_BASE_URL}/warehouses`; 

  // --- 1. بیکنڈ سے تمام ڈیٹا لوڈ کرنا (GET) ---
  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/all`);
      const data = await res.json();
      setWarehouses(data || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  // --- 2. موڈل کنٹرول پینل ---
  const handleOpenModal = (wh = null) => {
    if (wh) {
      setEditId(wh._id);
      setCurrentWarehouse({
        name: wh.name,
        location: wh.location,
        capacity: String(parseInt(wh.capacity) || 0), // اسٹرنگ نمبر کلین اپ
        status: wh.status || 'Active'
      });
    } else {
      setEditId(null);
      setCurrentWarehouse({ name: '', location: '', capacity: '0', status: 'Active' });
    }
    setIsModalOpen(true);
  };

  // --- 3. ڈیٹا محفوظ یا اپڈیٹ کرنا (POST/PUT) ---
  const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const method = editId ? 'PUT' : 'POST';
      const url = editId ? `${API_URL}/update/${editId}` : `${API_URL}/add`;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...currentWarehouse,
          capacity: Number(currentWarehouse.capacity) // بیکنڈ پر خالص نمبر فارمیٹ جائے گا
        })
      });

      if (res.ok) {
        fetchWarehouses(); 
        setIsModalOpen(false);
      } else {
        alert("Error while preserving warehouse records inside database.");
      }
    } catch (err) {
      console.error("Save Error:", err);
      alert("Server communication breakdown.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 4. ڈیلیٹ فنکشن (DELETE) ---
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to decommission this factory warehouse location?")) {
      try {
        const res = await fetch(`${API_URL}/delete/${id}`, { method: 'DELETE' });
        if (res.ok) fetchWarehouses();
      } catch (err) {
        console.error("Delete Error:", err);
      }
    }
  };

  return (
    <div className="w-full mx-auto p-6 space-y-6">
      
      {/* ٹاپ ہیڈر کارڈ - کلاسک مینوفیکچرنگ فلیٹ بلیو تھیم */}
      <div className="bg-[#1e40af] text-white p-5 rounded-t-xl flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()} className="p-1 hover:bg-blue-700 rounded-lg transition-all">
            <ArrowLeft size={20} className="text-white" />
          </button>
          <div className="flex items-center gap-2.5">
            <HomeModernIcon className="w-6 h-6 text-blue-200" />
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide">Factory Stock & Warehouses Ledger</h1>
              <p className="text-blue-100 text-xs font-normal">Monitor and manage raw material godowns and volumetric capacity limits</p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-[#2563eb] text-white px-5 py-2.5 rounded-lg font-semibold text-xs hover:bg-blue-700 transition-all shadow-sm border border-blue-400 flex items-center gap-1.5"
        >
          <PlusIcon className="w-4 h-4 stroke-[3]" /> Add New Godown
        </button>
      </div>

      {/* لوڈنگ اسٹیٹ ہینڈلر */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex justify-center items-center p-24">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {warehouses.map((wh) => {
            const capacityNum = parseInt(wh.capacity) || 0;
            return (
              <div key={wh._id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
                <div>
                  {/* ہیڈر لائن اسٹیٹس پینل */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <InboxStackIcon className="w-6 h-6" />
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      wh.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
                    }`}>
                      {wh.status || 'Active'}
                    </span>
                  </div>

                  {/* نام و پتا */}
                  <h3 className="text-base font-bold text-slate-800 tracking-tight">{wh.name}</h3>
                  <div className="flex items-center text-slate-400 text-xs mt-1 mb-4">
                    <MapPinIcon className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {wh.location}
                  </div>

                  {/* پروگریس بار انڈیکیٹر لائن (بگ فکسڈ) */}
                  <div className="space-y-1.5 mb-5 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Volumetric Load</span>
                      <span className={capacityNum > 85 ? 'text-red-500 font-black' : 'text-blue-600'}>{capacityNum}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 rounded-full ${capacityNum > 85 ? 'bg-red-500' : 'bg-blue-600'}`} 
                        style={{ width: `${Math.min(capacityNum, 100)}%` }} // سیف گارڈ لگا دیا تاکہ 100% سے اوپر نہ جائے ظاہر میں
                      ></div>
                    </div>
                  </div>
                </div>

                {/* ایکشن بٹن پینل */}
                <div className="flex gap-2 border-t border-slate-100 pt-3 mt-2">
                  <button onClick={() => handleOpenModal(wh)} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-50 hover:bg-blue-50 text-blue-600 rounded-md font-semibold text-xs border border-slate-200 hover:border-blue-200 transition-colors">
                    <PencilSquareIcon className="w-3.5 h-3.5" /> Edit Profile
                  </button>
                  <button onClick={() => handleDelete(wh._id)} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-50 hover:bg-red-50 text-red-500 rounded-md font-semibold text-xs border border-slate-200 hover:border-red-200 transition-colors">
                    <TrashIcon className="w-3.5 h-3.5" /> Decommission
                  </button>
                </div>
              </div>
            );
          })}

          {warehouses.length === 0 && (
            <div className="col-span-full text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <AlertCircle className="mx-auto text-slate-300 mb-2" size={36} />
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">No factory warehouse installations registered</p>
            </div>
          )}
        </div>
      )}

      {/* پاپ اپ ماڈل فارم */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* ماڈل ہیڈر */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider">
                {editId ? 'Modify Warehouse Data' : 'Establish New Warehouse'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            {/* مین فارم پینل */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Warehouse / Godown Identity</label>
                <input 
                  type="text" required
                  value={currentWarehouse.name}
                  onChange={(e) => setCurrentWarehouse({...currentWarehouse, name: e.target.value})}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
                  placeholder="e.g. Raw Material Vault A"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Physical Site Address</label>
                <input 
                  type="text" required
                  value={currentWarehouse.location}
                  onChange={(e) => setCurrentWarehouse({...currentWarehouse, location: e.target.value})}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
                  placeholder="e.g. Sector-B Plot 12, Factory Compound"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                
                {/* پرسنٹیج ان پٹ فیلڈ ٹائپ نمبر فکسڈ */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Current Load (%)</label>
                  <div className="relative">
                    <input 
                      type="number" min="0" max="100" required
                      value={currentWarehouse.capacity}
                      onChange={(e) => setCurrentWarehouse({...currentWarehouse, capacity: e.target.value})}
                      className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 pr-8 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
                      placeholder="65"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">%</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Operational Status</label>
                  <select 
                    value={currentWarehouse.status}
                    onChange={(e) => setCurrentWarehouse({...currentWarehouse, status: e.target.value})}
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
                  >
                    <option value="Active">Active Ledger</option>
                    <option value="Full">At Max Capacity</option>
                  </select>
                </div>

              </div>

              {/* سبمٹ ایکشن بٹن */}
              <button 
                type="submit" 
                disabled={isSubmitting}
                className={`w-full text-white py-3 rounded-lg font-bold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 mt-2 transition-all ${
                  isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-[#0284c7] hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Updating Master Logs...
                  </>
                ) : (
                  <>{editId ? 'Commit Modifications' : 'Initialize Warehouse Unit'}</>
                )}
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default WarehousePage;
