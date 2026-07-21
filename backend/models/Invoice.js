const mongoose = require("mongoose");

const todayDate = () =>
  new Date().toISOString().slice(0, 10);

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
    (cleanNumber(value) + Number.EPSILON) * 100
  ) / 100;

const invoiceItemSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",

      required: [
        true,
        "Finished good item is required",
      ],

      index: true,
    },

    deliveryChallanItemId: {
      type: mongoose.Schema.Types.ObjectId,

      required: [
        true,
        "Delivery challan item reference is required",
      ],
    },

    salesOrderItemId: {
      type: mongoose.Schema.Types.ObjectId,

      required: [
        true,
        "Sales order item reference is required",
      ],
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
        "Invoice quantity is required",
      ],

      min: [
        0.000001,
        "Invoice quantity must be greater than zero",
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

    grossWeight: {
      type: Number,
      default: 0,

      min: [
        0,
        "Gross weight cannot be negative",
      ],
    },

    netWeight: {
      type: Number,
      default: 0,

      min: [
        0,
        "Net weight cannot be negative",
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

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNo: {
      type: String,

      required: [
        true,
        "Invoice number is required",
      ],

      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    companyName: {
      type: String,
      trim: true,
      default: "Muddasir Packages",
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

    companyNTN: {
      type: String,
      trim: true,
      default: "",
    },

    companySTRN: {
      type: String,
      trim: true,
      default: "",
    },

    deliveryChallan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryChallan",

      required: [
        true,
        "Delivery challan is required",
      ],

      index: true,
    },

    challanNo: {
      type: String,

      required: [
        true,
        "Delivery challan number is required",
      ],

      trim: true,
      uppercase: true,
    },

    salesOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder",

      required: [
        true,
        "Sales order is required",
      ],

      index: true,
    },

    salesOrderNo: {
      type: String,

      required: [
        true,
        "Sales order number is required",
      ],

      trim: true,
      uppercase: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
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

    customerNTN: {
      type: String,
      trim: true,
      default: "",
    },

    customerSTRN: {
      type: String,
      trim: true,
      default: "",
    },

    invoiceDate: {
      type: String,

      required: [
        true,
        "Invoice date is required",
      ],

      default: todayDate,

      validate: {
        validator(value) {
          return /^\d{4}-\d{2}-\d{2}$/.test(
            value
          );
        },

        message:
          "Invoice date format must be YYYY-MM-DD",
      },

      index: true,
    },

    dueDate: {
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
          "Due date format must be YYYY-MM-DD",
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

      enum: [
        "without-tax",
        "with-tax",
      ],

      default: "without-tax",
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
        "Tax rate cannot exceed 100",
      ],
    },

    paymentTerms: {
      type: String,
      trim: true,
      default: "Due on Receipt",
    },

    preparedBy: {
      type: String,
      trim: true,
      default: "",
    },

    items: {
      type: [
        invoiceItemSchema,
      ],

      validate: {
        validator(items) {
          return (
            Array.isArray(items) &&
            items.length > 0
          );
        },

        message:
          "At least one invoice item is required",
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
        "Issued",
        "Paid",
        "Cancelled",
      ],

      default: "Draft",
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    issuedAt: {
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

      maxlength: [
        1000,
        "Cancel reason cannot exceed 1000 characters",
      ],
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

invoiceSchema.index(
  {
    deliveryChallan: 1,
    isActive: 1,
  },
  {
    unique: true,

    partialFilterExpression: {
      isActive: true,
    },

    name:
      "unique_active_invoice_per_challan",
  }
);

invoiceSchema.index({
  customer: 1,
  invoiceDate: -1,
});

invoiceSchema.index({
  salesOrder: 1,
  status: 1,
});

invoiceSchema.pre(
  "validate",
  function () {
    this.invoiceNo =
      cleanText(
        this.invoiceNo
      ).toUpperCase();

    this.companyName =
      cleanText(
        this.companyName,
        "Muddasir Packages"
      );

    this.companyAddress =
      cleanText(
        this.companyAddress
      );

    this.companyPhone =
      cleanText(
        this.companyPhone
      );

    this.companyNTN =
      cleanText(
        this.companyNTN
      );

    this.companySTRN =
      cleanText(
        this.companySTRN
      );

    this.challanNo =
      cleanText(
        this.challanNo
      ).toUpperCase();

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

    this.customerNTN =
      cleanText(
        this.customerNTN
      );

    this.customerSTRN =
      cleanText(
        this.customerSTRN
      );

    this.invoiceDate =
      cleanText(
        this.invoiceDate,
        todayDate()
      );

    this.dueDate =
      cleanText(
        this.dueDate
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
      this.taxType ===
      "with-tax"
        ? "with-tax"
        : "without-tax";

    this.taxRate =
      this.taxType ===
      "with-tax"
        ? Math.min(
            cleanNumber(
              this.taxRate ||
                18
            ),
            100
          )
        : 0;

    this.paymentTerms =
      cleanText(
        this.paymentTerms,
        "Due on Receipt"
      );

    this.preparedBy =
      cleanText(
        this.preparedBy
      );

    this.cancelReason =
      cleanText(
        this.cancelReason
      );

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
        item.itemCode =
          cleanText(
            item.itemCode
          ).toUpperCase();

        item.itemName =
          cleanText(
            item.itemName
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

        item.cartons =
          cleanNumber(
            item.cartons
          );

        item.quantity =
          cleanNumber(
            item.quantity
          );

        item.unit =
          cleanText(
            item.unit,
            "Pcs"
          );

        item.unitPrice =
          roundMoney(
            item.unitPrice
          );

        item.grossWeight =
          cleanNumber(
            item.grossWeight
          );

        item.netWeight =
          cleanNumber(
            item.netWeight
          );

        item.remarks =
          cleanText(
            item.remarks
          );

        if (
          item.grossWeight >
            0 &&
          item.netWeight >
            item.grossWeight
        ) {
          this.invalidate(
            "items",
            `Net weight cannot exceed gross weight for ${item.description}`
          );
        }

        item.amount =
          roundMoney(
            item.quantity *
              item.unitPrice
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

    this.totalGrossWeight =
      this.items.reduce(
        (
          sum,
          item
        ) =>
          sum +
          cleanNumber(
            item.grossWeight
          ),
        0
      );

    this.totalNetWeight =
      this.items.reduce(
        (
          sum,
          item
        ) =>
          sum +
          cleanNumber(
            item.netWeight
          ),
        0
      );

    this.subtotal =
      roundMoney(
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
        )
      );

    this.salesTax =
      this.taxType ===
      "with-tax"
        ? roundMoney(
            this.subtotal *
              (
                this.taxRate /
                100
              )
          )
        : 0;

    this.grandTotal =
      roundMoney(
        this.subtotal +
          this.salesTax
      );

    this.paidAmount =
      roundMoney(
        this.paidAmount
      );

    if (
      this.paidAmount >
      this.grandTotal
    ) {
      this.invalidate(
        "paidAmount",
        "Paid amount cannot exceed grand total"
      );
    }

    this.balance =
      roundMoney(
        this.grandTotal -
          this.paidAmount
      );

    if (
      this.grandTotal >
        0 &&
      this.balance <= 0
    ) {
      this.paymentStatus =
        "Paid";

      if (
        this.status !==
        "Cancelled"
      ) {
        this.status =
          "Paid";
      }
    } else if (
      this.paidAmount > 0
    ) {
      this.paymentStatus =
        "Partially Paid";

      if (
        this.status ===
        "Paid"
      ) {
        this.status =
          "Issued";
      }
    } else {
      this.paymentStatus =
        "Unpaid";

      if (
        this.status ===
        "Paid"
      ) {
        this.status =
          "Issued";
      }
    }

    this.isActive =
      this.status !==
      "Cancelled";
  }
);

module.exports =
  mongoose.model(
    "Invoice",
    invoiceSchema
  );