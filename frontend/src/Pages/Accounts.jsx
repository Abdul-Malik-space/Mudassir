import React, { useState, useEffect } from "react";
import { TrendingUp, Wallet, Landmark, Edit3, Save, X, ArrowUpRight, Loader2, ArrowLeft } from "lucide-react";
import { API_BASE_URL } from "../config/api";

export default function AccountsPro() {
  const [cash, setCash] = useState(0);
  const [bank, setBank] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tempData, setTempData] = useState({ cash: 0, bank: 0 });

  const API_URL = `${API_BASE_URL}/account`;

  // --- بیکنڈ سے ڈیٹا لوڈ کریں ---
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        console.log("Fetching from URL:", API_URL);
        const res = await fetch(API_URL);
        const data = await res.json();
        
        console.log("Data received from Backend:", data);
        
        // بیکنڈ کے نل (null) یا ان ڈیفائنڈ ڈیٹا کو ہینڈل کرنا
        setCash(data?.cash || 0);
        setBank(data?.bank || 0);
      } catch (err) {
        console.error("Error loading accounts:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBalance();
  }, []);

  const total = cash + bank;

  // --- ڈیٹا اپڈیٹ کرنے کا فنکشن (بگ فکسڈ اور انٹیگریشن) ---
  const handleUpdate = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cash: Number(tempData.cash), // یقینی بنایا کہ ڈیٹا نمبر فارمیٹ میں جائے
          bank: Number(tempData.bank) 
        })
      });

      if (res.ok) {
        const updatedData = await res.json();
        setCash(updatedData?.cash || 0);
        setBank(updatedData?.bank || 0);
        setIsModalOpen(false);
      } else {
        alert("Server error while updating assets ledger.");
      }
    } catch (err) {
      alert("Failed to update database! Check connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  return (
    <div className="w-full mx-auto p-6 space-y-6">
      
      {/* ٹاپ ہیڈر کارڈ - کلاسک مینوفیکچرنگ فلیٹ بلیو تھیم */}
      <div className="bg-[#1e40af] text-white p-5 rounded-t-xl flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()} className="p-1 hover:bg-blue-700 rounded-lg transition-all">
            <ArrowLeft size={20} className="text-white" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">Factory Vault & Liquidity Ledger</h1>
            <p className="text-blue-100 text-xs font-normal">Real-time status of cash in hand and registered factory bank accounts</p>
          </div>
        </div>
        
        <button 
          onClick={() => { setTempData({ cash, bank }); setIsModalOpen(true); }}
          className="bg-[#2563eb] text-white px-5 py-2.5 rounded-lg font-semibold text-xs hover:bg-blue-700 transition-all shadow-sm border border-blue-400 flex items-center gap-1.5"
        >
          <Edit3 size={15} /> Update Balances
        </button>
      </div>

      {/* فنانشل اسٹیٹس کارڈز گرڈ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* کیش کارڈ - کلاسک فلیٹ اسٹائل */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex items-center justify-between group">
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cash Reserve (In-Hand)</p>
            <h2 className="text-2xl font-black text-slate-800">₨ {cash.toLocaleString()}</h2>
            <p className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded w-fit border border-emerald-100">
              Verified Office Safe
            </p>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
            <Wallet size={24} />
          </div>
        </div>

        {/* بینک کارڈ */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex items-center justify-between group">
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Commercial Bank Balance</p>
            <h2 className="text-2xl font-black text-slate-800">₨ {bank.toLocaleString()}</h2>
            <p className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded w-fit border border-blue-100">
              HBL / Meezan Accounts
            </p>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
            <Landmark size={24} />
          </div>
        </div>

        {/* ٹوٹل اثاثے کارڈ */}
        <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm flex items-center justify-between group">
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider opacity-70">Total Liquidity Pool</p>
            <h2 className="text-2xl font-black text-white">₨ {total.toLocaleString()}</h2>
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800 px-2 py-0.5 rounded w-fit">
              <TrendingUp size={12} /> Live Working Capital
            </div>
          </div>
          <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg text-slate-400">
            <ArrowUpRight size={24} />
          </div>
        </div>

      </div>

      {/* اینالیٹکس پینل */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* بائیں جانب چارٹ بارز ہولڈر */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Asset Distribution Trend</h3>
            <span className="text-[10px] font-semibold text-slate-400">Past 6 Cycles</span>
          </div>
          <div className="h-40 flex items-end justify-around gap-4 pt-2">
            {[35, 60, 45, 85, 55, 75].map((h, i) => (
              <div key={i} className="w-full bg-slate-50 rounded-t border border-slate-100 hover:bg-blue-600 hover:border-blue-700 transition-all cursor-pointer h-full relative group">
                <div style={{ height: `${h}%` }} className="absolute bottom-0 left-0 right-0 bg-blue-500/10 group-hover:bg-transparent rounded-t transition-all"></div>
              </div>
            ))}
          </div>
        </div>

        {/* دائیں جانب والیو ریشو کارڈ */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Concentration Insight</h3>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                Ratio {((bank/(cash || 1))).toFixed(1)}:1
              </span>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600">Bank Allocation Weight</span>
                <span className="font-black text-slate-800">{total > 0 ? ((bank / total) * 100).toFixed(1) : 0}%</span>
              </div>
              
              {/* پروگریس بار */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                <div className="bg-blue-600 h-full transition-all" style={{ width: `${total > 0 ? (bank / total) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-400 font-medium mt-6 bg-slate-50 p-3 rounded-lg border border-slate-100">
            This metric details your capital deployment spread. Maintaining an optimal cash-to-bank ratio ensures immediate vendor payout capabilities while securing larger operational overheads inside commercial accounts.
          </p>
        </div>

      </div>

      {/* بینک بیلنس اپڈیٹ کرنے کا پاپ اپ ماڈل */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* ماڈل ہیڈر */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider">Adjust Ledger Balances</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            
            {/* ماڈل باڈی فارم */}
            <div className="p-6 space-y-5">
              
              {/* کیش ان ہینڈ فیلڈ */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Cash in Hand Balance (Rs.)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">Rs.</span>
                  <input 
                    type="number" 
                    value={tempData.cash}
                    onChange={(e) => setTempData({...tempData, cash: Number(e.target.value)})} // نمبر پارسنگ بگ فکسڈ
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 pl-10 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white" 
                  />
                </div>
              </div>

              {/* بینک ریزرو فیلڈ */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Commercial Bank Accounts (Rs.)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">Rs.</span>
                  <input 
                    type="number" 
                    value={tempData.bank}
                    onChange={(e) => setTempData({...tempData, bank: Number(e.target.value)})} // نمبر پارسنگ بگ فکسڈ
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 pl-10 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white" 
                  />
                </div>
              </div>

              {/* ایکشن بٹن */}
              <button 
                type="button"
                disabled={isSubmitting}
                onClick={handleUpdate}
                className={`w-full text-white py-3 rounded-lg font-bold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 mt-2 transition-all ${
                  isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-[#0284c7] hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Committing Changes...
                  </>
                ) : (
                  <>
                    <Save size={15} /> Save to Database
                  </>
                )}
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
