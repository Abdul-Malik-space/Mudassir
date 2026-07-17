const mongoose = require("mongoose");

const COMPANY_PROFILES = {
  topical: {
    key: "topical",
    name: "TOPICAL PACKAGING PVT. LTD.",
    shortName: "Topical Packaging",
    templateType: "detailed",
    codePrefix: "TP-DC",
    address: "21-Km, Ferozepur Road, Lahore, Pakistan",
    phone: "+92 321 9970676",
  },
  alKaram: {
    key: "alKaram",
    name: "AL-KARAM TRADERS",
    shortName: "Al-Karam Traders",
    templateType: "compact",
    codePrefix: "AK-DC",
    address: "Office #17, 3rd Floor, Gohar Centre, Wahdat Road, Lahore",
    phone: "0423 5912858 | 0333 8295065",
  },
};

const normalizeProfileKey = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");

  if (normalized === "alkaram") return "alKaram";
  return "topical";
};

const cleanText = (value, fallback = "") =>
  String(value ?? fallback).trim();

const cleanNumber = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
};

const deliveryChallanItemSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      default: null,
    },

    salesOrderItemId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    warehouse: {
      type: String,
      trim: true,
      default: "Main Godown",
    },

    description: {
      type: String,
      required: [true, "Item description is required"],
      trim: true,
    },

    size: {
      type: String,
      trim: true,
      default: "",
    },

    textType: {
      type: String,
      enum: ["", "with-text", "without-text"],
      default: "",
    },

    orderedQty: {
      type: Number,
      default: 0,
      min: 0,
    },

    alreadyDeliveredQty: {
      type: Number,
      default: 0,
      min: 0,
    },

    pendingQty: {
      type: Number,
      default: 0,
      min: 0,
    },

    cartons: {
      type: Number,
      default: 0,
      min: 0,
    },

    rolls: {
      type: Number,
      default: 0,
      min: 0,
    },

    quantity: {
      type: Number,
      required: [true, "Delivery quantity is required"],
      min: 0,
    },

    unit: {
      type: String,
      trim: true,
      default: "Rolls",
    },

    grossWeight: {
      type: Number,
      default: 0,
      min: 0,
    },

    netWeight: {
      type: Number,
      default: 0,
      min: 0,
    },

    unitPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: true }
);

const deliveryChallanSchema = new mongoose.Schema(
  {
    companyProfile: {
      type: String,
      enum: ["topical", "alKaram"],
      required: true,
      default: "topical",
      index: true,
    },

    companyName: {
      type: String,
      trim: true,
      required: true,
    },

    companyShortName: {
      type: String,
      trim: true,
      default: "",
    },

    templateType: {
      type: String,
      enum: ["detailed", "compact"],
      required: true,
    },

    companyAddress: {
      type: String,
      trim: true,
      default: "",
    },

    companyPhone: {
      type: String,
      trim: true,
      default: "",
    },

    challanNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    salesOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder",
      required: [true, "Sales Order is required"],
      index: true,
    },

    salesOrderNo: {
      type: String,
      required: true,
      trim: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer is required"],
      index: true,
    },

    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    customerPhone: {
      type: String,
      trim: true,
      default: "",
    },

    customerEmail: {
      type: String,
      trim: true,
      default: "",
    },

    customerAddress: {
      type: String,
      trim: true,
      default: "",
    },

    customerCity: {
      type: String,
      trim: true,
      default: "",
    },

    deliveryAddress: {
      type: String,
      trim: true,
      default: "",
    },

    contactPhone: {
      type: String,
      trim: true,
      default: "",
    },

    attentionTo: {
      type: String,
      trim: true,
      default: "",
    },

    referenceNo: {
      type: String,
      trim: true,
      default: "",
    },

    challanDate: {
      type: String,
      required: [true, "Challan date is required"],
      index: true,
    },

    dispatchDate: {
      type: String,
      trim: true,
      default: "",
    },

    receivedDate: {
      type: String,
      trim: true,
      default: "",
    },

    poNo: {
      type: String,
      trim: true,
      default: "",
    },

    vehicleNo: {
      type: String,
      trim: true,
      default: "",
    },

    driverName: {
      type: String,
      trim: true,
      default: "",
    },

    driverPhone: {
      type: String,
      trim: true,
      default: "",
    },

    preparedBy: {
      type: String,
      trim: true,
      default: "",
    },

    dispatchedBy: {
      type: String,
      trim: true,
      default: "",
    },

    deliveredBy: {
      type: String,
      trim: true,
      default: "",
    },

    receivedBy: {
      type: String,
      trim: true,
      default: "",
    },

    receiverDesignation: {
      type: String,
      trim: true,
      default: "",
    },

    warehouse: {
      type: String,
      trim: true,
      default: "Main Godown",
    },

    items: {
      type: [deliveryChallanItemSchema],
      validate: {
        validator(items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: "At least one delivery item is required",
      },
    },

    totalCartons: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalRolls: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalGrossWeight: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalNetWeight: {
      type: Number,
      default: 0,
      min: 0,
    },

    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["Draft", "Dispatched", "Received", "Cancelled"],
      default: "Draft",
      index: true,
    },

    invoiceStatus: {
      type: String,
      enum: ["Not Invoiced", "Invoiced"],
      default: "Not Invoiced",
      index: true,
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

const normalizeItemsAndTotals = (target) => {
  const warehouse = cleanText(target.warehouse, "Main Godown") || "Main Godown";
  target.warehouse = warehouse;

  const items = Array.isArray(target.items) ? target.items : [];

  target.items = items.map((item) => {
    const quantity = cleanNumber(item.quantity);
    const unitPrice = cleanNumber(item.unitPrice);
    const grossWeight = cleanNumber(item.grossWeight);
    const netWeight = cleanNumber(item.netWeight);

    if (grossWeight > 0 && netWeight > grossWeight) {
      throw new Error(
        `Net weight cannot exceed gross weight for item "${cleanText(
          item.description,
          "Unnamed item"
        )}"`
      );
    }

    item.warehouse = cleanText(item.warehouse, warehouse) || warehouse;
    item.description = cleanText(item.description);
    item.size = cleanText(item.size);
    item.textType = ["", "with-text", "without-text"].includes(item.textType)
      ? item.textType
      : "";

    item.orderedQty = cleanNumber(item.orderedQty);
    item.alreadyDeliveredQty = cleanNumber(item.alreadyDeliveredQty);
    item.pendingQty = cleanNumber(item.pendingQty);
    item.cartons = cleanNumber(item.cartons);
    item.rolls = cleanNumber(item.rolls);
    item.quantity = quantity;
    item.unit = cleanText(item.unit, "Rolls") || "Rolls";
    item.grossWeight = grossWeight;
    item.netWeight = netWeight;
    item.unitPrice = unitPrice;
    item.amount = quantity * unitPrice;
    item.remarks = cleanText(item.remarks);

    return item;
  });

  target.totalCartons = target.items.reduce(
    (sum, item) => sum + cleanNumber(item.cartons),
    0
  );
  target.totalRolls = target.items.reduce(
    (sum, item) => sum + cleanNumber(item.rolls),
    0
  );
  target.totalQuantity = target.items.reduce(
    (sum, item) => sum + cleanNumber(item.quantity),
    0
  );
  target.totalGrossWeight = target.items.reduce(
    (sum, item) => sum + cleanNumber(item.grossWeight),
    0
  );
  target.totalNetWeight = target.items.reduce(
    (sum, item) => sum + cleanNumber(item.netWeight),
    0
  );
  target.subtotal = target.items.reduce(
    (sum, item) => sum + cleanNumber(item.amount),
    0
  );
};

const normalizeDocumentFields = (target) => {
  const profileKey = normalizeProfileKey(target.companyProfile);
  const profile = COMPANY_PROFILES[profileKey];

  target.companyProfile = profile.key;
  target.companyName = profile.name;
  target.companyShortName = profile.shortName;
  target.templateType = profile.templateType;
  target.companyAddress = profile.address;
  target.companyPhone = profile.phone;

  target.challanNo = cleanText(target.challanNo).toUpperCase();
  target.salesOrderNo = cleanText(target.salesOrderNo);
  target.customerName = cleanText(target.customerName);

  target.deliveryAddress = cleanText(
    target.deliveryAddress || target.customerAddress
  );
  target.customerAddress = target.deliveryAddress;

  target.contactPhone = cleanText(target.contactPhone || target.customerPhone);
  target.customerPhone = target.contactPhone;

  target.attentionTo = cleanText(target.attentionTo);
  target.referenceNo = cleanText(target.referenceNo);
  target.challanDate = cleanText(target.challanDate);
  target.dispatchDate = cleanText(target.dispatchDate || target.challanDate);
  target.receivedDate = cleanText(target.receivedDate);
  target.poNo = cleanText(target.poNo);
  target.vehicleNo = cleanText(target.vehicleNo);
  target.driverName = cleanText(target.driverName);
  target.driverPhone = cleanText(target.driverPhone);
  target.preparedBy = cleanText(target.preparedBy);
  target.dispatchedBy = cleanText(target.dispatchedBy || target.deliveredBy);
  target.deliveredBy = target.dispatchedBy;
  target.receivedBy = cleanText(target.receivedBy);
  target.receiverDesignation = cleanText(target.receiverDesignation);
  target.remarks = cleanText(target.remarks);

  normalizeItemsAndTotals(target);
};

deliveryChallanSchema.pre("validate", function preValidate() {
  normalizeDocumentFields(this);
});

deliveryChallanSchema.index({ companyProfile: 1, createdAt: -1 });
deliveryChallanSchema.index({ salesOrder: 1, status: 1 });
deliveryChallanSchema.index({ customer: 1, challanDate: -1 });

module.exports = mongoose.model("DeliveryChallan", deliveryChallanSchema);
