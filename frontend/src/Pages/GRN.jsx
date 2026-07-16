import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Printer,
  Loader2,
  FileText,
  Edit2,
  X,
  Save,
  ArrowLeft,
  ClipboardCheck,
  PackageCheck,
  Warehouse,
  ShieldCheck,
  Search,
  RefreshCcw,
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
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || "Request failed");
  }

  return data;
};

const getVendorName = (order) => {
  return (
    order?.vendorName ||
    order?.vendor?.vendorName ||
    order?.vendor?.name ||
    "N/A"
  );
};

const getVendorPhone = (order) => {
  return (
    order?.vendorPhone ||
    order?.vendor?.phoneNumber ||
    order?.vendor?.phone ||
    ""
  );
};

const getOrderNo = (order) => {
  return order?.purchaseOrderNo || order?.orderNo || "N/A";
};

const getDefaultForm = (grnNo = "") => ({
  grnNo,
  purchaseOrder: "",
  purchaseOrderNo: "",
  vendor: "",
  vendorName: "",
  vendorPhone: "",
  receivedDate: todayDate(),
  challanNo: "",
  invoiceNo: "",
  vehicleNo: "",
  warehouse: "Main Godown",
  receivedBy: "",
  checkedBy: "",
  inspectionStatus: "Pending",
  status: "Draft",
  remarks: "",
  items: [],
});

const GRN = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [grns, setGrns] = useState([]);

  const [loading, setLoading] = useState(false);
  const [poLoading, setPoLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [form, setForm] = useState(getDefaultForm());

  const fetchPurchaseOrders = async () => {
    try {
      setPoLoading(true);

      const data = await apiRequest(`${API_BASE_URL}/purchase-orders/all`);
      const list = normalizeArray(data, ["purchaseOrders", "orders"]);

      setPurchaseOrders(
        list.filter((order) => !["Cancelled", "Received"].includes(order.status))
      );
    } catch (error) {
      console.error("Purchase orders loading error:", error);
      alert(error.message || "Purchase orders load nahi huay");
      setPurchaseOrders([]);
    } finally {
      setPoLoading(false);
    }
  };

  const fetchGrns = async () => {
    try {
      setLoading(true);

      const data = await apiRequest(`${API_BASE_URL}/grns/all`);
      setGrns(normalizeArray(data, ["grns"]));
    } catch (error) {
      console.error("GRN loading error:", error);
      alert(error.message || "GRN load nahi huay");
      setGrns([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchNextNo = async () => {
    const data = await apiRequest(`${API_BASE_URL}/grns/next-no`);
    return data.grnNo || "";
  };

  useEffect(() => {
    fetchPurchaseOrders();
    fetchGrns();
  }, []);

  const totals = useMemo(() => {
    const totalOrderedQty = form.items.reduce(
      (sum, item) => sum + Number(item.orderedQty || 0),
      0
    );

    const totalReceivedQty = form.items.reduce(
      (sum, item) => sum + Number(item.receivedQty || 0),
      0
    );

    const totalAcceptedQty = form.items.reduce(
      (sum, item) => sum + Number(item.acceptedQty || 0),
      0
    );

    const totalRejectedQty = form.items.reduce(
      (sum, item) => sum + Number(item.rejectedQty || 0),
      0
    );

    const totalPendingQty = form.items.reduce(
      (sum, item) => sum + Number(item.pendingQty || 0),
      0
    );

    return {
      totalOrderedQty,
      totalReceivedQty,
      totalAcceptedQty,
      totalRejectedQty,
      totalPendingQty,
    };
  }, [form.items]);

  const stats = useMemo(() => {
    return {
      totalGrns: grns.length,
      receivedQty: grns.reduce(
        (s, g) => s + Number(g.totalReceivedQty || g.totals?.totalReceivedQty || 0),
        0
      ),
      rejectedQty: grns.reduce(
        (s, g) => s + Number(g.totalRejectedQty || g.totals?.totalRejectedQty || 0),
        0
      ),
      pendingQty: grns.reduce(
        (s, g) => s + Number(g.totalPendingQty || g.totals?.totalPendingQty || 0),
        0
      ),
    };
  }, [grns]);

  const filteredGrns = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return grns.filter((grn) => {
      const matchesSearch =
        !keyword ||
        grn.grnNo?.toLowerCase().includes(keyword) ||
        grn.purchaseOrderNo?.toLowerCase().includes(keyword) ||
        grn.vendorName?.toLowerCase().includes(keyword) ||
        grn.challanNo?.toLowerCase().includes(keyword) ||
        grn.invoiceNo?.toLowerCase().includes(keyword);

      const matchesStatus = statusFilter === "All" || grn.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [grns, searchTerm, statusFilter]);

  const openNewForm = async () => {
    try {
      setSaving(true);

      await fetchPurchaseOrders();
      const nextNo = await fetchNextNo();

      setEditId(null);
      setForm(getDefaultForm(nextNo));
      setShowForm(true);
    } catch (error) {
      alert(error.message || "GRN No load nahi hua");
    } finally {
      setSaving(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(getDefaultForm());
  };

  const handlePurchaseOrderSelect = (purchaseOrderId) => {
    const order = purchaseOrders.find((po) => po._id === purchaseOrderId);

    if (!order) {
      setForm({
        ...form,
        purchaseOrder: "",
        purchaseOrderNo: "",
        vendor: "",
        vendorName: "",
        vendorPhone: "",
        items: [],
      });
      return;
    }

    const mappedItems = (order.items || []).map((row, index) => {
      const orderedQty = Number(row.quantity || row.qty || 0);
      const alreadyReceivedQty = Number(row.receivedQty || 0);
      const pendingQty = Math.max(orderedQty - alreadyReceivedQty, 0);

      return {
        item: row.item?._id || row.item || null,
        purchaseOrderItemId: row._id || null,
        description: row.description || row.itemName || "",
        size: row.size || "",
        orderedQty,
        previousReceivedQty: alreadyReceivedQty,
        receivedQty: "",
        rejectedQty: "",
        acceptedQty: 0,
        pendingQty,
        unit: row.unit || "Pcs",
        unitPrice: Number(row.unitPrice || 0),
        amount: 0,
        remarks: "",
        rowIndex: index,
      };
    });

    setForm({
      ...form,
      purchaseOrder: purchaseOrderId,
      purchaseOrderNo: getOrderNo(order),
      vendor: order.vendor?._id || order.vendor || "",
      vendorName: getVendorName(order),
      vendorPhone: getVendorPhone(order),
      items: mappedItems,
    });
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...form.items];

    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };

    const orderedQty = Number(updatedItems[index].orderedQty || 0);
    const previousReceivedQty = Number(updatedItems[index].previousReceivedQty || 0);
    const receivedQty = Number(updatedItems[index].receivedQty || 0);
    const rejectedQty = Number(updatedItems[index].rejectedQty || 0);
    const unitPrice = Number(updatedItems[index].unitPrice || 0);

    const acceptedQty = Math.max(receivedQty - rejectedQty, 0);
    const pendingQty = Math.max(orderedQty - previousReceivedQty - receivedQty, 0);

    updatedItems[index].acceptedQty = acceptedQty;
    updatedItems[index].pendingQty = pendingQty;
    updatedItems[index].amount = acceptedQty * unitPrice;

    setForm({
      ...form,
      items: updatedItems,
    });
  };

  const validateForm = () => {
    if (!form.grnNo.trim()) {
      alert("GRN No required hai");
      return false;
    }

    if (!form.purchaseOrder) {
      alert("Purchase Order select karein");
      return false;
    }

    if (!form.receivedDate) {
      alert("Received Date required hai");
      return false;
    }

    if (!form.warehouse.trim()) {
      alert("Warehouse required hai");
      return false;
    }

    const validItems = form.items.filter(
      (item) => Number(item.receivedQty || 0) > 0
    );

    if (validItems.length === 0) {
      alert("Kam az kam aik item receive karein");
      return false;
    }

    const invalidRejectedQty = form.items.some(
      (item) => Number(item.rejectedQty || 0) > Number(item.receivedQty || 0)
    );

    if (invalidRejectedQty) {
      alert("Rejected Qty received qty se zyada nahi ho sakti");
      return false;
    }

    const overReceived = form.items.some((item) => {
      const remaining =
        Number(item.orderedQty || 0) - Number(item.previousReceivedQty || 0);
      return Number(item.receivedQty || 0) > remaining;
    });

    if (overReceived) {
      alert("Received qty pending qty se zyada nahi ho sakti");
      return false;
    }

    return true;
  };

  const buildPayload = () => {
    const validItems = form.items
      .filter((item) => Number(item.receivedQty || 0) > 0)
      .map((item) => ({
        item: item.item || null,
        purchaseOrderItemId: item.purchaseOrderItemId || null,
        description: String(item.description || "").trim(),
        size: String(item.size || "").trim(),
        orderedQty: Number(item.orderedQty || 0),
        previousReceivedQty: Number(item.previousReceivedQty || 0),
        receivedQty: Number(item.receivedQty || 0),
        rejectedQty: Number(item.rejectedQty || 0),
        acceptedQty: Number(item.acceptedQty || 0),
        pendingQty: Number(item.pendingQty || 0),
        unit: String(item.unit || "Pcs").trim(),
        unitPrice: Number(item.unitPrice || 0),
        amount: Number(item.amount || 0),
        remarks: String(item.remarks || "").trim(),
      }));

    return {
      grnNo: form.grnNo,
      purchaseOrder: form.purchaseOrder,
      purchaseOrderNo: form.purchaseOrderNo,
      vendor: form.vendor || null,
      vendorName: form.vendorName,
      vendorPhone: form.vendorPhone,
      receivedDate: form.receivedDate,
      challanNo: form.challanNo,
      invoiceNo: form.invoiceNo,
      vehicleNo: form.vehicleNo,
      warehouse: form.warehouse,
      receivedBy: form.receivedBy,
      checkedBy: form.checkedBy,
      inspectionStatus: form.inspectionStatus,
      status: form.status,
      remarks: form.remarks,
      items: validItems,
      totalOrderedQty: totals.totalOrderedQty,
      totalReceivedQty: totals.totalReceivedQty,
      totalAcceptedQty: totals.totalAcceptedQty,
      totalRejectedQty: totals.totalRejectedQty,
      totalPendingQty: totals.totalPendingQty,
    };
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = buildPayload();

      const url = editId
        ? `${API_BASE_URL}/grns/update/${editId}`
        : `${API_BASE_URL}/grns/add`;

      const method = editId ? "PUT" : "POST";

      await apiRequest(url, {
        method,
        body: JSON.stringify(payload),
      });

      await fetchGrns();
      await fetchPurchaseOrders();
      closeForm();
    } catch (error) {
      console.error("GRN Save Error:", error);
      alert(error.message || "GRN save nahi hua");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (grn) => {
    await fetchPurchaseOrders();

    setEditId(grn._id);

    setForm({
      grnNo: grn.grnNo || "",
      purchaseOrder: grn.purchaseOrder?._id || grn.purchaseOrder || "",
      purchaseOrderNo: grn.purchaseOrderNo || "",
      vendor: grn.vendor?._id || grn.vendor || "",
      vendorName: grn.vendorName || "",
      vendorPhone: grn.vendorPhone || "",
      receivedDate: grn.receivedDate || todayDate(),
      challanNo: grn.challanNo || "",
      invoiceNo: grn.invoiceNo || "",
      vehicleNo: grn.vehicleNo || "",
      warehouse: grn.warehouse || "Main Godown",
      receivedBy: grn.receivedBy || "",
      checkedBy: grn.checkedBy || "",
      inspectionStatus: grn.inspectionStatus || "Pending",
      status: grn.status || "Draft",
      remarks: grn.remarks || "",
      items: grn.items?.length
        ? grn.items.map((row) => ({
            item: row.item?._id || row.item || null,
            purchaseOrderItemId: row.purchaseOrderItemId || null,
            description: row.description || "",
            size: row.size || "",
            orderedQty: row.orderedQty || 0,
            previousReceivedQty: row.previousReceivedQty || 0,
            receivedQty: row.receivedQty || "",
            rejectedQty: row.rejectedQty || "",
            acceptedQty: row.acceptedQty || 0,
            pendingQty: row.pendingQty || 0,
            unit: row.unit || "Pcs",
            unitPrice: row.unitPrice || 0,
            amount: row.amount || 0,
            remarks: row.remarks || "",
          }))
        : [],
    });

    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this GRN?")) return;

    try {
      await apiRequest(`${API_BASE_URL}/grns/delete/${id}`, {
        method: "DELETE",
      });

      await fetchGrns();
      await fetchPurchaseOrders();
    } catch (error) {
      alert(error.message || "GRN delete nahi hua");
    }
  };

  const printGrn = (grn) => {
    const rows = (grn.items || [])
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${item.description || ""}</td>
            <td>${item.size || ""}</td>
            <td>${item.orderedQty || 0}</td>
            <td>${item.receivedQty || 0}</td>
            <td>${item.acceptedQty || 0}</td>
            <td>${item.rejectedQty || 0}</td>
            <td>${item.pendingQty || 0}</td>
            <td>${item.unit || ""}</td>
            <td>${item.remarks || ""}</td>
          </tr>
        `
      )
      .join("");

    const printWindow = window.open("", "_blank");

    printWindow.document.write(`
      <html>
        <head>
          <title>${grn.grnNo}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 8mm;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #111827;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 15px;
              font-weight: 700;
              line-height: 1.45;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            body {
              padding: 6mm;
            }

            b,
            strong {
              font-weight: 900;
            }

            .top {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 30px;
              border-bottom: 2.5px solid #111827;
              padding-bottom: 12px;
            }

            h1 {
              margin: 0;
              font-size: 34px;
              line-height: 1.1;
              font-weight: 900;
            }

            h2 {
              text-align: center;
              margin: 18px 0 15px;
              font-size: 24px;
              line-height: 1.2;
              font-weight: 900;
              text-decoration: underline;
            }

            .small {
              font-size: 14px;
              color: #111827;
              line-height: 1.65;
              font-weight: 800;
            }

            .box {
              border: 1.5px solid #111827;
              padding: 11px 13px;
              margin: 12px 0;
              font-size: 15px;
              line-height: 1.65;
              font-weight: 700;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: auto;
              margin-top: 12px;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            th,
            td {
              border: 1.3px solid #111827;
              padding: 8px;
              font-size: 14px;
              line-height: 1.35;
              text-align: left;
              vertical-align: middle;
              font-weight: 700;
            }

            th {
              background: #f3f4f6;
              font-size: 14px;
              font-weight: 900;
              white-space: nowrap;
            }

            .summary {
              width: 390px;
              margin-left: auto;
              margin-top: 14px;
              font-size: 15px;
              font-weight: 800;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .summary div {
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 24px;
              border-bottom: 1.2px solid #9ca3af;
              padding: 7px 0;
            }

            .summary div:last-child {
              border-top: 2px solid #111827;
              border-bottom: 2px solid #111827;
              font-size: 16px;
              font-weight: 900;
            }

            body > p {
              margin-top: 18px;
              font-size: 15px;
              font-weight: 800;
            }

            .sign {
              margin-top: 42px;
              display: flex;
              justify-content: space-between;
              gap: 30px;
              font-size: 15px;
              font-weight: 800;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            @media print {
              html,
              body {
                width: 100%;
              }

              .top,
              .box,
              table,
              .summary,
              .sign {
                break-inside: avoid;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>

        <body>
          <div class="top">
            <div>
              <h1>Urwa Packages</h1>
              <div class="small">Goods Receiving Note</div>
            </div>

            <div class="small">
              <b>GRN No:</b> ${grn.grnNo || ""}<br/>
              <b>GRN Date:</b> ${grn.receivedDate || ""}<br/>
              <b>PO No:</b> ${grn.purchaseOrderNo || ""}<br/>
              <b>Status:</b> ${grn.status || ""}
            </div>
          </div>

          <h2>GOODS RECEIVING NOTE</h2>

          <div class="box">
            <b>Vendor Name:</b> ${grn.vendorName || ""}<br/>
            <b>Vendor Phone:</b> ${grn.vendorPhone || ""}<br/>
            <b>Challan No:</b> ${grn.challanNo || ""}<br/>
            <b>Invoice No:</b> ${grn.invoiceNo || ""}<br/>
            <b>Vehicle No:</b> ${grn.vehicleNo || ""}<br/>
            <b>Warehouse:</b> ${grn.warehouse || ""}<br/>
            <b>Received By:</b> ${grn.receivedBy || ""}<br/>
            <b>Checked By:</b> ${grn.checkedBy || ""}<br/>
            <b>Inspection Status:</b> ${grn.inspectionStatus || ""}
          </div>

          <table>
            <thead>
              <tr>
                <th>Sr</th>
                <th>Description</th>
                <th>Size</th>
                <th>Ordered</th>
                <th>Received</th>
                <th>Accepted</th>
                <th>Rejected</th>
                <th>Pending</th>
                <th>Unit</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <div class="summary">
            <div><span>Total Ordered Qty</span><b>${grn.totalOrderedQty || grn.totals?.totalOrderedQty || 0}</b></div>
            <div><span>Total Received Qty</span><b>${grn.totalReceivedQty || grn.totals?.totalReceivedQty || 0}</b></div>
            <div><span>Total Accepted Qty</span><b>${grn.totalAcceptedQty || grn.totals?.totalAcceptedQty || 0}</b></div>
            <div><span>Total Rejected Qty</span><b>${grn.totalRejectedQty || grn.totals?.totalRejectedQty || 0}</b></div>
            <div><span>Total Pending Qty</span><b>${grn.totalPendingQty || grn.totals?.totalPendingQty || 0}</b></div>
          </div>

          <p><b>Remarks:</b> ${grn.remarks || ""}</p>

          <div class="sign">
            <div>Store Incharge: __________________</div>
            <div>Quality Checked By: __________________</div>
            <div>Approved By: __________________</div>
          </div>

          <script>window.print();</script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

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
                Back to GRN List
              </button>

              <h1 className="text-2xl font-bold text-slate-900">
                {editId ? "Edit GRN" : "New Goods Receiving Note"}
              </h1>

              <p className="text-sm text-slate-500 mt-1">
                Purchase order select karein, received/rejected qty enter karein.
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
                <RequiredLabel>GRN No</RequiredLabel>
                <input
                  value={form.grnNo}
                  onChange={(e) => setForm({ ...form, grnNo: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="GRN-0001"
                />
              </div>

              <div>
                <RequiredLabel>Purchase Order</RequiredLabel>
                <select
                  value={form.purchaseOrder}
                  onChange={(e) => handlePurchaseOrderSelect(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  disabled={!!editId}
                >
                  <option value="">
                    {poLoading ? "Loading purchase orders..." : "Select Purchase Order"}
                  </option>

                  {purchaseOrders.map((order) => (
                    <option key={order._id} value={order._id}>
                      {getOrderNo(order)} - {getVendorName(order)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <RequiredLabel>Received Date</RequiredLabel>
                <input
                  type="date"
                  value={form.receivedDate}
                  onChange={(e) =>
                    setForm({ ...form, receivedDate: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                />
              </div>

              <div>
                <RequiredLabel>Warehouse</RequiredLabel>
                <select
                  value={form.warehouse}
                  onChange={(e) => setForm({ ...form, warehouse: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                >
                  <option>Main Godown</option>
                  <option>Raw Material Store</option>
                  <option>Finished Goods Store</option>
                  <option>UrwaGodam</option>
                </select>
              </div>

              <div>
                <NormalLabel>Vendor Name</NormalLabel>
                <input
                  value={form.vendorName}
                  readOnly
                  className="w-full border rounded-lg px-3 py-2 mt-1 bg-slate-50"
                />
              </div>

              <div>
                <NormalLabel>Vendor Phone</NormalLabel>
                <input
                  value={form.vendorPhone}
                  readOnly
                  className="w-full border rounded-lg px-3 py-2 mt-1 bg-slate-50"
                />
              </div>

              <div>
                <NormalLabel>Supplier Challan No</NormalLabel>
                <input
                  value={form.challanNo}
                  onChange={(e) => setForm({ ...form, challanNo: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="Challan number"
                />
              </div>

              <div>
                <NormalLabel>Supplier Invoice No</NormalLabel>
                <input
                  value={form.invoiceNo}
                  onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="Invoice number"
                />
              </div>

              <div>
                <NormalLabel>Vehicle No</NormalLabel>
                <input
                  value={form.vehicleNo}
                  onChange={(e) => setForm({ ...form, vehicleNo: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="LES-1234"
                />
              </div>

              <div>
                <NormalLabel>Received By</NormalLabel>
                <input
                  value={form.receivedBy}
                  onChange={(e) => setForm({ ...form, receivedBy: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="Store person name"
                />
              </div>

              <div>
                <NormalLabel>Checked By</NormalLabel>
                <input
                  value={form.checkedBy}
                  onChange={(e) => setForm({ ...form, checkedBy: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="QC person name"
                />
              </div>

              <div>
                <RequiredLabel>Inspection Status</RequiredLabel>
                <select
                  value={form.inspectionStatus}
                  onChange={(e) =>
                    setForm({ ...form, inspectionStatus: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                >
                  <option>Pending</option>
                  <option>Passed</option>
                  <option>Partially Accepted</option>
                  <option>Rejected</option>
                </select>
              </div>

              <div>
                <RequiredLabel>GRN Status</RequiredLabel>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                >
                  <option>Draft</option>
                  <option>Received</option>
                  <option>Partially Received</option>
                  <option>Completed</option>
                  <option>Cancelled</option>
                </select>
              </div>
            </div>

            <div className="border rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h3 className="font-bold flex items-center gap-2">
                    <PackageCheck size={18} className="text-blue-600" />
                    Received Items
                  </h3>
                  <p className="text-xs text-slate-500">
                    Item ID purchase order se aa raha hai. GRN save hone ke baad backend same item ko update karega.
                  </p>
                </div>

                <div className="text-xs bg-white border rounded-lg px-3 py-2 text-slate-600">
                  PO No: <b>{form.purchaseOrderNo || "Not selected"}</b>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white border-b text-slate-600">
                      <th className="p-2 text-left">Item Description</th>
                      <th className="p-2 text-left">Size</th>
                      <th className="p-2 text-right">Ordered</th>
                      <th className="p-2 text-right">Previous Rec.</th>
                      <th className="p-2 text-right">Pending</th>
                      <th className="p-2 text-right">
                        Received <span className="text-red-600">*</span>
                      </th>
                      <th className="p-2 text-right">Rejected</th>
                      <th className="p-2 text-right">Accepted</th>
                      <th className="p-2 text-left">Unit</th>
                      <th className="p-2 text-left">Remarks</th>
                    </tr>
                  </thead>

                  <tbody>
                    {form.items.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="p-8 text-center text-slate-500">
                          Purchase Order select karein. Items yahan auto load honge.
                        </td>
                      </tr>
                    ) : (
                      form.items.map((item, index) => (
                        <tr key={index} className="border-b hover:bg-slate-50">
                          <td className="p-2 min-w-[230px]">
                            <div className="font-semibold text-slate-800">
                              {item.description || "N/A"}
                            </div>

                            <div className="text-xs text-slate-500">
                              Rate: {money(item.unitPrice)}
                            </div>
                          </td>

                          <td className="p-2 min-w-[120px]">{item.size || "-"}</td>

                          <td className="p-2 text-right font-bold">
                            {item.orderedQty}
                          </td>

                          <td className="p-2 text-right font-bold text-slate-500">
                            {item.previousReceivedQty || 0}
                          </td>

                          <td className="p-2 text-right font-bold text-orange-600">
                            {Math.max(
                              Number(item.orderedQty || 0) -
                                Number(item.previousReceivedQty || 0),
                              0
                            )}
                          </td>

                          <td className="p-2 min-w-[110px]">
                            <input
                              type="number"
                              value={item.receivedQty}
                              onChange={(e) =>
                                updateItem(index, "receivedQty", e.target.value)
                              }
                              className="w-full border rounded px-2 py-1.5 text-right"
                              placeholder="0"
                            />
                          </td>

                          <td className="p-2 min-w-[110px]">
                            <input
                              type="number"
                              value={item.rejectedQty}
                              onChange={(e) =>
                                updateItem(index, "rejectedQty", e.target.value)
                              }
                              className="w-full border rounded px-2 py-1.5 text-right"
                              placeholder="0"
                            />
                          </td>

                          <td className="p-2 text-right font-bold text-emerald-600">
                            {item.acceptedQty}
                          </td>

                          <td className="p-2">{item.unit}</td>

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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <NormalLabel>Overall Remarks</NormalLabel>
                <textarea
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1 min-h-[150px]"
                  placeholder="Any receiving, quality or shortage remarks..."
                />
              </div>

              <div className="bg-slate-50 rounded-xl p-5 space-y-3">
                <div className="flex justify-between">
                  <span>Total Ordered Qty</span>
                  <b>{totals.totalOrderedQty}</b>
                </div>

                <div className="flex justify-between">
                  <span>Total Received Qty</span>
                  <b className="text-blue-700">{totals.totalReceivedQty}</b>
                </div>

                <div className="flex justify-between">
                  <span>Total Accepted Qty</span>
                  <b className="text-emerald-600">{totals.totalAcceptedQty}</b>
                </div>

                <div className="flex justify-between">
                  <span>Total Rejected Qty</span>
                  <b className="text-red-600">{totals.totalRejectedQty}</b>
                </div>

                <div className="flex justify-between text-lg border-t pt-3">
                  <span>Total Pending Qty</span>
                  <b className="text-orange-600">{totals.totalPendingQty}</b>
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
                {saving ? "Saving..." : "Save GRN"}
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
            <ClipboardCheck className="text-blue-600" size={26} />
            Goods Receiving Note
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Purchase order ke against goods receiving aur warehouse entry manage karein.
          </p>
        </div>

        <button
          onClick={openNewForm}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm disabled:opacity-60"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
          New GRN
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText size={22} />
          </div>

          <div>
            <p className="text-xs text-slate-500">Total GRNs</p>
            <h3 className="text-2xl font-bold">{stats.totalGrns}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <PackageCheck size={22} />
          </div>

          <div>
            <p className="text-xs text-slate-500">Received Qty</p>
            <h3 className="text-2xl font-bold">{stats.receivedQty}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <ShieldCheck size={22} />
          </div>

          <div>
            <p className="text-xs text-slate-500">Rejected Qty</p>
            <h3 className="text-2xl font-bold">{stats.rejectedQty}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Warehouse size={22} />
          </div>

          <div>
            <p className="text-xs text-slate-500">Pending Qty</p>
            <h3 className="text-2xl font-bold">{stats.pendingQty}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900">GRN List</h3>
            <p className="text-xs text-slate-500">All GRNs from MongoDB</p>
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
                placeholder="Search GRN, PO, vendor..."
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option>All</option>
              <option>Draft</option>
              <option>Received</option>
              <option>Partially Received</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>

            <button
              onClick={() => {
                fetchPurchaseOrders();
                fetchGrns();
              }}
              className="inline-flex items-center justify-center gap-2 text-sm px-3 py-2 rounded-lg border hover:bg-slate-50"
            >
              <RefreshCcw size={15} />
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3 text-left">GRN No</th>
                <th className="p-3 text-left">PO No</th>
                <th className="p-3 text-left">Vendor</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Warehouse</th>
                <th className="p-3 text-right">Received</th>
                <th className="p-3 text-right">Accepted</th>
                <th className="p-3 text-right">Rejected</th>
                <th className="p-3 text-center">Inspection</th>
                <th className="p-3 text-center">Status</th>
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
              ) : filteredGrns.length === 0 ? (
                <tr>
                  <td colSpan="11" className="p-10 text-center text-slate-500">
                    No GRN found.
                  </td>
                </tr>
              ) : (
                filteredGrns.map((grn) => (
                  <tr key={grn._id} className="border-t hover:bg-slate-50">
                    <td className="p-3 font-bold text-blue-700">{grn.grnNo}</td>

                    <td className="p-3">{grn.purchaseOrderNo}</td>

                    <td className="p-3">
                      <div className="font-semibold">{grn.vendorName}</div>
                      <div className="text-xs text-slate-500">
                        {grn.vendorPhone}
                      </div>
                    </td>

                    <td className="p-3">{grn.receivedDate}</td>

                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Warehouse size={14} className="text-slate-400" />
                        {grn.warehouse}
                      </div>
                    </td>

                    <td className="p-3 text-right font-bold text-blue-700">
                      {grn.totalReceivedQty || grn.totals?.totalReceivedQty || 0}
                    </td>

                    <td className="p-3 text-right font-bold text-emerald-600">
                      {grn.totalAcceptedQty || grn.totals?.totalAcceptedQty || 0}
                    </td>

                    <td className="p-3 text-right font-bold text-red-600">
                      {grn.totalRejectedQty || grn.totals?.totalRejectedQty || 0}
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          grn.inspectionStatus === "Passed"
                            ? "bg-green-50 text-green-700"
                            : grn.inspectionStatus === "Rejected"
                            ? "bg-red-50 text-red-700"
                            : grn.inspectionStatus === "Partially Accepted"
                            ? "bg-orange-50 text-orange-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {grn.inspectionStatus}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                        {grn.status}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => printGrn(grn)}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                          title="Print"
                        >
                          <Printer size={16} />
                        </button>

                        <button
                          onClick={() => handleEdit(grn)}
                          className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>

                        <button
                          onClick={() => handleDelete(grn._id)}
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
    </div>
  );
};

export default GRN;