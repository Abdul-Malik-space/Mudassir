import React, { useState, useEffect } from "react";
import { FileText, FileSpreadsheet, Download, Calendar, Clock, CheckCircle2, ChevronRight, Share2, Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import { API_BASE_URL } from "../config/api";

export default function ReportsDashboardPro() {
  const [reports, setReports] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [timeFilter, setTimeFilter] = useState("month");

  const API_URL = `${API_BASE_URL}/reports`; 

  // --- 1. بیکنڈ سے تمام رپورٹس لوڈ کرنا (GET) ---
  useEffect(() => {
    const loadReports = async () => {
      try {
        setFetching(true);
        const res = await fetch(`${API_URL}/all`);
        const data = await res.json();
        setReports(data || []);
      } catch (err) {
        console.error("Failed to fetch industrial reports ledger:", err);
      } finally {
        setFetching(false);
      }
    };
    loadReports();
  }, []);

  // --- 2. رپورٹ کمپائل اور ڈاؤن لوڈ لاجک ---
  const handleCompile = (report) => {
    setActiveReport(report);
    setIsCompiling(true);
    
    // فیکٹری بیکنڈ جنریشن کی نقالی (Simulation)
    setTimeout(() => {
      setIsCompiling(false);
    }, 1800);
  };

  if (fetching) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  return (
    <div className="w-full mx-auto p-6 space-y-6">

      {/* ٹاپ ہیڈر کارڈ - کلاسک مینوفیکچرنگ فلیٹ بلیو تھیم */}
      <div className="bg-[#1e40af] text-white p-5 rounded-t-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()} className="p-1 hover:bg-blue-700 rounded-lg transition-all">
            <ArrowLeft size={20} className="text-white" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">Factory Intelligence & System Reports</h1>
            <p className="text-blue-100 text-xs font-normal">Generate compiled statements for inventory, production sheets, and audits</p>
          </div>
        </div>
        
        {/* ٹائم فلٹر کنٹرولز */}
        <div className="flex items-center bg-blue-900/50 border border-blue-700/60 rounded-lg p-1">
          <button 
            onClick={() => setTimeFilter("today")}
            className={`px-3 py-1.5 text-[11px] font-semibold uppercase rounded transition-all ${timeFilter === 'today' ? 'bg-[#2563eb] text-white shadow-sm' : 'text-blue-200 hover:text-white'}`}
          >
            Today
          </button>
          <button 
            onClick={() => setTimeFilter("month")}
            className={`px-3 py-1.5 text-[11px] font-semibold uppercase rounded transition-all ${timeFilter === 'month' ? 'bg-[#2563eb] text-white shadow-sm' : 'text-blue-200 hover:text-white'}`}
          >
            This Month
          </button>
          <div className="h-4 w-[1px] bg-blue-800 mx-1.5"></div>
          <button className="p-1.5 text-blue-200 hover:text-white rounded transition-colors">
            <Calendar size={14} />
          </button>
        </div>
      </div>

      {/* مین لے آؤٹ پینل */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* بائیں جانب - رپورٹس گرڈ ہولڈر */}
        <div className="lg:col-span-2 space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {reports.map((report) => {
              const isSelected = activeReport?._id === report._id;
              return (
                <div
                  key={report._id}
                  onClick={() => handleCompile(report)}
                  className={`group cursor-pointer bg-white border rounded-xl p-5 transition-all flex flex-col justify-between ${
                    isSelected ? "border-blue-600 shadow-sm" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-2.5 rounded-lg border ${
                        isSelected 
                          ? 'bg-blue-50 border-blue-200 text-blue-600' 
                          : 'bg-slate-50 border-slate-100 text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 group-hover:border-blue-100'
                      } transition-colors`}>
                        {report.type === 'PDF' ? <FileText size={20} /> : <FileSpreadsheet size={20} />}
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">{report.type || 'RAW'}</span>
                        <span className="block text-[10px] text-slate-400 font-medium mt-1">{report.size || '0 KB'}</span>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {report.title}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-1 line-clamp-2 leading-relaxed">
                      {report.description || 'No descriptive summary registered for this log module.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span className="group-hover:text-blue-600">Compile Ledger</span>
                    <div className={`p-1.5 rounded ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>
                      <Download size={13} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {reports.length === 0 && (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
              <AlertCircle className="mx-auto text-slate-300 mb-2" size={32} />
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">No structured data sheets configured for compile</p>
            </div>
          )}

          {/* لائیو پاپ اپ بار اسٹیٹس اپڈیٹ (سٹیٹ آئسولیشن فکسڈ) */}
          {activeReport && (
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-top-3 duration-200 ${
              isCompiling ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
            }`}>
              <div className="flex items-center gap-3">
                {isCompiling ? (
                  <Loader2 className="animate-spin text-blue-600" size={18} />
                ) : (
                  <CheckCircle2 size={20} className="text-emerald-600" />
                )}
                <p className="text-xs font-semibold">
                  {isCompiling 
                    ? `Fetching live blocks & building [${activeReport.title}] statement...` 
                    : `Document [${activeReport.title}] has been successfully exported to core memory.`
                  }
                </p>
              </div>
              {!isCompiling && (
                <button 
                  onClick={() => alert(`Downloading: ${activeReport.title}`)}
                  className="w-full sm:w-auto text-[10px] font-bold uppercase bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md transition-colors shadow-sm"
                >
                  Download Now
                </button>
              )}
            </div>
          )}
        </div>

        {/* دائیں جانب - حالیہ سرگرمی لاگز پینل */}
        <div className="space-y-5">
          
          {/* ایکٹیویٹی لاگ باکس */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-5">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <Clock size={14} className="text-slate-400" /> Recent Exports Log
            </h2>
            
            <div className="space-y-4">
              {[
                { title: "Raw Inventory Audit", time: "2 Hours ago", type: "XLSX" },
                { title: "Monthly Wages Ledger", time: "Yesterday", type: "PDF" },
                { title: "Procurement Expenses Sheet", time: "04 May 2026", type: "XLSX"}
              ].map((log, idx) => (
                <div key={idx} className="flex items-center justify-between group cursor-pointer border-b border-slate-50 last:border-none pb-2 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-1.5 bg-slate-300 rounded-full group-hover:bg-blue-600 transition-all"></div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{log.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{log.time} • <span className="font-bold text-slate-500">{log.type}</span></p>
                    </div>
                  </div>
                  <ChevronRight size={13} className="text-slate-300 group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
          </div>

          {/* آٹومیشن بینر فلیٹ ڈارک مینوفیکچرنگ لک */}
          <div className="bg-slate-900 rounded-xl p-5 text-white relative overflow-hidden shadow-sm flex flex-col justify-between h-44">
            <Share2 className="absolute -right-4 -top-4 text-slate-800 opacity-40" size={100} />
            <div className="relative z-10">
              <h4 className="text-sm font-bold tracking-wide">Automate Scheduler</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-1">Configure the engine to automatically dispatch analytical logs to the central office email.</p>
            </div>
            <button className="text-[10px] font-bold uppercase bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md w-fit transition-colors shadow-sm">
              Setup Pipeline
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
