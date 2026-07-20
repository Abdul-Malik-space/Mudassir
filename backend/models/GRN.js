const mongoose = require("mongoose");

const GRN_STATUSES = [
  "Draft",
  "Received",
  "Partially Received",
  "Completed",
  "Posted",
  "Cancelled",
];

const INSPECTION_STATUSES = [
  "Pending",
  "Passed",
  "Partially Accepted",
  "Rejected",
];

const PURCHASE_STATUSES = [
  "Not Purchased",
  "Purchased",
];

const todayDate = () =>
  new Date().toISOString().slice(0, 10);

const normalizeText = (
  value,
  fallback = ""
) => {
  const cleanedValue = String(
    value || ""
  ).trim();

  return cleanedValue || fallback;
};

const normalizeNumber = (
  value,
  fallback = 0
) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
};

const normalizeStatus = (value) => {
  const status = normalizeText(
    value,
    "Draft"
  );

  if (status === "Partial") {
    return "Partially Received";
  }

  if (status === "Complete") {
    return "Completed";
  }

  return status;
};

const normalizeInspectionStatus = (
  value
) => {
  const status = normalizeText(
    value,
    "Pending"
  );

  if (status === "Partial") {
    return "Partially Accepted";
  }

  if (status === "Failed") {
    return "Rejected";
  }

  return status;
};

/*
|--------------------------------------------------------------------------
| GRN Item Schema
|--------------------------------------------------------------------------
*/

const grnItemSchema =
  new mongoose.Schema(
    {
      /*
       * Purchase Order کے embedded item کی ID۔
       * اس سے معلوم ہوگا کہ GRN کی یہ line
       * Purchase Order کی کس line سے متعلق ہے۔
       */
      purchaseOrderItemId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },

      /*
       * اصل Item Master link۔
       * Stock Ledger اسی ObjectId کے ذریعے بنے گا۔
       */
      item: {
        type: mongoose.Schema.Types.ObjectId,
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
        maxlength: [
          250,
          "Item description cannot exceed 250 characters",
        ],
      },

      size: {
        type: String,
        trim: true,
        default: "",
        maxlength: [
          100,
          "Item size cannot exceed 100 characters",
        ],
      },

      orderedQty: {
        type: Number,
        default: 0,
        min: [
          0,
          "Ordered quantity cannot be negative",
        ],
      },

      /*
       * پہلے بنے ہوئے GRNs میں accepted quantity۔
       */
      previousReceivedQty: {
        type: Number,
        default: 0,
        min: [
          0,
          "Previous received quantity cannot be negative",
        ],
      },

      receivedQty: {
        type: Number,
        required: [
          true,
          "Received quantity is required",
        ],
        min: [
          0,
          "Received quantity cannot be negative",
        ],
      },

      rejectedQty: {
        type: Number,
        default: 0,
        min: [
          0,
          "Rejected quantity cannot be negative",
        ],
      },

      acceptedQty: {
        type: Number,
        default: 0,
        min: [
          0,
          "Accepted quantity cannot be negative",
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
        maxlength: [
          30,
          "Item unit cannot exceed 30 characters",
        ],
      },

      unitPrice: {
        type: Number,
        default: 0,
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
          500,
          "Item remarks cannot exceed 500 characters",
        ],
      },
    },
    {
      /*
       * ہر GRN line کی اپنی _id ضروری ہے۔
       * یہی Stock Ledger referenceLineId میں استعمال ہوگی۔
       */
      _id: true,
      id: false,
    }
  );

/*
 * Mongoose 9 synchronous middleware:
 * یہاں next() استعمال نہیں ہوگا۔
 */
grnItemSchema.pre(
  "validate",
  function () {
    this.description = normalizeText(
      this.description
    );

    this.size = normalizeText(
      this.size
    );

    this.unit = normalizeText(
      this.unit,
      "Pcs"
    );

    this.remarks = normalizeText(
      this.remarks
    );

    this.orderedQty = normalizeNumber(
      this.orderedQty
    );

    this.previousReceivedQty =
      normalizeNumber(
        this.previousReceivedQty
      );

    this.receivedQty = normalizeNumber(
      this.receivedQty
    );

    this.rejectedQty = normalizeNumber(
      this.rejectedQty
    );

    this.unitPrice = normalizeNumber(
      this.unitPrice
    );

    if (
      this.rejectedQty >
      this.receivedQty
    ) {
      this.invalidate(
        "rejectedQty",
        "Rejected quantity received quantity se zyada nahi ho sakti"
      );
    }

    this.acceptedQty = Math.max(
      this.receivedQty -
        this.rejectedQty,
      0
    );

    const totalPreviouslyAccepted =
      this.previousReceivedQty +
      this.acceptedQty;

    this.pendingQty = Math.max(
      this.orderedQty -
        totalPreviouslyAccepted,
      0
    );

    this.amount =
      this.acceptedQty *
      this.unitPrice;
  }
);

/*
|--------------------------------------------------------------------------
| Main GRN Schema
|--------------------------------------------------------------------------
*/

const grnSchema =
  new mongoose.Schema(
    {
      grnNo: {
        type: String,
        required: [
          true,
          "GRN number is required",
        ],
        unique: true,
        trim: true,
        uppercase: true,
        maxlength: [
          50,
          "GRN number cannot exceed 50 characters",
        ],
      },

      purchaseOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PurchaseOrder",
        required: [
          true,
          "Purchase Order is required",
        ],
        index: true,
      },

      purchaseOrderNo: {
        type: String,
        required: [
          true,
          "Purchase Order number is required",
        ],
        trim: true,
        uppercase: true,
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

      /*
       * Vendor snapshots محفوظ رکھے جائیں گے۔
       */
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

      receivedDate: {
        type: String,
        required: [
          true,
          "Received date is required",
        ],
        default: todayDate,
        validate: {
          validator(value) {
            return /^\d{4}-\d{2}-\d{2}$/.test(
              value
            );
          },
          message:
            "Received date format YYYY-MM-DD hona chahiye",
        },
        index: true,
      },

      challanNo: {
        type: String,
        trim: true,
        default: "",
      },

      invoiceNo: {
        type: String,
        trim: true,
        default: "",
      },

      vehicleNo: {
        type: String,
        trim: true,
        uppercase: true,
        default: "",
      },

      /*
       * اصل Warehouse document link۔
       */
      warehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Warehouse",
        default: null,
        index: true,
      },

      /*
       * Warehouse name snapshot۔
       * GRN عام طور پر Raw Material Godown میں جائے گا۔
       */
      warehouse: {
        type: String,
        required: [
          true,
          "Warehouse is required",
        ],
        trim: true,
        default: "Raw Material Godown",
      },

      receivedBy: {
        type: String,
        trim: true,
        default: "",
      },

      checkedBy: {
        type: String,
        trim: true,
        default: "",
      },

      inspectionStatus: {
        type: String,
        enum: {
          values:
            INSPECTION_STATUSES,
          message:
            "Invalid inspection status",
        },
        default: "Pending",
        index: true,
      },

      status: {
        type: String,
        enum: {
          values: GRN_STATUSES,
          message:
            "Invalid GRN status",
        },
        default: "Draft",
        index: true,
      },

      purchaseStatus: {
        type: String,
        enum: {
          values: PURCHASE_STATUSES,
          message:
            "Invalid GRN purchase status",
        },
        default: "Not Purchased",
        index: true,
      },

      items: {
        type: [grnItemSchema],
        validate: {
          validator(items) {
            return (
              Array.isArray(items) &&
              items.length > 0
            );
          },
          message:
            "At least one GRN item is required",
        },
      },

      totalOrderedQty: {
        type: Number,
        default: 0,
        min: 0,
      },

      totalReceivedQty: {
        type: Number,
        default: 0,
        min: 0,
      },

      totalRejectedQty: {
        type: Number,
        default: 0,
        min: 0,
      },

      totalAcceptedQty: {
        type: Number,
        default: 0,
        min: 0,
      },

      totalPendingQty: {
        type: Number,
        default: 0,
        min: 0,
      },

      subtotal: {
        type: Number,
        default: 0,
        min: 0,
      },

      /*
       * Stock Ledger میں GRN posting ہوچکی ہے یا نہیں۔
       */
      stockPosted: {
        type: Boolean,
        default: false,
        index: true,
      },

      stockPostedAt: {
        type: Date,
        default: null,
      },

      cancelledAt: {
        type: Date,
        default: null,
      },

      remarks: {
        type: String,
        trim: true,
        default: "",
        maxlength: [
          1000,
          "GRN remarks cannot exceed 1000 characters",
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

grnSchema.index({
  purchaseOrder: 1,
  status: 1,
});

grnSchema.index({
  vendor: 1,
  receivedDate: 1,
});

grnSchema.index({
  warehouseId: 1,
  receivedDate: 1,
});

/*
 * Mongoose 9 synchronous middleware۔
 */
grnSchema.pre(
  "validate",
  function () {
    this.grnNo = normalizeText(
      this.grnNo
    ).toUpperCase();

    this.purchaseOrderNo =
      normalizeText(
        this.purchaseOrderNo
      ).toUpperCase();

    this.vendorName =
      normalizeText(
        this.vendorName
      );

    this.vendorPhone =
      normalizeText(
        this.vendorPhone
      );

    this.vendorEmail =
      normalizeText(
        this.vendorEmail
      ).toLowerCase();

    this.vendorAddress =
      normalizeText(
        this.vendorAddress
      );

    this.receivedDate =
      normalizeText(
        this.receivedDate,
        todayDate()
      );

    this.challanNo =
      normalizeText(
        this.challanNo
      );

    this.invoiceNo =
      normalizeText(
        this.invoiceNo
      );

    this.vehicleNo =
      normalizeText(
        this.vehicleNo
      ).toUpperCase();

    this.warehouse =
      normalizeText(
        this.warehouse,
        "Raw Material Godown"
      );

    this.receivedBy =
      normalizeText(
        this.receivedBy
      );

    this.checkedBy =
      normalizeText(
        this.checkedBy
      );

    this.status = normalizeStatus(
      this.status
    );

    this.inspectionStatus =
      normalizeInspectionStatus(
        this.inspectionStatus
      );

    this.remarks =
      normalizeText(
        this.remarks
      );

    const rows = Array.isArray(
      this.items
    )
      ? this.items
      : [];

    this.totalOrderedQty =
      rows.reduce(
        (sum, item) =>
          sum +
          normalizeNumber(
            item.orderedQty
          ),
        0
      );

    this.totalReceivedQty =
      rows.reduce(
        (sum, item) =>
          sum +
          normalizeNumber(
            item.receivedQty
          ),
        0
      );

    this.totalRejectedQty =
      rows.reduce(
        (sum, item) =>
          sum +
          normalizeNumber(
            item.rejectedQty
          ),
        0
      );

    this.totalAcceptedQty =
      rows.reduce(
        (sum, item) =>
          sum +
          normalizeNumber(
            item.acceptedQty
          ),
        0
      );

    this.totalPendingQty =
      rows.reduce(
        (sum, item) =>
          sum +
          normalizeNumber(
            item.pendingQty
          ),
        0
      );

    this.subtotal = rows.reduce(
      (sum, item) =>
        sum +
        normalizeNumber(
          item.amount
        ),
      0
    );

    if (
      this.inspectionStatus ===
        "Rejected" &&
      this.totalAcceptedQty > 0
    ) {
      this.invalidate(
        "inspectionStatus",
        "Rejected GRN mein accepted quantity zero honi chahiye"
      );
    }

    if (
      this.status ===
      "Cancelled"
    ) {
      this.cancelledAt =
        this.cancelledAt ||
        new Date();
    }
  }
);

grnSchema.virtual(
  "hasAcceptedStock"
).get(function () {
  return (
    Number(
      this.totalAcceptedQty || 0
    ) > 0
  );
});

module.exports = mongoose.model(
  "GRN",
  grnSchema
);