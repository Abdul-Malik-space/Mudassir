import React, { useState, useEffect } from 'react';
import { Plus, Receipt, Trash2, ArrowLeft, PencilLine, CheckCircle2, Wallet, Calendar, Loader2 } from 'lucide-react';
import { API_BASE_URL } from "../config/api";

function ExpensePro() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const API_URL = `${API_BASE_URL}/expenses`; // Backend API کا URL

  const categories = ["Utility", "Maintenance", "Supplies", "Salary", "Others"];

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'Utility',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash',
    note: ''
  });

  // --- بیکنڈ سے ڈیٹا حاصل کرنا ---
  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_URL + "/all");
      if (!response.ok) throw new Error("Server error");
      const data = await response.json();
      setExpenses(data);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  // ٹوٹل کیلکولیشن
  const totalExpense = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  // --- ڈیٹا محفوظ یا اپڈیٹ کرنا ---
  const handleSubmit = async () => {
    if (!formData.title || !formData.amount) {
      alert("Please enter title and amount");
      return;
    }

    setIsSubmitting(true);
    try {
      const method = editId ? 'PUT' : 'POST';
      const url = editId ? `${API_URL}/update/${editId}` : `${API_URL}/add`;

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchExpenses();
        closeForm();
      } else {
        const errorData = await response.json();
        alert(`Server Error: ${errorData.message || "Failed to save"}`);
      }
    } catch (error) {
      alert("Check your internet connection!");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- DATA DELETE ---
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        const response = await fetch(`${API_URL}/delete/${id}`, { method: 'DELETE' });
        if (response.ok) {
          setExpenses(expenses.filter(e => e._id !== id));
        }
      } catch (error) {
        alert("Delete failed!");
      }
    }
  };

  const handleEdit = (item) => {
    setEditId(item._id);
    setFormData({
      title: item.title,
      amount: item.amount,
      category: item.category,
      date: item.date,
      paymentMethod: item.paymentMethod || 'Cash',
      note: item.note || ''
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setFormData({ title: '', amount: '', category: 'Utility', date: new Date().toISOString().split('T')[0], paymentMethod: 'Cash', note: '' });
    setEditId(null);
    setShowForm(false);
  };

  // --- ویو 1: مین لسٹ ڈیش بورڈ ---
  if (!showForm) {
    return (
      <div className="w-full mx-auto p-6 space-y-6">
        
        {/* ٹاپ ہیڈر کارڈ - کلاسک بلیو فلیٹ تھیم */}
        <div className="bg-[#1e40af] text-white p-5 rounded-t-xl flex justify-between items-center relative shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()} className="p-1 hover:bg-blue-700 rounded-lg transition-all">
              <ArrowLeft size={20} className="text-white" />
            </button>
            <div className="flex items-center gap-2">
              <Wallet size={20} className="text-blue-200" />
              <div>
                <h1 className="text-lg font-bold text-white tracking-wide">Factory Expense Voucher Book</h1>
                <p className="text-blue-100 text-xs font-normal">Track factory utility bills, maintenance, salaries and supplies</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* ٹوٹل ایکسپنس کاؤنٹر */}
            <div className="hidden md:flex bg-blue-800/50 border border-blue-500 px-4 py-1.5 rounded-lg items-center gap-2">
              <div className="text-right">
                <p className="text-[9px] font-bold text-blue-200 uppercase tracking-wider">Total Debited</p>
                <p className="text-sm font-black text-white">Rs. {totalExpense.toLocaleString()}</p>
              </div>
            </div>

            <button 
              onClick={() => { closeForm(); setShowForm(true); }}
              className="flex items-center gap-1.5 bg-[#2563eb] text-white px-5 py-2.5 rounded-lg font-semibold text-xs hover:bg-blue-700 transition-all shadow-sm border border-blue-400"
            >
              <Plus size={16} /> Add Expense
            </button>
          </div>
        </div>

        {/* ٹیبل لسٹ سیکشن */}
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
                    <th className="px-5 py-3.5">Expense Details</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Payment Mode</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Amount</th>
                    <th className="px-5 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {expenses.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Receipt size={14} className="text-slate-400" />
                          {item.title}
                        </div>
                        {item.note && <div className="text-[11px] text-slate-400 font-medium mt-0.5">{item.note}</div>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-600">
                        {item.paymentMethod || 'Cash'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 font-medium">
                        <div className="flex items-center gap-1"><Calendar size={13} /> {item.date}</div>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-red-600">
                        Rs. {Number(item.amount).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-center gap-1.5">
                          <button 
                            onClick={() => handleEdit(item)} 
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                          >
                            <PencilLine size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(item._id)} 
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center text-slate-400 py-10">No expenses recorded yet.</td>
                    </tr>
                  )}
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
      
      {/* فارم ہیڈر کلاسک لک */}
      <div className="bg-[#1e40af] text-white p-5 rounded-t-xl flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={closeForm} className="p-1 hover:bg-blue-700 rounded-lg transition-all">
             <ArrowLeft size={20} className="text-white" />
          </button>
          <h1 className="text-lg font-bold tracking-wide">
            {editId ? 'Update Expense Voucher' : 'Record New Factory Expense Debit'}
          </h1>
        </div>
        <button 
          onClick={closeForm}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-xs hover:bg-blue-800 transition-all border border-blue-500"
        >
          Back to Dashboard
        </button>
      </div>

      <div className="bg-white rounded-b-xl border-x border-b border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 space-y-8">
          
          {/* سیکشن 1: بنیادی تفصیلات اور رقم */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 tracking-wider uppercase mb-4 border-b border-slate-100 pb-1">1. Expense Head & Voucher Title</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* ایکسپنس ٹائٹل */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Expense Title / Description</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Electricity Bill Jan, Machine Lubricants" 
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium" 
                />
              </div>

              {/* رقم ڈیبٹ */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Amount Paid (Rs.)</label>
                <div className="flex items-center bg-[#f8fafc] border border-slate-200 rounded-lg px-3 focus-within:border-blue-500 focus-within:bg-white transition-all">
                  <span className="text-slate-400 font-bold text-xs mr-2">Rs.</span>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-transparent py-2 text-base font-bold outline-none text-slate-800"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* سیکشن 2: کیٹیگری ٹیگز سلیکشن */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 tracking-wider uppercase mb-4 border-b border-slate-100 pb-1">2. Expense Category</h3>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600">Select Ledger Account Group</label>
              <div className="flex gap-2 flex-wrap">
                {categories.map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setFormData({ ...formData, category: cat })}
                    className={`px-5 py-2.5 rounded-lg border text-xs font-bold transition-all ${formData.category === cat
                        ? "border-blue-600 bg-blue-50/50 text-blue-700 shadow-sm"
                        : "border-slate-200 bg-[#f8fafc] text-slate-500 hover:border-slate-300"
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* سیکشن 3: لاجسٹک اور پیمنٹ میتھڈز */}
          <div>
            <h3 className="text-xs font-bold text-blue-600 tracking-wider uppercase mb-4 border-b border-slate-100 pb-1">3. Payment Logistics & Dates</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* تاریخ ان پٹ */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Payment Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-600 outline-none focus:border-blue-500"
                />
              </div>

              {/* پیمنٹ طریقہ کار */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Payment Method Account</label>
                <select 
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 font-medium cursor-pointer"
                >
                  <option>Cash</option>
                  <option>Bank Transfer</option>
                  <option>Cheque</option>
                  <option>Petty Cash Drawer</option>
                </select>
              </div>

              {/* اضافی نوٹ */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Voucher Notes / Remarks (Optional)</label>
                <input
                  type="text"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="e.g. Paid via check #4582"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500"
                />
              </div>

            </div>
          </div>

        </div>

        {/* بوٹم ایکشن بٹنز پینل */}
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
            disabled={isSubmitting}
            onClick={handleSubmit}
            className={`px-6 py-2 rounded-lg text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all ${
              isSubmitting ? 'bg-blue-400 cursor-not-allowed opacity-80' : 'bg-[#0284c7] hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 size={14} />
                {editId ? 'Update Voucher' : 'Post Expense'}
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

export default ExpensePro;
