import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Boxes,
  Building2,
  CheckCircle2,
  ClipboardList,
  Edit2,
  FileText,
  Loader2,
  Package,
  Plus,
  Printer,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  Truck,
  Weight,
  X,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

/*
|--------------------------------------------------------------------------
| Company Profiles
|--------------------------------------------------------------------------
*/

const COMPANY_PROFILES = {
  topical: {
    key: "topical",
    name: "TOPICAL PACKAGING PVT. LTD.",
    shortName: "Topical Packaging",
    codePrefix: "TP-DC",
    templateType: "detailed",
    address: "21-Km, Ferozepur Road, Lahore, Pakistan",
    phone: "+92 321 9970676",
    subtitle: "Professional detailed delivery challan",
  },

  alKaram: {
    key: "alKaram",
    name: "AL-KARAM TRADERS",
    shortName: "Al-Karam Traders",
    codePrefix: "AK-DC",
    templateType: "compact",
    address: "Office #17, 3rd Floor, Gohar Centre, Wahdat Road, Lahore",
    phone: "0423 5912858 | 0333 8295065",
    subtitle: "Professional compact delivery challan",
  },
};

const PROFILE_OPTIONS = Object.values(COMPANY_PROFILES);

/*
|--------------------------------------------------------------------------
| General Helpers
|--------------------------------------------------------------------------
*/

const todayDate = () => new Date().toISOString().slice(0, 10);
const numberValue = (value) => Number(value || 0);

const safeText = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return date.toLocaleDateString("en-GB");
};

const formatWeight = (value) => {
  const amount = numberValue(value);

  return amount.toLocaleString("en-PK", {
    maximumFractionDigits: 3,
  });
};

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
        ? {
            "Content-Type": "application/json",
          }
        : {}),
      ...headers,
    },
  });

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const responseText = await response.text();

    console.error("Delivery Challan API returned non-JSON:", {
      url,
      status: response.status,
      contentType,
      response: responseText.slice(0, 300),
    });

    throw new Error(
      `The API returned an invalid response. Status: ${response.status}`
    );
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || "Request failed");
  }

  return data;
};

const getItemId = (value) => {
  if (!value) return "";

  if (typeof value === "object" && value._id) {
    return value._id;
  }

  return value;
};

const getCustomerName = (challan) =>
  challan?.customerName ||
  challan?.customer?.name ||
  challan?.salesOrder?.customerName ||
  "-";

const getCustomerAddress = (challan) =>
  challan?.deliveryAddress ||
  challan?.customerAddress ||
  challan?.customer?.address ||
  challan?.salesOrder?.customerAddress ||
  "";

const getCustomerPhone = (challan) =>
  challan?.contactPhone ||
  challan?.customerPhone ||
  challan?.customer?.phone ||
  challan?.salesOrder?.customerPhone ||
  "";

const inferCompanyProfile = (challan) => {
  if (COMPANY_PROFILES[challan?.companyProfile]) {
    return challan.companyProfile;
  }

  const challanNo = String(challan?.challanNo || "").toUpperCase();

  if (challanNo.startsWith("AK-DC")) {
    return "alKaram";
  }

  return "topical";
};

const getCompanyProfile = (challan) =>
  COMPANY_PROFILES[inferCompanyProfile(challan)];

const extractChallanSequence = (challanNo) => {
  const matches = String(challanNo || "").match(/(\d+)(?!.*\d)/);
  return matches ? Number(matches[1]) : 0;
};

const formatChallanNumber = (profileKey, sequence) => {
  const profile = COMPANY_PROFILES[profileKey];
  const safeSequence = Math.max(numberValue(sequence), 1);

  return `${profile.codePrefix}-${String(safeSequence).padStart(4, "0")}`;
};

/*
|--------------------------------------------------------------------------
| Form Data
|--------------------------------------------------------------------------
*/

const emptyItem = {
  item: "",
  salesOrderItemId: "",
  warehouse: "Main Godown",

  description: "",
  size: "",
  textType: "",

  orderedQty: 0,
  alreadyDeliveredQty: 0,
  pendingQty: 0,

  cartons: "",
  rolls: "",
  quantity: "",
  unit: "Rolls",

  grossWeight: "",
  netWeight: "",
  remarks: "",
};

const getDefaultForm = (challanNo = "", companyProfile = "") => ({
  companyProfile,
  challanNo,

  salesOrder: "",
  salesOrderNo: "",

  challanDate: todayDate(),
  dispatchDate: todayDate(),
  receivedDate: "",

  poNo: "",
  referenceNo: "",
  attentionTo: "",

  customerName: "",
  deliveryAddress: "",
  contactPhone: "",

  vehicleNo: "",
  driverName: "",

  preparedBy: "",
  dispatchedBy: "",
  deliveredBy: "",
  receivedBy: "",
  receiverDesignation: "",

  status: "Draft",
  remarks: "",
  items: [],
});

const calculateItemsTotals = (items = []) => ({
  totalCartons: items.reduce(
    (sum, item) => sum + numberValue(item.cartons),
    0
  ),
  totalRolls: items.reduce((sum, item) => sum + numberValue(item.rolls), 0),
  totalQuantity: items.reduce(
    (sum, item) => sum + numberValue(item.quantity),
    0
  ),
  totalGrossWeight: items.reduce(
    (sum, item) => sum + numberValue(item.grossWeight),
    0
  ),
  totalNetWeight: items.reduce(
    (sum, item) => sum + numberValue(item.netWeight),
    0
  ),
});

const calculateChallanTotals = (challan) => {
  const itemTotals = calculateItemsTotals(challan?.items || []);

  return {
    totalCartons:
      challan?.totalCartons !== undefined
        ? numberValue(challan.totalCartons)
        : itemTotals.totalCartons,
    totalRolls:
      challan?.totalRolls !== undefined
        ? numberValue(challan.totalRolls)
        : itemTotals.totalRolls,
    totalQuantity:
      challan?.totalQuantity !== undefined
        ? numberValue(challan.totalQuantity)
        : itemTotals.totalQuantity,
    totalGrossWeight:
      challan?.totalGrossWeight !== undefined
        ? numberValue(challan.totalGrossWeight)
        : itemTotals.totalGrossWeight,
    totalNetWeight:
      challan?.totalNetWeight !== undefined
        ? numberValue(challan.totalNetWeight)
        : itemTotals.totalNetWeight,
  };
};

/*
|--------------------------------------------------------------------------
| Reusable UI
|--------------------------------------------------------------------------
*/

const RequiredLabel = ({ children }) => (
  <label className="flex items-center gap-1 text-xs font-bold text-slate-600">
    {children}
    <AlertCircle size={12} className="text-red-600" />
  </label>
);

const NormalLabel = ({ children }) => (
  <label className="text-xs font-bold text-slate-600">{children}</label>
);

function StatCard({ title, value, note, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          {note && <p className="mt-1 text-xs text-slate-400">{note}</p>}
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

const getStatusClass = (status) => {
  switch (status) {
    case "Dispatched":
      return "bg-blue-100 text-blue-700";
    case "Received":
      return "bg-emerald-100 text-emerald-700";
    case "Cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

const getProfileBadgeClass = (profileKey) =>
  profileKey === "alKaram"
    ? "bg-amber-100 text-amber-800"
    : "bg-indigo-100 text-indigo-800";

/*
|--------------------------------------------------------------------------
| Main Component
|--------------------------------------------------------------------------
*/

const DeliveryChallans = () => {
  const [salesOrders, setSalesOrders] = useState([]);
  const [challans, setChallans] = useState([]);

  const [loading, setLoading] = useState(false);
  const [salesOrderLoading, setSalesOrderLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [companyFilter, setCompanyFilter] = useState("All");

  const [form, setForm] = useState(getDefaultForm());

  const activeProfile = form.companyProfile
    ? COMPANY_PROFILES[form.companyProfile]
    : null;

  /*
  |------------------------------------------------------------------------
  | API Loading
  |------------------------------------------------------------------------
  */

  const fetchSalesOrders = async ({ includeClosed = false } = {}) => {
    try {
      setSalesOrderLoading(true);

      const data = await apiRequest(`${API_BASE_URL}/sales-orders/all`);
      const list = normalizeArray(data, ["salesOrders", "orders"]);

      setSalesOrders(
        includeClosed
          ? list
          : list.filter(
              (order) =>
                !["Cancelled", "Delivered", "Invoiced"].includes(order.status)
            )
      );
    } catch (error) {
      console.error("Sales order loading error:", error);
      setSalesOrders([]);
    } finally {
      setSalesOrderLoading(false);
    }
  };

  const fetchChallans = async () => {
    try {
      setLoading(true);

      const data = await apiRequest(
        `${API_BASE_URL}/delivery-challans/all`
      );

      setChallans(
        normalizeArray(data, ["challans", "deliveryChallans"])
      );
    } catch (error) {
      console.error("Delivery challan loading error:", error);
      alert(error.message || "Delivery challans could not be loaded.");
      setChallans([]);
    } finally {
      setLoading(false);
    }
  };

  const getLocalNextSequence = (profileKey) => {
    const profile = COMPANY_PROFILES[profileKey];

    const sequences = challans
      .filter((challan) => {
        const challanProfile = inferCompanyProfile(challan);
        const challanNo = String(challan.challanNo || "").toUpperCase();

        return (
          challanProfile === profileKey ||
          challanNo.startsWith(profile.codePrefix)
        );
      })
      .map((challan) => extractChallanSequence(challan.challanNo));

    return sequences.length > 0 ? Math.max(...sequences) + 1 : 1;
  };

  const fetchNextNo = async (profileKey) => {
    const localNextSequence = getLocalNextSequence(profileKey);

    try {
      const data = await apiRequest(
        `${API_BASE_URL}/delivery-challans/next-no?companyProfile=${encodeURIComponent(
          profileKey
        )}`
      );

      const serverNumber = data.challanNo || data.deliveryChallanNo || "";
      const serverSequence = extractChallanSequence(serverNumber);

      return formatChallanNumber(
        profileKey,
        serverSequence > 0 ? serverSequence : localNextSequence
      );
    } catch (error) {
      console.warn("Profile challan number fallback used:", error.message);
      return formatChallanNumber(profileKey, localNextSequence);
    }
  };

  useEffect(() => {
    fetchSalesOrders();
    fetchChallans();
  }, []);

  /*
  |------------------------------------------------------------------------
  | Selected Order and Totals
  |------------------------------------------------------------------------
  */

  const selectedOrder = useMemo(
    () => salesOrders.find((order) => order._id === form.salesOrder),
    [salesOrders, form.salesOrder]
  );

  const totals = useMemo(() => calculateItemsTotals(form.items), [form.items]);

  const stats = useMemo(() => {
    return challans.reduce(
      (summary, challan) => {
        const challanTotals = calculateChallanTotals(challan);
        const profileKey = inferCompanyProfile(challan);

        summary.totalChallans += 1;
        summary.totalCartons += challanTotals.totalCartons;
        summary.totalRolls += challanTotals.totalRolls;
        summary.totalNetWeight += challanTotals.totalNetWeight;

        if (["Dispatched", "Received"].includes(challan.status)) {
          summary.dispatched += 1;
        }

        if (profileKey === "topical") summary.topical += 1;
        if (profileKey === "alKaram") summary.alKaram += 1;

        return summary;
      },
      {
        totalChallans: 0,
        totalCartons: 0,
        totalRolls: 0,
        totalNetWeight: 0,
        dispatched: 0,
        topical: 0,
        alKaram: 0,
      }
    );
  }, [challans]);

  const filteredChallans = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return challans
      .filter((challan) => {
        const profileKey = inferCompanyProfile(challan);
        const profile = COMPANY_PROFILES[profileKey];

        const matchesSearch =
          !keyword ||
          String(challan.challanNo || "")
            .toLowerCase()
            .includes(keyword) ||
          String(challan.salesOrderNo || "")
            .toLowerCase()
            .includes(keyword) ||
          getCustomerName(challan).toLowerCase().includes(keyword) ||
          String(challan.poNo || "").toLowerCase().includes(keyword) ||
          profile.name.toLowerCase().includes(keyword) ||
          profile.shortName.toLowerCase().includes(keyword) ||
          challan.items?.some((item) =>
            String(item.description || "").toLowerCase().includes(keyword)
          );

        const matchesStatus =
          statusFilter === "All" || challan.status === statusFilter;

        const matchesCompany =
          companyFilter === "All" || profileKey === companyFilter;

        return matchesSearch && matchesStatus && matchesCompany;
      })
      .sort((first, second) => {
        const firstSequence = extractChallanSequence(first.challanNo);
        const secondSequence = extractChallanSequence(second.challanNo);

        if (firstSequence !== secondSequence) {
          return firstSequence - secondSequence;
        }

        return String(first.challanNo || "").localeCompare(
          String(second.challanNo || "")
        );
      });
  }, [challans, searchTerm, statusFilter, companyFilter]);

  /*
  |------------------------------------------------------------------------
  | Form Open, Close and Company Selection
  |------------------------------------------------------------------------
  */

  const openNewForm = async () => {
    setEditId(null);
    setForm(getDefaultForm());
    setShowForm(true);
    await fetchSalesOrders();
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(getDefaultForm());
  };

  const handleCompanyProfileChange = async (profileKey) => {
    if (!COMPANY_PROFILES[profileKey]) {
      setForm(getDefaultForm());
      return;
    }

    try {
      setProfileLoading(true);

      const nextNo = await fetchNextNo(profileKey);

      setForm(getDefaultForm(nextNo, profileKey));
    } catch (error) {
      alert(error.message || "The company profile could not be loaded.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await Promise.all([fetchChallans(), fetchSalesOrders()]);
    } finally {
      setRefreshing(false);
    }
  };

  /*
  |------------------------------------------------------------------------
  | Sales Order Selection
  |------------------------------------------------------------------------
  */

  const handleSalesOrderChange = (salesOrderId) => {
    const order = salesOrders.find((item) => item._id === salesOrderId);

    if (!order) {
      setForm((previous) => ({
        ...previous,
        salesOrder: "",
        salesOrderNo: "",
        poNo: "",
        customerName: "",
        deliveryAddress: "",
        contactPhone: "",
        attentionTo: "",
        items: [],
      }));

      return;
    }

    const mappedItems = (order.items || [])
      .map((row) => {
        const orderedQty = numberValue(row.quantity);
        const alreadyDeliveredQty = numberValue(row.deliveredQty);

        const pendingQty =
          row.pendingQty !== undefined
            ? numberValue(row.pendingQty)
            : Math.max(orderedQty - alreadyDeliveredQty, 0);

        return {
          item: getItemId(row.item),
          salesOrderItemId: row._id || "",
          warehouse: row.warehouse || "Main Godown",

          description: row.description || row.itemName || "",
          size: row.size || "",
          textType: row.textType || "",

          orderedQty,
          alreadyDeliveredQty,
          pendingQty,

          cartons: row.cartons || "",
          rolls:
            row.rolls ||
            (String(row.unit || "").toLowerCase() === "rolls"
              ? pendingQty
              : ""),
          quantity: pendingQty > 0 ? pendingQty : "",
          unit: row.unit || "Rolls",

          grossWeight: row.grossWeight || "",
          netWeight: row.netWeight || "",
          remarks: row.remarks || "",
        };
      })
      .filter((row) => numberValue(row.pendingQty) > 0);

    setForm((previous) => ({
      ...previous,
      salesOrder: order._id,
      salesOrderNo: order.salesOrderNo || "",
      poNo: order.poNo || "",
      customerName: order.customerName || order.customer?.name || "",
      deliveryAddress:
        order.customerAddress || order.deliveryAddress || order.address || "",
      contactPhone:
        order.customerPhone || order.phone || order.customer?.phone || "",
      attentionTo:
        order.contactPerson || order.attentionTo || order.customerContact || "",
      items: mappedItems,
    }));
  };

  const updateItem = (index, field, value) => {
    setForm((previous) => {
      const updatedItems = [...previous.items];

      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value,
      };

      return {
        ...previous,
        items: updatedItems,
      };
    });
  };

  const removeItemRow = (index) => {
    setForm((previous) => ({
      ...previous,
      items: previous.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  /*
  |------------------------------------------------------------------------
  | Validation and Payload
  |------------------------------------------------------------------------
  */

  const validateForm = () => {
    if (!form.companyProfile) {
      alert("Select a company profile.");
      return false;
    }

    if (!form.challanNo.trim()) {
      alert("Delivery challan number is required.");
      return false;
    }

    if (!form.salesOrder) {
      alert("Select a sales order.");
      return false;
    }

    if (!form.challanDate) {
      alert("Challan date is required.");
      return false;
    }

    const validItems = form.items.filter(
      (item) =>
        item.description?.trim() &&
        numberValue(item.quantity) > 0 &&
        item.item &&
        item.salesOrderItemId
    );

    if (validItems.length === 0) {
      alert("Add at least one valid delivery item.");
      return false;
    }

    const overDelivered = validItems.some(
      (item) =>
        numberValue(item.quantity) > numberValue(item.pendingQty)
    );

    if (overDelivered) {
      alert("Delivery quantity cannot exceed the pending quantity.");
      return false;
    }

    const missingWarehouse = validItems.some(
      (item) => !item.warehouse?.trim()
    );

    if (missingWarehouse) {
      alert("Warehouse is required.");
      return false;
    }

    const invalidWeight = validItems.some(
      (item) =>
        numberValue(item.grossWeight) > 0 &&
        numberValue(item.netWeight) > numberValue(item.grossWeight)
    );

    if (invalidWeight) {
      alert("Net weight cannot exceed gross weight.");
      return false;
    }

    if (form.companyProfile === "topical" && !form.dispatchDate) {
      alert("Dispatch date is required for Topical Packaging.");
      return false;
    }

    return true;
  };

  const buildPayload = () => {
    const profile = COMPANY_PROFILES[form.companyProfile];

    const validItems = form.items
      .filter(
        (item) =>
          item.description?.trim() &&
          numberValue(item.quantity) > 0 &&
          item.item &&
          item.salesOrderItemId
      )
      .map((item) => ({
        item: item.item,
        salesOrderItemId: item.salesOrderItemId,
        warehouse: item.warehouse || "Main Godown",

        description: String(item.description || "").trim(),
        size: String(item.size || "").trim(),
        textType: item.textType || "",

        orderedQty: numberValue(item.orderedQty),
        alreadyDeliveredQty: numberValue(item.alreadyDeliveredQty),
        pendingQty: numberValue(item.pendingQty),

        cartons: numberValue(item.cartons),
        rolls: numberValue(item.rolls),
        quantity: numberValue(item.quantity),
        unit: String(item.unit || "Rolls").trim(),

        grossWeight: numberValue(item.grossWeight),
        netWeight: numberValue(item.netWeight),
        remarks: String(item.remarks || "").trim(),
      }));

    return {
      companyProfile: form.companyProfile,
      companyName: profile.name,
      companyShortName: profile.shortName,
      templateType: profile.templateType,

      challanNo: form.challanNo,
      salesOrder: form.salesOrder,
      salesOrderNo: form.salesOrderNo,

      challanDate: form.challanDate,
      dispatchDate:
        form.companyProfile === "topical"
          ? form.dispatchDate
          : form.challanDate,
      receivedDate: form.receivedDate,

      poNo: form.poNo,
      referenceNo: form.referenceNo,
      attentionTo: form.attentionTo,

      customerName: form.customerName,
      deliveryAddress: form.deliveryAddress,
      customerAddress: form.deliveryAddress,
      contactPhone: form.contactPhone,
      customerPhone: form.contactPhone,

      vehicleNo: form.companyProfile === "topical" ? form.vehicleNo : "",
      driverName: form.companyProfile === "topical" ? form.driverName : "",

      preparedBy: form.preparedBy,
      dispatchedBy: form.dispatchedBy,
      deliveredBy: form.dispatchedBy,
      receivedBy: form.receivedBy,
      receiverDesignation: form.receiverDesignation,

      status: form.status,
      remarks: form.remarks,

      totalCartons: totals.totalCartons,
      totalRolls: totals.totalRolls,
      totalQuantity: totals.totalQuantity,
      totalGrossWeight: totals.totalGrossWeight,
      totalNetWeight: totals.totalNetWeight,

      items: validItems,
    };
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = buildPayload();
      const url = editId
        ? `${API_BASE_URL}/delivery-challans/update/${editId}`
        : `${API_BASE_URL}/delivery-challans/add`;
      const method = editId ? "PUT" : "POST";

      await apiRequest(url, {
        method,
        body: JSON.stringify(payload),
      });

      await Promise.all([fetchChallans(), fetchSalesOrders()]);
      closeForm();
    } catch (error) {
      console.error("Delivery Challan Save Error:", error);
      alert(error.message || "Delivery challan could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  /*
  |------------------------------------------------------------------------
  | Edit and Delete
  |------------------------------------------------------------------------
  */

  const handleEdit = async (challan) => {
    await fetchSalesOrders({ includeClosed: true });

    const profileKey = inferCompanyProfile(challan);

    setEditId(challan._id);
    setForm({
      companyProfile: profileKey,
      challanNo: challan.challanNo || "",

      salesOrder: challan.salesOrder?._id || challan.salesOrder || "",
      salesOrderNo: challan.salesOrderNo || "",

      challanDate: challan.challanDate
        ? String(challan.challanDate).slice(0, 10)
        : todayDate(),
      dispatchDate: challan.dispatchDate
        ? String(challan.dispatchDate).slice(0, 10)
        : challan.challanDate
          ? String(challan.challanDate).slice(0, 10)
          : todayDate(),
      receivedDate: challan.receivedDate
        ? String(challan.receivedDate).slice(0, 10)
        : "",

      poNo: challan.poNo || "",
      referenceNo: challan.referenceNo || "",
      attentionTo: challan.attentionTo || "",

      customerName: getCustomerName(challan) === "-" ? "" : getCustomerName(challan),
      deliveryAddress: getCustomerAddress(challan),
      contactPhone: getCustomerPhone(challan),

      vehicleNo: challan.vehicleNo || "",
      driverName: challan.driverName || "",

      preparedBy: challan.preparedBy || "",
      dispatchedBy: challan.dispatchedBy || challan.deliveredBy || "",
      deliveredBy: challan.deliveredBy || "",
      receivedBy: challan.receivedBy || "",
      receiverDesignation: challan.receiverDesignation || "",

      status: challan.status || "Draft",
      remarks: challan.remarks || "",

      items: challan.items?.length
        ? challan.items.map((row) => ({
            item: getItemId(row.item),
            salesOrderItemId: row.salesOrderItemId || "",
            warehouse: row.warehouse || "Main Godown",

            description: row.description || "",
            size: row.size || "",
            textType: row.textType || "",

            orderedQty: numberValue(row.orderedQty),
            alreadyDeliveredQty: numberValue(row.alreadyDeliveredQty),
            pendingQty: numberValue(row.pendingQty ?? row.quantity),

            cartons: row.cartons ?? "",
            rolls: row.rolls ?? "",
            quantity: row.quantity ?? "",
            unit: row.unit || "Rolls",

            grossWeight: row.grossWeight ?? "",
            netWeight: row.netWeight ?? "",
            remarks: row.remarks || "",
          }))
        : [],
    });

    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this delivery challan?")) {
      return;
    }

    try {
      await apiRequest(`${API_BASE_URL}/delivery-challans/delete/${id}`, {
        method: "DELETE",
      });

      await Promise.all([fetchChallans(), fetchSalesOrders()]);
    } catch (error) {
      alert(error.message || "Delivery challan could not be deleted.");
    }
  };

  /*
  |------------------------------------------------------------------------
  | Topical Packaging Print
  |------------------------------------------------------------------------
  */

  const printTopicalChallan = (challan) => {
    const profile = COMPANY_PROFILES.topical;
    const challanTotals = calculateChallanTotals(challan);
    const customerName = getCustomerName(challan);
    const customerAddress = getCustomerAddress(challan);
    const customerPhone = getCustomerPhone(challan);

    const rows = (challan.items || [])
      .map(
        (item, index) => `
          <tr>
            <td class="center">${index + 1}</td>
            <td>
              <div class="item-title">${safeText(item.description || "")}</div>
              ${
                item.textType
                  ? `<div class="sub-text">${
                      item.textType === "with-text"
                        ? "With Text / Printed"
                        : "Without Text"
                    }</div>`
                  : ""
              }
              ${
                item.remarks
                  ? `<div class="sub-text">${safeText(item.remarks)}</div>`
                  : ""
              }
            </td>
            <td class="center">${safeText(item.size || "")}</td>
            <td class="number">${numberValue(item.cartons) || ""}</td>
            <td class="number">${numberValue(item.rolls) || ""}</td>
            <td class="number">${numberValue(item.quantity) || ""}</td>
            <td class="center">${safeText(item.unit || "")}</td>
            <td class="number">${formatWeight(item.grossWeight) || ""}</td>
            <td class="number">${formatWeight(item.netWeight) || ""}</td>
          </tr>
        `
      )
      .join("");

    const printWindow = window.open("", "_blank", "width=1100,height=850");

    if (!printWindow) {
      alert("The print window was blocked. Allow pop-ups and try again.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>${safeText(challan.challanNo || "Delivery Challan")}</title>
          <style>
            @page { size: A4 portrait; margin: 9mm; }
            * { box-sizing: border-box; }
            html, body {
              margin: 0;
              padding: 0;
              background: #fff;
              color: #111827;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 10.5px;
              line-height: 1.35;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .page {
              width: 100%;
              min-height: 276mm;
              display: flex;
              flex-direction: column;
            }
            .header {
              display: grid;
              grid-template-columns: 70px 1fr 188px;
              gap: 13px;
              align-items: center;
              padding-bottom: 9px;
              border-bottom: 3px solid #172554;
            }
            .logo {
              width: 62px;
              height: 62px;
              border-radius: 12px;
              background: #172554;
              color: #fff;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 25px;
              font-weight: 900;
            }
            .company h1 {
              margin: 0;
              color: #172554;
              font-size: 22px;
              line-height: 1.05;
              letter-spacing: .4px;
            }
            .company p { margin: 4px 0 0; color: #475569; }
            .document-box {
              border: 1.5px solid #172554;
              border-radius: 7px;
              overflow: hidden;
            }
            .document-title {
              padding: 7px;
              background: #172554;
              color: #fff;
              text-align: center;
              font-size: 12px;
              font-weight: 900;
            }
            .document-row {
              display: flex;
              justify-content: space-between;
              gap: 8px;
              padding: 5px 8px;
              border-top: 1px solid #cbd5e1;
            }
            .document-row span { color: #64748b; }
            .reference {
              margin-top: 11px;
              display: grid;
              grid-template-columns: 1.15fr .85fr;
              gap: 9px;
            }
            .info-box {
              border: 1px solid #64748b;
              border-radius: 6px;
              overflow: hidden;
            }
            .info-heading {
              background: #e2e8f0;
              color: #172554;
              padding: 6px 8px;
              font-weight: 900;
              text-transform: uppercase;
            }
            .info-content { padding: 8px; min-height: 86px; }
            .info-row {
              display: grid;
              grid-template-columns: 100px 1fr;
              gap: 6px;
              margin-bottom: 5px;
            }
            .info-row label { color: #64748b; font-weight: 700; }
            .info-row div { font-weight: 700; overflow-wrap: anywhere; }
            table {
              width: 100%;
              margin-top: 11px;
              border-collapse: collapse;
              table-layout: fixed;
            }
            th, td {
              border: 1px solid #334155;
              padding: 5px 4px;
              vertical-align: middle;
            }
            th {
              background: #172554;
              color: #fff;
              text-align: center;
              font-size: 8.7px;
              font-weight: 900;
              text-transform: uppercase;
            }
            td { font-size: 9.4px; }
            .center { text-align: center; }
            .number { text-align: right; font-weight: 700; }
            .item-title { font-weight: 800; }
            .sub-text { margin-top: 2px; color: #64748b; font-size: 8px; }
            .total-row td {
              background: #f1f5f9;
              font-weight: 900;
              border-top: 2px solid #172554;
            }
            .summary {
              margin-top: 10px;
              display: grid;
              grid-template-columns: 1fr 252px;
              gap: 10px;
            }
            .remarks {
              min-height: 68px;
              padding: 8px;
              border: 1px solid #64748b;
              border-radius: 6px;
            }
            .remarks strong { display: block; margin-bottom: 5px; color: #172554; }
            .totals-box {
              border: 1px solid #64748b;
              border-radius: 6px;
              overflow: hidden;
            }
            .total-line {
              display: flex;
              justify-content: space-between;
              padding: 6px 8px;
              border-bottom: 1px solid #cbd5e1;
            }
            .total-line:last-child {
              border-bottom: 0;
              background: #e2e8f0;
              font-weight: 900;
            }
            .receiver-details {
              margin-top: 12px;
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
              padding: 7px;
              border: 1px solid #94a3b8;
              border-radius: 6px;
            }
            .receiver-details span { color: #64748b; font-size: 8.5px; }
            .receiver-details strong { display: block; margin-top: 3px; }
            .signatures {
              margin-top: auto;
              padding-top: 24px;
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
            }
            .signature { text-align: center; }
            .signature-line {
              margin-top: 27px;
              padding-top: 5px;
              border-top: 1px solid #111827;
              font-size: 8.7px;
              font-weight: 700;
            }
            .footer-note {
              margin-top: 9px;
              padding-top: 6px;
              border-top: 1px solid #cbd5e1;
              text-align: center;
              color: #64748b;
              font-size: 7.7px;
            }
          </style>
        </head>
        <body>
          <section class="page">
            <header class="header">
              <div class="logo">TP</div>
              <div class="company">
                <h1>${safeText(profile.name)}</h1>
                <p>${safeText(profile.address)}</p>
                <p>Phone: ${safeText(profile.phone)}</p>
              </div>
              <div class="document-box">
                <div class="document-title">DELIVERY CHALLAN</div>
                <div class="document-row"><span>Challan No.</span><strong>${safeText(
                  challan.challanNo || ""
                )}</strong></div>
                <div class="document-row"><span>Date</span><strong>${safeText(
                  formatDate(challan.challanDate)
                )}</strong></div>
                <div class="document-row"><span>Status</span><strong>${safeText(
                  challan.status || "Draft"
                )}</strong></div>
              </div>
            </header>

            <div class="reference">
              <div class="info-box">
                <div class="info-heading">Delivered To</div>
                <div class="info-content">
                  <div class="info-row"><label>Attention</label><div>${safeText(
                    challan.attentionTo || "-"
                  )}</div></div>
                  <div class="info-row"><label>Customer / M/S</label><div>${safeText(
                    customerName
                  )}</div></div>
                  <div class="info-row"><label>Address</label><div>${safeText(
                    customerAddress
                  )}</div></div>
                  <div class="info-row"><label>Phone</label><div>${safeText(
                    customerPhone || "-"
                  )}</div></div>
                  <div class="info-row"><label>PO Number</label><div>${safeText(
                    challan.poNo || "-"
                  )}</div></div>
                </div>
              </div>

              <div class="info-box">
                <div class="info-heading">Dispatch Reference</div>
                <div class="info-content">
                  <div class="info-row"><label>Sales Order</label><div>${safeText(
                    challan.salesOrderNo || "-"
                  )}</div></div>
                  <div class="info-row"><label>Dispatch Date</label><div>${safeText(
                    formatDate(challan.dispatchDate || challan.challanDate)
                  )}</div></div>
                  <div class="info-row"><label>Vehicle No.</label><div>${safeText(
                    challan.vehicleNo || "-"
                  )}</div></div>
                  <div class="info-row"><label>Driver</label><div>${safeText(
                    challan.driverName || "-"
                  )}</div></div>
                </div>
              </div>
            </div>

            <table>
              <colgroup>
                <col style="width: 31px;" />
                <col style="width: 170px;" />
                <col style="width: 66px;" />
                <col style="width: 50px;" />
                <col style="width: 47px;" />
                <col style="width: 55px;" />
                <col style="width: 43px;" />
                <col style="width: 64px;" />
                <col style="width: 64px;" />
              </colgroup>
              <thead>
                <tr>
                  <th>Sr.</th>
                  <th>Particulars</th>
                  <th>Size</th>
                  <th>Cartons</th>
                  <th>Rolls</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>Gross Weight</th>
                  <th>Net Weight</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
                <tr class="total-row">
                  <td colspan="3" class="center">TOTAL</td>
                  <td class="number">${challanTotals.totalCartons}</td>
                  <td class="number">${challanTotals.totalRolls}</td>
                  <td class="number">${challanTotals.totalQuantity}</td>
                  <td></td>
                  <td class="number">${formatWeight(
                    challanTotals.totalGrossWeight
                  )}</td>
                  <td class="number">${formatWeight(
                    challanTotals.totalNetWeight
                  )}</td>
                </tr>
              </tbody>
            </table>

            <div class="summary">
              <div class="remarks">
                <strong>Remarks</strong>
                ${safeText(challan.remarks || "Goods received in good condition.")}
              </div>
              <div class="totals-box">
                <div class="total-line"><span>Total Cartons</span><strong>${
                  challanTotals.totalCartons
                }</strong></div>
                <div class="total-line"><span>Total Rolls</span><strong>${
                  challanTotals.totalRolls
                }</strong></div>
                <div class="total-line"><span>Gross Weight</span><strong>${formatWeight(
                  challanTotals.totalGrossWeight
                )} kg</strong></div>
                <div class="total-line"><span>Net Weight</span><strong>${formatWeight(
                  challanTotals.totalNetWeight
                )} kg</strong></div>
              </div>
            </div>

            <div class="receiver-details">
              <div><span>Received By</span><strong>${safeText(
                challan.receivedBy || ""
              )}</strong></div>
              <div><span>Received Date</span><strong>${safeText(
                formatDate(challan.receivedDate)
              )}</strong></div>
              <div><span>Receiver Designation</span><strong>${safeText(
                challan.receiverDesignation || ""
              )}</strong></div>
            </div>

            <div class="signatures">
              <div class="signature"><div>${safeText(
                challan.preparedBy || ""
              )}</div><div class="signature-line">Prepared By</div></div>
              <div class="signature"><div>${safeText(
                challan.dispatchedBy || challan.deliveredBy || ""
              )}</div><div class="signature-line">Dispatched By</div></div>
              <div class="signature"><div>${safeText(
                challan.driverName || ""
              )}</div><div class="signature-line">Driver Signature</div></div>
              <div class="signature"><div>${safeText(
                challan.receivedBy || ""
              )}</div><div class="signature-line">Receiver Signature / Stamp</div></div>
            </div>

            <div class="footer-note">
              This document confirms dispatch and receipt of the listed goods. It is not a sales invoice.
            </div>
          </section>
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  /*
  |------------------------------------------------------------------------
  | Al-Karam Traders Print
  |------------------------------------------------------------------------
  */

  const printAlKaramChallan = (challan) => {
    const profile = COMPANY_PROFILES.alKaram;
    const challanTotals = calculateChallanTotals(challan);
    const customerName = getCustomerName(challan);
    const customerAddress = getCustomerAddress(challan);
    const items = challan.items || [];

    const realRows = items
      .map(
        (item, index) => `
          <tr>
            <td class="center">${index + 1}</td>
            <td>
              <strong>${safeText(item.description || "")}</strong>
              ${
                item.textType
                  ? `<div class="sub">${
                      item.textType === "with-text"
                        ? "Printed / With Text"
                        : "Without Text"
                    }</div>`
                  : ""
              }
            </td>
            <td class="center">${safeText(item.size || "")}</td>
            <td class="number">${numberValue(item.cartons) || ""}</td>
            <td class="number">${numberValue(item.rolls) || ""}</td>
            <td class="number">${formatWeight(item.grossWeight) || ""}</td>
            <td class="number">${formatWeight(item.netWeight) || ""}</td>
          </tr>
        `
      )
      .join("");

    const blankRows = Array.from({ length: Math.max(8 - items.length, 0) })
      .map(
        () => `
          <tr class="blank-row">
            <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td>
          </tr>
        `
      )
      .join("");

    const printWindow = window.open("", "_blank", "width=1000,height=850");

    if (!printWindow) {
      alert("The print window was blocked. Allow pop-ups and try again.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>${safeText(challan.challanNo || "Delivery Challan")}</title>
          <style>
            @page { size: A4 portrait; margin: 13mm; }
            * { box-sizing: border-box; }
            html, body {
              margin: 0;
              padding: 0;
              background: #fff;
              color: #111;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 11px;
              line-height: 1.35;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .page {
              min-height: 270mm;
              display: flex;
              flex-direction: column;
            }
            .company-header {
              text-align: center;
              padding-bottom: 10px;
              border-bottom: 2.4px solid #111;
            }
            .company-header h1 {
              margin: 0;
              font-size: 25px;
              line-height: 1.05;
              letter-spacing: .7px;
            }
            .company-header p { margin: 4px 0 0; font-size: 10.5px; }
            .title {
              margin: 13px 0 12px;
              text-align: center;
              font-size: 18px;
              font-weight: 900;
              text-decoration: underline;
              letter-spacing: .4px;
            }
            .reference {
              display: grid;
              grid-template-columns: 1fr 210px;
              gap: 22px;
              margin-bottom: 12px;
            }
            .customer-block, .document-block { line-height: 1.7; }
            .document-block {
              padding-left: 16px;
              border-left: 1.3px solid #111;
            }
            .row-label { display: inline-block; min-width: 88px; font-weight: 800; }
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }
            th, td {
              border: 1px solid #111;
              padding: 7px 6px;
              vertical-align: middle;
            }
            th {
              background: #efefef;
              text-align: center;
              font-size: 9.5px;
              font-weight: 900;
              text-transform: uppercase;
            }
            td { font-size: 10px; }
            .center { text-align: center; }
            .number { text-align: right; font-weight: 700; }
            .sub { margin-top: 2px; font-size: 8.4px; color: #555; }
            .blank-row td { height: 31px; }
            .total-row td {
              background: #f5f5f5;
              border-top: 2px solid #111;
              font-weight: 900;
            }
            .lower-grid {
              margin-top: 14px;
              display: grid;
              grid-template-columns: 1fr 240px;
              gap: 18px;
            }
            .remarks {
              min-height: 82px;
              padding: 8px;
              border: 1px solid #111;
            }
            .remarks strong { display: block; margin-bottom: 6px; }
            .totals {
              border: 1px solid #111;
              overflow: hidden;
            }
            .total-line {
              display: flex;
              justify-content: space-between;
              padding: 7px 9px;
              border-bottom: 1px solid #bbb;
            }
            .total-line:last-child {
              border-bottom: 0;
              background: #eee;
              font-weight: 900;
            }
            .receiving {
              margin-top: 16px;
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 16px;
              line-height: 1.65;
            }
            .signatures {
              margin-top: auto;
              padding-top: 42px;
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 35px;
            }
            .signature {
              padding-top: 6px;
              border-top: 1px solid #111;
              text-align: center;
              font-weight: 700;
            }
            .footer-note {
              margin-top: 13px;
              text-align: center;
              color: #666;
              font-size: 8px;
            }
          </style>
        </head>
        <body>
          <section class="page">
            <div class="company-header">
              <h1>${safeText(profile.name)}</h1>
              <p>${safeText(profile.address)}</p>
              <p>Ph: ${safeText(profile.phone)}</p>
            </div>

            <div class="title">DELIVERY CHALLAN</div>

            <div class="reference">
              <div class="customer-block">
                <div><span class="row-label">Att:</span>${safeText(
                  challan.attentionTo || "-"
                )}</div>
                <div><span class="row-label">M/S:</span>${safeText(
                  customerName
                )}</div>
                <div><span class="row-label">Address:</span>${safeText(
                  customerAddress || "-"
                )}</div>
              </div>

              <div class="document-block">
                <div><span class="row-label">S.No:</span>${safeText(
                  challan.referenceNo || challan.challanNo || ""
                )}</div>
                <div><span class="row-label">Dated:</span>${safeText(
                  formatDate(challan.challanDate)
                )}</div>
                <div><span class="row-label">PO #:</span>${safeText(
                  challan.poNo || "-"
                )}</div>
                <div><span class="row-label">Sales Order:</span>${safeText(
                  challan.salesOrderNo || "-"
                )}</div>
              </div>
            </div>

            <table>
              <colgroup>
                <col style="width: 38px;" />
                <col />
                <col style="width: 82px;" />
                <col style="width: 60px;" />
                <col style="width: 55px;" />
                <col style="width: 80px;" />
                <col style="width: 80px;" />
              </colgroup>
              <thead>
                <tr>
                  <th>Sr.</th>
                  <th>Particulars</th>
                  <th>Size</th>
                  <th>Cartons</th>
                  <th>Rolls</th>
                  <th>Gross Weight</th>
                  <th>Net Weight</th>
                </tr>
              </thead>
              <tbody>
                ${realRows}
                ${blankRows}
                <tr class="total-row">
                  <td colspan="3" class="center">TOTAL</td>
                  <td class="number">${challanTotals.totalCartons}</td>
                  <td class="number">${challanTotals.totalRolls}</td>
                  <td class="number">${formatWeight(
                    challanTotals.totalGrossWeight
                  )}</td>
                  <td class="number">${formatWeight(
                    challanTotals.totalNetWeight
                  )}</td>
                </tr>
              </tbody>
            </table>

            <div class="lower-grid">
              <div class="remarks">
                <strong>Remarks</strong>
                ${safeText(challan.remarks || "")}
              </div>
              <div class="totals">
                <div class="total-line"><span>Total Cartons</span><strong>${
                  challanTotals.totalCartons
                }</strong></div>
                <div class="total-line"><span>Total Rolls</span><strong>${
                  challanTotals.totalRolls
                }</strong></div>
                <div class="total-line"><span>Gross Weight</span><strong>${formatWeight(
                  challanTotals.totalGrossWeight
                )} kg</strong></div>
                <div class="total-line"><span>Net Weight</span><strong>${formatWeight(
                  challanTotals.totalNetWeight
                )} kg</strong></div>
              </div>
            </div>

            <div class="receiving">
              <div><strong>Prepared By:</strong><br/>${safeText(
                challan.preparedBy || ""
              )}</div>
              <div><strong>Dispatched By:</strong><br/>${safeText(
                challan.dispatchedBy || challan.deliveredBy || ""
              )}</div>
              <div><strong>Received By:</strong><br/>${safeText(
                challan.receivedBy || ""
              )}</div>
              <div><strong>Received Date:</strong><br/>${safeText(
                formatDate(challan.receivedDate)
              )}</div>
              <div><strong>Designation:</strong><br/>${safeText(
                challan.receiverDesignation || ""
              )}</div>
            </div>

            <div class="signatures">
              <div class="signature">Prepared By</div>
              <div class="signature">Dispatch By</div>
              <div class="signature">Received By / Stamp</div>
            </div>

            <div class="footer-note">
              Delivery challan only. Prices and taxes are excluded.
            </div>
          </section>
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const printChallan = (challan) => {
    const profileKey = inferCompanyProfile(challan);

    if (profileKey === "alKaram") {
      printAlKaramChallan(challan);
      return;
    }

    printTopicalChallan(challan);
  };

  /*
  |------------------------------------------------------------------------
  | Topical Items Table
  |------------------------------------------------------------------------
  */

  const renderTopicalItemsTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth: "1700px" }}>
        <thead>
          <tr className="border-b bg-white text-xs text-slate-600">
            <th className="w-[48px] p-3 text-center">Sr.</th>
            <th className="p-3 text-left">Particulars</th>
            <th className="p-3 text-left">Size</th>
            <th className="p-3 text-left">Text</th>
            <th className="p-3 text-left">Warehouse</th>
            <th className="p-3 text-right">Ordered</th>
            <th className="p-3 text-right">Delivered</th>
            <th className="p-3 text-right">Pending</th>
            <th className="p-3 text-left">Cartons</th>
            <th className="p-3 text-left">Rolls</th>
            <th className="p-3 text-left">Delivery Qty</th>
            <th className="p-3 text-left">Unit</th>
            <th className="p-3 text-left">Gross Weight</th>
            <th className="p-3 text-left">Net Weight</th>
            <th className="p-3"></th>
          </tr>
        </thead>

        <tbody>
          {form.items.length === 0 ? (
            <tr>
              <td colSpan="15" className="p-10 text-center text-slate-500">
                Select a sales order to load pending items.
              </td>
            </tr>
          ) : (
            form.items.map((item, index) => {
              const overQty =
                numberValue(item.quantity) > numberValue(item.pendingQty);
              const invalidWeight =
                numberValue(item.grossWeight) > 0 &&
                numberValue(item.netWeight) > numberValue(item.grossWeight);

              return (
                <tr
                  key={item.salesOrderItemId || index}
                  className="border-b border-slate-100 align-top"
                >
                  <td className="p-3 text-center font-bold text-slate-500">
                    {index + 1}
                  </td>

                  <td className="min-w-[230px] p-2">
                    <input
                      value={item.description}
                      onChange={(event) =>
                        updateItem(index, "description", event.target.value)
                      }
                      className="w-full rounded border border-slate-200 px-2.5 py-2 outline-none focus:border-blue-500"
                      placeholder="Aluminium Foil Printed"
                    />
                  </td>

                  <td className="min-w-[120px] p-2">
                    <input
                      value={item.size}
                      onChange={(event) =>
                        updateItem(index, "size", event.target.value)
                      }
                      className="w-full rounded border border-slate-200 px-2.5 py-2 outline-none focus:border-blue-500"
                      placeholder="140mm"
                    />
                  </td>

                  <td className="min-w-[130px] p-2">
                    <select
                      value={item.textType}
                      onChange={(event) =>
                        updateItem(index, "textType", event.target.value)
                      }
                      className="w-full rounded border border-slate-200 bg-white px-2.5 py-2 outline-none focus:border-blue-500"
                    >
                      <option value="">No Label</option>
                      <option value="with-text">With Text</option>
                      <option value="without-text">Without Text</option>
                    </select>
                  </td>

                  <td className="min-w-[130px] p-2">
                    <input
                      value={item.warehouse}
                      readOnly
                      className="w-full cursor-not-allowed rounded border border-slate-200 bg-slate-50 px-2.5 py-2"
                    />
                  </td>

                  <td className="p-3 text-right font-bold">
                    {numberValue(item.orderedQty)}
                  </td>
                  <td className="p-3 text-right font-bold text-blue-700">
                    {numberValue(item.alreadyDeliveredQty)}
                  </td>
                  <td className="p-3 text-right font-bold text-orange-600">
                    {numberValue(item.pendingQty)}
                  </td>

                  <td className="min-w-[90px] p-2">
                    <input
                      type="number"
                      min="0"
                      value={item.cartons}
                      onChange={(event) =>
                        updateItem(index, "cartons", event.target.value)
                      }
                      className="w-full rounded border border-slate-200 px-2.5 py-2 outline-none focus:border-blue-500"
                      placeholder="1"
                    />
                  </td>

                  <td className="min-w-[90px] p-2">
                    <input
                      type="number"
                      min="0"
                      value={item.rolls}
                      onChange={(event) =>
                        updateItem(index, "rolls", event.target.value)
                      }
                      className="w-full rounded border border-slate-200 px-2.5 py-2 outline-none focus:border-blue-500"
                      placeholder="1"
                    />
                  </td>

                  <td className="min-w-[120px] p-2">
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(index, "quantity", event.target.value)
                        }
                        className={`w-full rounded border px-2.5 py-2 outline-none ${
                          overQty
                            ? "border-red-500 bg-red-50"
                            : "border-slate-200 focus:border-blue-500"
                        }`}
                        placeholder="100"
                      />
                      {overQty && (
                        <AlertTriangle
                          size={15}
                          className="absolute right-2 top-2.5 text-red-600"
                        />
                      )}
                    </div>
                  </td>

                  <td className="min-w-[90px] p-2">
                    <input
                      value={item.unit}
                      onChange={(event) =>
                        updateItem(index, "unit", event.target.value)
                      }
                      className="w-full rounded border border-slate-200 px-2.5 py-2 outline-none focus:border-blue-500"
                      placeholder="Rolls"
                    />
                  </td>

                  <td className="min-w-[120px] p-2">
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={item.grossWeight}
                      onChange={(event) =>
                        updateItem(index, "grossWeight", event.target.value)
                      }
                      className="w-full rounded border border-slate-200 px-2.5 py-2 outline-none focus:border-blue-500"
                      placeholder="10.800"
                    />
                  </td>

                  <td className="min-w-[120px] p-2">
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={item.netWeight}
                        onChange={(event) =>
                          updateItem(index, "netWeight", event.target.value)
                        }
                        className={`w-full rounded border px-2.5 py-2 outline-none ${
                          invalidWeight
                            ? "border-red-500 bg-red-50"
                            : "border-slate-200 focus:border-blue-500"
                        }`}
                        placeholder="9.800"
                      />
                      {invalidWeight && (
                        <AlertTriangle
                          size={15}
                          className="absolute right-2 top-2.5 text-red-600"
                        />
                      )}
                    </div>
                  </td>

                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeItemRow(index)}
                      className="rounded-lg bg-red-50 p-2.5 text-red-600 transition hover:bg-red-100"
                      title="Remove row"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>

        <tfoot>
          <tr className="bg-slate-50 font-bold text-slate-800">
            <td className="p-4 text-center" colSpan="8">
              TOTAL
            </td>
            <td className="p-4">{totals.totalCartons}</td>
            <td className="p-4">{totals.totalRolls}</td>
            <td className="p-4">{totals.totalQuantity}</td>
            <td></td>
            <td className="p-4">{formatWeight(totals.totalGrossWeight)}</td>
            <td className="p-4">{formatWeight(totals.totalNetWeight)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  /*
  |------------------------------------------------------------------------
  | Al-Karam Items Table
  |------------------------------------------------------------------------
  */

  const renderAlKaramItemsTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth: "1200px" }}>
        <thead>
          <tr className="border-b bg-white text-xs text-slate-600">
            <th className="w-[48px] p-3 text-center">Sr.</th>
            <th className="p-3 text-left">Particulars</th>
            <th className="p-3 text-left">Size</th>
            <th className="p-3 text-left">Order Balance</th>
            <th className="p-3 text-left">Cartons</th>
            <th className="p-3 text-left">Rolls</th>
            <th className="p-3 text-left">Delivery Qty</th>
            <th className="p-3 text-left">Unit</th>
            <th className="p-3 text-left">Gross Weight</th>
            <th className="p-3 text-left">Net Weight</th>
            <th className="p-3"></th>
          </tr>
        </thead>

        <tbody>
          {form.items.length === 0 ? (
            <tr>
              <td colSpan="11" className="p-10 text-center text-slate-500">
                Select a sales order to load items.
              </td>
            </tr>
          ) : (
            form.items.map((item, index) => {
              const overQty =
                numberValue(item.quantity) > numberValue(item.pendingQty);
              const invalidWeight =
                numberValue(item.grossWeight) > 0 &&
                numberValue(item.netWeight) > numberValue(item.grossWeight);

              return (
                <tr
                  key={item.salesOrderItemId || index}
                  className="border-b border-slate-100 align-top"
                >
                  <td className="p-3 text-center font-bold text-slate-500">
                    {index + 1}
                  </td>

                  <td className="min-w-[250px] p-2">
                    <input
                      value={item.description}
                      onChange={(event) =>
                        updateItem(index, "description", event.target.value)
                      }
                      className="w-full rounded border border-slate-200 px-2.5 py-2 outline-none focus:border-amber-500"
                      placeholder="Aluminium Foil Printed"
                    />
                  </td>

                  <td className="min-w-[120px] p-2">
                    <input
                      value={item.size}
                      onChange={(event) =>
                        updateItem(index, "size", event.target.value)
                      }
                      className="w-full rounded border border-slate-200 px-2.5 py-2 outline-none focus:border-amber-500"
                      placeholder="250mm"
                    />
                  </td>

                  <td className="min-w-[145px] p-2">
                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5">
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Ordered</span>
                        <b>{numberValue(item.orderedQty)}</b>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Delivered</span>
                        <b className="text-blue-700">
                          {numberValue(item.alreadyDeliveredQty)}
                        </b>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Pending</span>
                        <b className="text-orange-600">
                          {numberValue(item.pendingQty)}
                        </b>
                      </div>
                    </div>
                  </td>

                  <td className="min-w-[90px] p-2">
                    <input
                      type="number"
                      min="0"
                      value={item.cartons}
                      onChange={(event) =>
                        updateItem(index, "cartons", event.target.value)
                      }
                      className="w-full rounded border border-slate-200 px-2.5 py-2 outline-none focus:border-amber-500"
                      placeholder="1"
                    />
                  </td>

                  <td className="min-w-[90px] p-2">
                    <input
                      type="number"
                      min="0"
                      value={item.rolls}
                      onChange={(event) =>
                        updateItem(index, "rolls", event.target.value)
                      }
                      className="w-full rounded border border-slate-200 px-2.5 py-2 outline-none focus:border-amber-500"
                      placeholder="1"
                    />
                  </td>

                  <td className="min-w-[120px] p-2">
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(index, "quantity", event.target.value)
                        }
                        className={`w-full rounded border px-2.5 py-2 outline-none ${
                          overQty
                            ? "border-red-500 bg-red-50"
                            : "border-slate-200 focus:border-amber-500"
                        }`}
                        placeholder="1"
                      />
                      {overQty && (
                        <AlertTriangle
                          size={15}
                          className="absolute right-2 top-2.5 text-red-600"
                        />
                      )}
                    </div>
                  </td>

                  <td className="min-w-[90px] p-2">
                    <input
                      value={item.unit}
                      onChange={(event) =>
                        updateItem(index, "unit", event.target.value)
                      }
                      className="w-full rounded border border-slate-200 px-2.5 py-2 outline-none focus:border-amber-500"
                      placeholder="Rolls"
                    />
                  </td>

                  <td className="min-w-[120px] p-2">
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={item.grossWeight}
                      onChange={(event) =>
                        updateItem(index, "grossWeight", event.target.value)
                      }
                      className="w-full rounded border border-slate-200 px-2.5 py-2 outline-none focus:border-amber-500"
                      placeholder="10.800"
                    />
                  </td>

                  <td className="min-w-[120px] p-2">
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={item.netWeight}
                        onChange={(event) =>
                          updateItem(index, "netWeight", event.target.value)
                        }
                        className={`w-full rounded border px-2.5 py-2 outline-none ${
                          invalidWeight
                            ? "border-red-500 bg-red-50"
                            : "border-slate-200 focus:border-amber-500"
                        }`}
                        placeholder="9.800"
                      />
                      {invalidWeight && (
                        <AlertTriangle
                          size={15}
                          className="absolute right-2 top-2.5 text-red-600"
                        />
                      )}
                    </div>
                  </td>

                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeItemRow(index)}
                      className="rounded-lg bg-red-50 p-2.5 text-red-600 transition hover:bg-red-100"
                      title="Remove row"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>

        <tfoot>
          <tr className="bg-amber-50 font-bold text-slate-800">
            <td className="p-4 text-center" colSpan="4">
              TOTAL
            </td>
            <td className="p-4">{totals.totalCartons}</td>
            <td className="p-4">{totals.totalRolls}</td>
            <td className="p-4">{totals.totalQuantity}</td>
            <td></td>
            <td className="p-4">{formatWeight(totals.totalGrossWeight)}</td>
            <td className="p-4">{formatWeight(totals.totalNetWeight)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  /*
  |------------------------------------------------------------------------
  | Form View
  |------------------------------------------------------------------------
  */

  if (showForm) {
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
                Back to Delivery Challans
              </button>

              <h1 className="text-2xl font-bold text-slate-900">
                {editId ? "Edit Delivery Challan" : "New Delivery Challan"}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Select a company profile to continue.
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
                <h2 className="font-bold text-slate-900">Company Profile</h2>
                <p className="text-xs text-slate-500">
                  Choose the company issuing this challan.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
                <div>
                  <RequiredLabel>Company Profile</RequiredLabel>
                  <select
                    value={form.companyProfile}
                    onChange={(event) =>
                      handleCompanyProfileChange(event.target.value)
                    }
                    disabled={!!editId || profileLoading}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">Select Company Profile</option>
                    {PROFILE_OPTIONS.map((profile) => (
                      <option key={profile.key} value={profile.key}>
                        {profile.name}
                      </option>
                    ))}
                  </select>
                </div>

                {profileLoading ? (
                  <div className="flex min-h-[88px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                    <Loader2 className="animate-spin text-blue-600" size={24} />
                  </div>
                ) : activeProfile ? (
                  <div
                    className={`rounded-2xl border p-4 ${
                      form.companyProfile === "alKaram"
                        ? "border-amber-200 bg-amber-50"
                        : "border-indigo-200 bg-indigo-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                          form.companyProfile === "alKaram"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-indigo-100 text-indigo-700"
                        }`}
                      >
                        <Building2 size={22} />
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-900">
                          {activeProfile.name}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {activeProfile.address}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {activeProfile.phone} | {activeProfile.subtitle}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[88px] items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 text-sm text-slate-500">
                    Select a company profile to open the form.
                  </div>
                )}
              </div>
            </section>

            {activeProfile && (
              <>
                <section>
                  <div className="mb-4">
                    <h2 className="font-bold text-slate-900">
                      Challan Details
                    </h2>
                    <p className="text-xs text-slate-500">
                      Document and order details.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <RequiredLabel>Challan No</RequiredLabel>
                      <input
                        value={form.challanNo}
                        readOnly
                        className="mt-1 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 font-semibold text-slate-700"
                      />
                    </div>

                    <div>
                      <RequiredLabel>Sales Order</RequiredLabel>
                      <select
                        value={form.salesOrder}
                        onChange={(event) =>
                          handleSalesOrderChange(event.target.value)
                        }
                        disabled={!!editId}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                      >
                        <option value="">
                          {salesOrderLoading
                            ? "Loading Sales Orders..."
                            : "Select Sales Order"}
                        </option>
                        {salesOrders.map((order) => (
                          <option key={order._id} value={order._id}>
                            {order.salesOrderNo} - {order.customerName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <RequiredLabel>Challan Date</RequiredLabel>
                      <input
                        type="date"
                        value={form.challanDate}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            challanDate: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                      />
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
                        <option>Dispatched</option>
                        <option>Received</option>
                        <option>Cancelled</option>
                      </select>
                    </div>

                    <div>
                      <NormalLabel>Customer PO No</NormalLabel>
                      <input
                        value={form.poNo}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            poNo: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                        placeholder="Customer PO number"
                      />
                    </div>

                    {form.companyProfile === "alKaram" && (
                      <div>
                        <NormalLabel>Reference / S.No</NormalLabel>
                        <input
                          value={form.referenceNo}
                          onChange={(event) =>
                            setForm((previous) => ({
                              ...previous,
                              referenceNo: event.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-amber-500"
                          placeholder="Optional office reference"
                        />
                      </div>
                    )}
                  </div>
                </section>

                <section>
                  <div className="mb-4">
                    <h2 className="font-bold text-slate-900">
                      Customer Details
                    </h2>
                    <p className="text-xs text-slate-500">
                      Customer details are loaded from the selected sales order.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <NormalLabel>Attention To</NormalLabel>
                      <input
                        value={form.attentionTo}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            attentionTo: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                        placeholder="Mr. / Dr. / Store Officer"
                      />
                    </div>

                    <div>
                      <NormalLabel>Customer / M/S</NormalLabel>
                      <input
                        value={form.customerName}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            customerName: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                        placeholder="Customer company name"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <NormalLabel>Delivery Address</NormalLabel>
                      <input
                        value={form.deliveryAddress}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            deliveryAddress: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                        placeholder="Complete delivery address"
                      />
                    </div>

                    {form.companyProfile === "topical" && (
                      <div>
                        <NormalLabel>Contact Phone</NormalLabel>
                        <input
                          value={form.contactPhone}
                          onChange={(event) =>
                            setForm((previous) => ({
                              ...previous,
                              contactPhone: event.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-500"
                          placeholder="Customer phone"
                        />
                      </div>
                    )}
                  </div>
                </section>

                {selectedOrder && (
                  <section
                    className={`rounded-2xl border p-5 ${
                      form.companyProfile === "alKaram"
                        ? "border-amber-100 bg-amber-50"
                        : "border-blue-100 bg-blue-50"
                    }`}
                  >
                    <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <p className="text-xs text-slate-500">Customer</p>
                        <p className="mt-1 font-bold text-slate-900">
                          {form.customerName || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Sales Order</p>
                        <p className="mt-1 font-bold text-slate-900">
                          {selectedOrder.salesOrderNo || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Order Date</p>
                        <p className="mt-1 font-bold text-slate-900">
                          {formatDate(selectedOrder.orderDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">PO Number</p>
                        <p className="mt-1 font-bold text-slate-900">
                          {form.poNo || "-"}
                        </p>
                      </div>
                    </div>
                  </section>
                )}

                {form.companyProfile === "topical" && (
                  <section>
                    <div className="mb-4">
                      <h2 className="font-bold text-slate-900">
                        Dispatch Details
                      </h2>
                      <p className="text-xs text-slate-500">
                        Vehicle and dispatch details.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <RequiredLabel>Dispatch Date</RequiredLabel>
                        <input
                          type="date"
                          value={form.dispatchDate}
                          onChange={(event) =>
                            setForm((previous) => ({
                              ...previous,
                              dispatchDate: event.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <NormalLabel>Vehicle No</NormalLabel>
                        <input
                          value={form.vehicleNo}
                          onChange={(event) =>
                            setForm((previous) => ({
                              ...previous,
                              vehicleNo: event.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-500"
                          placeholder="LES-1234"
                        />
                      </div>

                      <div>
                        <NormalLabel>Driver Name</NormalLabel>
                        <input
                          value={form.driverName}
                          onChange={(event) =>
                            setForm((previous) => ({
                              ...previous,
                              driverName: event.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-500"
                          placeholder="Driver name"
                        />
                      </div>
                    </div>
                  </section>
                )}

                <section className="overflow-hidden rounded-2xl border border-slate-200">
                  <div
                    className={`border-b border-slate-200 px-5 py-4 ${
                      form.companyProfile === "alKaram"
                        ? "bg-amber-50"
                        : "bg-slate-50"
                    }`}
                  >
                    <h3 className="font-bold text-slate-900">Delivery Items</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {form.companyProfile === "topical"
                        ? "Enter cartons, rolls, quantity, and weight."
                        : "Compact Al-Karam entry table with order balance and weight details."}
                    </p>
                  </div>

                  {form.companyProfile === "topical"
                    ? renderTopicalItemsTable()
                    : renderAlKaramItemsTable()}
                </section>

                <section>
                  <div className="mb-4">
                    <h2 className="font-bold text-slate-900">
                      Receiving Details
                    </h2>
                    <p className="text-xs text-slate-500">
                      These details appear on the printed challan.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                      <NormalLabel>Dispatched By</NormalLabel>
                      <input
                        value={form.dispatchedBy}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            dispatchedBy: event.target.value,
                            deliveredBy: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                        placeholder="Dispatch staff name"
                      />
                    </div>

                    <div>
                      <NormalLabel>Received By</NormalLabel>
                      <input
                        value={form.receivedBy}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            receivedBy: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                        placeholder="Receiver name"
                      />
                    </div>

                    <div>
                      <NormalLabel>Received Date</NormalLabel>
                      <input
                        type="date"
                        value={form.receivedDate}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            receivedDate: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <NormalLabel>Receiver Designation</NormalLabel>
                      <input
                        value={form.receiverDesignation}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            receiverDesignation: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                        placeholder="Store Officer"
                      />
                    </div>
                  </div>
                </section>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_370px]">
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
                      className="mt-1 min-h-[180px] w-full resize-y rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                      placeholder="Delivery notes, packing condition or receiving instructions..."
                    />
                  </div>

                  <div
                    className={`rounded-2xl border p-5 ${
                      form.companyProfile === "alKaram"
                        ? "border-amber-200 bg-amber-50"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <h3 className="mb-4 font-bold text-slate-900">
                      Challan Summary
                    </h3>

                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between border-b border-slate-200 pb-3">
                        <span className="text-slate-600">Total Cartons</span>
                        <b>{totals.totalCartons}</b>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-3">
                        <span className="text-slate-600">Total Rolls</span>
                        <b>{totals.totalRolls}</b>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-3">
                        <span className="text-slate-600">Total Quantity</span>
                        <b>{totals.totalQuantity}</b>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-3">
                        <span className="text-slate-600">Gross Weight</span>
                        <b>{formatWeight(totals.totalGrossWeight)} kg</b>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-3">
                        <span className="text-slate-600">Net Weight</span>
                        <b>{formatWeight(totals.totalNetWeight)} kg</b>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-slate-600">Stock Effect</span>
                        <b
                          className={
                            ["Dispatched", "Received"].includes(form.status)
                              ? "text-red-600"
                              : "text-slate-700"
                          }
                        >
                          {["Dispatched", "Received"].includes(form.status)
                            ? "Godown Minus"
                            : "No Stock Posting"}
                        </b>
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
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      form.companyProfile === "alKaram"
                        ? "bg-amber-600 hover:bg-amber-700"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {saving ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <Save size={18} />
                    )}

                    {saving
                      ? "Saving..."
                      : editId
                        ? "Update Delivery Challan"
                        : "Save Delivery Challan"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  /*
  |------------------------------------------------------------------------
  | List View
  |------------------------------------------------------------------------
  */

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <ClipboardList className="text-blue-600" size={26} />
            Delivery Challans
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage delivery challans for both company profiles.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewForm}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus size={18} />
          New Delivery Challan
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Total Challans"
          value={stats.totalChallans}
          icon={FileText}
          note={`Topical ${stats.topical} | Al-Karam ${stats.alKaram}`}
        />
        <StatCard
          title="Total Cartons"
          value={stats.totalCartons}
          icon={Boxes}
          note="Across all challans"
        />
        <StatCard
          title="Total Rolls"
          value={stats.totalRolls}
          icon={Package}
          note="Across both companies"
        />
        <StatCard
          title="Total Net Weight"
          value={`${formatWeight(stats.totalNetWeight)} kg`}
          icon={Weight}
          note="Net dispatched material"
        />
        <StatCard
          title="Dispatched"
          value={stats.dispatched}
          icon={Truck}
          note="Dispatched or received"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Delivery Challan List
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Company-specific records and print templates.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full min-w-[285px] rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
                placeholder="Search challan, order, customer..."
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
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Dispatched">Dispatched</option>
              <option value="Received">Received</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCcw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: "1380px" }}>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="w-[55px] px-4 py-3 text-center">Sr.</th>
                <th className="px-4 py-3 text-left">Challan No</th>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Sales Order</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-right">Cartons</th>
                <th className="px-4 py-3 text-right">Rolls</th>
                <th className="px-4 py-3 text-right">Net Weight</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" className="px-4 py-16 text-center">
                    <Loader2
                      size={24}
                      className="mx-auto animate-spin text-blue-600"
                    />
                    <p className="mt-3 text-sm text-slate-500">
                      Loading Delivery Challans...
                    </p>
                  </td>
                </tr>
              ) : filteredChallans.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-4 py-16 text-center">
                    <ClipboardList
                      size={36}
                      className="mx-auto text-slate-300"
                    />
                    <p className="mt-3 font-medium text-slate-600">
                      No Delivery Challans Found
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Adjust the filters or create a new delivery challan.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredChallans.map((challan, index) => {
                  const profileKey = inferCompanyProfile(challan);
                  const profile = COMPANY_PROFILES[profileKey];
                  const challanTotals = calculateChallanTotals(challan);

                  return (
                    <tr
                      key={challan._id || `${challan.challanNo}-${index}`}
                      className="border-b border-slate-100 transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 text-center font-bold text-slate-500">
                        {index + 1}
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-900">
                          {challan.challanNo || "-"}
                        </div>
                        {challan.poNo && (
                          <div className="mt-1 text-xs text-slate-400">
                            PO: {challan.poNo}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getProfileBadgeClass(
                            profileKey
                          )}`}
                        >
                          {profile.shortName}
                        </span>
                        <div className="mt-1 text-xs text-slate-400">
                          {profile.templateType === "detailed"
                            ? "Detailed Format"
                            : "Compact Format"}
                        </div>
                      </td>

                      <td className="px-4 py-4 font-medium text-slate-700">
                        {challan.salesOrderNo || "-"}
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-800">
                          {getCustomerName(challan)}
                        </div>
                        {getCustomerPhone(challan) && (
                          <div className="mt-1 text-xs text-slate-400">
                            {getCustomerPhone(challan)}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {formatDate(challan.challanDate)}
                      </td>

                      <td className="px-4 py-4 text-right font-bold">
                        {challanTotals.totalCartons}
                      </td>
                      <td className="px-4 py-4 text-right font-bold">
                        {challanTotals.totalRolls}
                      </td>
                      <td className="px-4 py-4 text-right font-bold">
                        {formatWeight(challanTotals.totalNetWeight)} kg
                      </td>

                      <td className="px-4 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                            challan.status
                          )}`}
                        >
                          {challan.status || "Draft"}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => printChallan(challan)}
                            className={`rounded-lg p-2 transition ${
                              profileKey === "alKaram"
                                ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                                : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                            }`}
                            title={`Print ${profile.shortName} Format`}
                          >
                            <Printer size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEdit(challan)}
                            className="rounded-lg bg-violet-50 p-2 text-violet-600 transition hover:bg-violet-100"
                            title="Edit Challan"
                          >
                            <Edit2 size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(challan._id)}
                            className="rounded-lg bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
                            title="Delete Challan"
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

        {!loading && filteredChallans.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {filteredChallans.length} of {challans.length} challans
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 size={14} className="text-emerald-500" />
              Company-specific formats and sequential row numbering enabled
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryChallans;
