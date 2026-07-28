import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Printer,
  Loader2,
  ReceiptText,
  Edit2,
  X,
  Save,
  ArrowLeft,
  FileCheck2,
  PackageCheck,
  WalletCards,
  Truck,
  BadgePercent,
  Warehouse,
  Search,
  RotateCcw,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

const todayDate = () => new Date().toISOString().slice(0, 10);

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

const RequiredLabel = ({ children }) => (
  <label className="text-xs font-bold text-slate-600">
    {children} <span className="text-red-600">*</span>
  </label>
);

const NormalLabel = ({ children }) => (
  <label className="text-xs font-bold text-slate-600">{children}</label>
);

const normalizeArray = (data, keys = []) => {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  if (Array.isArray(data?.data)) return data.data;

  return [];
};

const apiRequest = async (url, options = {}) => {
  const { headers = {}, ...requestOptions } = options;

  const response = await fetch(url, {
    ...requestOptions,
    headers: {
      Accept: "application/json",
      ...(requestOptions.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.success === false) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
};

const getId = (value) =>
  String(value?._id || value?.id || value || "");

const getDefaultForm = (purchaseNo = "") => ({
  purchaseNo,
  grn: "",
  grnNo: "",
  purchaseOrderNo: "",
  vendorName: "",
  vendorPhone: "",
  purchaseDate: todayDate(),
  dueDate: "",
  vendorInvoiceNo: "",
  supplierBillNo: "",
  challanNo: "",
  warehouse: "",
  taxType: "without-tax",
  taxRate: 18,
  freightCharges: "",
  otherCharges: "",
  overallDiscount: "",
  paidAmount: "",
  paymentMethod: "Credit",
  paymentStatus: "Unpaid",
  postingStatus: "Draft",
  status: "Draft",
  remarks: "",
  items: [],
});

const Purchases = () => {
  const [grns, setGrns] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [form, setForm] = useState(getDefaultForm());

  const fetchGRNs = async () => {
    const data = await apiRequest(`${API_BASE_URL}/grns/all`);

    const availableGRNs = normalizeArray(data, ["grns", "records"])
      .filter((grn) => {
        const status = String(grn.status || "");

        return (
          status !== "Cancelled" &&
          grn.purchaseStatus !== "Purchased" &&
          (
            Number(grn.totalAcceptedQty || 0) > 0 ||
            (grn.items || []).some(
              (item) => Number(item.acceptedQty || 0) > 0
            )
          )
        );
      })
      .sort((a, b) =>
        String(b.receivedDate || "").localeCompare(
          String(a.receivedDate || "")
        )
      );

    setGrns(availableGRNs);

    return availableGRNs;
  };

  const fetchPurchases = async () => {
    const data = await apiRequest(`${API_BASE_URL}/purchases/all`);
    const list = normalizeArray(data, ["purchases", "records"]);

    setPurchases(list);

    return list;
  };

  const loadData = async () => {
    try {
      setLoading(true);

      await Promise.all([fetchGRNs(), fetchPurchases()]);
    } catch (error) {
      console.error("Purchase data loading error:", error);
      alert(error.message || "Purchase data load nahi hua");
      setGrns([]);
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchNextPurchaseNo = async () => {
    const data = await apiRequest(
      `${API_BASE_URL}/purchases/next-no`
    );

    return data.purchaseNo || "PUR-0001";
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedGRN = useMemo(() => {
    return grns.find((grn) => getId(grn) === form.grn);
  }, [grns, form.grn]);

  const totals = useMemo(() => {
    const subtotal = form.items.reduce((sum, item) => {
      const qty = Number(item.purchaseQty || 0);
      const rate = Number(item.unitPrice || 0);
      return sum + qty * rate;
    }, 0);

    const itemDiscount = form.items.reduce((sum, item) => {
      return sum + Number(item.discount || 0);
    }, 0);

    const overallDiscount = Number(form.overallDiscount || 0);
    const totalDiscount = itemDiscount + overallDiscount;

    const taxableAmount = Math.max(subtotal - totalDiscount, 0);
    const salesTax =
      form.taxType === "with-tax"
        ? taxableAmount * (Number(form.taxRate || 0) / 100)
        : 0;

    const freightCharges = Number(form.freightCharges || 0);
    const otherCharges = Number(form.otherCharges || 0);

    const grandTotal =
      taxableAmount + salesTax + freightCharges + otherCharges;

    const paidAmount = Number(form.paidAmount || 0);
    const balance = grandTotal - paidAmount;

    return {
      subtotal,
      itemDiscount,
      overallDiscount,
      totalDiscount,
      taxableAmount,
      salesTax,
      freightCharges,
      otherCharges,
      grandTotal,
      paidAmount,
      balance,
    };
  }, [
    form.items,
    form.taxType,
    form.taxRate,
    form.freightCharges,
    form.otherCharges,
    form.overallDiscount,
    form.paidAmount,
  ]);

  const updatePaymentStatus = (paidAmount, grandTotal) => {
    const paid = Number(paidAmount || 0);
    const total = Number(grandTotal || 0);

    if (paid <= 0) return "Unpaid";
    if (paid >= total) return "Paid";
    return "Partially Paid";
  };

  useEffect(() => {
    const paymentStatus = updatePaymentStatus(
      form.paidAmount,
      totals.grandTotal
    );

    if (form.paymentStatus !== paymentStatus) {
      setForm((prev) => ({
        ...prev,
        paymentStatus,
      }));
    }
  }, [form.paidAmount, totals.grandTotal]);

  const openNewForm = async () => {
    try {
      setSaving(true);

      const [, nextNo] = await Promise.all([
        fetchGRNs(),
        fetchNextPurchaseNo(),
      ]);

      setEditId(null);
      setForm(getDefaultForm(nextNo));
      setShowForm(true);
    } catch (error) {
      alert(error.message || "Purchase Number load nahi hua");
    } finally {
      setSaving(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(getDefaultForm());
  };

  const handleGRNSelect = (grnId) => {
    const grn = grns.find((item) => getId(item) === String(grnId));

    if (!grn) {
      setForm((previous) => ({
        ...previous,
        grn: "",
        grnNo: "",
        purchaseOrderNo: "",
        vendorName: "",
        vendorPhone: "",
        challanNo: "",
        warehouse: "",
        items: [],
      }));

      return;
    }

    const mappedItems = (grn.items || [])
      .filter((item) => Number(item.acceptedQty || 0) > 0)
      .map((item) => {
        const acceptedQty = Number(item.acceptedQty || 0);
        const unitPrice = Number(item.unitPrice || 0);

        return {
          item: getId(item.item),
          description:
            item.description ||
            item.itemName ||
            item.item?.name ||
            "",
          size: item.size || "",
          grnAcceptedQty: acceptedQty,
          purchaseQty: acceptedQty,
          unit: item.unit || item.item?.unit || "Pcs",
          unitPrice,
          discount: "",
          amount: acceptedQty * unitPrice,
          remarks: item.remarks || "",
        };
      });

    setForm((previous) => ({
      ...previous,
      grn: getId(grn),
      grnNo: grn.grnNo || "",
      purchaseOrderNo:
        grn.purchaseOrderNo ||
        grn.purchaseOrder?.purchaseOrderNo ||
        "",
      vendorName:
        grn.vendorName ||
        grn.vendor?.vendorName ||
        grn.vendor?.name ||
        "",
      vendorPhone:
        grn.vendorPhone ||
        grn.vendor?.phoneNumber ||
        grn.vendor?.phone ||
        "",
      challanNo: grn.challanNo || "",
      warehouse: grn.warehouse || "Main Warehouse",
      items: mappedItems,
    }));
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...form.items];

    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };

    const qty = Number(updatedItems[index].purchaseQty || 0);
    const rate = Number(updatedItems[index].unitPrice || 0);
    const discount = Number(updatedItems[index].discount || 0);

    updatedItems[index].amount = Math.max(qty * rate - discount, 0);

    setForm({
      ...form,
      items: updatedItems,
    });
  };

  const handleSubmit = async () => {
    const purchaseNo = String(form.purchaseNo || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");

    if (!purchaseNo) {
      alert("Purchase No required hai");
      return;
    }

    if (!form.grn) {
      alert("GRN select karein");
      return;
    }

    if (!form.purchaseDate) {
      alert("Purchase Date required hai");
      return;
    }

    if (!String(form.vendorInvoiceNo || "").trim()) {
      alert("Vendor Invoice No required hai");
      return;
    }

    if (!String(form.warehouse || "").trim()) {
      alert("Warehouse required hai");
      return;
    }

    if (form.items.length === 0) {
      alert("GRN items available nahi hain");
      return;
    }

    const invalidQty = form.items.some(
      (item) =>
        Number(item.purchaseQty || 0) <= 0 ||
        Number(item.purchaseQty || 0) >
          Number(item.grnAcceptedQty || 0)
    );

    if (invalidQty) {
      alert(
        "Purchase Qty zero nahi ho sakti aur GRN accepted qty se zyada nahi honi chahiye"
      );
      return;
    }

    const invalidDiscount = form.items.some((item) => {
      const gross =
        Number(item.purchaseQty || 0) *
        Number(item.unitPrice || 0);

      return Number(item.discount || 0) > gross;
    });

    if (invalidDiscount) {
      alert("Discount item amount se zyada nahi ho sakta");
      return;
    }

    if (Number(form.paidAmount || 0) > totals.grandTotal) {
      alert("Paid amount grand total se zyada nahi ho sakta");
      return;
    }

    const payload = {
      purchaseNo,
      grn: form.grn,
      purchaseDate: form.purchaseDate,
      dueDate: form.dueDate,
      vendorInvoiceNo: String(form.vendorInvoiceNo || "").trim(),
      supplierBillNo: String(form.supplierBillNo || "").trim(),
      challanNo: String(form.challanNo || "").trim(),
      warehouse: String(form.warehouse || "").trim(),
      taxType: form.taxType,
      taxRate: Number(form.taxRate || 0),
      freightCharges: Number(form.freightCharges || 0),
      otherCharges: Number(form.otherCharges || 0),
      overallDiscount: Number(form.overallDiscount || 0),
      paidAmount: Number(form.paidAmount || 0),
      paymentMethod: form.paymentMethod,
      postingStatus: form.postingStatus,
      status: form.status,
      remarks: String(form.remarks || "").trim(),
      items: form.items.map((item) => ({
        item: item.item || null,
        description: String(item.description || "").trim(),
        size: String(item.size || "").trim(),
        grnAcceptedQty: Number(item.grnAcceptedQty || 0),
        purchaseQty: Number(item.purchaseQty || 0),
        unit: String(item.unit || "Pcs").trim(),
        unitPrice: Number(item.unitPrice || 0),
        discount: Number(item.discount || 0),
        remarks: String(item.remarks || "").trim(),
      })),
    };

    try {
      setSaving(true);

      const url = editId
        ? `${API_BASE_URL}/purchases/update/${editId}`
        : `${API_BASE_URL}/purchases/add`;

      await apiRequest(url, {
        method: editId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      await loadData();
      closeForm();
    } catch (error) {
      alert(error.message || "Purchase save nahi hui");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (purchase) => {
    try {
      setSaving(true);

      const purchaseId = getId(purchase);
      const result = await apiRequest(
        `${API_BASE_URL}/purchases/${purchaseId}`
      );

      const data = result.data || purchase;

      await fetchGRNs();

      setEditId(purchaseId);

      setForm({
        purchaseNo: data.purchaseNo || "",
        grn: getId(data.grn),
        grnNo: data.grnNo || data.grn?.grnNo || "",
        purchaseOrderNo:
          data.purchaseOrderNo ||
          data.purchaseOrder?.purchaseOrderNo ||
          "",
        vendorName:
          data.vendorName ||
          data.vendor?.vendorName ||
          data.vendor?.name ||
          "",
        vendorPhone:
          data.vendorPhone ||
          data.vendor?.phoneNumber ||
          data.vendor?.phone ||
          "",
        purchaseDate: data.purchaseDate || todayDate(),
        dueDate: data.dueDate || "",
        vendorInvoiceNo: data.vendorInvoiceNo || "",
        supplierBillNo: data.supplierBillNo || "",
        challanNo: data.challanNo || "",
        warehouse: data.warehouse || "Main Warehouse",
        taxType: data.taxType || "without-tax",
        taxRate: data.taxRate ?? 18,
        freightCharges: data.freightCharges || "",
        otherCharges: data.otherCharges || "",
        overallDiscount: data.overallDiscount || "",
        paidAmount: data.paidAmount || "",
        paymentMethod: data.paymentMethod || "Credit",
        paymentStatus: data.paymentStatus || "Unpaid",
        postingStatus: data.postingStatus || "Draft",
        status: data.status || "Draft",
        remarks: data.remarks || "",
        items: (data.items || []).map((item) => ({
          item: getId(item.item),
          description: item.description || "",
          size: item.size || "",
          grnAcceptedQty: Number(item.grnAcceptedQty || 0),
          purchaseQty: Number(item.purchaseQty || 0),
          unit: item.unit || "Pcs",
          unitPrice: Number(item.unitPrice || 0),
          discount: Number(item.discount || 0),
          amount: Number(item.amount || 0),
          remarks: item.remarks || "",
        })),
      });

      setShowForm(true);
    } catch (error) {
      alert(error.message || "Purchase load nahi hui");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this purchase entry?"
      )
    ) {
      return;
    }

    try {
      setSaving(true);

      await apiRequest(
        `${API_BASE_URL}/purchases/delete/${id}`,
        {
          method: "DELETE",
        }
      );

      await loadData();
    } catch (error) {
      alert(error.message || "Purchase delete nahi hui");
    } finally {
      setSaving(false);
    }
  };

  const markAsPosted = async (id) => {
    try {
      setSaving(true);

      await apiRequest(
        `${API_BASE_URL}/purchases/post/${id}`,
        {
          method: "PUT",
        }
      );

      await loadData();
    } catch (error) {
      alert(error.message || "Purchase post nahi hui");
    } finally {
      setSaving(false);
    }
  };

  const printPurchase = (purchase) => {
    const rows = purchase.items
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${item.description || ""}</td>
            <td>${item.size || ""}</td>
            <td>${item.grnAcceptedQty || 0}</td>
            <td>${item.purchaseQty || 0}</td>
            <td>${item.unit || ""}</td>
            <td>${Number(item.unitPrice || 0).toLocaleString()}</td>
            <td>${Number(item.discount || 0).toLocaleString()}</td>
            <td>${Number(item.amount || 0).toLocaleString()}</td>
            <td>${item.remarks || ""}</td>
          </tr>
        `
      )
      .join("");

    const printWindow = window.open("", "_blank");

    printWindow.document.write(`
      <html>
        <head>
          <title>${purchase.purchaseNo}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; color: #111827; }
            .top { display: flex; justify-content: space-between; border-bottom: 2px solid #111827; padding-bottom: 12px; }
            h1 { margin: 0; font-size: 30px; }
            h2 { text-align: center; margin: 24px 0 18px; text-decoration: underline; }
            .small { font-size: 12px; color: #374151; line-height: 1.7; }
            .box { border: 1px solid #111827; padding: 10px; margin: 12px 0; font-size: 13px; line-height: 1.7; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #111827; padding: 7px; font-size: 12px; text-align: left; }
            th { background: #f3f4f6; }
            .totals { width: 360px; margin-left: auto; margin-top: 14px; }
            .totals div { display: flex; justify-content: space-between; border-bottom: 1px solid #d1d5db; padding: 6px 0; }
            .sign { margin-top: 70px; display: flex; justify-content: space-between; }
          </style>
        </head>

        <body>
          <div class="top">
            <div>
              <h1>Urwa Packages</h1>
              <div class="small">Purchase Entry</div>
            </div>
            <div class="small">
              <b>Purchase No:</b> ${purchase.purchaseNo || ""}<br/>
              <b>Purchase Date:</b> ${purchase.purchaseDate || ""}<br/>
              <b>Due Date:</b> ${purchase.dueDate || ""}<br/>
              <b>Vendor Invoice:</b> ${purchase.vendorInvoiceNo || ""}<br/>
              <b>Status:</b> ${purchase.status || ""}
            </div>
          </div>

          <h2>PURCHASE ENTRY</h2>

          <div class="box">
            <b>Vendor Name:</b> ${purchase.vendorName || ""}<br/>
            <b>Vendor Phone:</b> ${purchase.vendorPhone || ""}<br/>
            <b>GRN No:</b> ${purchase.grnNo || ""}<br/>
            <b>Purchase Order No:</b> ${purchase.purchaseOrderNo || ""}<br/>
            <b>Supplier Bill No:</b> ${purchase.supplierBillNo || ""}<br/>
            <b>Challan No:</b> ${purchase.challanNo || ""}<br/>
            <b>Warehouse:</b> ${purchase.warehouse || ""}<br/>
            <b>Payment Method:</b> ${purchase.paymentMethod || ""}<br/>
            <b>Payment Status:</b> ${purchase.paymentStatus || ""}<br/>
            <b>Posting Status:</b> ${purchase.postingStatus || ""}
          </div>

          <table>
            <thead>
              <tr>
                <th>Sr</th>
                <th>Description</th>
                <th>Size</th>
                <th>GRN Accepted</th>
                <th>Purchase Qty</th>
                <th>Unit</th>
                <th>Rate</th>
                <th>Discount</th>
                <th>Amount</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <div class="totals">
            <div><span>Subtotal</span><b>${money(purchase.subtotal)}</b></div>
            <div><span>Item Discount</span><b>${money(purchase.itemDiscount)}</b></div>
            <div><span>Overall Discount</span><b>${money(purchase.overallDiscount)}</b></div>
            <div><span>Taxable Amount</span><b>${money(purchase.taxableAmount)}</b></div>
            <div><span>Sales Tax</span><b>${money(purchase.salesTax)}</b></div>
            <div><span>Freight Charges</span><b>${money(purchase.freightCharges)}</b></div>
            <div><span>Other Charges</span><b>${money(purchase.otherCharges)}</b></div>
            <div><span>Grand Total</span><b>${money(purchase.grandTotal)}</b></div>
            <div><span>Paid Amount</span><b>${money(purchase.paidAmount)}</b></div>
            <div><span>Balance</span><b>${money(purchase.balance)}</b></div>
          </div>

          <p><b>Remarks:</b> ${purchase.remarks || ""}</p>

          <div class="sign">
            <div>Prepared By: __________________</div>
            <div>Checked By: __________________</div>
            <div>Approved By: __________________</div>
          </div>

          <script>window.print();</script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const filteredPurchases = purchases.filter((purchase) => {
    const keyword = searchTerm.toLowerCase();

    const matchesSearch =
      purchase.purchaseNo?.toLowerCase().includes(keyword) ||
      purchase.vendorName?.toLowerCase().includes(keyword) ||
      purchase.vendorInvoiceNo?.toLowerCase().includes(keyword) ||
      purchase.grnNo?.toLowerCase().includes(keyword);

    const matchesStatus =
      statusFilter === "All" ||
      purchase.paymentStatus === statusFilter ||
      purchase.postingStatus === statusFilter ||
      purchase.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (showForm) {
    return (
      <div className="w-full space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <button
                onClick={closeForm}
                className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-3"
              >
                <ArrowLeft size={17} />
                Back to Purchases
              </button>

              <h1 className="text-2xl font-bold text-slate-900">
                {editId ? "Edit Purchase Entry" : "New Purchase Entry"}
              </h1>

              <p className="text-sm text-slate-500 mt-1">
                GRN select karein, vendor bill enter karein, tax/payment calculate karein aur posting status manage karein.
              </p>
            </div>

            <button
              onClick={closeForm}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50"
            >
              <X size={18} />
              Cancel
            </button>
          </div>

          <div className="pt-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <RequiredLabel>Purchase No</RequiredLabel>
                <input
                  value={form.purchaseNo}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      purchaseNo: e.target.value
                        .toUpperCase()
                        .replace(/\s+/g, ""),
                    })
                  }
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="PUR-0001"
                />
              </div>

              <div>
                <RequiredLabel>GRN</RequiredLabel>
                <select
                  value={form.grn}
                  onChange={(e) => handleGRNSelect(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  disabled={editId}
                >
                  <option value="">Select GRN</option>

                  {editId &&
                    form.grn &&
                    !grns.some((grn) => getId(grn) === form.grn) && (
                      <option value={form.grn}>
                        {form.grnNo} - {form.vendorName}
                      </option>
                    )}

                  {grns.map((grn) => (
                    <option key={getId(grn)} value={getId(grn)}>
                      {grn.grnNo} - {grn.vendorName || grn.vendor?.vendorName || grn.vendor?.name || "Vendor"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <RequiredLabel>Purchase Date</RequiredLabel>
                <input
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) =>
                    setForm({ ...form, purchaseDate: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                />
              </div>

              <div>
                <NormalLabel>Due Date</NormalLabel>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                />
              </div>

              <div>
                <RequiredLabel>Vendor Invoice No</RequiredLabel>
                <input
                  value={form.vendorInvoiceNo}
                  onChange={(e) =>
                    setForm({ ...form, vendorInvoiceNo: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="Supplier invoice no"
                />
              </div>

              <div>
                <NormalLabel>Supplier Bill No</NormalLabel>
                <input
                  value={form.supplierBillNo}
                  onChange={(e) =>
                    setForm({ ...form, supplierBillNo: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="Bill no"
                />
              </div>

              <div>
                <NormalLabel>GRN No</NormalLabel>
                <input
                  value={form.grnNo}
                  readOnly
                  className="w-full border rounded-lg px-3 py-2 mt-1 bg-slate-50"
                  placeholder="Auto from GRN"
                />
              </div>

              <div>
                <NormalLabel>Purchase Order No</NormalLabel>
                <input
                  value={form.purchaseOrderNo}
                  readOnly
                  className="w-full border rounded-lg px-3 py-2 mt-1 bg-slate-50"
                  placeholder="Auto from GRN"
                />
              </div>

              <div>
                <NormalLabel>Vendor Name</NormalLabel>
                <input
                  value={form.vendorName}
                  readOnly
                  className="w-full border rounded-lg px-3 py-2 mt-1 bg-slate-50"
                  placeholder="Auto from GRN"
                />
              </div>

              <div>
                <NormalLabel>Vendor Phone</NormalLabel>
                <input
                  value={form.vendorPhone}
                  readOnly
                  className="w-full border rounded-lg px-3 py-2 mt-1 bg-slate-50"
                  placeholder="Auto from GRN"
                />
              </div>

              <div>
                <RequiredLabel>Warehouse</RequiredLabel>
                <select
                  value={form.warehouse}
                  onChange={(e) =>
                    setForm({ ...form, warehouse: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                >
                  <option value="">Auto from GRN</option>
                  <option>Raw Material Godown</option>
                  <option>Finished Goods Godown</option>
                  <option>Multiple Warehouses</option>
                </select>
              </div>

              <div>
                <NormalLabel>Challan No</NormalLabel>
                <input
                  value={form.challanNo}
                  onChange={(e) =>
                    setForm({ ...form, challanNo: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="Supplier challan no"
                />
              </div>
            </div>

            <div className="border rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h3 className="font-bold flex items-center gap-2">
                    <PackageCheck size={18} className="text-blue-600" />
                    Purchase Items
                  </h3>
                  <p className="text-xs text-slate-500">
                    Items GRN se auto load honge. Purchase qty GRN accepted qty se zyada nahi ho sakti.
                  </p>
                </div>

                <div className="text-xs bg-white border rounded-lg px-3 py-2 text-slate-600">
                  GRN: <b>{form.grnNo || "Not selected"}</b>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white border-b text-slate-600">
                      <th className="p-2 text-left">Item Description</th>
                      <th className="p-2 text-left">Size</th>
                      <th className="p-2 text-right">GRN Accepted</th>
                      <th className="p-2 text-right">
                        Purchase Qty <span className="text-red-600">*</span>
                      </th>
                      <th className="p-2 text-left">Unit</th>
                      <th className="p-2 text-right">
                        Rate <span className="text-red-600">*</span>
                      </th>
                      <th className="p-2 text-right">Discount</th>
                      <th className="p-2 text-right">Amount</th>
                      <th className="p-2 text-left">Remarks</th>
                    </tr>
                  </thead>

                  <tbody>
                    {form.items.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="p-8 text-center text-slate-500">
                          GRN select karein. Accepted items yahan auto load honge.
                        </td>
                      </tr>
                    ) : (
                      form.items.map((item, index) => (
                        <tr key={index} className="border-b hover:bg-slate-50">
                          <td className="p-2 min-w-[220px]">
                            <div className="font-semibold text-slate-800">
                              {item.description || "N/A"}
                            </div>
                          </td>

                          <td className="p-2 min-w-[120px]">
                            {item.size || "-"}
                          </td>

                          <td className="p-2 text-right font-bold">
                            {item.grnAcceptedQty}
                          </td>

                          <td className="p-2 min-w-[120px]">
                            <input
                              type="number"
                              value={item.purchaseQty}
                              onChange={(e) =>
                                updateItem(index, "purchaseQty", e.target.value)
                              }
                              className="w-full border rounded px-2 py-1.5 text-right"
                              placeholder="0"
                            />
                          </td>

                          <td className="p-2 min-w-[90px]">
                            <input
                              value={item.unit}
                              onChange={(e) =>
                                updateItem(index, "unit", e.target.value)
                              }
                              className="w-full border rounded px-2 py-1.5"
                            />
                          </td>

                          <td className="p-2 min-w-[120px]">
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) =>
                                updateItem(index, "unitPrice", e.target.value)
                              }
                              className="w-full border rounded px-2 py-1.5 text-right"
                              placeholder="0"
                            />
                          </td>

                          <td className="p-2 min-w-[120px]">
                            <input
                              type="number"
                              value={item.discount}
                              onChange={(e) =>
                                updateItem(index, "discount", e.target.value)
                              }
                              className="w-full border rounded px-2 py-1.5 text-right"
                              placeholder="0"
                            />
                          </td>

                          <td className="p-2 text-right font-bold text-blue-700">
                            {money(item.amount)}
                          </td>

                          <td className="p-2 min-w-[180px]">
                            <input
                              value={item.remarks}
                              onChange={(e) =>
                                updateItem(index, "remarks", e.target.value)
                              }
                              className="w-full border rounded px-2 py-1.5"
                              placeholder="Item remarks"
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              <div className="xl:col-span-2 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <RequiredLabel>Tax Type</RequiredLabel>
                    <select
                      value={form.taxType}
                      onChange={(e) =>
                        setForm({ ...form, taxType: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2 mt-1"
                    >
                      <option value="without-tax">Without Tax</option>
                      <option value="with-tax">With Sales Tax</option>
                    </select>
                  </div>

                  <div>
                    <NormalLabel>Tax Rate %</NormalLabel>
                    <input
                      type="number"
                      value={form.taxRate}
                      onChange={(e) =>
                        setForm({ ...form, taxRate: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2 mt-1"
                      disabled={form.taxType === "without-tax"}
                    />
                  </div>

                  <div>
                    <NormalLabel>Freight Charges</NormalLabel>
                    <input
                      type="number"
                      value={form.freightCharges}
                      onChange={(e) =>
                        setForm({ ...form, freightCharges: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2 mt-1"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <NormalLabel>Other Charges</NormalLabel>
                    <input
                      type="number"
                      value={form.otherCharges}
                      onChange={(e) =>
                        setForm({ ...form, otherCharges: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2 mt-1"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <NormalLabel>Overall Discount</NormalLabel>
                    <input
                      type="number"
                      value={form.overallDiscount}
                      onChange={(e) =>
                        setForm({ ...form, overallDiscount: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2 mt-1"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <NormalLabel>Paid Amount</NormalLabel>
                    <input
                      type="number"
                      value={form.paidAmount}
                      onChange={(e) =>
                        setForm({ ...form, paidAmount: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2 mt-1"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <NormalLabel>Payment Method</NormalLabel>
                    <select
                      value={form.paymentMethod}
                      onChange={(e) =>
                        setForm({ ...form, paymentMethod: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2 mt-1"
                    >
                      <option>Cash</option>
                      <option>Bank</option>
                      <option>Cheque</option>
                      <option>Credit</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div>
                    <NormalLabel>Payment Status</NormalLabel>
                    <input
                      value={form.paymentStatus}
                      readOnly
                      className="w-full border rounded-lg px-3 py-2 mt-1 bg-slate-50"
                    />
                  </div>

                  <div>
                    <RequiredLabel>Posting Status</RequiredLabel>
                    <select
                      value={form.postingStatus}
                      onChange={(e) =>
                        setForm({ ...form, postingStatus: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2 mt-1"
                    >
                      <option>Draft</option>
                      <option>Posted</option>
                    </select>
                  </div>

                  <div>
                    <RequiredLabel>Status</RequiredLabel>
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm({ ...form, status: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2 mt-1"
                    >
                      <option>Draft</option>
                      <option>Completed</option>
                      <option>Cancelled</option>
                    </select>
                  </div>
                </div>

                <div>
                  <NormalLabel>Remarks</NormalLabel>
                  <textarea
                    value={form.remarks}
                    onChange={(e) =>
                      setForm({ ...form, remarks: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2 mt-1 min-h-[130px]"
                    placeholder="Purchase notes, payment terms, tax notes, inventory posting notes..."
                  />
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-5 space-y-3">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <b>{money(totals.subtotal)}</b>
                </div>

                <div className="flex justify-between">
                  <span>Item Discount</span>
                  <b>{money(totals.itemDiscount)}</b>
                </div>

                <div className="flex justify-between">
                  <span>Overall Discount</span>
                  <b>{money(totals.overallDiscount)}</b>
                </div>

                <div className="flex justify-between">
                  <span>Taxable Amount</span>
                  <b>{money(totals.taxableAmount)}</b>
                </div>

                <div className="flex justify-between">
                  <span>
                    Sales Tax {form.taxType === "with-tax" ? `${form.taxRate}%` : "0%"}
                  </span>
                  <b>{money(totals.salesTax)}</b>
                </div>

                <div className="flex justify-between">
                  <span>Freight Charges</span>
                  <b>{money(totals.freightCharges)}</b>
                </div>

                <div className="flex justify-between">
                  <span>Other Charges</span>
                  <b>{money(totals.otherCharges)}</b>
                </div>

                <div className="flex justify-between text-lg border-t pt-3">
                  <span>Grand Total</span>
                  <b>{money(totals.grandTotal)}</b>
                </div>

                <div className="flex justify-between text-emerald-600">
                  <span>Paid Amount</span>
                  <b>{money(totals.paidAmount)}</b>
                </div>

                <div className="flex justify-between text-red-600 text-lg">
                  <span>Balance</span>
                  <b>{money(totals.balance)}</b>
                </div>
              </div>
            </div>

            <div className="border-t pt-5 flex justify-end gap-3">
              <button
                onClick={closeForm}
                className="px-5 py-2.5 rounded-xl border hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}
                {saving ? "Saving..." : "Save Purchase"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ReceiptText className="text-blue-600" size={26} />
            Purchases
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            GRN ke against final vendor bill, tax, payment, balance aur inventory/account posting manage karein.
          </p>
        </div>

        <button
          onClick={openNewForm}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm"
        >
          <Plus size={18} />
          New Purchase
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ReceiptText size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500">Total Purchases</p>
            <h3 className="text-2xl font-bold">{purchases.length}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <WalletCards size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500">Grand Total</p>
            <h3 className="text-xl font-bold">
              {money(
                purchases.reduce(
                  (s, p) => s + Number(p.grandTotal || 0),
                  0
                )
              )}
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <BadgePercent size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500">Tax Value</p>
            <h3 className="text-xl font-bold">
              {money(
                purchases.reduce(
                  (s, p) => s + Number(p.salesTax || 0),
                  0
                )
              )}
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Truck size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500">Freight</p>
            <h3 className="text-xl font-bold">
              {money(
                purchases.reduce(
                  (s, p) => s + Number(p.freightCharges || 0),
                  0
                )
              )}
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <FileCheck2 size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500">Balance</p>
            <h3 className="text-xl font-bold">
              {money(
                purchases.reduce(
                  (s, p) => s + Number(p.balance || 0),
                  0
                )
              )}
            </h3>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900">Purchase List</h3>
            <p className="text-xs text-slate-500">
              All vendor purchase entries
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-2 border rounded-lg text-sm w-full sm:w-72"
                placeholder="Search purchase, vendor, invoice, GRN..."
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option>All</option>
              <option>Draft</option>
              <option>Completed</option>
              <option>Cancelled</option>
              <option>Paid</option>
              <option>Partially Paid</option>
              <option>Unpaid</option>
              <option>Posted</option>
            </select>

            <button
              onClick={loadData}
              className="inline-flex items-center justify-center gap-2 text-sm px-3 py-2 rounded-lg border hover:bg-slate-50"
            >
              <RotateCcw size={15} />
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3 text-left">Purchase No</th>
                <th className="p-3 text-left">Vendor</th>
                <th className="p-3 text-left">Invoice</th>
                <th className="p-3 text-left">GRN</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-right">Grand Total</th>
                <th className="p-3 text-right">Paid</th>
                <th className="p-3 text-right">Balance</th>
                <th className="p-3 text-center">Payment</th>
                <th className="p-3 text-center">Posting</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" className="p-10 text-center">
                    <Loader2 className="animate-spin mx-auto text-blue-600" />
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan="11" className="p-10 text-center text-slate-500">
                    No purchase entry found.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => (
                  <tr key={getId(purchase)} className="border-t hover:bg-slate-50">
                    <td className="p-3 font-bold text-blue-700">
                      {purchase.purchaseNo}
                    </td>

                    <td className="p-3">
                      <div className="font-semibold">{purchase.vendorName}</div>
                      <div className="text-xs text-slate-500">
                        {purchase.vendorPhone}
                      </div>
                    </td>

                    <td className="p-3">
                      <div>{purchase.vendorInvoiceNo}</div>
                      <div className="text-xs text-slate-500">
                        Bill: {purchase.supplierBillNo || "-"}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="font-semibold">{purchase.grnNo}</div>
                      <div className="text-xs text-slate-500">
                        PO: {purchase.purchaseOrderNo}
                      </div>
                    </td>

                    <td className="p-3">{purchase.purchaseDate}</td>

                    <td className="p-3 text-right font-bold">
                      {money(purchase.grandTotal)}
                    </td>

                    <td className="p-3 text-right font-bold text-emerald-600">
                      {money(purchase.paidAmount)}
                    </td>

                    <td className="p-3 text-right font-bold text-red-600">
                      {money(purchase.balance)}
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          purchase.paymentStatus === "Paid"
                            ? "bg-green-50 text-green-700"
                            : purchase.paymentStatus === "Partially Paid"
                            ? "bg-orange-50 text-orange-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {purchase.paymentStatus}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          purchase.postingStatus === "Posted"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {purchase.postingStatus}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => printPurchase(purchase)}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                          title="Print"
                        >
                          <Printer size={16} />
                        </button>

                        {purchase.postingStatus !== "Posted" && (
                          <button
                            onClick={() => markAsPosted(getId(purchase))}
                            className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            title="Post Entry"
                          >
                            <FileCheck2 size={16} />
                          </button>
                        )}

                        <button
                          onClick={() => handleEdit(purchase)}
                          className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>

                        <button
                          onClick={() => handleDelete(getId(purchase))}
                          className="p-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-800">
        <b>Flow:</b> Purchase Order → GRN → Purchase Entry. Data MongoDB/API se load aur save hota hai.
      </div>
    </div>
  );
};

export default Purchases;