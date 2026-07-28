const mongoose = require("mongoose");

const PURCHASE_NO_PATTERN =
  /^[A-Z0-9][A-Z0-9/_-]*$/;

const normalizePurchaseNo = (
  value
) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

const purchaseItemSchema =
  new mongoose.Schema(
    {
      item: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Item",
        default: null,
      },

      description: {
        type: String,

        required: [
          true,
          "Item description is required",
        ],

        trim: true,
      },

      size: {
        type: String,
        trim: true,
        default: "",
      },

      grnAcceptedQty: {
        type: Number,
        default: 0,
        min: 0,
      },

      purchaseQty: {
        type: Number,

        required: [
          true,
          "Purchase quantity is required",
        ],

        min: 0,
      },

      unit: {
        type: String,
        trim: true,
        default: "Pcs",
      },

      unitPrice: {
        type: Number,

        required: [
          true,
          "Unit price is required",
        ],

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
      },
    },
    {
      _id: false,
    }
  );

const purchaseSchema =
  new mongoose.Schema(
    {
      purchaseNo: {
        type: String,

        required: [
          true,
          "Purchase number is required",
        ],

        unique: true,
        trim: true,
        uppercase: true,

        maxlength: [
          50,
          "Purchase number cannot exceed 50 characters",
        ],

        validate: {
          validator(value) {
            return PURCHASE_NO_PATTERN.test(
              normalizePurchaseNo(
                value
              )
            );
          },

          message:
            "Purchase number can contain letters, numbers, hyphen, slash or underscore only",
        },

        index: true,
      },

      grn: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "GRN",

        required: [
          true,
          "GRN is required",
        ],

        unique: true,
      },

      grnNo: {
        type: String,
        required: true,
        trim: true,
      },

      purchaseOrder: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "PurchaseOrder",

        required: [
          true,
          "Purchase Order is required",
        ],
      },

      purchaseOrderNo: {
        type: String,
        required: true,
        trim: true,
      },

      vendor: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Vendor",

        required: [
          true,
          "Vendor is required",
        ],
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
        default: "",
      },

      vendorAddress: {
        type: String,
        trim: true,
        default: "",
      },

      purchaseDate: {
        type: String,

        required: [
          true,
          "Purchase date is required",
        ],
      },

      dueDate: {
        type: String,
        default: "",
      },

      vendorInvoiceNo: {
        type: String,

        required: [
          true,
          "Vendor invoice no is required",
        ],

        trim: true,
      },

      supplierBillNo: {
        type: String,
        trim: true,
        default: "",
      },

      challanNo: {
        type: String,
        trim: true,
        default: "",
      },

      warehouse: {
        type: String,
        trim: true,
        default: "Main Warehouse",
      },

      taxType: {
        type: String,

        enum: [
          "without-tax",
          "with-tax",
        ],

        default: "without-tax",
      },

      taxRate: {
        type: Number,
        default: 0,
        min: 0,
      },

      items: {
        type: [
          purchaseItemSchema,
        ],

        validate: {
          validator(items) {
            return (
              Array.isArray(
                items
              ) &&
              items.length > 0
            );
          },

          message:
            "At least one purchase item is required",
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
      },

      paymentMethod: {
        type: String,

        enum: [
          "Cash",
          "Bank",
          "Cheque",
          "Credit",
          "Other",
        ],

        default: "Credit",
      },

      paymentStatus: {
        type: String,

        enum: [
          "Unpaid",
          "Partially Paid",
          "Paid",
        ],

        default: "Unpaid",
      },

      postingStatus: {
        type: String,

        enum: [
          "Draft",
          "Posted",
        ],

        default: "Draft",
      },

      status: {
        type: String,

        enum: [
          "Draft",
          "Completed",
          "Cancelled",
        ],

        default: "Draft",
      },

      remarks: {
        type: String,
        trim: true,
        default: "",
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

purchaseSchema.pre(
  "validate",
  function () {
    this.purchaseNo =
      normalizePurchaseNo(
        this.purchaseNo
      );

    this.grnNo =
      String(
        this.grnNo ?? ""
      )
        .trim()
        .toUpperCase();

    this.purchaseOrderNo =
      String(
        this.purchaseOrderNo ??
          ""
      )
        .trim()
        .toUpperCase();

    this.vendorName =
      String(
        this.vendorName ?? ""
      ).trim();

    this.vendorPhone =
      String(
        this.vendorPhone ?? ""
      ).trim();

    this.vendorEmail =
      String(
        this.vendorEmail ?? ""
      )
        .trim()
        .toLowerCase();

    this.vendorAddress =
      String(
        this.vendorAddress ?? ""
      ).trim();

    this.vendorInvoiceNo =
      String(
        this.vendorInvoiceNo ??
          ""
      ).trim();

    this.supplierBillNo =
      String(
        this.supplierBillNo ??
          ""
      ).trim();

    this.challanNo =
      String(
        this.challanNo ?? ""
      ).trim();

    this.warehouse =
      String(
        this.warehouse ??
          "Main Warehouse"
      ).trim() ||
      "Main Warehouse";

    this.remarks =
      String(
        this.remarks ?? ""
      ).trim();
  }
);

module.exports =
  mongoose.model(
    "Purchase",
    purchaseSchema
  );