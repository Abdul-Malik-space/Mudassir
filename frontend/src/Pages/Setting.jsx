import React, { useState, useEffect } from "react";
import { User, Shield, Settings as SettingsIcon, Upload, Loader2, Save, ArrowLeft, Building2, Globe2, Landmark, CheckCircle2, AlertTriangle } from "lucide-react";
import { API_BASE_URL } from "../config/api";

export default function SettingsPro() {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  
  // اسکرین پر کامیابی یا غلطی کا میسج دکھانے کے لیے اسٹیٹ
  const [statusBanner, setStatusBanner] = useState({ show: false, type: '', message: '' });
  
  const [settings, setSettings] = useState({
    companyName: '', 
    email: '', 
    phone: '', 
    ntnNumber: '', 
    currency: 'PKR', 
    fiscalYearStart: 'July', 
    theme: 'Light Mode', 
    language: 'English'
  });
  
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });

  const API_URL = `${API_BASE_URL}/settings`;

  // میسج کو 5 سیکنڈ بعد خود بخود غائب کرنے کا ٹائمر
  useEffect(() => {
    if (statusBanner.show) {
      const timer = setTimeout(() => {
        setStatusBanner({ show: false, type: '', message: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [statusBanner.show]);

  const fetchSettings = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      if (data && data.email) {
        setSettings({ ...settings, ...data });
      }
    } catch (err) {
      console.error("Error fetching factory parameters:", err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault(); 

    if (activeTab === "security") {
      if (!passwords.current || !passwords.new || !passwords.confirm) {
        setStatusBanner({ show: true, type: 'error', message: 'All password fields are mandatory.' });
        return;
      }
      if (passwords.new !== passwords.confirm) {
        setStatusBanner({ show: true, type: 'error', message: 'Validation Error: New Password and Confirm Password do not match.' });
        return;
      }
      if (passwords.new.length < 6) {
        setStatusBanner({ show: true, type: 'error', message: 'Security Alert: Password must be at least 6 characters long.' });
        return;
      }
    }

    setLoading(true);
    try {
      const endpoint = activeTab === "security" ? "/change-password" : "/update";
      const body = activeTab === "security" ? passwords : settings;

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: activeTab === "security" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const result = await res.json();

      if (res.ok) {
        if (activeTab !== "security") {
          setSettings(result);
        }
        // اسکرین پر گرین کامیابی کا میسج دکھانا
        setStatusBanner({ 
          show: true, 
          type: 'success', 
          message: activeTab === 'security' ? 'Security access keys re-encrypted successfully!' : 'System corporate parameters committed successfully!' 
        });
        
        if (activeTab === "security") {
          setPasswords({ current: '', new: '', confirm: '' }); 
        }
      } else {
        setStatusBanner({ show: true, type: 'error', message: 'Server Error: ' + (result.message || 'Failed to compile changes.') });
      }
    } catch (err) {
      setStatusBanner({ show: true, type: 'error', message: 'Network breakdown. Failed to establish pipeline connection to server.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full mx-auto p-6 space-y-6">

      {/* ٹاپ ہیڈر کارڈ - کلاسک مینوفیکچرنگ فلیٹ بلیو تھیم */}
      <div className="bg-[#1e40af] text-white p-5 rounded-t-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()} className="p-1 hover:bg-blue-700 rounded-lg transition-all">
            <ArrowLeft size={20} className="text-white" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">System Settings & Parameters</h1>
            <p className="text-blue-100 text-xs font-normal">Configure corporate identity, encryption profiles, and financial ledger defaults</p>
          </div>
        </div>
        
        <div className="flex items-center bg-blue-900/50 border border-blue-700/60 rounded-lg p-1 w-full md:w-auto overflow-x-auto">
          <TabBtn id="profile" icon={<User size={13}/>} label="Corporate Profile" active={activeTab} set={setActiveTab} />
          <TabBtn id="security" icon={<Shield size={13}/>} label="Security Profile" active={activeTab} set={setActiveTab} />
          <TabBtn id="preferences" icon={<SettingsIcon size={13}/>} label="System Engine" active={activeTab} set={setActiveTab} />
        </div>
      </div>

      {/* مین فارم کنٹینر پینل */}
      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-b-xl p-6 shadow-sm space-y-5 relative">
        
        {/* نیا الرٹ بار ہولڈر (Success / Error Notification) */}
        {statusBanner.show && (
          <div className={`p-4 rounded-lg border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
            statusBanner.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {statusBanner.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-600 shrink-0" /> : <AlertTriangle size={18} className="text-red-600 shrink-0" />}
            <p className="text-xs font-bold tracking-wide">{statusBanner.message}</p>
          </div>
        )}

        {/* 1. CORPORATE PROFILE TAB */}
        {activeTab === "profile" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
              <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center bg-slate-50 text-slate-400 hover:border-blue-500 hover:text-blue-600 transition-colors cursor-pointer group">
                <Upload size={16} className="group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-bold uppercase mt-1">Upload</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><Building2 size={16} className="text-slate-400" /> Corporate Logo</h2>
                <p className="text-xs text-slate-400">PNG or JPG asset used in print layouts and purchase orders.</p>
              </div>
            </div>
             
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Registered Company Name" required val={settings.companyName} set={(v) => setSettings({...settings, companyName: v})} ph="e.g. Al-Noor Textiles Ltd" />
              <Input label="Official NTN Number (Tax)" required val={settings.ntnNumber} set={(v) => setSettings({...settings, ntnNumber: v})} ph="e.g. 1234567-8" />
              <Input type="email" label="Gateway Notification Email" required val={settings.email} set={(v) => setSettings({...settings, email: v})} ph="admin@factory.com" />
              <Input type="tel" label="Factory Contact Terminal" required val={settings.phone} set={(v) => setSettings({...settings, phone: v})} ph="e.g. +92 42 111 XXXXXX" />
            </div>
          </div>
        )}

        {/* 2. SECURITY & ENCRYPTION TAB */}
        {activeTab === "security" && (
          <div className="space-y-4 max-w-md animate-in slide-in-from-right-3 duration-150">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-xs font-medium mb-2">
              Security Notice: Changing root passwords will terminate all current API access tokens across warehouse terminals.
            </div>
            <Input type="password" label="Master Current Password" val={passwords.current} set={(v) => setPasswords({...passwords, current: v})} ph="••••••••" />
            <Input type="password" label="New Secure Key Encryption" val={passwords.new} set={(v) => setPasswords({...passwords, new: v})} ph="••••••••" />
            <Input type="password" label="Confirm Encryption Sequence" val={passwords.confirm} set={(v) => setPasswords({...passwords, confirm: v})} ph="••••••••" />
          </div>
        )}

        {/* 3. SYSTEM PREFERENCES TAB */}
        {activeTab === "preferences" && (
          <div className="space-y-5 animate-in slide-in-from-right-3 duration-150">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1"><Landmark size={14} className="text-slate-400" /> Default Base Currency</label>
                <select value={settings.currency} onChange={(e) => setSettings({...settings, currency: e.target.value})} className="w-full p-2.5 border border-slate-200 bg-[#f8fafc] text-xs font-bold text-slate-700 rounded-lg outline-none focus:border-blue-500 focus:bg-white cursor-pointer">
                  <option value="PKR">PKR - Pakistani Rupee</option>
                  <option value="USD">USD - United States Dollar</option>
                  <option value="AED">AED - UAE Dirham</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1"><Globe2 size={14} className="text-slate-400" /> Financial Year Segment</label>
                <select value={settings.fiscalYearStart} onChange={(e) => setSettings({...settings, fiscalYearStart: e.target.value})} className="w-full p-2.5 border border-slate-200 bg-[#f8fafc] text-xs font-bold text-slate-700 rounded-lg outline-none focus:border-blue-500 focus:bg-white cursor-pointer">
                  <option value="July">July to June Cycle</option>
                  <option value="January">January to December Cycle</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Interface Display Environment</label>
                <select value={settings.theme} onChange={(e) => setSettings({...settings, theme: e.target.value})} className="w-full p-2.5 border border-slate-200 bg-[#f8fafc] text-xs font-bold text-slate-700 rounded-lg outline-none focus:border-blue-500 focus:bg-white cursor-pointer">
                  <option value="Light Mode">Industrial Light Theme</option>
                  <option value="Dark Mode">High Contrast Dark Control Room</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">System Core Locale Language</label>
                <select value={settings.language} onChange={(e) => setSettings({...settings, language: e.target.value})} className="w-full p-2.5 border border-slate-200 bg-[#f8fafc] text-xs font-bold text-slate-700 rounded-lg outline-none focus:border-blue-500 focus:bg-white cursor-pointer">
                  <option value="English">English (United States)</option>
                  <option value="Urdu">Urdu (اردو ڈیش بورڈ)</option>
                </select>
              </div>

            </div>
          </div>
        )}

        {/* ایکشن سیو بٹن پینل */}
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button 
            type="submit" 
            disabled={loading}
            className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-8 py-3 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm ${
              loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-[#0284c7] hover:bg-blue-700'
            }`}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Commit Parameter Updates
          </button>
        </div>
      </form>
    </div>
  );
}

// --- ری یوزیبل کمپوننٹس (Sub Components) ---

const TabBtn = ({ id, icon, label, active, set }) => (
  <button 
    type="button" 
    onClick={() => set(id)} 
    className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-semibold whitespace-nowrap uppercase rounded transition-all ${
      active === id 
      ? "bg-[#2563eb] text-white shadow-sm" 
      : "text-blue-200 hover:text-white"
    }`}
  >
    {icon} <span>{label}</span>
  </button>
);

const Input = ({ label, ph, val, set, type = "text", required = false }) => (
  <div className="space-y-1.5 w-full">
    {label && <label className="text-xs font-bold text-slate-600 tracking-wide">{label}</label>}
    <input 
      type={type} 
      required={required}
      value={val || ""} 
      onChange={(e) => set(e.target.value)} 
      className="w-full p-2.5 border border-slate-200 bg-[#f8fafc] rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-300 placeholder:font-normal" 
      placeholder={ph} 
    />
  </div>
);
