import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BadgeDollarSign,
  Building2,
  CheckCircle2,
  CreditCard,
  Edit2,
  FileText,
  Landmark,
  Loader2,
  Plus,
  Printer,
  Receipt,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

const COMPANY_PROFILES = {
  topical: {
    key: "topical",
    name: "TOPICAL PACKAGING PVT. LTD.",
    shortName: "Topical Packaging",
    codePrefix: "TP-INV",
    templateType: "detailed",
    address: "21-Km, Ferozepur Road, Lahore, Pakistan",
    phone: "+92 321 9970676",
    salesTaxRegNo: "32-77-8762-085-29",
    nationalTaxNo: "6620209-3",
  },
  alKaram: {
    key: "alKaram",
    name: "AL-KARAM TRADERS",
    shortName: "Al-Karam Traders",
    codePrefix: "AK-INV",
    templateType: "compact",
    address: "Office #17, 3rd Floor, Gohar Centre, Wahdat Road, Lahore",
    phone: "0423 5912858 | 0333 8295065",
    salesTaxRegNo: "",
    nationalTaxNo: "",
  },
};

const PROFILE_OPTIONS = Object.values(COMPANY_PROFILES);

const emptyItem = {
  description: "",
  size: "",
  textType: "",
  cartons: "",
  rolls: "",
  packing: "",
  quantity: "",
  unit: "Rolls",
  unitPrice: "",
  grossWeight: "",
  netWeight: "",
};

const getDefaultForm = () => ({
  companyProfile: "",
  companyName: "",
  companyAddress: "",
  companyPhone: "",
  templateType: "",
  invoiceNo: "",
  deliveryChallan: "",
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  poNo: "",
  taxType: "without-tax",
  taxRate: 18,
  salesTaxRegNo: "",
  nationalTaxNo: "",
  customerNTN: "",
  customerSTRN: "",
  paymentTerms: "Due on Receipt",
  paidAmount: "",
  status: "Draft",
  remarks: "",
  preparedBy: "",
  items: [],
});

const numberValue = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const todayDate = () => new Date().toISOString().slice(0, 10);

const money = (value) =>
  `Rs. ${numberValue(value).toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString("en-GB");
};

const safeText = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

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
      ...(requestOptions.body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
  });

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    console.error("Invoice API returned non-JSON:", {
      url,
      status: response.status,
      contentType,
      response: text.slice(0, 300),
    });
    throw new Error(`The API returned an invalid response. Status: ${response.status}`);
  }

  const data = await response.json();

  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || data?.error || "Request failed");
  }

  return data;
};

const calculateItemAmount = (item) =>
  numberValue(item.quantity) * numberValue(item.unitPrice);

const getTextTypeValue = (item) => {
  const raw =
    item?.textType ??
    item?.textStatus ??
    item?.textOption ??
    item?.withText ??
    item?.hasText ??
    item?.isWithText ??
    "";

  if (typeof raw === "boolean") return raw ? "with-text" : "without-text";

  const normalized = String(raw).trim().toLowerCase();

  if (["with-text", "with text", "with_text", "yes", "true", "1", "printed"].includes(normalized)) {
    return "with-text";
  }

  if (["without-text", "without text", "without_text", "no", "false", "0"].includes(normalized)) {
    return "without-text";
  }

  return "";
};

const resolveCompanyProfileKey = (record) => {
  if (COMPANY_PROFILES[record?.companyProfile]) return record.companyProfile;

  const number = String(record?.invoiceNo || record?.challanNo || "").toUpperCase();
  if (number.startsWith("AK-")) return "alKaram";
  return "topical";
};

const getCompanyProfile = (record) =>
  COMPANY_PROFILES[resolveCompanyProfileKey(record)] || COMPANY_PROFILES.topical;

const numberToWordsBelowThousand = (number) => {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  let value = Math.floor(number);
  const parts = [];

  if (value >= 100) {
    parts.push(`${ones[Math.floor(value / 100)]} Hundred`);
    value %= 100;
  }

  if (value >= 20) {
    parts.push(tens[Math.floor(value / 10)]);
    value %= 10;
  }

  if (value > 0) parts.push(ones[value]);

  return parts.join(" ");
};

const amountToWords = (amount) => {
  let value = Math.round(numberValue(amount));
  if (value === 0) return "Zero Rupees Only";

  const parts = [];
  const groups = [
    { value: 10000000, label: "Crore" },
    { value: 100000, label: "Lakh" },
    { value: 1000, label: "Thousand" },
  ];

  for (const group of groups) {
    if (value >= group.value) {
      const count = Math.floor(value / group.value);
      parts.push(`${numberToWordsBelowThousand(count)} ${group.label}`);
      value %= group.value;
    }
  }

  if (value > 0) parts.push(numberToWordsBelowThousand(value));

  return `${parts.join(" ")} Rupees Only`;
};

const RequiredLabel = ({ children }) => (
  <label className="flex items-center gap-1 text-xs font-bold text-slate-600">
    {children}
    <AlertCircle size={12} className="text-red-600" />
  </label>
);

const NormalLabel = ({ children }) => (
  <label className="text-xs font-bold text-slate-600">{children}</label>
);

const getStatusClass = (status) => {
  if (status === "Paid") return "bg-emerald-100 text-emerald-700";
  if (status === "Issued") return "bg-blue-100 text-blue-700";
  if (status === "Cancelled") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-700";
};

const getPaymentStatus = (invoice) => {
  if (invoice.paymentStatus) return invoice.paymentStatus;
  const balance = numberValue(invoice.balance);
  const paid = numberValue(invoice.paidAmount);
  if (balance <= 0 && numberValue(invoice.grandTotal) > 0) return "Paid";
  if (paid > 0) return "Partially Paid";
  return "Unpaid";
};

const StatCard = ({ title, value, icon: Icon, note }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-medium text-slate-500">{title}</p>
        <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
        {note && <p className="mt-1 text-xs text-slate-400">{note}</p>}
      </div>
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <Icon size={21} />
      </div>
    </div>
  </div>
);

const Invoices = () => {
  const [challans, setChallans] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState("All");
  const [taxFilter, setTaxFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [form, setForm] = useState(getDefaultForm());

  const fetchChallans = async () => {
    try {
      const data = await apiRequest(`${API_BASE_URL}/delivery-challans/all`);
      setChallans(normalizeArray(data, ["challans", "deliveryChallans"]));
    } catch (error) {
      console.error("Challan loading error:", error);
      setChallans([]);
    }
  };

  const fetchSalesOrders = async () => {
    try {
      const data = await apiRequest(`${API_BASE_URL}/sales-orders/all`);
      setSalesOrders(normalizeArray(data, ["orders", "salesOrders"]));
    } catch (error) {
      console.error("Sales order loading error:", error);
      setSalesOrders([]);
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`${API_BASE_URL}/invoices/all`);
      setInvoices(normalizeArray(data, ["invoices"]));
    } catch (error) {
      console.error("Invoice loading error:", error);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchNextNo = async (companyProfile) => {
    if (!companyProfile) return "";

    const data = await apiRequest(
      `${API_BASE_URL}/invoices/next-no?companyProfile=${encodeURIComponent(companyProfile)}`
    );

    return data.invoiceNo || "";
  };

  useEffect(() => {
    fetchChallans();
    fetchSalesOrders();
    fetchInvoices();
  }, []);

  const selectedChallan = useMemo(
    () => challans.find((challan) => challan._id === form.deliveryChallan) || null,
    [challans, form.deliveryChallan]
  );

  const selectedSalesOrder = useMemo(() => {
    if (!selectedChallan) return null;
    const id = selectedChallan.salesOrder?._id || selectedChallan.salesOrder || "";
    return salesOrders.find((order) => order._id === id) || null;
  }, [selectedChallan, salesOrders]);

  const availableChallans = useMemo(() => {
    return challans.filter((challan) => {
      const profileKey = resolveCompanyProfileKey(challan);
      const matchesCompany = !form.companyProfile || profileKey === form.companyProfile;
      const notInvoiced = challan.invoiceStatus !== "Invoiced";
      const currentSelected = challan._id === form.deliveryChallan;
      const validStatus = !["Cancelled"].includes(challan.status);
      return matchesCompany && validStatus && (notInvoiced || currentSelected || !!editId);
    });
  }, [challans, form.companyProfile, form.deliveryChallan, editId]);

  const totals = useMemo(() => {
    const subtotal = form.items.reduce((sum, item) => sum + calculateItemAmount(item), 0);
    const salesTax =
      form.taxType === "with-tax"
        ? subtotal * (numberValue(form.taxRate) / 100)
        : 0;
    const grandTotal = subtotal + salesTax;
    const paidAmount = Math.max(numberValue(form.paidAmount), 0);
    const balance = Math.max(grandTotal - paidAmount, 0);

    return { subtotal, salesTax, grandTotal, paidAmount, balance };
  }, [form.items, form.taxType, form.taxRate, form.paidAmount]);

  const dashboardStats = useMemo(() => {
    return {
      count: invoices.length,
      value: invoices.reduce((sum, invoice) => sum + numberValue(invoice.grandTotal), 0),
      tax: invoices.reduce((sum, invoice) => sum + numberValue(invoice.salesTax), 0),
      paid: invoices.reduce((sum, invoice) => sum + numberValue(invoice.paidAmount), 0),
      receivable: invoices.reduce((sum, invoice) => sum + numberValue(invoice.balance), 0),
    };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const profileKey = resolveCompanyProfileKey(invoice);
      const matchesSearch =
        !keyword ||
        [
          invoice.invoiceNo,
          invoice.customerName,
          invoice.customerPhone,
          invoice.challanNo,
          invoice.salesOrderNo,
          invoice.poNo,
        ].some((value) => String(value || "").toLowerCase().includes(keyword)) ||
        invoice.items?.some((item) =>
          String(item.description || "").toLowerCase().includes(keyword)
        );

      const matchesCompany = companyFilter === "All" || profileKey === companyFilter;
      const matchesTax = taxFilter === "All" || invoice.taxType === taxFilter;
      const matchesStatus = statusFilter === "All" || invoice.status === statusFilter;

      return matchesSearch && matchesCompany && matchesTax && matchesStatus;
    });
  }, [invoices, searchTerm, companyFilter, taxFilter, statusFilter]);

  const openNewForm = () => {
    setEditId(null);
    setForm(getDefaultForm());
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(getDefaultForm());
  };

  const handleCompanyChange = async (companyProfile) => {
    if (!companyProfile) {
      setForm(getDefaultForm());
      return;
    }

    const profile = COMPANY_PROFILES[companyProfile];

    try {
      setSaving(true);
      const invoiceNo = await fetchNextNo(companyProfile);

      setForm({
        ...getDefaultForm(),
        companyProfile,
        companyName: profile.name,
        companyAddress: profile.address,
        companyPhone: profile.phone,
        templateType: profile.templateType,
        invoiceNo,
        salesTaxRegNo: profile.salesTaxRegNo,
        nationalTaxNo: profile.nationalTaxNo,
      });
    } catch (error) {
      console.error("Invoice number loading error:", error);
      setForm({
        ...getDefaultForm(),
        companyProfile,
        companyName: profile.name,
        companyAddress: profile.address,
        companyPhone: profile.phone,
        templateType: profile.templateType,
        salesTaxRegNo: profile.salesTaxRegNo,
        nationalTaxNo: profile.nationalTaxNo,
      });
    } finally {
      setSaving(false);
    }
  };

  const getRateFromSalesOrder = (challanItem, index, order) => {
    if (!order?.items) return "";

    const exactItem = order.items.find((item) => {
      const sameId =
        String(item._id || item.salesOrderItemId || "") ===
        String(challanItem.salesOrderItemId || "");
      const sameDetails =
        String(item.description || "").trim().toLowerCase() ===
          String(challanItem.description || "").trim().toLowerCase() &&
        String(item.size || "").trim().toLowerCase() ===
          String(challanItem.size || "").trim().toLowerCase();
      return sameId || sameDetails;
    });

    return exactItem?.unitPrice ?? order.items[index]?.unitPrice ?? "";
  };

  const handleChallanChange = async (challanId) => {
    const challan = challans.find((item) => item._id === challanId);

    if (!challan) {
      setForm((previous) => ({
        ...previous,
        deliveryChallan: "",
        poNo: "",
        customerNTN: "",
        customerSTRN: "",
        items: [],
      }));
      return;
    }

    const profileKey = resolveCompanyProfileKey(challan);
    const profile = COMPANY_PROFILES[profileKey];
    const salesOrderId = challan.salesOrder?._id || challan.salesOrder || "";
    const order = salesOrders.find((item) => item._id === salesOrderId);

    let invoiceNo = form.invoiceNo;

    if (!editId && form.companyProfile !== profileKey) {
      try {
        invoiceNo = await fetchNextNo(profileKey);
      } catch (error) {
        console.error("Invoice number loading error:", error);
      }
    }

    setForm((previous) => ({
      ...previous,
      companyProfile: profileKey,
      companyName: challan.companyName || profile.name,
      companyAddress: challan.companyAddress || profile.address,
      companyPhone: challan.companyPhone || profile.phone,
      templateType: challan.templateType || profile.templateType,
      invoiceNo,
      deliveryChallan: challan._id,
      poNo: challan.poNo || order?.poNo || "",
      taxType: order?.taxType || previous.taxType || "without-tax",
      salesTaxRegNo: previous.salesTaxRegNo || profile.salesTaxRegNo,
      nationalTaxNo: previous.nationalTaxNo || profile.nationalTaxNo,
      customerNTN: order?.customerNTN || order?.ntn || "",
      customerSTRN: order?.customerSTRN || order?.strn || "",
      items:
        challan.items?.length > 0
          ? challan.items.map((item, index) => ({
              description: item.description || "",
              size: item.size || "",
              textType: getTextTypeValue(item),
              cartons: item.cartons || "",
              rolls: item.rolls || "",
              packing: item.packing || item.cartons || "",
              quantity: item.quantity || item.netWeight || "",
              unit: item.unit || "Rolls",
              unitPrice: getRateFromSalesOrder(item, index, order),
              grossWeight: item.grossWeight || "",
              netWeight: item.netWeight || "",
            }))
          : [{ ...emptyItem }],
    }));
  };

  const updateItem = (index, field, value) => {
    setForm((previous) => {
      const items = [...previous.items];
      items[index] = { ...items[index], [field]: value };
      return { ...previous, items };
    });
  };

  const addItemRow = () => {
    setForm((previous) => ({
      ...previous,
      items: [...previous.items, { ...emptyItem }],
    }));
  };

  const removeItemRow = (index) => {
    setForm((previous) => ({
      ...previous,
      items:
        previous.items.length === 1
          ? previous.items
          : previous.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const validateForm = () => {
    if (!form.companyProfile) {
      alert("Select a company profile.");
      return false;
    }
    if (!form.invoiceNo.trim()) {
      alert("Invoice number is required.");
      return false;
    }
    if (!form.deliveryChallan) {
      alert("Select a delivery challan.");
      return false;
    }
    if (!form.invoiceDate) {
      alert("Invoice date is required.");
      return false;
    }
    if (form.taxType === "with-tax" && numberValue(form.taxRate) <= 0) {
      alert("Enter a valid sales tax rate.");
      return false;
    }

    const validItems = form.items.filter(
      (item) =>
        String(item.description || "").trim() &&
        numberValue(item.quantity) > 0 &&
        numberValue(item.unitPrice) >= 0
    );

    if (!validItems.length) {
      alert("Add at least one valid invoice item.");
      return false;
    }

    if (numberValue(form.paidAmount) > totals.grandTotal) {
      alert("Paid amount cannot exceed the grand total.");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const validItems = form.items
      .filter(
        (item) =>
          String(item.description || "").trim() &&
          numberValue(item.quantity) > 0 &&
          numberValue(item.unitPrice) >= 0
      )
      .map((item) => ({
        ...item,
        cartons: numberValue(item.cartons),
        rolls: numberValue(item.rolls),
        quantity: numberValue(item.quantity),
        unitPrice: numberValue(item.unitPrice),
        grossWeight: numberValue(item.grossWeight),
        netWeight: numberValue(item.netWeight),
        amount: calculateItemAmount(item),
      }));

    const payload = {
      ...form,
      items: validItems,
      taxRate: form.taxType === "with-tax" ? numberValue(form.taxRate) : 0,
      paidAmount: numberValue(form.paidAmount),
      subtotal: totals.subtotal,
      salesTax: totals.salesTax,
      grandTotal: totals.grandTotal,
      balance: totals.balance,
      amountInWords: amountToWords(totals.grandTotal),
    };

    try {
      setSaving(true);

      const url = editId
        ? `${API_BASE_URL}/invoices/update/${editId}`
        : `${API_BASE_URL}/invoices/add`;

      await apiRequest(url, {
        method: editId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      await Promise.all([fetchInvoices(), fetchChallans(), fetchSalesOrders()]);
      closeForm();
    } catch (error) {
      console.error("Invoice save error:", error);
      alert(error.message || "Invoice could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (invoice) => {
    const profileKey = resolveCompanyProfileKey(invoice);
    const profile = COMPANY_PROFILES[profileKey];

    setEditId(invoice._id);
    setForm({
      ...getDefaultForm(),
      companyProfile: profileKey,
      companyName: invoice.companyName || profile.name,
      companyAddress: invoice.companyAddress || profile.address,
      companyPhone: invoice.companyPhone || profile.phone,
      templateType: invoice.templateType || profile.templateType,
      invoiceNo: invoice.invoiceNo || "",
      deliveryChallan: invoice.deliveryChallan?._id || invoice.deliveryChallan || "",
      invoiceDate: String(invoice.invoiceDate || todayDate()).slice(0, 10),
      dueDate: invoice.dueDate ? String(invoice.dueDate).slice(0, 10) : "",
      poNo: invoice.poNo || "",
      taxType: invoice.taxType || "without-tax",
      taxRate: invoice.taxRate ?? 18,
      salesTaxRegNo: invoice.salesTaxRegNo || profile.salesTaxRegNo,
      nationalTaxNo: invoice.nationalTaxNo || profile.nationalTaxNo,
      customerNTN: invoice.customerNTN || "",
      customerSTRN: invoice.customerSTRN || "",
      paymentTerms: invoice.paymentTerms || "Due on Receipt",
      paidAmount: invoice.paidAmount || "",
      status: invoice.status || "Draft",
      remarks: invoice.remarks || "",
      preparedBy: invoice.preparedBy || "",
      items: invoice.items?.length
        ? invoice.items.map((item) => ({
            ...emptyItem,
            ...item,
            textType: getTextTypeValue(item),
          }))
        : [{ ...emptyItem }],
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this invoice?")) return;

    try {
      await apiRequest(`${API_BASE_URL}/invoices/delete/${id}`, {
        method: "DELETE",
      });
      await Promise.all([fetchInvoices(), fetchChallans(), fetchSalesOrders()]);
    } catch (error) {
      alert(error.message || "Invoice could not be deleted.");
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await Promise.all([fetchInvoices(), fetchChallans(), fetchSalesOrders()]);
    } finally {
      setRefreshing(false);
    }
  };

  const buildPrintData = (invoice) => {
    const profile = getCompanyProfile(invoice);
    const taxRate = invoice.taxType === "with-tax" ? numberValue(invoice.taxRate || 18) : 0;
    const rows = (invoice.items || []).map((item) => {
      const amount = numberValue(item.amount) || calculateItemAmount(item);
      const tax = amount * (taxRate / 100);
      return { ...item, amount, tax, total: amount + tax };
    });

    const subtotal = numberValue(invoice.subtotal) || rows.reduce((sum, item) => sum + item.amount, 0);
    const salesTax =
      invoice.taxType === "with-tax"
        ? numberValue(invoice.salesTax) || rows.reduce((sum, item) => sum + item.tax, 0)
        : 0;
    const grandTotal = numberValue(invoice.grandTotal) || subtotal + salesTax;
    const paidAmount = numberValue(invoice.paidAmount);
    const balance = Math.max(numberValue(invoice.balance) || grandTotal - paidAmount, 0);

    return {
      profile,
      taxRate,
      rows,
      subtotal,
      salesTax,
      grandTotal,
      paidAmount,
      balance,
    };
  };

  const printTopicalInvoice = (invoice, printData) => {
    const { profile, taxRate, rows, subtotal, salesTax, grandTotal, paidAmount, balance } = printData;
    const isTaxInvoice = invoice.taxType === "with-tax";

    const itemRows = rows
      .map(
        (item, index) => `
          <tr>
            <td class="center">${index + 1}</td>
            <td>
              <div class="strong">${safeText(item.description)}</div>
              ${item.size ? `<div class="muted">${safeText(item.size)}</div>` : ""}
              ${getTextTypeValue(item) ? `<div class="muted">${getTextTypeValue(item) === "with-text" ? "With Text / Printed" : "Without Text"}</div>` : ""}
            </td>
            <td class="center">${numberValue(item.cartons) || ""}</td>
            <td class="center">${numberValue(item.rolls) || ""}</td>
            <td class="right">${numberValue(item.quantity).toLocaleString("en-PK")}</td>
            <td class="center">${safeText(item.unit || "")}</td>
            <td class="right">${numberValue(item.unitPrice).toLocaleString("en-PK")}</td>
            <td class="right">${numberValue(item.amount).toLocaleString("en-PK")}</td>
            ${isTaxInvoice ? `<td class="right">${numberValue(item.tax).toLocaleString("en-PK")}</td><td class="right strong">${numberValue(item.total).toLocaleString("en-PK")}</td>` : ""}
          </tr>
        `
      )
      .join("");

    const printWindow = window.open("", "_blank", "width=1200,height=850");
    if (!printWindow) {
      alert("Allow browser popups to print the invoice.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>${safeText(invoice.invoiceNo || "Invoice")}</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; color: #111827; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page { min-height: 190mm; display: flex; flex-direction: column; }
            .header { display: grid; grid-template-columns: 1fr 260px; gap: 18px; align-items: start; padding-bottom: 10px; border-bottom: 3px solid #172554; }
            h1 { margin: 0; color: #172554; font-size: 26px; letter-spacing: .5px; }
            .company p { margin: 4px 0 0; color: #475569; }
            .title-box { border: 1.5px solid #172554; border-radius: 7px; overflow: hidden; }
            .title { background: #172554; color: white; text-align: center; font-weight: 900; font-size: 14px; padding: 8px; letter-spacing: .5px; }
            .doc-row { display: flex; justify-content: space-between; gap: 12px; padding: 6px 9px; border-top: 1px solid #cbd5e1; }
            .doc-row span { color: #64748b; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 12px 0; }
            .box { border: 1px solid #64748b; border-radius: 6px; overflow: hidden; }
            .box-title { background: #e2e8f0; color: #172554; font-weight: 900; padding: 6px 9px; text-transform: uppercase; }
            .box-body { padding: 8px 10px; min-height: 88px; }
            .field { display: grid; grid-template-columns: 130px 1fr; gap: 8px; margin: 4px 0; }
            .field label { color: #64748b; font-weight: 700; }
            .field div { font-weight: 700; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid #334155; padding: 6px 5px; vertical-align: top; }
            th { background: #172554; color: #fff; font-size: 9px; text-align: center; text-transform: uppercase; }
            .center { text-align: center; }
            .right { text-align: right; }
            .strong { font-weight: 800; }
            .muted { margin-top: 2px; color: #64748b; font-size: 9px; }
            .bottom { display: grid; grid-template-columns: 1fr 330px; gap: 16px; margin-top: 12px; }
            .notes { border: 1px solid #94a3b8; border-radius: 6px; padding: 9px; min-height: 92px; }
            .words { margin-top: 10px; padding-top: 8px; border-top: 1px solid #cbd5e1; font-weight: 800; }
            .totals { border: 1px solid #64748b; border-radius: 6px; overflow: hidden; }
            .total-row { display: flex; justify-content: space-between; gap: 15px; padding: 7px 9px; border-bottom: 1px solid #cbd5e1; }
            .total-row:last-child { border: 0; }
            .grand { background: #e2e8f0; font-size: 13px; font-weight: 900; }
            .footer { margin-top: auto; padding-top: 30px; display: flex; justify-content: space-between; gap: 50px; }
            .sign { width: 220px; border-top: 1px solid #111827; padding-top: 6px; text-align: center; font-weight: 700; }
          </style>
        </head>
        <body>
          <section class="page">
            <header class="header">
              <div class="company">
                <h1>${safeText(invoice.companyName || profile.name)}</h1>
                <p>${safeText(invoice.companyAddress || profile.address)}</p>
                <p>${safeText(invoice.companyPhone || profile.phone)}</p>
                ${isTaxInvoice ? `<p><strong>Sales Tax Reg #:</strong> ${safeText(invoice.salesTaxRegNo || profile.salesTaxRegNo || "-")} &nbsp; | &nbsp; <strong>National Tax #:</strong> ${safeText(invoice.nationalTaxNo || profile.nationalTaxNo || "-")}</p>` : ""}
              </div>
              <div class="title-box">
                <div class="title">${isTaxInvoice ? "SALES TAX INVOICE" : "COMMERCIAL INVOICE"}</div>
                <div class="doc-row"><span>Invoice No.</span><strong>${safeText(invoice.invoiceNo || "")}</strong></div>
                <div class="doc-row"><span>Date</span><strong>${safeText(formatDate(invoice.invoiceDate))}</strong></div>
                <div class="doc-row"><span>Payment Status</span><strong>${safeText(getPaymentStatus(invoice))}</strong></div>
              </div>
            </header>

            <div class="details">
              <div class="box">
                <div class="box-title">Customer Details</div>
                <div class="box-body">
                  <div class="field"><label>Customer / M/S</label><div>${safeText(invoice.customerName || "")}</div></div>
                  <div class="field"><label>Address</label><div>${safeText(invoice.customerAddress || "")}</div></div>
                  <div class="field"><label>Phone</label><div>${safeText(invoice.customerPhone || "")}</div></div>
                  ${isTaxInvoice ? `<div class="field"><label>Customer NTN</label><div>${safeText(invoice.customerNTN || "-")}</div></div><div class="field"><label>Customer STRN</label><div>${safeText(invoice.customerSTRN || "-")}</div></div>` : ""}
                </div>
              </div>
              <div class="box">
                <div class="box-title">Invoice References</div>
                <div class="box-body">
                  <div class="field"><label>Delivery Challan</label><div>${safeText(invoice.challanNo || "-")}</div></div>
                  <div class="field"><label>Sales Order</label><div>${safeText(invoice.salesOrderNo || "-")}</div></div>
                  <div class="field"><label>PO Number</label><div>${safeText(invoice.poNo || "-")}</div></div>
                  <div class="field"><label>Payment Terms</label><div>${safeText(invoice.paymentTerms || "Due on Receipt")}</div></div>
                  <div class="field"><label>Due Date</label><div>${safeText(formatDate(invoice.dueDate))}</div></div>
                </div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width:35px">Sr.</th>
                  <th>Description</th>
                  <th style="width:60px">Cartons</th>
                  <th style="width:55px">Rolls</th>
                  <th style="width:72px">Quantity</th>
                  <th style="width:55px">Unit</th>
                  <th style="width:82px">Unit Price</th>
                  <th style="width:95px">Value Excl. Tax</th>
                  ${isTaxInvoice ? `<th style="width:82px">Tax ${taxRate}%</th><th style="width:95px">Total</th>` : ""}
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>

            <div class="bottom">
              <div class="notes">
                <strong>Remarks</strong>
                <div style="margin-top:6px">${safeText(invoice.remarks || "")}</div>
                <div class="words">Amount in Words: ${safeText(invoice.amountInWords || amountToWords(grandTotal))}</div>
              </div>
              <div class="totals">
                <div class="total-row"><span>Subtotal</span><strong>${money(subtotal)}</strong></div>
                ${isTaxInvoice ? `<div class="total-row"><span>Sales Tax ${taxRate}%</span><strong>${money(salesTax)}</strong></div>` : ""}
                <div class="total-row grand"><span>Grand Total</span><strong>${money(grandTotal)}</strong></div>
                <div class="total-row"><span>Paid Amount</span><strong>${money(paidAmount)}</strong></div>
                <div class="total-row"><span>Balance</span><strong>${money(balance)}</strong></div>
              </div>
            </div>

            <div class="footer">
              <div class="sign">Prepared By</div>
              <div class="sign">Authorized Signature</div>
            </div>
          </section>
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const printAlKaramInvoice = (invoice, printData) => {
    const { profile, taxRate, rows, subtotal, salesTax, grandTotal, paidAmount, balance } = printData;
    const isTaxInvoice = invoice.taxType === "with-tax";

    const itemRows = rows
      .map(
        (item, index) => `
          <tr>
            <td class="center">${index + 1}</td>
            <td>
              <strong>${safeText(item.description)}</strong>
              ${item.size ? `<div class="small">${safeText(item.size)}</div>` : ""}
              ${getTextTypeValue(item) ? `<div class="small">${getTextTypeValue(item) === "with-text" ? "With Text / Printed" : "Without Text"}</div>` : ""}
            </td>
            <td class="center">${safeText(item.packing || item.cartons || "")}</td>
            <td class="right">${numberValue(item.quantity).toLocaleString("en-PK")}</td>
            <td class="center">${safeText(item.unit || "")}</td>
            <td class="right">${numberValue(item.unitPrice).toLocaleString("en-PK")}</td>
            <td class="right strong">${numberValue(item.amount).toLocaleString("en-PK")}</td>
          </tr>
        `
      )
      .join("");

    const emptyRows = Array.from({ length: Math.max(8 - rows.length, 0) })
      .map(() => `<tr class="empty"><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`)
      .join("");

    const printWindow = window.open("", "_blank", "width=950,height=900");
    if (!printWindow) {
      alert("Allow browser popups to print the invoice.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>${safeText(invoice.invoiceNo || "Invoice")}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; color: #111; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page { min-height: 270mm; display: flex; flex-direction: column; }
            .company { text-align: center; border-bottom: 2px solid #111; padding-bottom: 9px; }
            .company h1 { margin: 0; font-size: 27px; letter-spacing: .7px; }
            .company p { margin: 4px 0 0; }
            .title { margin: 13px 0; text-align: center; font-size: 19px; font-weight: 900; text-decoration: underline; }
            .head-grid { display: grid; grid-template-columns: 1fr 215px; gap: 18px; margin-bottom: 12px; line-height: 1.7; }
            .document { border-left: 1px solid #111; padding-left: 16px; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid #111; padding: 7px 6px; vertical-align: top; }
            th { background: #eee; text-align: center; font-size: 10px; font-weight: 900; }
            .center { text-align: center; }
            .right { text-align: right; }
            .strong { font-weight: 800; }
            .small { margin-top: 3px; font-size: 9px; color: #444; }
            .empty td { height: 31px; }
            .summary { margin-top: 13px; margin-left: auto; width: 340px; border: 1px solid #111; }
            .summary-row { display: flex; justify-content: space-between; gap: 15px; padding: 7px 9px; border-bottom: 1px solid #111; }
            .summary-row:last-child { border-bottom: 0; }
            .grand { font-size: 14px; font-weight: 900; background: #eee; }
            .words { margin-top: 9px; border: 1px solid #111; padding: 8px; font-weight: 700; }
            .remarks { margin-top: 12px; min-height: 65px; border: 1px solid #111; padding: 8px; }
            .footer { margin-top: auto; padding-top: 42px; display: flex; justify-content: flex-end; }
            .sign { width: 220px; border-top: 1px solid #111; padding-top: 6px; text-align: center; font-weight: 700; }
          </style>
        </head>
        <body>
          <section class="page">
            <div class="company">
              <h1>${safeText(invoice.companyName || profile.name)}</h1>
              <p>${safeText(invoice.companyAddress || profile.address)}</p>
              <p>${safeText(invoice.companyPhone || profile.phone)}</p>
              ${isTaxInvoice ? `<p><strong>Sales Tax Reg #:</strong> ${safeText(invoice.salesTaxRegNo || "-")} &nbsp; | &nbsp; <strong>National Tax #:</strong> ${safeText(invoice.nationalTaxNo || "-")}</p>` : ""}
            </div>

            <div class="title">${isTaxInvoice ? "SALES TAX INVOICE" : "COMMERCIAL INVOICE"}</div>

            <div class="head-grid">
              <div>
                <strong>Customer / M/S:</strong> ${safeText(invoice.customerName || "")}<br />
                <strong>Address:</strong> ${safeText(invoice.customerAddress || "")}<br />
                <strong>Phone:</strong> ${safeText(invoice.customerPhone || "")}<br />
                ${isTaxInvoice ? `<strong>Customer NTN:</strong> ${safeText(invoice.customerNTN || "-")}<br /><strong>Customer STRN:</strong> ${safeText(invoice.customerSTRN || "-")}` : ""}
              </div>
              <div class="document">
                <strong>Invoice No:</strong> ${safeText(invoice.invoiceNo || "")}<br />
                <strong>Dated:</strong> ${safeText(formatDate(invoice.invoiceDate))}<br />
                <strong>DC No:</strong> ${safeText(invoice.challanNo || "-")}<br />
                <strong>PO No:</strong> ${safeText(invoice.poNo || "-")}<br />
                <strong>Sales Order:</strong> ${safeText(invoice.salesOrderNo || "-")}
              </div>
            </div>

            <table>
              <colgroup>
                <col style="width:42px" />
                <col />
                <col style="width:80px" />
                <col style="width:78px" />
                <col style="width:60px" />
                <col style="width:92px" />
                <col style="width:105px" />
              </colgroup>
              <thead>
                <tr>
                  <th>Sr. No.</th>
                  <th>Description</th>
                  <th>Packing</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>Unit Price</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>${itemRows}${emptyRows}</tbody>
            </table>

            <div class="summary">
              <div class="summary-row"><span>Subtotal</span><strong>${money(subtotal)}</strong></div>
              ${isTaxInvoice ? `<div class="summary-row"><span>Sales Tax ${taxRate}%</span><strong>${money(salesTax)}</strong></div>` : ""}
              <div class="summary-row grand"><span>Grand Total</span><strong>${money(grandTotal)}</strong></div>
              <div class="summary-row"><span>Advance / Paid</span><strong>${money(paidAmount)}</strong></div>
              <div class="summary-row"><span>Balance</span><strong>${money(balance)}</strong></div>
            </div>

            <div class="words">${safeText(invoice.amountInWords || amountToWords(grandTotal))}</div>
            <div class="remarks"><strong>Remarks:</strong><div style="margin-top:6px">${safeText(invoice.remarks || "")}</div></div>

            <div class="footer"><div class="sign">For Company</div></div>
          </section>
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const printInvoice = (invoice) => {
    const printData = buildPrintData(invoice);
    if (printData.profile.key === "alKaram") {
      printAlKaramInvoice(invoice, printData);
      return;
    }
    printTopicalInvoice(invoice, printData);
  };

  if (showForm) {
    const activeProfile = form.companyProfile
      ? COMPANY_PROFILES[form.companyProfile]
      : null;

    return (
      <div className="w-full space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <button
                type="button"
                onClick={closeForm}
                className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
              >
                <ArrowLeft size={17} />
                Back to Invoices
              </button>
              <h1 className="text-2xl font-bold text-slate-900">
                {editId ? "Edit Invoice" : "New Invoice"}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Create a professional commercial or sales tax invoice from a delivery challan.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium transition hover:bg-slate-50"
            >
              <X size={18} />
              Cancel
            </button>
          </div>

          <div className="space-y-7 pt-6">
            <section>
              <div className="mb-4">
                <h2 className="font-bold text-slate-900">Company and Invoice Details</h2>
                <p className="text-xs text-slate-500">
                  Select the issuing company, delivery challan, tax type, and invoice status.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <RequiredLabel>Company Profile</RequiredLabel>
                  <select
                    value={form.companyProfile}
                    onChange={(event) => handleCompanyChange(event.target.value)}
                    disabled={!!editId || !!form.deliveryChallan}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">Select Company Profile</option>
                    {PROFILE_OPTIONS.map((profile) => (
                      <option key={profile.key} value={profile.key}>
                        {profile.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <RequiredLabel>Delivery Challan</RequiredLabel>
                  <select
                    value={form.deliveryChallan}
                    onChange={(event) => handleChallanChange(event.target.value)}
                    disabled={!form.companyProfile || !!editId}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">
                      {!form.companyProfile
                        ? "Select Company First"
                        : "Select Delivery Challan"}
                    </option>
                    {availableChallans.map((challan) => (
                      <option key={challan._id} value={challan._id}>
                        {challan.challanNo} - {challan.customerName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <RequiredLabel>Invoice No</RequiredLabel>
                  <input
                    value={form.invoiceNo}
                    readOnly
                    className="mt-1 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 font-semibold text-slate-700"
                    placeholder="TP-INV-0001"
                  />
                </div>

                <div>
                  <RequiredLabel>Invoice Date</RequiredLabel>
                  <input
                    type="date"
                    value={form.invoiceDate}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        invoiceDate: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <NormalLabel>Due Date</NormalLabel>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        dueDate: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <NormalLabel>PO Number</NormalLabel>
                  <input
                    value={form.poNo}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        poNo: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                    placeholder="Customer PO Number"
                  />
                </div>

                <div>
                  <RequiredLabel>Invoice Type</RequiredLabel>
                  <select
                    value={form.taxType}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        taxType: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-blue-500"
                  >
                    <option value="without-tax">Commercial Invoice - Without Tax</option>
                    <option value="with-tax">Sales Tax Invoice</option>
                  </select>
                </div>

                <div>
                  <RequiredLabel>Status</RequiredLabel>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        status: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-blue-500"
                  >
                    <option>Draft</option>
                    <option>Issued</option>
                    <option>Paid</option>
                    <option>Cancelled</option>
                  </select>
                </div>
              </div>
            </section>

            {activeProfile && (
              <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="text-xs text-blue-600">Issuing Company</p>
                    <p className="mt-1 font-bold text-blue-950">{form.companyName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600">Print Template</p>
                    <p className="mt-1 font-bold capitalize text-blue-950">
                      {activeProfile.templateType} Format
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600">Delivery Challan</p>
                    <p className="mt-1 font-bold text-blue-950">
                      {selectedChallan?.challanNo || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600">Sales Order</p>
                    <p className="mt-1 font-bold text-blue-950">
                      {selectedChallan?.salesOrderNo || "-"}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {form.taxType === "with-tax" && (
              <section>
                <div className="mb-4">
                  <h2 className="font-bold text-slate-900">Tax Information</h2>
                  <p className="text-xs text-slate-500">
                    Seller and customer tax details shown on the sales tax invoice.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <div>
                    <RequiredLabel>Sales Tax Rate</RequiredLabel>
                    <div className="relative mt-1">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.taxRate}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            taxRate: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 pr-9 outline-none focus:border-blue-500"
                      />
                      <span className="absolute right-3 top-2.5 text-sm text-slate-500">%</span>
                    </div>
                  </div>

                  <div>
                    <NormalLabel>Seller Sales Tax Reg #</NormalLabel>
                    <input
                      value={form.salesTaxRegNo}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          salesTaxRegNo: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <NormalLabel>Seller National Tax #</NormalLabel>
                    <input
                      value={form.nationalTaxNo}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          nationalTaxNo: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <NormalLabel>Customer NTN</NormalLabel>
                    <input
                      value={form.customerNTN}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          customerNTN: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                      placeholder="Customer NTN"
                    />
                  </div>

                  <div>
                    <NormalLabel>Customer STRN</NormalLabel>
                    <input
                      value={form.customerSTRN}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          customerSTRN: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                      placeholder="Customer STRN"
                    />
                  </div>
                </div>
              </section>
            )}

            {selectedChallan && (
              <section>
                <div className="mb-4">
                  <h2 className="font-bold text-slate-900">Customer Information</h2>
                  <p className="text-xs text-slate-500">
                    Customer details are loaded from the selected delivery challan.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="text-xs text-slate-500">Customer / M/S</p>
                    <p className="mt-1 font-bold text-slate-900">
                      {selectedChallan.customerName || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Phone</p>
                    <p className="mt-1 font-bold text-slate-900">
                      {selectedChallan.customerPhone || "-"}
                    </p>
                  </div>
                  <div className="xl:col-span-2">
                    <p className="text-xs text-slate-500">Address</p>
                    <p className="mt-1 font-bold text-slate-900">
                      {selectedChallan.customerAddress || "-"}
                    </p>
                  </div>
                </div>
              </section>
            )}

            <section className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">Invoice Items</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Quantity is loaded from the delivery challan and rates are loaded from the sales order.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addItemRow}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <Plus size={16} />
                  Add Row
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: "1380px" }}>
                  <thead>
                    <tr className="border-b bg-white text-xs text-slate-600">
                      <th className="w-[48px] p-3 text-center">Sr.</th>
                      <th className="p-3 text-left">Description</th>
                      <th className="p-3 text-left">Size</th>
                      <th className="p-3 text-left">Text</th>
                      <th className="p-3 text-left">Packing</th>
                      <th className="p-3 text-left">Cartons</th>
                      <th className="p-3 text-left">Rolls</th>
                      <th className="p-3 text-left">Quantity</th>
                      <th className="p-3 text-left">Unit</th>
                      <th className="p-3 text-left">Unit Price</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>

                  <tbody>
                    {form.items.length === 0 ? (
                      <tr>
                        <td colSpan="12" className="p-10 text-center text-slate-500">
                          Select a delivery challan to load invoice items.
                        </td>
                      </tr>
                    ) : (
                      form.items.map((item, index) => (
                        <tr key={index} className="border-b border-slate-100 align-top">
                          <td className="p-3 text-center font-bold text-slate-500">
                            {index + 1}
                          </td>
                          <td className="min-w-[230px] p-2">
                            <input
                              value={item.description}
                              onChange={(event) => updateItem(index, "description", event.target.value)}
                              className="w-full rounded border border-slate-200 px-2.5 py-2 outline-none focus:border-blue-500"
                              placeholder="Aluminium Foil Printed"
                            />
                          </td>
                          <td className="min-w-[120px] p-2">
                            <input
                              value={item.size}
                              onChange={(event) => updateItem(index, "size", event.target.value)}
                              className="w-full rounded border border-slate-200 px-2.5 py-2 outline-none focus:border-blue-500"
                              placeholder="140mm"
                            />
                          </td>
                          <td className="min-w-[130px] p-2">
                            <select
                              value={item.textType || ""}
                              onChange={(event) => updateItem(index, "textType", event.target.value)}
                              className="w-full rounded border border-slate-200 bg-white px-2.5 py-2 outline-none focus:border-blue-500"
                            >
                              <option value="">No Label</option>
                              <option value="with-text">With Text</option>
                              <option value="without-text">Without Text</option>
                            </select>
                          </td>
                          <td className="min-w-[95px] p-2">
                            <input
                              value={item.packing}
                              onChange={(event) => updateItem(index, "packing", event.target.value)}
                              className="w-full rounded border border-slate-200 px-2.5 py-2 outline-none focus:border-blue-500"
                              placeholder="4"
                            />
                          </td>
                          <td className="min-w-[90px] p-2">
                            <input
                              type="number"
                              min="0"
                              value={item.cartons}
                              onChange={(event) => updateItem(index, "cartons", event.target.value)}
                              className="w-full rounded border border-slate-200 px-2.5 py-2 outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="min-w-[90px] p-2">
                            <input
                              type="number"
                              min="0"
                              value={item.rolls}
                              onChange={(event) => updateItem(index, "rolls", event.target.value)}
                              className="w-full rounded border border-slate-200 px-2.5 py-2 outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="min-w-[110px] p-2">
                            <input
                              type="number"
                              min="0"
                              step="0.001"
                              value={item.quantity}
                              onChange={(event) => updateItem(index, "quantity", event.target.value)}
                              className="w-full rounded border border-slate-200 px-2.5 py-2 outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="min-w-[90px] p-2">
                            <input
                              value={item.unit}
                              onChange={(event) => updateItem(index, "unit", event.target.value)}
                              className="w-full rounded border border-slate-200 px-2.5 py-2 outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="min-w-[120px] p-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(event) => updateItem(index, "unitPrice", event.target.value)}
                              className="w-full rounded border border-slate-200 px-2.5 py-2 outline-none focus:border-blue-500"
                              placeholder="2300"
                            />
                          </td>
                          <td className="min-w-[130px] p-3 text-right font-bold text-slate-900">
                            {money(calculateItemAmount(item))}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeItemRow(index)}
                              className="rounded-lg bg-red-50 p-2.5 text-red-600 transition hover:bg-red-100"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_390px]">
              <div className="space-y-4">
                <div>
                  <NormalLabel>Payment Terms</NormalLabel>
                  <input
                    value={form.paymentTerms}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        paymentTerms: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                    placeholder="Due on Receipt"
                  />
                </div>

                <div>
                  <NormalLabel>Prepared By</NormalLabel>
                  <input
                    value={form.preparedBy}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        preparedBy: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                    placeholder="Prepared by name"
                  />
                </div>

                <div>
                  <NormalLabel>Remarks</NormalLabel>
                  <textarea
                    value={form.remarks}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        remarks: event.target.value,
                      }))
                    }
                    className="mt-1 min-h-[130px] w-full resize-y rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                    placeholder="Payment instructions or invoice notes..."
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="mb-4 font-bold text-slate-900">Invoice Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-slate-200 pb-3">
                    <span className="text-slate-600">Subtotal</span>
                    <b>{money(totals.subtotal)}</b>
                  </div>

                  {form.taxType === "with-tax" && (
                    <div className="flex justify-between border-b border-slate-200 pb-3">
                      <span className="text-slate-600">
                        Sales Tax {numberValue(form.taxRate)}%
                      </span>
                      <b>{money(totals.salesTax)}</b>
                    </div>
                  )}

                  <div className="flex justify-between border-b border-slate-200 pb-3 text-lg">
                    <span className="font-semibold text-slate-800">Grand Total</span>
                    <b className="text-blue-700">{money(totals.grandTotal)}</b>
                  </div>

                  <div>
                    <NormalLabel>Paid Amount</NormalLabel>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.paidAmount}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          paidAmount: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>

                  <div className="flex justify-between border-t border-slate-200 pt-3">
                    <span className="font-semibold text-slate-700">Balance</span>
                    <b className="text-red-600">{money(totals.balance)}</b>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">
                    <strong className="text-slate-800">Amount in Words:</strong>
                    <div className="mt-1">{amountToWords(totals.grandTotal)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl border border-slate-200 px-5 py-2.5 font-medium transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {saving ? "Saving..." : editId ? "Update Invoice" : "Save Invoice"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Receipt className="text-blue-600" size={26} />
            Invoices
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage commercial and sales tax invoices for both company profiles.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewForm}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus size={18} />
          New Invoice
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total Invoices" value={dashboardStats.count} icon={FileText} note="All invoice records" />
        <StatCard title="Invoice Value" value={money(dashboardStats.value)} icon={BadgeDollarSign} note="Total invoiced amount" />
        <StatCard title="Sales Tax" value={money(dashboardStats.tax)} icon={Landmark} note="Tax charged on invoices" />
        <StatCard title="Amount Received" value={money(dashboardStats.paid)} icon={CreditCard} note="Recorded payments" />
        <StatCard title="Receivable" value={money(dashboardStats.receivable)} icon={Receipt} note="Outstanding balance" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Invoice List</h2>
            <p className="mt-1 text-xs text-slate-500">
              Company-specific records, tax types, payments, and print templates.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <div className="relative">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full min-w-[270px] rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
                placeholder="Search invoice, customer, challan..."
              />
            </div>

            <select
              value={companyFilter}
              onChange={(event) => setCompanyFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="All">All Companies</option>
              <option value="topical">Topical Packaging</option>
              <option value="alKaram">Al-Karam Traders</option>
            </select>

            <select
              value={taxFilter}
              onChange={(event) => setTaxFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="All">All Invoice Types</option>
              <option value="without-tax">Without Tax</option>
              <option value="with-tax">Sales Tax</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Issued">Issued</option>
              <option value="Paid">Paid</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCcw size={16} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: "1450px" }}>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="w-[55px] px-4 py-3 text-center">Sr.</th>
                <th className="px-4 py-3 text-left">Invoice No</th>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Challan</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-center">Invoice Type</th>
                <th className="px-4 py-3 text-right">Grand Total</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 text-center">Payment</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="12" className="px-4 py-16 text-center">
                    <Loader2 size={24} className="mx-auto animate-spin text-blue-600" />
                    <p className="mt-3 text-sm text-slate-500">Loading invoices...</p>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="12" className="px-4 py-16 text-center">
                    <Receipt size={36} className="mx-auto text-slate-300" />
                    <p className="mt-3 font-medium text-slate-600">No Invoices Found</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Change the filters or create a new invoice.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice, index) => {
                  const profile = getCompanyProfile(invoice);
                  const paymentStatus = getPaymentStatus(invoice);

                  return (
                    <tr
                      key={invoice._id || `${invoice.invoiceNo}-${index}`}
                      className="border-b border-slate-100 transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 text-center font-bold text-slate-500">
                        {index + 1}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-900">{invoice.invoiceNo || "-"}</div>
                        {invoice.poNo && <div className="mt-1 text-xs text-slate-400">PO: {invoice.poNo}</div>}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            profile.key === "alKaram"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-indigo-100 text-indigo-700"
                          }`}
                        >
                          {profile.shortName}
                        </span>
                        <div className="mt-1 text-xs text-slate-400 capitalize">
                          {profile.templateType} Format
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-800">{invoice.customerName || "-"}</div>
                        <div className="mt-1 text-xs text-slate-400">{invoice.customerPhone || ""}</div>
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-700">{invoice.challanNo || "-"}</td>
                      <td className="px-4 py-4 text-slate-600">{formatDate(invoice.invoiceDate)}</td>
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            invoice.taxType === "with-tax"
                              ? "bg-violet-100 text-violet-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {invoice.taxType === "with-tax" ? "Sales Tax" : "Without Tax"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-slate-900">
                        {money(invoice.grandTotal)}
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-red-600">
                        {money(invoice.balance)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          <CreditCard size={13} />
                          {paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(invoice.status)}`}>
                          {invoice.status || "Draft"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => printInvoice(invoice)}
                            className="rounded-lg bg-slate-100 p-2 text-slate-700 transition hover:bg-slate-200"
                            title="Print Invoice"
                          >
                            <Printer size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(invoice)}
                            className="rounded-lg bg-blue-50 p-2 text-blue-700 transition hover:bg-blue-100"
                            title="Edit Invoice"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(invoice._id)}
                            className="rounded-lg bg-red-50 p-2 text-red-700 transition hover:bg-red-100"
                            title="Delete Invoice"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredInvoices.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {filteredInvoices.length} of {invoices.length} invoices
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 size={14} className="text-emerald-500" />
              Company-specific print formats and sequential row numbering enabled
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Invoices;
