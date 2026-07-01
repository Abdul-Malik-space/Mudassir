import React, { useState, useEffect } from 'react';
import { Plus, Package, ArrowLeft, Save, Trash2, Edit3, Layers, Tag, Ruler } from 'lucide-react';
import { API_BASE_URL } from "../config/api";

const ItemsManager = () => {
  const [items, setItems] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    name: "", code: "", category: "General", brand: "", unit: "Pcs",
    purchasePrice: "0", salePrice: "0", openingStock: "0", minStock: "5", status: "Active"
  });

  const API_URL = `${API_BASE_URL}/items`;

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/all`);
      const data = await response.json();
      setItems(data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editId ? `${API_URL}/update/${editId}` : `${API_URL}/add`;
    const method = editId ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    fetchItems();
    setIsFormOpen(false);
  };

  const deleteItem = async (id) => {
    if (window.confirm("Are you sure?")) {
      await fetch(`${API_URL}/delete/${id}`, { method: "DELETE" });
      fetchItems();
    }
  };

  const openEdit = (item) => {
    setEditId(item._id);
    setFormData(item);
    setIsFormOpen(true);
  };

  return (
    <div className="w-full mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-[#1e40af] text-white p-6 rounded-t-xl flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <button className="p-1 hover:bg-blue-700 rounded-lg"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-xl font-bold">Inventory & Items Master</h1>
            <p className="text-blue-100 text-xs">Manage product catalog, brands, and stock units</p>
          </div>
        </div>
        {!isFormOpen && (
          <button onClick={() => { setIsFormOpen(true); setEditId(null); }} className="bg-white text-blue-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-100 flex items-center gap-2">
            <Plus size={16} /> Create New Entry
          </button>
        )}
      </div>

      {/* Content */}
      <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-8">
        {!isFormOpen ? (
          <div className="space-y-4">
            <input type="text" placeholder="Search by name or code..." onChange={(e) => setSearchTerm(e.target.value)} className="border border-slate-300 rounded-lg px-4 py-2 text-xs w-64" />
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="p-4">Item Name</th>
                  <th className="p-4">SKU / Code</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Brand</th>
                  <th className="p-4 text-center">Unit</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).map(item => (
                  <tr key={item._id} className="border-b hover:bg-slate-50">
                    <td className="p-4 font-semibold">{item.name}</td>
                    <td className="p-4 font-mono text-blue-600">{item.code}</td>
                    <td className="p-4">{item.category}</td>
                    <td className="p-4">{item.brand}</td>
                    <td className="p-4 text-center">{item.unit}</td>
                    <td className="p-4 text-center"><span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">{item.status}</span></td>
                    <td className="p-4 text-center flex justify-center gap-2">
                      <button onClick={() => openEdit(item)} className="text-blue-600"><Edit3 size={15} /></button>
                      <button onClick={() => deleteItem(item._id)} className="text-red-600"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <form className="space-y-8" onSubmit={handleSubmit}>
            {/* Section 1: Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-blue-800 border-b pb-2 flex items-center gap-2"><Package size={16}/> 1. BASE INFORMATION</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="border rounded-lg p-3 text-xs" placeholder="Item Name" required />
                <input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="border rounded-lg p-3 text-xs" placeholder="Item Code / SKU" required />
              </div>
            </div>

            {/* Section 2: Classification */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-blue-800 border-b pb-2 flex items-center gap-2"><Layers size={16}/> 2. CLASSIFICATION & BRANDING</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="border rounded-lg p-3 text-xs" placeholder="Category (e.g. Papers)" />
                <input value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="border rounded-lg p-3 text-xs" placeholder="Brand Name" />
                <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="border rounded-lg p-3 text-xs">
                  <option value="Pcs">Pcs</option><option value="Kg">Kg</option><option value="Sheets">Sheets</option><option value="Mtr">Mtr</option>
                </select>
              </div>
            </div>

            {/* Section 3: Status */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-blue-800 border-b pb-2 flex items-center gap-2"><Tag size={16}/> 3. STATUS</h3>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="border rounded-lg p-3 text-xs w-full md:w-1/3">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-2 rounded-lg text-xs font-bold text-slate-600">Cancel</button>
              <button type="submit" className="flex items-center gap-2 bg-[#1e40af] text-white px-6 py-2 rounded-lg text-xs font-bold hover:bg-blue-800">
                <Save size={16} /> {editId ? "Update Registry" : "Add Item to Inventory"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ItemsManager;
