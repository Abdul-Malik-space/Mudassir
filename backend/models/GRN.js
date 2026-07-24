const mongoose = require("mongoose");

const RAW_MATERIAL_GODOWN = "Raw Material Godown";
const FINISHED_GOODS_GODOWN = "Finished Goods Godown";
const MULTIPLE_WAREHOUSES = "Multiple Warehouses";

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

const SUPPORTED_ITEM_TYPES = [
  "Raw Material",
  "Packing Material",
  "Consumable",
  "Finished Good",
];

const RECEIPT_TYPES = [
  "Raw Material",
  "Finished Good",
  "Mixed",
];

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

const normalizeStatus = (value) => {
  const status = cleanText(value, "Draft");

  if (status === "Partial") {
    return "Partially Received";
  }

  if (status === "Complete") {
    return "Completed";
  }

  return GRN_STATUSES.includes(status)
    ? status
    : "Draft";
};

const normalizeInspectionStatus = (value) => {
  const status = cleanText(value, "Pending");

  if (status === "Partial") {
    return "Partially Accepted";
  }

  if (status === "Failed") {
    return "Rejected";
  }

  return INSPECTION_STATUSES.includes(status)
    ? status
    : "Pending";
};

const warehouseForItemType = (itemType) =>
  itemType === "Finished Good"
    ? FINISHED_GOODS_GODOWN
    : RAW_MATERIAL_GODOWN;

const grnItemSchema = new mongoose.Schema(
  {
    purchaseOrderItemId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: [
        true,
        "Item Master reference is required",
      ],
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

    itemType: {
      type: String,

      enum: {
        values: SUPPORTED_ITEM_TYPES,

        message:
          "GRN supports Raw Material, Packing Material, Consumable and Finished Good items only",
      },

      required: [
        true,
        "Item type is required",
      ],

      index: true,
    },

    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",

      required: [
        true,
        "Target warehouse is required",
      ],

      index: true,
    },

    warehouse: {
      type: String,

      required: [
        true,
        "Target warehouse name is required",
      ],

      trim: true,
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
    _id: true,
    id: false,
    versionKey: false,
  }
);

grnItemSchema.pre("validate", function () {
  this.itemCode = cleanText(
    this.itemCode
  ).toUpperCase();

  this.itemName = cleanText(
    this.itemName
  );

  this.itemType = cleanText(
    this.itemType
  );

  this.warehouse = cleanText(
    this.warehouse,
    warehouseForItemType(this.itemType)
  );

  this.description = cleanText(
    this.description,
    this.itemName
  );

  this.size = cleanText(
    this.size
  );

  this.unit = cleanText(
    this.unit,
    "Pcs"
  );

  this.remarks = cleanText(
    this.remarks
  );

  this.orderedQty = cleanNumber(
    this.orderedQty
  );

  this.previousReceivedQty = cleanNumber(
    this.previousReceivedQty
  );

  this.receivedQty = cleanNumber(
    this.receivedQty
  );

  this.rejectedQty = cleanNumber(
    this.rejectedQty
  );

  this.unitPrice = cleanNumber(
    this.unitPrice
  );

  if (
    this.rejectedQty >
    this.receivedQty
  ) {
    this.invalidate(
      "rejectedQty",
      "Rejected quantity cannot exceed received quantity"
    );
  }

  this.acceptedQty = Math.max(
    this.receivedQty -
      this.rejectedQty,
    0
  );

  const totalAccepted =
    this.previousReceivedQty +
    this.acceptedQty;

  if (
    totalAccepted >
    this.orderedQty
  ) {
    this.invalidate(
      "acceptedQty",
      `Accepted quantity cannot exceed ordered quantity for ${this.description}`
    );
  }

  this.pendingQty = Math.max(
    this.orderedQty -
      totalAccepted,
    0
  );

  this.amount =
    this.acceptedQty *
    this.unitPrice;
});

const grnSchema = new mongoose.Schema(
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
      maxlength: 50,
      index: true,
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
          "Received date format must be YYYY-MM-DD",
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

    receiptType: {
      type: String,
      enum: RECEIPT_TYPES,
      default: "Raw Material",
      index: true,
    },

    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      default: null,
      index: true,
    },

    warehouse: {
      type: String,
      trim: true,
      default: RAW_MATERIAL_GODOWN,
      index: true,
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
        values: INSPECTION_STATUSES,
        message: "Invalid inspection status",
      },

      default: "Pending",
      index: true,
    },

    status: {
      type: String,

      enum: {
        values: GRN_STATUSES,
        message: "Invalid GRN status",
      },

      default: "Draft",
      index: true,
    },

    purchaseStatus: {
      type: String,

      enum: {
        values: PURCHASE_STATUSES,
        message: "Invalid GRN purchase status",
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

    stockPosted: {
      type: Boolean,
      default: false,
      index: true,
    },

    stockPostedAt: {
      type: Date,
      default: null,
    },

    reversalPosted: {
      type: Boolean,
      default: false,
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
  receivedDate: -1,
});

grnSchema.index({
  "items.item": 1,
  "items.warehouseId": 1,
});

grnSchema.pre("validate", function () {
  this.grnNo = cleanText(
    this.grnNo
  ).toUpperCase();

  this.purchaseOrderNo = cleanText(
    this.purchaseOrderNo
  ).toUpperCase();

  this.vendorName = cleanText(
    this.vendorName
  );

  this.vendorPhone = cleanText(
    this.vendorPhone
  );

  this.vendorEmail = cleanText(
    this.vendorEmail
  ).toLowerCase();

  this.vendorAddress = cleanText(
    this.vendorAddress
  );

  this.receivedDate = cleanText(
    this.receivedDate,
    todayDate()
  );

  this.challanNo = cleanText(
    this.challanNo
  );

  this.invoiceNo = cleanText(
    this.invoiceNo
  );

  this.vehicleNo = cleanText(
    this.vehicleNo
  ).toUpperCase();

  this.receivedBy = cleanText(
    this.receivedBy
  );

  this.checkedBy = cleanText(
    this.checkedBy
  );

  this.status = normalizeStatus(
    this.status
  );

  this.inspectionStatus =
    normalizeInspectionStatus(
      this.inspectionStatus
    );

  this.purchaseStatus =
    PURCHASE_STATUSES.includes(
      this.purchaseStatus
    )
      ? this.purchaseStatus
      : "Not Purchased";

  this.cancelReason = cleanText(
    this.cancelReason
  );

  this.remarks = cleanText(
    this.remarks
  );

  const rows = Array.isArray(
    this.items
  )
    ? this.items
    : [];

  const warehouseNames = [
    ...new Set(
      rows
        .map((item) =>
          cleanText(item.warehouse)
        )
        .filter(Boolean)
    ),
  ];

  const warehouseIds = [
    ...new Set(
      rows
        .map((item) =>
          item.warehouseId
            ? String(item.warehouseId)
            : ""
        )
        .filter(Boolean)
    ),
  ];

  const containsFinishedGood =
    rows.some(
      (item) =>
        item.itemType ===
        "Finished Good"
    );

  const containsRawMaterial =
    rows.some(
      (item) =>
        item.itemType !==
        "Finished Good"
    );

  this.receiptType =
    containsFinishedGood &&
    containsRawMaterial
      ? "Mixed"
      : containsFinishedGood
        ? "Finished Good"
        : "Raw Material";

  this.warehouse =
    warehouseNames.length === 1
      ? warehouseNames[0]
      : warehouseNames.length > 1
        ? MULTIPLE_WAREHOUSES
        : RAW_MATERIAL_GODOWN;

  this.warehouseId =
    warehouseIds.length === 1
      ? warehouseIds[0]
      : null;

  this.totalOrderedQty =
    rows.reduce(
      (sum, item) =>
        sum +
        cleanNumber(
          item.orderedQty
        ),
      0
    );

  this.totalReceivedQty =
    rows.reduce(
      (sum, item) =>
        sum +
        cleanNumber(
          item.receivedQty
        ),
      0
    );

  this.totalRejectedQty =
    rows.reduce(
      (sum, item) =>
        sum +
        cleanNumber(
          item.rejectedQty
        ),
      0
    );

  this.totalAcceptedQty =
    rows.reduce(
      (sum, item) =>
        sum +
        cleanNumber(
          item.acceptedQty
        ),
      0
    );

  this.totalPendingQty =
    rows.reduce(
      (sum, item) =>
        sum +
        cleanNumber(
          item.pendingQty
        ),
      0
    );

  this.subtotal =
    rows.reduce(
      (sum, item) =>
        sum +
        cleanNumber(
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
      "Rejected GRN must have zero accepted quantity"
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
});

grnSchema
  .virtual("hasAcceptedStock")
  .get(function () {
    return (
      Number(
        this.totalAcceptedQty ||
          0
      ) > 0
    );
  });

module.exports =
  mongoose.model(
    "GRN",
    grnSchema
  );