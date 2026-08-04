const mongoose = require("mongoose");

const PURCHASE_NO_PATTERN = /^[A-Z0-9][A-Z0-9/_-]*$/;
const TAX_TYPES = ["without-tax", "with-tax"];
const PAYMENT_METHODS = ["Cash", "Bank", "Cheque", "Credit", "Other"];
const PAYMENT_STATUSES = ["Unpaid", "Partially Paid", "Paid"];
const POSTING_STATUSES = ["Draft", "Posted"];
const PURCHASE_STATUSES = ["Draft", "Completed", "Cancelled"];

const cleanText = (value, fallback = "") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const cleanNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(number, 0) : 0;
};

const roundMoney = (value) =>
  Math.round((cleanNumber(value) + Number.EPSILON) * 100) / 100;

const normalizePurchaseNo = (value) =>
  cleanText(value).toUpperCase().replace(/\s+/g, "");

const purchaseItemSchema = new mongoose.Schema(
  {
    grnItemId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    purchaseOrderItemId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: [true, "Item Master reference is required"],
      index: true,
    },

    itemCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    itemName: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      required: [true, "Item description is required"],
      trim: true,
      maxlength: 250,
    },

    size: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    cartons: {
      type: Number,
      default: 0,
      min: 0,
    },

    grnAcceptedQty: {
      type: Number,
      required: [true, "GRN accepted quantity is required"],
      min: 0.000001,
    },

    purchaseQty: {
      type: Number,
      required: [true, "Purchase quantity is required"],
      min: 0.000001,
    },

    unit: {
      type: String,
      trim: true,
      default: "Pcs",
      maxlength: 30,
    },

    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: 0,
    },

    grossAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    discount: {
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
      maxlength: 500,
    },
  },
  {
    _id: true,
    id: false,
    versionKey: false,
  }
);

purchaseItemSchema.pre("validate", function () {
  this.itemCode = cleanText(this.itemCode).toUpperCase();
  this.itemName = cleanText(this.itemName);
  this.description = cleanText(this.description, this.itemName);
  this.size = cleanText(this.size);
  this.cartons = cleanNumber(this.cartons);
  this.grnAcceptedQty = cleanNumber(this.grnAcceptedQty);
  this.purchaseQty = cleanNumber(this.purchaseQty);
  this.unit = cleanText(this.unit, "Pcs");
  this.unitPrice = roundMoney(this.unitPrice);
  this.discount = roundMoney(this.discount);
  this.remarks = cleanText(this.remarks);

  // One Purchase is created against one GRN, so its quantity must exactly
  // represent the quantity accepted by that GRN.
  if (Math.abs(this.purchaseQty - this.grnAcceptedQty) > 0.000001) {
    this.invalidate(
      "purchaseQty",
      `Purchase quantity must equal GRN accepted quantity for ${this.description}`
    );
  }

  this.grossAmount = roundMoney(this.purchaseQty * this.unitPrice);

  if (this.discount > this.grossAmount) {
    this.invalidate(
      "discount",
      `Item discount cannot exceed gross amount for ${this.description}`
    );
  }

  this.amount = roundMoney(this.grossAmount - this.discount);
});

const purchaseSchema = new mongoose.Schema(
  {
    purchaseNo: {
      type: String,
      required: [true, "Purchase number is required"],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [50, "Purchase number cannot exceed 50 characters"],
      validate: {
        validator(value) {
          return PURCHASE_NO_PATTERN.test(normalizePurchaseNo(value));
        },
        message:
          "Purchase number can contain letters, numbers, hyphen, slash or underscore only",
      },
      index: true,
    },

    grn: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GRN",
      required: [true, "GRN is required"],
      unique: true,
      index: true,
    },

    grnNo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: [true, "Purchase Order is required"],
      index: true,
    },

    purchaseOrderNo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: [true, "Vendor is required"],
      index: true,
    },

    vendorName: {
      type: String,
      required: true,
      trim: true,
    },

    vendorPhone: {
      type: String,
      trim: true,
      default: "",
    },

    vendorEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    vendorAddress: {
      type: String,
      trim: true,
      default: "",
    },

    purchaseDate: {
      type: String,
      required: [true, "Purchase date is required"],
      validate: {
        validator(value) {
          return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
        },
        message: "Purchase date format must be YYYY-MM-DD",
      },
      index: true,
    },

    dueDate: {
      type: String,
      default: "",
      validate: {
        validator(value) {
          return !value || /^\d{4}-\d{2}-\d{2}$/.test(String(value));
        },
        message: "Due date format must be YYYY-MM-DD",
      },
    },

    vendorInvoiceNo: {
      type: String,
      required: [true, "Vendor invoice number is required"],
      trim: true,
      maxlength: 100,
      index: true,
    },

    supplierBillNo: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    challanNo: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    warehouse: {
      type: String,
      trim: true,
      default: "Main Warehouse",
    },

    taxType: {
      type: String,
      enum: TAX_TYPES,
      default: "without-tax",
    },

    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    items: {
      type: [purchaseItemSchema],
      validate: {
        validator(items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: "At least one purchase item is required",
      },
    },

    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    itemDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },

    overallDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxableAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    salesTax: {
      type: Number,
      default: 0,
      min: 0,
    },

    freightCharges: {
      type: Number,
      default: 0,
      min: 0,
    },

    otherCharges: {
      type: Number,
      default: 0,
      min: 0,
    },

    grandTotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    balance: {
      type: Number,
      default: 0,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: "Credit",
    },

    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "Unpaid",
      index: true,
    },

    postingStatus: {
      type: String,
      enum: POSTING_STATUSES,
      default: "Draft",
      index: true,
    },

    status: {
      type: String,
      enum: PURCHASE_STATUSES,
      default: "Draft",
      index: true,
    },

    postedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelReason: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

purchaseSchema.index({ vendor: 1, purchaseDate: -1 });
purchaseSchema.index({ postingStatus: 1, createdAt: -1 });
purchaseSchema.index({ paymentStatus: 1, dueDate: 1 });

purchaseSchema.pre("validate", function () {
  this.purchaseNo = normalizePurchaseNo(this.purchaseNo);
  this.grnNo = cleanText(this.grnNo).toUpperCase();
  this.purchaseOrderNo = cleanText(this.purchaseOrderNo).toUpperCase();
  this.vendorName = cleanText(this.vendorName);
  this.vendorPhone = cleanText(this.vendorPhone);
  this.vendorEmail = cleanText(this.vendorEmail).toLowerCase();
  this.vendorAddress = cleanText(this.vendorAddress);
  this.purchaseDate = cleanText(this.purchaseDate);
  this.dueDate = cleanText(this.dueDate);
  this.vendorInvoiceNo = cleanText(this.vendorInvoiceNo);
  this.supplierBillNo = cleanText(this.supplierBillNo);
  this.challanNo = cleanText(this.challanNo);
  this.warehouse = cleanText(this.warehouse, "Main Warehouse");
  this.remarks = cleanText(this.remarks);
  this.cancelReason = cleanText(this.cancelReason);

  this.taxType = this.taxType === "with-tax" ? "with-tax" : "without-tax";
  this.taxRate = this.taxType === "with-tax" ? cleanNumber(this.taxRate || 18) : 0;

  this.items = Array.isArray(this.items) ? this.items : [];

  this.subtotal = roundMoney(
    this.items.reduce((sum, item) => sum + cleanNumber(item.grossAmount), 0)
  );

  this.itemDiscount = roundMoney(
    this.items.reduce((sum, item) => sum + cleanNumber(item.discount), 0)
  );

  this.overallDiscount = roundMoney(this.overallDiscount);

  const maximumOverallDiscount = Math.max(
    this.subtotal - this.itemDiscount,
    0
  );

  if (this.overallDiscount > maximumOverallDiscount) {
    this.invalidate(
      "overallDiscount",
      "Overall discount cannot exceed the amount remaining after item discounts"
    );
  }

  this.totalDiscount = roundMoney(this.itemDiscount + this.overallDiscount);
  this.taxableAmount = roundMoney(
    Math.max(this.subtotal - this.totalDiscount, 0)
  );
  this.salesTax =
    this.taxType === "with-tax"
      ? roundMoney(this.taxableAmount * (this.taxRate / 100))
      : 0;

  this.freightCharges = roundMoney(this.freightCharges);
  this.otherCharges = roundMoney(this.otherCharges);
  this.grandTotal = roundMoney(
    this.taxableAmount +
      this.salesTax +
      this.freightCharges +
      this.otherCharges
  );

  this.paidAmount = roundMoney(this.paidAmount);

  if (this.paidAmount > this.grandTotal) {
    this.invalidate("paidAmount", "Paid amount cannot exceed grand total");
  }

  this.balance = roundMoney(Math.max(this.grandTotal - this.paidAmount, 0));

  if (this.grandTotal > 0 && this.balance <= 0) {
    this.paymentStatus = "Paid";
  } else if (this.paidAmount > 0) {
    this.paymentStatus = "Partially Paid";
  } else {
    this.paymentStatus = "Unpaid";
  }

  if (this.postingStatus === "Posted" && this.status !== "Cancelled") {
    this.status = "Completed";
    this.postedAt = this.postedAt || new Date();
  }

  if (this.status === "Cancelled") {
    this.postingStatus = "Draft";
    this.cancelledAt = this.cancelledAt || new Date();
  }
});

module.exports = mongoose.model("Purchase", purchaseSchema);
