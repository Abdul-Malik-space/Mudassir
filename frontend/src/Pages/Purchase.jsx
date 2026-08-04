import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  CreditCard,
  Edit2,
  FileText,
  Loader2,
  PackageCheck,
  Printer,
  RefreshCcw,
  Save,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

const API_PURCHASES = `${API_BASE_URL}/purchases`;

const todayDate = () => new Date().toISOString().slice(0, 10);

const numberValue = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const quantity = (value) =>
  numberValue(value).toLocaleString(undefined, {
    maximumFractionDigits: 3,
  });

const money = (value) =>
  `Rs. ${numberValue(value).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const idOf = (value) => {
  if (!value) return "";
  return typeof value === "object"
    ? String(value._id || value.id || "")
    : String(value);
};

const normalizeArray = (data, keys = []) => {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return Array.isArray(data?.data) ? data.data : [];
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const apiRequest = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.success === false) {
    throw new Error(data.message || data.error || "Request failed");
  }

  return data;
};

const emptyForm = (purchaseNo = "") => ({
  purchaseNo,
  grn: "",
  grnNo: "",
  purchaseOrder: "",
  purchaseOrderNo: "",
  purchaseOrderReferenceNo: "",
  vendor: "",
  vendorName: "",
  vendorPhone: "",
  vendorEmail: "",
  vendorAddress: "",
  purchaseDate: todayDate(),
  dueDate: "",
  vendorInvoiceNo: "",
  supplierBillNo: "",
  challanNo: "",
  warehouse: "",
  taxType: "without-tax",
  taxRate: 0,
  overallDiscount: "",
  freightCharges: "",
  otherCharges: "",
  paidAmount: "",
  paymentMethod: "Credit",
  postingStatus: "Draft",
  status: "Draft",
  remarks: "",
  items: [],
});

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

const Label = ({ children, required = false }) => (
  <label className="mb-1 block text-xs font-bold text-slate-600">
    {children}
    {required ? <span className="ml-1 text-red-600">*</span> : null}
  </label>
);

const statusClass = (status) =>
  ({
    Draft: "bg-slate-100 text-slate-700",
    Posted: "bg-purple-100 text-purple-700",
    Completed: "bg-emerald-100 text-emerald-700",
    Cancelled: "bg-red-100 text-red-700",
    Unpaid: "bg-red-100 text-red-700",
    "Partially Paid": "bg-amber-100 text-amber-700",
    Paid: "bg-emerald-100 text-emerald-700",
  })[status] || "bg-slate-100 text-slate-700";

const Purchases = () => {
  const [eligibleGrns, setEligibleGrns] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState("");
  const [search, setSearch] = useState("");
  const [postingFilter, setPostingFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");

  const fetchEligibleGrns = async () => {
    const data = await apiRequest(`${API_PURCHASES}/eligible-grns`);
    setEligibleGrns(normalizeArray(data, ["grns"]));
  };

  const fetchPurchases = async () => {
    const data = await apiRequest(`${API_PURCHASES}/all`);
    setPurchases(normalizeArray(data, ["purchases"]));
  };

  const refresh = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchEligibleGrns(), fetchPurchases()]);
    } catch (error) {
      console.error("Purchase load error:", error);
      alert(error.message || "Unable to load Purchases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const subtotal = form.items.reduce(
      (sum, item) =>
        sum + numberValue(item.purchaseQty) * numberValue(item.unitPrice),
      0
    );

    const itemDiscount = form.items.reduce(
      (sum, item) => sum + numberValue(item.discount),
      0
    );

    const overallDiscount = numberValue(form.overallDiscount);
    const totalDiscount = itemDiscount + overallDiscount;
    const taxableAmount = Math.max(subtotal - totalDiscount, 0);
    const salesTax =
      form.taxType === "with-tax"
        ? taxableAmount * (numberValue(form.taxRate || 18) / 100)
        : 0;
    const grandTotal =
      taxableAmount +
      salesTax +
      numberValue(form.freightCharges) +
      numberValue(form.otherCharges);
    const paidAmount = numberValue(form.paidAmount);
    const balance = Math.max(grandTotal - paidAmount, 0);

    return {
      subtotal,
      itemDiscount,
      overallDiscount,
      totalDiscount,
      taxableAmount,
      salesTax,
      grandTotal,
      paidAmount,
      balance,
    };
  }, [form]);

  const filteredPurchases = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return purchases.filter((purchase) => {
      const text = [
        purchase.purchaseNo,
        purchase.grnNo,
        purchase.purchaseOrderNo,
        purchase.vendorName,
        purchase.vendorInvoiceNo,
        purchase.supplierBillNo,
        purchase.challanNo,
        ...(purchase.items || []).flatMap((item) => [
          item.itemCode,
          item.itemName,
          item.description,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!keyword || text.includes(keyword)) &&
        (postingFilter === "All" ||
          purchase.postingStatus === postingFilter) &&
        (paymentFilter === "All" ||
          purchase.paymentStatus === paymentFilter)
      );
    });
  }, [purchases, search, postingFilter, paymentFilter]);

  const stats = useMemo(
    () => ({
      total: purchases.length,
      posted: purchases.filter((row) => row.postingStatus === "Posted").length,
      payable: purchases.reduce(
        (sum, row) => sum + numberValue(row.balance),
        0
      ),
      value: purchases.reduce(
        (sum, row) => sum + numberValue(row.grandTotal),
        0
      ),
    }),
    [purchases]
  );

  const openNew = async () => {
    try {
      setSaving(true);
      const [numberData] = await Promise.all([
        apiRequest(`${API_PURCHASES}/next-no`),
        fetchEligibleGrns(),
      ]);

      setEditId(null);
      setForm(emptyForm(numberData.purchaseNo || ""));
      setShowForm(true);
    } catch (error) {
      alert(error.message || "Unable to open a new Purchase");
    } finally {
      setSaving(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm());
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const selectGRN = (grnId) => {
    const grn = eligibleGrns.find(
      (row) => String(row._id) === String(grnId)
    );

    if (!grn) {
      setForm((current) => emptyForm(current.purchaseNo));
      return;
    }

    setForm((current) => ({
      ...current,
      grn: grn._id,
      grnNo: grn.grnNo || "",
      purchaseOrder: idOf(grn.purchaseOrder),
      purchaseOrderNo: grn.purchaseOrderNo || "",
      purchaseOrderReferenceNo: grn.purchaseOrderReferenceNo || "",
      vendor: idOf(grn.vendor),
      vendorName: grn.vendorName || "",
      vendorPhone: grn.vendorPhone || "",
      vendorEmail: grn.vendorEmail || "",
      vendorAddress: grn.vendorAddress || "",
      purchaseDate: grn.receivedDate || current.purchaseDate || todayDate(),
      challanNo: grn.challanNo || "",
      warehouse: grn.warehouse || "Main Warehouse",
      taxType: grn.taxType || "without-tax",
      taxRate: numberValue(grn.taxRate),
      items: (grn.items || []).map((item) => ({
        grnItemId: idOf(item.grnItemId),
        purchaseOrderItemId: idOf(item.purchaseOrderItemId),
        item: idOf(item.item),
        itemCode: item.itemCode || "",
        itemName: item.itemName || item.description || "",
        description: item.description || item.itemName || "",
        size: item.size || "",
        cartons: numberValue(item.cartons),
        grnAcceptedQty: numberValue(item.grnAcceptedQty),
        purchaseQty: numberValue(item.grnAcceptedQty),
        unit: item.unit || "Pcs",
        unitPrice: numberValue(item.unitPrice),
        discount: 0,
        remarks: item.remarks || "",
      })),
    }));
  };

  const updateItem = (index, field, value) => {
    setForm((current) => {
      const items = [...current.items];
      items[index] = { ...items[index], [field]: value };
      return { ...current, items };
    });
  };

  const validate = () => {
    if (!form.purchaseNo.trim()) {
      alert("Purchase number is required");
      return false;
    }
    if (!form.grn) {
      alert("Select an eligible GRN");
      return false;
    }
    if (!form.vendorInvoiceNo.trim()) {
      alert("Vendor invoice number is required");
      return false;
    }
    if (!form.purchaseDate) {
      alert("Purchase date is required");
      return false;
    }
    if (form.dueDate && form.dueDate < form.purchaseDate) {
      alert("Due date cannot be earlier than purchase date");
      return false;
    }
    if (!form.items.length) {
      alert("Selected GRN has no accepted items");
      return false;
    }

    for (const item of form.items) {
      const gross =
        numberValue(item.purchaseQty) * numberValue(item.unitPrice);
      if (numberValue(item.unitPrice) < 0) {
        alert(`${item.itemName}: unit price cannot be negative`);
        return false;
      }
      if (numberValue(item.discount) > gross) {
        alert(`${item.itemName}: discount cannot exceed gross amount`);
        return false;
      }
    }

    if (
      numberValue(form.overallDiscount) >
      totals.subtotal - totals.itemDiscount
    ) {
      alert("Overall discount is greater than the remaining item amount");
      return false;
    }
    if (numberValue(form.paidAmount) > totals.grandTotal) {
      alert("Paid amount cannot exceed grand total");
      return false;
    }

    return true;
  };

  const buildPayload = (postingStatus = "Draft") => ({
    purchaseNo: form.purchaseNo.trim(),
    grn: form.grn,
    purchaseDate: form.purchaseDate,
    dueDate: form.dueDate,
    vendorInvoiceNo: form.vendorInvoiceNo.trim(),
    supplierBillNo: form.supplierBillNo.trim(),
    challanNo: form.challanNo.trim(),
    warehouse: form.warehouse.trim(),
    overallDiscount: numberValue(form.overallDiscount),
    freightCharges: numberValue(form.freightCharges),
    otherCharges: numberValue(form.otherCharges),
    paidAmount: numberValue(form.paidAmount),
    paymentMethod: form.paymentMethod,
    postingStatus,
    remarks: form.remarks.trim(),
    items: form.items.map((item) => ({
      grnItemId: item.grnItemId,
      purchaseOrderItemId: item.purchaseOrderItemId,
      item: item.item,
      description: item.description,
      size: item.size,
      unit: item.unit,
      unitPrice: numberValue(item.unitPrice),
      discount: numberValue(item.discount),
      remarks: String(item.remarks || "").trim(),
    })),
  });

  const save = async (postingStatus = "Draft") => {
    if (!validate()) return;

    const postingMessage =
      postingStatus === "Posted"
        ? "Post this Purchase? Posted records cannot be edited."
        : "";

    if (postingMessage && !window.confirm(postingMessage)) return;

    try {
      setSaving(true);
      await apiRequest(
        editId
          ? `${API_PURCHASES}/update/${editId}`
          : `${API_PURCHASES}/add`,
        {
          method: editId ? "PUT" : "POST",
          body: JSON.stringify(buildPayload(postingStatus)),
        }
      );

      await refresh();
      closeForm();
    } catch (error) {
      alert(error.message || "Purchase could not be saved");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (purchaseId) => {
    try {
      setActionId(purchaseId);
      const response = await apiRequest(`${API_PURCHASES}/${purchaseId}`);
      const purchase = response.data;

      if (purchase.postingStatus === "Posted") {
        alert("Posted Purchase cannot be edited");
        return;
      }
      if (purchase.status === "Cancelled") {
        alert("Cancelled Purchase cannot be edited");
        return;
      }

      setEditId(purchase._id);
      setForm({
        purchaseNo: purchase.purchaseNo || "",
        grn: idOf(purchase.grn),
        grnNo: purchase.grnNo || purchase.grn?.grnNo || "",
        purchaseOrder: idOf(purchase.purchaseOrder),
        purchaseOrderNo:
          purchase.purchaseOrderNo ||
          purchase.purchaseOrder?.purchaseOrderNo ||
          "",
        purchaseOrderReferenceNo:
          purchase.purchaseOrder?.referenceNo || "",
        vendor: idOf(purchase.vendor),
        vendorName: purchase.vendorName || "",
        vendorPhone: purchase.vendorPhone || "",
        vendorEmail: purchase.vendorEmail || "",
        vendorAddress: purchase.vendorAddress || "",
        purchaseDate: purchase.purchaseDate || todayDate(),
        dueDate: purchase.dueDate || "",
        vendorInvoiceNo: purchase.vendorInvoiceNo || "",
        supplierBillNo: purchase.supplierBillNo || "",
        challanNo: purchase.challanNo || "",
        warehouse: purchase.warehouse || "Main Warehouse",
        taxType: purchase.taxType || "without-tax",
        taxRate: numberValue(purchase.taxRate),
        overallDiscount: purchase.overallDiscount || "",
        freightCharges: purchase.freightCharges || "",
        otherCharges: purchase.otherCharges || "",
        paidAmount: purchase.paidAmount || "",
        paymentMethod: purchase.paymentMethod || "Credit",
        postingStatus: purchase.postingStatus || "Draft",
        status: purchase.status || "Draft",
        remarks: purchase.remarks || "",
        items: (purchase.items || []).map((item) => ({
          grnItemId: idOf(item.grnItemId),
          purchaseOrderItemId: idOf(item.purchaseOrderItemId),
          item: idOf(item.item),
          itemCode: item.itemCode || item.item?.code || "",
          itemName:
            item.itemName || item.item?.name || item.description || "",
          description: item.description || "",
          size: item.size || "",
          cartons: numberValue(item.cartons),
          grnAcceptedQty: numberValue(item.grnAcceptedQty),
          purchaseQty: numberValue(item.purchaseQty),
          unit: item.unit || "Pcs",
          unitPrice: numberValue(item.unitPrice),
          discount: numberValue(item.discount),
          remarks: item.remarks || "",
        })),
      });
      setShowForm(true);
    } catch (error) {
      alert(error.message || "Purchase could not be opened");
    } finally {
      setActionId("");
    }
  };

  const postPurchase = async (purchase) => {
    if (!window.confirm(`Post ${purchase.purchaseNo}? This action locks editing.`)) {
      return;
    }

    try {
      setActionId(purchase._id);
      await apiRequest(`${API_PURCHASES}/post/${purchase._id}`, {
        method: "PUT",
      });
      await refresh();
    } catch (error) {
      alert(error.message || "Purchase could not be posted");
    } finally {
      setActionId("");
    }
  };

  const updatePayment = async (purchase) => {
    const entered = window.prompt(
      `Enter total paid amount for ${purchase.purchaseNo}. Grand total: ${money(
        purchase.grandTotal
      )}`,
      String(purchase.paidAmount || 0)
    );

    if (entered === null) return;
    const paidAmount = Number(entered);

    if (!Number.isFinite(paidAmount) || paidAmount < 0) {
      alert("Enter a valid paid amount");
      return;
    }

    try {
      setActionId(purchase._id);
      await apiRequest(`${API_PURCHASES}/payment/${purchase._id}`, {
        method: "PATCH",
        body: JSON.stringify({
          paidAmount,
          paymentMethod: purchase.paymentMethod || "Credit",
        }),
      });
      await refresh();
    } catch (error) {
      alert(error.message || "Payment could not be updated");
    } finally {
      setActionId("");
    }
  };

  const cancelPurchase = async (purchase) => {
    const reason = window.prompt(
      `Reason for cancelling ${purchase.purchaseNo}:`,
      ""
    );
    if (reason === null) return;

    try {
      setActionId(purchase._id);
      await apiRequest(`${API_PURCHASES}/cancel/${purchase._id}`, {
        method: "PATCH",
        body: JSON.stringify({ cancelReason: reason }),
      });
      await refresh();
    } catch (error) {
      alert(error.message || "Purchase could not be cancelled");
    } finally {
      setActionId("");
    }
  };

  const deletePurchase = async (purchase) => {
    if (!window.confirm(`Delete draft Purchase ${purchase.purchaseNo}?`)) return;

    try {
      setActionId(purchase._id);
      await apiRequest(`${API_PURCHASES}/delete/${purchase._id}`, {
        method: "DELETE",
      });
      await refresh();
    } catch (error) {
      alert(error.message || "Purchase could not be deleted");
    } finally {
      setActionId("");
    }
  };

  const printPurchase = (purchase) => {
    const rows = (purchase.items || [])
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(item.itemCode || "")}</td>
            <td>${escapeHtml(item.description || item.itemName || "")}</td>
            <td>${escapeHtml(item.size || "-")}</td>
            <td class="number">${quantity(item.purchaseQty)}</td>
            <td>${escapeHtml(item.unit || "")}</td>
            <td class="number">${money(item.unitPrice)}</td>
            <td class="number">${money(item.discount)}</td>
            <td class="number">${money(item.amount)}</td>
          </tr>`
      )
      .join("");

    const taxLabel =
      purchase.taxType === "with-tax"
        ? `With Sales Tax ${numberValue(purchase.taxRate)}%`
        : "Without Sales Tax";

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to print this Purchase");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(purchase.purchaseNo)}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 28px; color: #111827; }
            h1 { text-align: center; margin: 0; font-size: 25px; letter-spacing: 1px; }
            .sub { text-align: center; color: #475569; margin: 5px 0 22px; font-size: 12px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; font-size: 12px; line-height: 1.7; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #94a3b8; padding: 7px; font-size: 11px; text-align: left; }
            th { background: #f1f5f9; }
            .number { text-align: right; white-space: nowrap; }
            .totals { width: 380px; margin: 14px 0 0 auto; }
            .totals div { display: flex; justify-content: space-between; border-bottom: 1px solid #cbd5e1; padding: 6px 2px; font-size: 12px; }
            .total { font-size: 14px !important; font-weight: bold; border-top: 2px solid #111827; }
            .sign { margin-top: 65px; display: flex; justify-content: space-between; font-size: 12px; }
            .remarks { margin-top: 18px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>PURCHASE VOUCHER</h1>
          <div class="sub">Generated from an approved GRN</div>

          <div class="grid">
            <div class="box">
              <b>Purchase No:</b> ${escapeHtml(purchase.purchaseNo)}<br/>
              <b>GRN No:</b> ${escapeHtml(purchase.grnNo)}<br/>
              <b>Purchase Order:</b> ${escapeHtml(purchase.purchaseOrderNo)}<br/>
              <b>Purchase Date:</b> ${escapeHtml(purchase.purchaseDate)}<br/>
              <b>Due Date:</b> ${escapeHtml(purchase.dueDate || "-")}
            </div>
            <div class="box">
              <b>Vendor:</b> ${escapeHtml(purchase.vendorName)}<br/>
              <b>Vendor Invoice:</b> ${escapeHtml(purchase.vendorInvoiceNo)}<br/>
              <b>Supplier Bill:</b> ${escapeHtml(purchase.supplierBillNo || "-")}<br/>
              <b>Challan:</b> ${escapeHtml(purchase.challanNo || "-")}<br/>
              <b>Tax:</b> ${escapeHtml(taxLabel)}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Sr</th><th>Code</th><th>Item</th><th>Size</th>
                <th>Qty</th><th>Unit</th><th>Rate</th><th>Discount</th><th>Amount</th>
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
            <div><span>Freight + Other Charges</span><b>${money(
              numberValue(purchase.freightCharges) +
                numberValue(purchase.otherCharges)
            )}</b></div>
            <div class="total"><span>Grand Total</span><b>${money(
              purchase.grandTotal
            )}</b></div>
            <div><span>Paid</span><b>${money(purchase.paidAmount)}</b></div>
            <div><span>Balance</span><b>${money(purchase.balance)}</b></div>
          </div>

          <div class="remarks"><b>Remarks:</b> ${escapeHtml(
            purchase.remarks || "-"
          )}</div>
          <div class="sign">
            <span>Prepared By: __________________</span>
            <span>Checked By: __________________</span>
            <span>Approved By: __________________</span>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (showForm) {
    return (
      <div className="w-full space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <button
                type="button"
                onClick={closeForm}
                className="mb-3 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft size={17} /> Back to Purchases
              </button>
              <h1 className="text-2xl font-bold text-slate-900">
                {editId ? "Edit Purchase" : "New Purchase from GRN"}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Select a posted GRN. Vendor, Purchase Order, tax and accepted quantities will fill automatically.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 hover:bg-slate-50"
            >
              <X size={18} /> Cancel
            </button>
          </div>

          <div className="space-y-6 pt-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <Label required>Purchase No</Label>
                <input
                  value={form.purchaseNo}
                  onChange={(event) =>
                    updateField("purchaseNo", event.target.value.toUpperCase())
                  }
                  className={inputClass}
                  placeholder="PUR-0001"
                />
              </div>

              <div className="md:col-span-2">
                <Label required>GRN</Label>
                {editId ? (
                  <input
                    value={`${form.grnNo} — ${form.purchaseOrderNo}`}
                    disabled
                    className={inputClass}
                  />
                ) : (
                  <select
                    value={form.grn}
                    onChange={(event) => selectGRN(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select Posted GRN</option>
                    {eligibleGrns.map((grn) => (
                      <option key={grn._id} value={grn._id}>
                        {grn.grnNo} — {grn.purchaseOrderNo} — {grn.vendorName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <Label required>Purchase Date</Label>
                <input
                  type="date"
                  value={form.purchaseDate}
                  onChange={(event) =>
                    updateField("purchaseDate", event.target.value)
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <Label>Purchase Order</Label>
                <input value={form.purchaseOrderNo} disabled className={inputClass} />
              </div>

              <div>
                <Label>PO Reference</Label>
                <input
                  value={form.purchaseOrderReferenceNo}
                  disabled
                  className={inputClass}
                />
              </div>

              <div>
                <Label required>Vendor Invoice No</Label>
                <input
                  value={form.vendorInvoiceNo}
                  onChange={(event) =>
                    updateField("vendorInvoiceNo", event.target.value)
                  }
                  className={inputClass}
                  placeholder="Supplier invoice number"
                />
              </div>

              <div>
                <Label>Due Date</Label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => updateField("dueDate", event.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <Label>Supplier Bill No</Label>
                <input
                  value={form.supplierBillNo}
                  onChange={(event) =>
                    updateField("supplierBillNo", event.target.value)
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <Label>Challan No</Label>
                <input
                  value={form.challanNo}
                  onChange={(event) =>
                    updateField("challanNo", event.target.value)
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <Label>Warehouse</Label>
                <input value={form.warehouse} disabled className={inputClass} />
              </div>

              <div>
                <Label>Tax from Purchase Order</Label>
                <input
                  value={
                    form.taxType === "with-tax"
                      ? `With Sales Tax ${numberValue(form.taxRate)}%`
                      : "Without Sales Tax"
                  }
                  disabled
                  className={inputClass}
                />
              </div>
            </div>

            {form.grn ? (
              <div className="grid grid-cols-1 gap-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm md:grid-cols-2">
                <div>
                  <div className="font-bold text-slate-800">Vendor</div>
                  <div className="mt-1 text-slate-700">{form.vendorName}</div>
                  <div className="text-slate-600">{form.vendorPhone || "No phone"}</div>
                  <div className="text-slate-600">{form.vendorEmail || "No email"}</div>
                </div>
                <div>
                  <div className="font-bold text-slate-800">Address</div>
                  <div className="mt-1 text-slate-600">
                    {form.vendorAddress || "No vendor address available"}
                  </div>
                  <div className="mt-2 text-xs font-semibold text-blue-700">
                    Quantity is locked to GRN accepted quantity. Tax is inherited from the Purchase Order.
                  </div>
                </div>
              </div>
            ) : null}

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="flex flex-col gap-2 bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">Accepted GRN Items</h3>
                  <p className="text-xs text-slate-500">
                    Item and quantity are controlled by GRN. Enter invoice rate and discount only.
                  </p>
                </div>
                <div className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
                  {form.items.length} item(s) · {quantity(
                    form.items.reduce(
                      (sum, row) => sum + numberValue(row.purchaseQty),
                      0
                    )
                  )} total qty
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] text-sm">
                  <thead>
                    <tr className="border-b bg-white text-slate-600">
                      <th className="p-3 text-left">Item</th>
                      <th className="p-3 text-left">Description</th>
                      <th className="p-3 text-left">Size</th>
                      <th className="p-3 text-right">GRN Accepted</th>
                      <th className="p-3 text-left">Unit</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-right">Gross</th>
                      <th className="p-3 text-right">Discount</th>
                      <th className="p-3 text-right">Net Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!form.items.length ? (
                      <tr>
                        <td colSpan={9} className="p-10 text-center text-slate-500">
                          Select a GRN to load accepted items.
                        </td>
                      </tr>
                    ) : (
                      form.items.map((item, index) => {
                        const gross =
                          numberValue(item.purchaseQty) *
                          numberValue(item.unitPrice);
                        const net = Math.max(
                          gross - numberValue(item.discount),
                          0
                        );

                        return (
                          <tr key={item.grnItemId || index} className="border-b last:border-0">
                            <td className="p-3">
                              <div className="font-semibold text-slate-900">
                                {item.itemCode || "—"}
                              </div>
                              <div className="text-xs text-slate-500">
                                {item.itemName}
                              </div>
                            </td>
                            <td className="p-3 text-slate-700">
                              {item.description}
                            </td>
                            <td className="p-3 text-slate-600">
                              {item.size || "—"}
                            </td>
                            <td className="p-3 text-right font-bold text-blue-700">
                              {quantity(item.purchaseQty)}
                            </td>
                            <td className="p-3 text-slate-600">{item.unit}</td>
                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(event) =>
                                  updateItem(index, "unitPrice", event.target.value)
                                }
                                className={`${inputClass} min-w-[130px] text-right`}
                              />
                            </td>
                            <td className="p-3 text-right font-medium text-slate-700">
                              {money(gross)}
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.discount}
                                onChange={(event) =>
                                  updateItem(index, "discount", event.target.value)
                                }
                                className={`${inputClass} min-w-[120px] text-right`}
                              />
                            </td>
                            <td className="p-3 text-right font-bold text-slate-900">
                              {money(net)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              <div className="space-y-4 rounded-xl border border-slate-200 p-4 xl:col-span-2">
                <h3 className="font-bold text-slate-900">Charges and Payment</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <Label>Overall Discount</Label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.overallDiscount}
                      onChange={(event) =>
                        updateField("overallDiscount", event.target.value)
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <Label>Freight Charges</Label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.freightCharges}
                      onChange={(event) =>
                        updateField("freightCharges", event.target.value)
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <Label>Other Charges</Label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.otherCharges}
                      onChange={(event) =>
                        updateField("otherCharges", event.target.value)
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <Label>Paid Amount</Label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.paidAmount}
                      onChange={(event) =>
                        updateField("paidAmount", event.target.value)
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <Label>Payment Method</Label>
                    <select
                      value={form.paymentMethod}
                      onChange={(event) =>
                        updateField("paymentMethod", event.target.value)
                      }
                      className={inputClass}
                    >
                      {[
                        "Cash",
                        "Bank",
                        "Cheque",
                        "Credit",
                        "Other",
                      ].map((method) => (
                        <option key={method}>{method}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <Label>Remarks</Label>
                    <textarea
                      value={form.remarks}
                      onChange={(event) =>
                        updateField("remarks", event.target.value)
                      }
                      className={`${inputClass} min-h-[90px]`}
                      placeholder="Optional purchase notes"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-3 font-bold text-slate-900">Purchase Summary</h3>
                <div className="space-y-2 text-sm">
                  {[
                    ["Subtotal", totals.subtotal],
                    ["Item Discount", totals.itemDiscount],
                    ["Overall Discount", totals.overallDiscount],
                    ["Taxable Amount", totals.taxableAmount],
                    [
                      `Sales Tax ${form.taxType === "with-tax" ? `${numberValue(form.taxRate)}%` : ""}`,
                      totals.salesTax,
                    ],
                    ["Freight Charges", form.freightCharges],
                    ["Other Charges", form.otherCharges],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between border-b border-slate-200 py-1.5">
                      <span className="text-slate-600">{label}</span>
                      <b>{money(value)}</b>
                    </div>
                  ))}
                  <div className="flex justify-between border-t-2 border-slate-900 pt-3 text-base">
                    <span className="font-bold">Grand Total</span>
                    <b>{money(totals.grandTotal)}</b>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-600">Paid</span>
                    <b className="text-emerald-700">{money(totals.paidAmount)}</b>
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="font-bold">Balance</span>
                    <b className="text-red-700">{money(totals.balance)}</b>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl border border-slate-300 px-5 py-2.5 font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => save("Draft")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Save Draft
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => save("Posted")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                Save and Post
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Purchases</h1>
          <p className="mt-1 text-sm text-slate-500">
            Convert posted GRNs into controlled supplier purchases and payable records.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            type="button"
            onClick={openNew}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <PackageCheck size={18} />}
            New Purchase
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          ["Total Purchases", stats.total, FileText],
          ["Posted", stats.posted, CheckCircle2],
          ["Purchase Value", money(stats.value), PackageCheck],
          ["Outstanding Payable", money(stats.payable), CreditCard],
        ].map(([label, value, Icon]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {label}
                </div>
                <div className="mt-2 text-xl font-bold text-slate-900">{value}</div>
              </div>
              <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
                <Icon size={21} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={`${inputClass} pl-10`}
              placeholder="Search purchase, GRN, PO, vendor or invoice..."
            />
          </div>
          <select
            value={postingFilter}
            onChange={(event) => setPostingFilter(event.target.value)}
            className={inputClass}
          >
            <option>All</option>
            <option>Draft</option>
            <option>Posted</option>
          </select>
          <select
            value={paymentFilter}
            onChange={(event) => setPaymentFilter(event.target.value)}
            className={inputClass}
          >
            <option>All</option>
            <option>Unpaid</option>
            <option>Partially Paid</option>
            <option>Paid</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="p-3">Purchase</th>
                <th className="p-3">GRN / PO</th>
                <th className="p-3">Vendor</th>
                <th className="p-3">Invoice</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-right">Balance</th>
                <th className="p-3">Posting</th>
                <th className="p-3">Payment</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-500">
                    <Loader2 className="mx-auto mb-2 animate-spin" /> Loading Purchases...
                  </td>
                </tr>
              ) : !filteredPurchases.length ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-500">
                    No Purchase records found.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => {
                  const busy = actionId === purchase._id;
                  return (
                    <tr key={purchase._id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{purchase.purchaseNo}</div>
                        <div className="text-xs text-slate-500">{purchase.purchaseDate}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-slate-800">{purchase.grnNo}</div>
                        <div className="text-xs text-slate-500">{purchase.purchaseOrderNo}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-slate-800">{purchase.vendorName}</div>
                        <div className="text-xs text-slate-500">{purchase.vendorPhone || "—"}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-slate-800">{purchase.vendorInvoiceNo}</div>
                        <div className="text-xs text-slate-500">{purchase.supplierBillNo || "—"}</div>
                      </td>
                      <td className="p-3 text-right font-bold">{money(purchase.grandTotal)}</td>
                      <td className="p-3 text-right font-bold text-red-700">{money(purchase.balance)}</td>
                      <td className="p-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(purchase.postingStatus)}`}>
                          {purchase.postingStatus}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(purchase.paymentStatus)}`}>
                          {purchase.paymentStatus}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => printPurchase(purchase)}
                            className="rounded-lg bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
                            title="Print"
                          >
                            <Printer size={16} />
                          </button>

                          {purchase.postingStatus !== "Posted" && purchase.status !== "Cancelled" ? (
                            <>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleEdit(purchase._id)}
                                className="rounded-lg bg-blue-50 p-2 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                                title="Edit"
                              >
                                {busy ? <Loader2 size={16} className="animate-spin" /> : <Edit2 size={16} />}
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => postPurchase(purchase)}
                                className="rounded-lg bg-purple-50 p-2 text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                                title="Post"
                              >
                                <Send size={16} />
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => deletePurchase(purchase)}
                                className="rounded-lg bg-red-50 p-2 text-red-700 hover:bg-red-100 disabled:opacity-50"
                                title="Delete Draft"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          ) : null}

                          {purchase.status !== "Cancelled" ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => updatePayment(purchase)}
                              className="rounded-lg bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                              title="Update Payment"
                            >
                              <CreditCard size={16} />
                            </button>
                          ) : null}

                          {purchase.status !== "Cancelled" ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => cancelPurchase(purchase)}
                              className="rounded-lg bg-amber-50 p-2 text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                              title="Cancel Purchase"
                            >
                              <Ban size={16} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Purchases;
