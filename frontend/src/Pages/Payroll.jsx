import React, { useState, useEffect } from "react";
import { Users, Trash2, Edit3, Plus, Save, X, UserPlus, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { API_BASE_URL } from "../config/api";

const PayrollEntry = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  
  const API_URL = `${API_BASE_URL}/payroll`; // بیکنڈ API کا URL

  // مینوفیکچرنگ یونٹ کے شعبہ جات
  const departments = ["Printing Ops", "Die-Cutting", "Pasting/Folding", "Design", "Management", "Guards/Helpers"];

  // فارم ڈیٹا بشمول نئی پروفیشنل فیلڈز
  const [formData, setFormData] = useState({ 
    name: "", 
    salary: "", 
    department: "Printing Ops",
    workedDays: "30" // ڈیفالٹ پورے مہینے کے دن
  });

  // --- بیکنڈ سے ڈیٹا لوڈ کریں ---
  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_URL}/all`);
      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);

  // --- سیو یا اپڈیٹ ہینڈلر ---
  const handleSubmit = async () => {
    if (!formData.name || !formData.salary || !formData.workedDays) {
      return alert("Please fill Name, Base Salary and Worked Days!");
    }

    const payload = { 
      name: formData.name, 
      baseSalary: Number(formData.salary),
      department: formData.department,
      workedDays: Number(formData.workedDays)
    };
    
    try {
      const url = editId ? `${API_URL}/update/${editId}` : `${API_URL}/add`;
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        fetchEmployees(); 
        closeModal();
      } else {
        alert("Server responded with an error");
      }
    } catch (err) {
      alert("Action failed!");
    }
  };

  // --- بونس، کٹوتی، اور حاضری ان لائن اپڈیٹ (ڈیٹا بیس میں فوری سیو) ---
  const updateStats = async (id, field, value) => {
    try {
      // فرنٹ اینڈ پر فوری تبدیلی (Optimistic Update)
      setEmployees(employees.map(emp => emp._id === id ? { ...emp, [field]: Number(value) } : emp));

      await fetch(`${API_URL}/update/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: Number(value) })
      });
    } catch (err) {
      console.error("Update failed");
    }
  };

  // --- ڈیلیٹ ہینڈلر ---
  const deleteEmployee = async (id) => {
    if (window.confirm("Are you sure you want to remove this employee from payroll?")) {
      try {
        await fetch(`${API_URL}/delete/${id}`, { method: 'DELETE' });
        setEmployees(employees.filter(emp => emp._id !== id));
      } catch (err) {
        alert("Delete failed");
      }
    }
  };

  const openEditModal = (emp) => {
    setEditId(emp._id);
    setFormData({ 
      name: emp.name, 
      salary: emp.baseSalary,
      department: emp.department || "Printing Ops",
      workedDays: emp.workedDays !== undefined ? emp.workedDays : "30"
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    setFormData({ name: "", salary: "", department: "Printing Ops", workedDays: "30" });
  };

  // حاضری کے دنوں کے مطابق بنیادی تنخواہ نکالیں، پھر بونس پلس اور کٹوتی مائنس کریں
  const calculateNet = (emp) => {
    const days = emp.workedDays !== undefined ? Number(emp.workedDays) : 30;
    const earnedBase = (Number(emp.baseSalary) / 30) * days;
    return Math.round(earnedBase + (emp.bonus || 0) - (emp.deduction || 0));
  };
  
  const totalPayout = employees.reduce((acc, emp) => acc + calculateNet(emp), 0);

  return (
    <div className="w-full mx-auto p-6 space-y-6">
      
      {/* ٹاپ ہیڈر کارڈ - کلاسک مینوفیکچرنگ فلیٹ بلیو تھیم */}
      <div className="bg-[#1e40af] text-white p-5 rounded-t-xl flex justify-between items-center relative shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()} className="p-1 hover:bg-blue-700 rounded-lg transition-all">
            <ArrowLeft size={20} className="text-white" />
          </button>
          <div className="flex items-center gap-2.5">
            <Users size={20} className="text-blue-200" />
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide">Factory Wage & Payroll Ledger</h1>
              <p className="text-blue-100 text-xs font-normal">{employees.length} Active Factory Staff & Workers Registered</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* ٹوٹل پے آؤٹ کاؤنٹر */}
          <div className="hidden md:flex bg-blue-800/50 border border-blue-500 px-4 py-1.5 rounded-lg items-center gap-2">
            <div className="text-right">
              <p className="text-[9px] font-bold text-blue-200 uppercase tracking-wider">Estimated Net Payout</p>
              <p className="text-sm font-black text-white">Rs. {totalPayout.toLocaleString()}</p>
            </div>
          </div>

          <button 
            onClick={() => { closeModal(); setIsModalOpen(true); }}
            className="flex items-center gap-1.5 bg-[#2563eb] text-white px-5 py-2.5 rounded-lg font-semibold text-xs hover:bg-blue-700 transition-all shadow-sm border border-blue-400"
          >
            <UserPlus size={16} /> Onboard Staff
          </button>
        </div>
      </div>

      {/* ملازمین کی لسٹ ٹیبل سیکشن */}
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
                  <th className="px-5 py-3.5">Staff Name & Dept</th>
                  <th className="px-5 py-3.5">Basic Pay (30 Days)</th>
                  <th className="px-5 py-3.5 w-24">Worked Days</th>
                  <th className="px-5 py-3.5 w-28">Bonus (Rs)</th>
                  <th className="px-5 py-3.5 w-28">Deduction (Rs)</th>
                  <th className="px-5 py-3.5 text-center">Net Payable</th>
                  <th className="px-5 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {employees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* نام اور شعبہ */}
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{emp.name}</div>
                      <div className="text-[10px] font-bold text-blue-600 uppercase mt-0.5">{emp.department || 'General Labour'}</div>
                    </td>
                    
                    {/* بنیادی تنخواہ */}
                    <td className="px-5 py-3.5 font-semibold text-slate-600">
                      Rs. {Number(emp.baseSalary).toLocaleString()}
                    </td>
                    
                    {/* ڈیوٹی کے دن */}
                    <td className="px-5 py-3.5">
                      <input 
                        type="number"
                        min="0"
                        max="31"
                        value={emp.workedDays !== undefined ? emp.workedDays : 30}
                        onChange={(e) => updateStats(emp._id, 'workedDays', e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-md p-1.5 text-center font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white w-full"
                      />
                    </td>
                    
                    {/* ایڈوانس یا بونس پلس */}
                    <td className="px-5 py-3.5">
                      <input 
                        type="number" 
                        value={emp.bonus || ''} 
                        placeholder="0"
                        onChange={(e) => updateStats(emp._id, 'bonus', e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-md p-1.5 font-bold text-emerald-600 outline-none focus:border-emerald-500 focus:bg-white w-full" 
                      />
                    </td>
                    
                    {/* کٹوتی یا فائن */}
                    <td className="px-5 py-3.5">
                      <input 
                        type="number" 
                        value={emp.deduction || ''} 
                        placeholder="0"
                        onChange={(e) => updateStats(emp._id, 'deduction', e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-md p-1.5 font-bold text-red-500 outline-none focus:border-red-400 focus:bg-white w-full" 
                      />
                    </td>

                    {/* نیٹ فائنل تنخواہ */}
                    <td className="px-5 py-3.5 text-center font-black text-blue-700 text-sm">
                      Rs. {calculateNet(emp).toLocaleString()}
                    </td>

                    {/* ایکشن بٹنز */}
                    <td className="px-5 py-3.5">
                      <div className="flex justify-center gap-1">
                        <button 
                          onClick={() => openEditModal(emp)} 
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button 
                          onClick={() => deleteEmployee(emp._id)} 
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
                
                {employees.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-12 bg-slate-50">
                      <AlertCircle className="mx-auto text-slate-300 mb-2" size={36} />
                      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">No active employees found in ledger</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* پاپ اپ ماڈل فارم: ایڈ اور ایڈٹ ملازم */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* ماڈل ہیڈر */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider">
                {editId ? 'Modify Profile Details' : 'Register / Onboard Worker'}
              </h3>
              <button onClick={closeModal} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            
            {/* ماڈل باڈی */}
            <div className="p-6 space-y-5">
              
              {/* نام ان پٹ */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Employee Full Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Muhammad Asif"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white" 
                />
              </div>

              {/* شعبہ / ڈیپارٹمنٹ ڈراپ ڈاؤن */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Factory Department</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
                >
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                
                {/* بنیادی مقررہ تنخواہ */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Basic Salary (30 Days)</label>
                  <input 
                    type="number" 
                    value={formData.salary}
                    onChange={(e) => setFormData({...formData, salary: e.target.value})}
                    placeholder="e.g. 35000"
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white" 
                  />
                </div>

                {/* مہینے کے حاضر دن */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Worked Days</label>
                  <input 
                    type="number" 
                    min="1"
                    max="31"
                    value={formData.workedDays}
                    onChange={(e) => setFormData({...formData, workedDays: e.target.value})}
                    placeholder="30"
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white" 
                  />
                </div>

              </div>

              {/* ایکشن بٹن */}
              <button 
                type="button"
                onClick={handleSubmit}
                className="w-full bg-[#0284c7] text-white py-3 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-blue-700 shadow-sm transition-all flex items-center justify-center gap-1.5 mt-2"
              >
                <Save size={15} /> {editId ? 'Update Ledger Record' : 'Commit & Save Profile'}
              </button>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PayrollEntry;
