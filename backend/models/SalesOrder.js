const mongoose = require("mongoose");

const FINISHED_GOODS_GODOWN =
  "Finished Goods Godown";

const SALES_ORDER_STATUSES = [
  "Draft",
  "Confirmed",
  "In Production",
  "Ready",
  "Partially Delivered",
  "Delivered",
  "Invoiced",
  "Cancelled",
];

const TAX_TYPES = [
  "without-tax",
  "with-tax",
];

const TEXT_TYPES = [
  "",
  "with-text",
  "without-text",
];

const todayDate = () =>
  new Date()
    .toISOString()
    .slice(0, 10);

const cleanText = (
  value,
  fallback = ""
) => {
  const text = String(
    value ?? ""
  ).trim();

  return text || fallback;
};

const cleanNumber = (
  value
) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? Math.max(number, 0)
    : 0;
};

const salesOrderItemSchema =
  new mongoose.Schema(
    {
      item: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Item",

        required: [
          true,
          "Finished good item is required",
        ],

        index: true,
      },

      warehouseId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Warehouse",

        default: null,
      },

      warehouse: {
        type: String,
        trim: true,

        default:
          FINISHED_GOODS_GODOWN,
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

      availableStock: {
        type: Number,
        default: 0,
        min: [
          0,
          "Available stock cannot be negative",
        ],
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

      textType: {
        type: String,

        enum: {
          values:
            TEXT_TYPES,

          message:
            "Invalid text type",
        },

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

      deliveredQty: {
        type: Number,
        default: 0,

        min: [
          0,
          "Delivered quantity cannot be negative",
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
      versionKey: false,
    }
  );

const salesOrderSchema =
  new mongoose.Schema(
    {
      salesOrderNo: {
        type: String,

        required: [
          true,
          "Sales order number is required",
        ],

        unique: true,
        trim: true,
        uppercase: true,
      },

      customer: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Customer",

        required: [
          true,
          "Customer is required",
        ],

        index: true,
      },

      customerName: {
        type: String,

        required: [
          true,
          "Customer name is required",
        ],

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
        lowercase: true,
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

      orderDate: {
        type: String,

        required: [
          true,
          "Order date is required",
        ],

        default: todayDate,

        validate: {
          validator(value) {
            return /^\d{4}-\d{2}-\d{2}$/.test(
              value
            );
          },

          message:
            "Order date format must be YYYY-MM-DD",
        },

        index: true,
      },

      deliveryDate: {
        type: String,
        trim: true,
        default: "",

        validate: {
          validator(value) {
            return (
              !value ||
              /^\d{4}-\d{2}-\d{2}$/.test(
                value
              )
            );
          },

          message:
            "Delivery date format must be YYYY-MM-DD",
        },
      },

      poNo: {
        type: String,
        trim: true,
        default: "",
      },

      referenceNo: {
        type: String,
        trim: true,
        default: "",
      },

      taxType: {
        type: String,

        enum: {
          values:
            TAX_TYPES,

          message:
            "Invalid tax type",
        },

        default:
          "without-tax",
      },

      taxRate: {
        type: Number,
        default: 0,
        min: 0,
      },

      items: {
        type: [
          salesOrderItemSchema,
        ],

        validate: {
          validator(items) {
            return (
              Array.isArray(items) &&
              items.length > 0
            );
          },

          message:
            "At least one finished good item is required",
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
        min: 0,
      },

      balance: {
        type: Number,
        default: 0,
      },

      paymentStatus: {
        type: String,

        enum: [
          "Unpaid",
          "Partially Paid",
          "Paid",
        ],

        default:
          "Unpaid",

        index: true,
      },

      status: {
        type: String,

        enum: {
          values:
            SALES_ORDER_STATUSES,

          message:
            "Invalid sales order status",
        },

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

salesOrderSchema.index({
  customer: 1,
  orderDate: -1,
});

salesOrderSchema.index({
  status: 1,
  orderDate: -1,
});

salesOrderSchema.index({
  "items.item": 1,
  status: 1,
});

salesOrderSchema.pre(
  "validate",
  function () {
    this.salesOrderNo =
      cleanText(
        this.salesOrderNo
      ).toUpperCase();

    this.customerName =
      cleanText(
        this.customerName
      );

    this.customerPhone =
      cleanText(
        this.customerPhone
      );

    this.customerEmail =
      cleanText(
        this.customerEmail
      ).toLowerCase();

    this.customerAddress =
      cleanText(
        this.customerAddress
      );

    this.customerCity =
      cleanText(
        this.customerCity
      );

    this.orderDate =
      cleanText(
        this.orderDate,
        todayDate()
      );

    this.deliveryDate =
      cleanText(
        this.deliveryDate
      );

    this.poNo =
      cleanText(
        this.poNo
      );

    this.referenceNo =
      cleanText(
        this.referenceNo
      );

    this.taxType =
      TAX_TYPES.includes(
        this.taxType
      )
        ? this.taxType
        : "without-tax";

    this.remarks =
      cleanText(
        this.remarks
      );

    this.items = (
      Array.isArray(
        this.items
      )
        ? this.items
        : []
    ).map(
      (item) => {
        item.warehouse =
          FINISHED_GOODS_GODOWN;

        item.itemCode =
          cleanText(
            item.itemCode
          ).toUpperCase();

        item.itemName =
          cleanText(
            item.itemName
          );

        item.availableStock =
          cleanNumber(
            item.availableStock
          );

        item.description =
          cleanText(
            item.description,
            item.itemName
          );

        item.size =
          cleanText(
            item.size
          );

        item.textType =
          TEXT_TYPES.includes(
            item.textType
          )
            ? item.textType
            : "";

        item.cartons =
          cleanNumber(
            item.cartons
          );

        item.quantity =
          cleanNumber(
            item.quantity
          );

        item.deliveredQty =
          cleanNumber(
            item.deliveredQty
          );

        if (
          item.deliveredQty >
          item.quantity
        ) {
          this.invalidate(
            "items",
            `Delivered quantity cannot exceed ordered quantity for ${item.description}`
          );
        }

        item.pendingQty =
          Math.max(
            item.quantity -
              item.deliveredQty,
            0
          );

        item.unit =
          cleanText(
            item.unit,
            "Pcs"
          );

        item.unitPrice =
          cleanNumber(
            item.unitPrice
          );

        item.amount =
          item.quantity *
          item.unitPrice;

        item.remarks =
          cleanText(
            item.remarks
          );

        return item;
      }
    );

    this.totalCartons =
      this.items.reduce(
        (
          sum,
          item
        ) =>
          sum +
          cleanNumber(
            item.cartons
          ),
        0
      );

    this.totalQuantity =
      this.items.reduce(
        (
          sum,
          item
        ) =>
          sum +
          cleanNumber(
            item.quantity
          ),
        0
      );

    this.subtotal =
      this.items.reduce(
        (
          sum,
          item
        ) =>
          sum +
          cleanNumber(
            item.amount
          ),
        0
      );

    this.taxRate =
      this.taxType ===
      "with-tax"
        ? 18
        : 0;

    this.salesTax =
      this.taxType ===
      "with-tax"
        ? this.subtotal *
          0.18
        : 0;

    this.grandTotal =
      this.subtotal +
      this.salesTax;

    this.advance =
      cleanNumber(
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
      this.grandTotal -
      this.advance;

    if (
      this.advance <= 0
    ) {
      this.paymentStatus =
        "Unpaid";
    } else if (
      this.advance >=
      this.grandTotal
    ) {
      this.paymentStatus =
        "Paid";
    } else {
      this.paymentStatus =
        "Partially Paid";
    }
  }
);

module.exports =
  mongoose.model(
    "SalesOrder",
    salesOrderSchema
  );