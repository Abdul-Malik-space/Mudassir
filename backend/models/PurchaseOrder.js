const mongoose = require("mongoose");

const cleanText = (value, fallback = "") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const cleanNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.max(number, 0)
    : 0;
};

const roundMoney = (value) =>
  Math.round(
    (cleanNumber(value) + Number.EPSILON) *
      100
  ) / 100;

const purchaseOrderItemSchema =
  new mongoose.Schema(
    {
      item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
        required: [
          true,
          "Item Master record is required",
        ],
        index: true,
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

      cartons: {
        type: Number,
        default: 0,
        min: [
          0,
          "Cartons cannot be negative",
        ],
      },

      quantity: {
        type: Number,
        required: [
          true,
          "Quantity is required",
        ],
        min: [
          0.000001,
          "Quantity must be greater than zero",
        ],
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
        min: [
          0,
          "Unit price cannot be negative",
        ],
      },

      amount: {
        type: Number,
        default: 0,
        min: [
          0,
          "Amount cannot be negative",
        ],
      },

      receivedQty: {
        type: Number,
        default: 0,
        min: [
          0,
          "Received quantity cannot be negative",
        ],
      },

      pendingQty: {
        type: Number,
        default: 0,
        min: [
          0,
          "Pending quantity cannot be negative",
        ],
      },

      remarks: {
        type: String,
        trim: true,
        default: "",
        maxlength: [
          1000,
          "Item remarks cannot exceed 1000 characters",
        ],
      },
    },
    {
      _id: true,
      id: false,
      versionKey: false,
    }
  );

purchaseOrderItemSchema.pre(
  "validate",
  function () {
    this.description =
      cleanText(this.description);

    this.size =
      cleanText(this.size);

    this.cartons =
      cleanNumber(this.cartons);

    this.quantity =
      cleanNumber(this.quantity);

    this.unit =
      cleanText(this.unit, "Pcs");

    this.unitPrice =
      roundMoney(this.unitPrice);

    this.receivedQty =
      cleanNumber(this.receivedQty);

    this.remarks =
      cleanText(this.remarks);

    if (
      this.receivedQty >
      this.quantity
    ) {
      this.invalidate(
        "receivedQty",
        "Received quantity cannot exceed ordered quantity"
      );
    }

    this.pendingQty =
      Math.max(
        this.quantity -
          this.receivedQty,
        0
      );

    this.amount =
      roundMoney(
        this.quantity *
          this.unitPrice
      );
  }
);

const purchaseOrderSchema =
  new mongoose.Schema(
    {
      purchaseOrderNo: {
        type: String,
        required: [
          true,
          "Purchase order number is required",
        ],
        unique: true,
        trim: true,
        uppercase: true,
        index: true,
      },

      vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
        required: [
          true,
          "Vendor is required",
        ],
        index: true,
      },

      vendorName: {
        type: String,
        required: [
          true,
          "Vendor name is required",
        ],
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

      vendorCity: {
        type: String,
        trim: true,
        default: "",
      },

      vendorNtn: {
        type: String,
        trim: true,
        default: "",
      },

      vendorStrn: {
        type: String,
        trim: true,
        default: "",
      },

      orderDate: {
        type: String,
        required: [
          true,
          "Order date is required",
        ],
        validate: {
          validator(value) {
            return /^\d{4}-\d{2}-\d{2}$/.test(
              String(value || "")
            );
          },
          message:
            "Order date format must be YYYY-MM-DD",
        },
        index: true,
      },

      expectedDate: {
        type: String,
        default: "",
        validate: {
          validator(value) {
            return (
              !value ||
              /^\d{4}-\d{2}-\d{2}$/.test(
                String(value)
              )
            );
          },
          message:
            "Expected date format must be YYYY-MM-DD",
        },
      },

      referenceNo: {
        type: String,
        trim: true,
        default: "",
      },

      taxType: {
        type: String,
        enum: [
          "without-tax",
          "with-tax",
        ],
        default:
          "without-tax",
      },

      taxRate: {
        type: Number,
        default: 0,
        min: [
          0,
          "Tax rate cannot be negative",
        ],
        max: [
          100,
          "Tax rate cannot exceed 100 percent",
        ],
      },

      items: {
        type: [
          purchaseOrderItemSchema,
        ],
        validate: {
          validator(items) {
            return (
              Array.isArray(items) &&
              items.length > 0
            );
          },
          message:
            "At least one item is required",
        },
      },

      totalCartons: {
        type: Number,
        default: 0,
        min: 0,
      },

      totalQuantity: {
        type: Number,
        default: 0,
        min: 0,
      },

      subtotal: {
        type: Number,
        default: 0,
        min: 0,
      },

      salesTax: {
        type: Number,
        default: 0,
        min: 0,
      },

      grandTotal: {
        type: Number,
        default: 0,
        min: 0,
      },

      advance: {
        type: Number,
        default: 0,
        min: [
          0,
          "Advance cannot be negative",
        ],
      },

      balance: {
        type: Number,
        default: 0,
        min: [
          0,
          "Balance cannot be negative",
        ],
      },

      paymentStatus: {
        type: String,
        enum: [
          "Unpaid",
          "Partially Paid",
          "Paid",
        ],
        default: "Unpaid",
        index: true,
      },

      status: {
        type: String,
        enum: [
          "Draft",
          "Ordered",
          "Partially Received",
          "Received",
          "Cancelled",
        ],
        default: "Draft",
        index: true,
      },

      remarks: {
        type: String,
        trim: true,
        default: "",
        maxlength: [
          2000,
          "Remarks cannot exceed 2000 characters",
        ],
      },
    },
    {
      timestamps: true,
      versionKey: false,
      toJSON: {
        virtuals: true,
      },
      toObject: {
        virtuals: true,
      },
    }
  );

purchaseOrderSchema.index({
  vendor: 1,
  orderDate: -1,
});

purchaseOrderSchema.index({
  status: 1,
  createdAt: -1,
});

purchaseOrderSchema.pre(
  "validate",
  function () {
    this.purchaseOrderNo =
      cleanText(
        this.purchaseOrderNo
      ).toUpperCase();

    this.vendorName =
      cleanText(this.vendorName);

    this.vendorPhone =
      cleanText(this.vendorPhone);

    this.vendorEmail =
      cleanText(
        this.vendorEmail
      ).toLowerCase();

    this.vendorAddress =
      cleanText(
        this.vendorAddress
      );

    this.vendorCity =
      cleanText(this.vendorCity);

    this.vendorNtn =
      cleanText(this.vendorNtn);

    this.vendorStrn =
      cleanText(this.vendorStrn);

    this.orderDate =
      cleanText(this.orderDate);

    this.expectedDate =
      cleanText(this.expectedDate);

    this.referenceNo =
      cleanText(this.referenceNo);

    this.remarks =
      cleanText(this.remarks);

    this.taxType =
      this.taxType ===
      "with-tax"
        ? "with-tax"
        : "without-tax";

    this.taxRate =
      this.taxType ===
      "with-tax"
        ? 18
        : 0;

    this.items =
      Array.isArray(this.items)
        ? this.items
        : [];

    this.totalCartons =
      this.items.reduce(
        (sum, item) =>
          sum +
          cleanNumber(
            item.cartons
          ),
        0
      );

    this.totalQuantity =
      this.items.reduce(
        (sum, item) =>
          sum +
          cleanNumber(
            item.quantity
          ),
        0
      );

    this.subtotal =
      roundMoney(
        this.items.reduce(
          (sum, item) =>
            sum +
            roundMoney(
              cleanNumber(
                item.quantity
              ) *
                cleanNumber(
                  item.unitPrice
                )
            ),
          0
        )
      );

    this.salesTax =
      this.taxType ===
      "with-tax"
        ? roundMoney(
            this.subtotal *
              0.18
          )
        : 0;

    this.grandTotal =
      roundMoney(
        this.subtotal +
          this.salesTax
      );

    this.advance =
      roundMoney(
        this.advance
      );

    if (
      this.advance >
      this.grandTotal
    ) {
      this.invalidate(
        "advance",
        "Advance cannot exceed grand total"
      );
    }

    this.balance =
      roundMoney(
        Math.max(
          this.grandTotal -
            this.advance,
          0
        )
      );

    if (
      this.grandTotal > 0 &&
      this.balance <= 0
    ) {
      this.paymentStatus =
        "Paid";
    } else if (
      this.advance > 0
    ) {
      this.paymentStatus =
        "Partially Paid";
    } else {
      this.paymentStatus =
        "Unpaid";
    }

    const totalReceived =
      this.items.reduce(
        (sum, item) =>
          sum +
          cleanNumber(
            item.receivedQty
          ),
        0
      );

    if (
      this.status !==
      "Cancelled"
    ) {
      if (
        totalReceived >=
          this.totalQuantity &&
        this.totalQuantity > 0
      ) {
        this.status =
          "Received";
      } else if (
        totalReceived > 0
      ) {
        this.status =
          "Partially Received";
      } else if (
        [
          "Partially Received",
          "Received",
        ].includes(
          this.status
        )
      ) {
        this.status =
          "Ordered";
      }
    }
  }
);

module.exports =
  mongoose.model(
    "PurchaseOrder",
    purchaseOrderSchema
  );
