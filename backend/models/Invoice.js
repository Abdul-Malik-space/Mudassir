const mongoose = require("mongoose");

const COMPANY_PROFILES = {
  topical: {
    key: "topical",
    name: "TOPICAL PACKAGING PVT. LTD.",
    shortName: "Topical Packaging",
    templateType: "detailed",
    codePrefix: "TP-INV",
    address: "21-Km, Ferozepur Road, Lahore, Pakistan",
    phone: "+92 321 9970676",
    salesTaxRegNo: "32-77-8762-085-29",
    nationalTaxNo: "6620209-3",
  },

  alKaram: {
    key: "alKaram",
    name: "AL-KARAM TRADERS",
    shortName: "Al-Karam Traders",
    templateType: "compact",
    codePrefix: "AK-INV",
    address:
      "Office #17, 3rd Floor, Gohar Centre, Wahdat Road, Lahore",
    phone: "0423 5912858 | 0333 8295065",
    salesTaxRegNo: "",
    nationalTaxNo: "",
  },
};

const normalizeProfileKey = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");

  if (normalized === "alkaram") {
    return "alKaram";
  }

  return "topical";
};

const cleanText = (value, fallback = "") =>
  String(value ?? fallback).trim();

const cleanNumber = (value) => {
  const parsed = Number(value || 0);

  return Number.isFinite(parsed)
    ? Math.max(parsed, 0)
    : 0;
};

const roundMoney = (value) =>
  Math.round(
    (Number(value || 0) + Number.EPSILON) * 100
  ) / 100;

/*
|--------------------------------------------------------------------------
| Invoice Item Schema
|--------------------------------------------------------------------------
*/

const invoiceItemSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      default: null,
    },

    deliveryChallanItemId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    salesOrderItemId: {
      type: mongoose.Schema.Types.ObjectId,
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

    textType: {
      type: String,
      enum: [
        "",
        "with-text",
        "without-text",
      ],
      default: "",
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

    packing: {
      type: String,
      trim: true,
      default: "",
    },

    quantity: {
      type: Number,
      required: [
        true,
        "Quantity is required",
      ],
      min: 0,
    },

    unit: {
      type: String,
      trim: true,
      default: "Rolls",
    },

    unitPrice: {
      type: Number,
      required: [
        true,
        "Unit price is required",
      ],
      min: 0,
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
    _id: true,
  }
);

/*
|--------------------------------------------------------------------------
| Main Invoice Schema
|--------------------------------------------------------------------------
*/

const invoiceSchema = new mongoose.Schema(
  {
    companyProfile: {
      type: String,
      enum: [
        "topical",
        "alKaram",
      ],
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

    templateType: {
      type: String,
      enum: [
        "detailed",
        "compact",
      ],
      required: true,
    },

    invoiceNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    deliveryChallan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryChallan",
      required: [
        true,
        "Delivery Challan is required",
      ],
      index: true,
    },

    challanNo: {
      type: String,
      required: true,
      trim: true,
    },

    salesOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder",
      required: [
        true,
        "Sales Order is required",
      ],
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
      required: [
        true,
        "Customer is required",
      ],
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
      index: true,
    },

    dueDate: {
      type: String,
      trim: true,
      default: "",
    },

    poNo: {
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
      index: true,
    },

    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    salesTaxRegNo: {
      type: String,
      trim: true,
      default: "",
    },

    nationalTaxNo: {
      type: String,
      trim: true,
      default: "",
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
      type: [invoiceItemSchema],

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

    amountInWords: {
      type: String,
      trim: true,
      default: "",
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

    /*
    |--------------------------------------------------------------------------
    | Active invoice indicator
    |--------------------------------------------------------------------------
    |
    | A cancelled invoice becomes inactive.
    | This allows another invoice to be created from the same challan later.
    |
    */

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

/*
|--------------------------------------------------------------------------
| Normalize Invoice Before Validation
|--------------------------------------------------------------------------
*/

const normalizeInvoice = (invoice) => {
  const profileKey =
    normalizeProfileKey(
      invoice.companyProfile
    );

  const profile =
    COMPANY_PROFILES[profileKey];

  invoice.companyProfile =
    profile.key;

  invoice.companyName =
    profile.name;

  invoice.companyShortName =
    profile.shortName;

  invoice.companyAddress =
    profile.address;

  invoice.companyPhone =
    profile.phone;

  invoice.templateType =
    profile.templateType;

  invoice.invoiceNo =
    cleanText(
      invoice.invoiceNo
    ).toUpperCase();

  invoice.challanNo =
    cleanText(
      invoice.challanNo
    );

  invoice.salesOrderNo =
    cleanText(
      invoice.salesOrderNo
    );

  invoice.customerName =
    cleanText(
      invoice.customerName
    );

  invoice.customerPhone =
    cleanText(
      invoice.customerPhone
    );

  invoice.customerEmail =
    cleanText(
      invoice.customerEmail
    );

  invoice.customerAddress =
    cleanText(
      invoice.customerAddress
    );

  invoice.customerCity =
    cleanText(
      invoice.customerCity
    );

  invoice.customerNTN =
    cleanText(
      invoice.customerNTN
    );

  invoice.customerSTRN =
    cleanText(
      invoice.customerSTRN
    );

  invoice.invoiceDate =
    cleanText(
      invoice.invoiceDate
    );

  invoice.dueDate =
    cleanText(
      invoice.dueDate
    );

  invoice.poNo =
    cleanText(
      invoice.poNo
    );

  invoice.paymentTerms =
    cleanText(
      invoice.paymentTerms,
      "Due on Receipt"
    ) || "Due on Receipt";

  invoice.preparedBy =
    cleanText(
      invoice.preparedBy
    );

  invoice.remarks =
    cleanText(
      invoice.remarks
    );

  invoice.taxType =
    invoice.taxType === "with-tax"
      ? "with-tax"
      : "without-tax";

  invoice.taxRate =
    invoice.taxType === "with-tax"
      ? cleanNumber(
          invoice.taxRate
        )
      : 0;

  invoice.salesTaxRegNo =
    cleanText(
      invoice.salesTaxRegNo,
      profile.salesTaxRegNo
    );

  invoice.nationalTaxNo =
    cleanText(
      invoice.nationalTaxNo,
      profile.nationalTaxNo
    );

  const items = Array.isArray(
    invoice.items
  )
    ? invoice.items
    : [];

  invoice.items = items.map(
    (item) => {
      const quantity =
        cleanNumber(
          item.quantity
        );

      const unitPrice =
        cleanNumber(
          item.unitPrice
        );

      const grossWeight =
        cleanNumber(
          item.grossWeight
        );

      const netWeight =
        cleanNumber(
          item.netWeight
        );

      if (
        grossWeight > 0 &&
        netWeight > grossWeight
      ) {
        throw new Error(
          `Net weight cannot exceed gross weight for item "${cleanText(
            item.description,
            "Unnamed item"
          )}"`
        );
      }

      item.description =
        cleanText(
          item.description
        );

      item.size =
        cleanText(
          item.size
        );

      item.textType = [
        "",
        "with-text",
        "without-text",
      ].includes(
        item.textType
      )
        ? item.textType
        : "";

      item.cartons =
        cleanNumber(
          item.cartons
        );

      item.rolls =
        cleanNumber(
          item.rolls
        );

      item.packing =
        cleanText(
          item.packing
        );

      item.quantity =
        quantity;

      item.unit =
        cleanText(
          item.unit,
          "Rolls"
        ) || "Rolls";

      item.unitPrice =
        unitPrice;

      item.grossWeight =
        grossWeight;

      item.netWeight =
        netWeight;

      item.amount =
        roundMoney(
          quantity * unitPrice
        );

      item.remarks =
        cleanText(
          item.remarks
        );

      return item;
    }
  );

  invoice.totalCartons =
    invoice.items.reduce(
      (sum, item) =>
        sum +
        cleanNumber(
          item.cartons
        ),
      0
    );

  invoice.totalRolls =
    invoice.items.reduce(
      (sum, item) =>
        sum +
        cleanNumber(
          item.rolls
        ),
      0
    );

  invoice.totalQuantity =
    invoice.items.reduce(
      (sum, item) =>
        sum +
        cleanNumber(
          item.quantity
        ),
      0
    );

  invoice.totalGrossWeight =
    invoice.items.reduce(
      (sum, item) =>
        sum +
        cleanNumber(
          item.grossWeight
        ),
      0
    );

  invoice.totalNetWeight =
    invoice.items.reduce(
      (sum, item) =>
        sum +
        cleanNumber(
          item.netWeight
        ),
      0
    );

  invoice.subtotal =
    roundMoney(
      invoice.items.reduce(
        (sum, item) =>
          sum +
          cleanNumber(
            item.amount
          ),
        0
      )
    );

  invoice.salesTax =
    invoice.taxType === "with-tax"
      ? roundMoney(
          invoice.subtotal *
            (invoice.taxRate /
              100)
        )
      : 0;

  invoice.grandTotal =
    roundMoney(
      invoice.subtotal +
        invoice.salesTax
    );

  invoice.paidAmount =
    cleanNumber(
      invoice.paidAmount
    );

  if (
    invoice.paidAmount >
    invoice.grandTotal
  ) {
    throw new Error(
      "Paid amount cannot exceed grand total"
    );
  }

  invoice.balance =
    roundMoney(
      invoice.grandTotal -
        invoice.paidAmount
    );

  if (
    invoice.grandTotal > 0 &&
    invoice.balance <= 0
  ) {
    invoice.paymentStatus =
      "Paid";
  } else if (
    invoice.paidAmount > 0
  ) {
    invoice.paymentStatus =
      "Partially Paid";
  } else {
    invoice.paymentStatus =
      "Unpaid";
  }

  if (
    invoice.status !==
      "Cancelled" &&
    invoice.paymentStatus ===
      "Paid"
  ) {
    invoice.status = "Paid";
  }

  invoice.isActive =
    invoice.status !==
    "Cancelled";
};

/*
|--------------------------------------------------------------------------
| Model Middleware
|--------------------------------------------------------------------------
*/

invoiceSchema.pre(
  "validate",
  function preValidate() {
    normalizeInvoice(this);
  }
);

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

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
  companyProfile: 1,
  createdAt: -1,
});

invoiceSchema.index({
  salesOrder: 1,
  status: 1,
});

invoiceSchema.index({
  customer: 1,
  invoiceDate: -1,
});

const Invoice = mongoose.model(
  "Invoice",
  invoiceSchema
);

Invoice.COMPANY_PROFILES =
  COMPANY_PROFILES;

Invoice.normalizeProfileKey =
  normalizeProfileKey;

module.exports = Invoice;