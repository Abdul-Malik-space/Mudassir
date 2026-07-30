const mongoose = require("mongoose");

const FINISHED_GOODS_GODOWN = "Finished Goods Godown";

const ISSUING_COMPANIES = [
  "TOPICAL PACKAGING.PVT.LTD",
  "AL-KARAM-TRADERS",
];

const TAX_TYPES = [
  "without-tax",
  "with-tax",
];

const normalizeIssuingCompany = (
  value,
  taxType = "without-tax"
) => {
  const company = cleanText(
    value
  ).toUpperCase();

  if (
    ISSUING_COMPANIES.includes(
      company
    )
  ) {
    return company;
  }

  return taxType === "with-tax"
    ? "TOPICAL PACKAGING.PVT.LTD"
    : "AL-KARAM-TRADERS";
};

const taxTypeForCompany = (
  company
) =>
  normalizeIssuingCompany(
    company
  ) ===
  "TOPICAL PACKAGING.PVT.LTD"
    ? "with-tax"
    : "without-tax";

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

const deliveryChallanItemSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: [true, "Finished good item is required"],
      index: true,
    },

    salesOrderItemId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    productionOutput: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReadyProduct",
      default: null,
      index: true,
    },

    productionJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductionItem",
      default: null,
      index: true,
    },

    productionOutputNo: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    productionJobNo: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      default: null,
    },

    warehouse: {
      type: String,
      trim: true,
      default: FINISHED_GOODS_GODOWN,
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
    },

    size: {
      type: String,
      trim: true,
      default: "",
    },

    textType: {
      type: String,
      trim: true,
      default: "",
    },

    orderedQty: {
      type: Number,
      default: 0,
      min: [0, "Ordered quantity cannot be negative"],
    },

    alreadyDeliveredQty: {
      type: Number,
      default: 0,
      min: [0, "Previously delivered quantity cannot be negative"],
    },

    pendingQty: {
      type: Number,
      default: 0,
      min: [0, "Pending quantity cannot be negative"],
    },

    availableStock: {
      type: Number,
      default: 0,
      min: [0, "Available stock cannot be negative"],
    },

    cartons: {
      type: Number,
      default: 0,
      min: [0, "Cartons cannot be negative"],
    },

    rolls: {
      type: Number,
      default: 0,
      min: [0, "Rolls cannot be negative"],
    },

    quantity: {
      type: Number,
      required: [true, "Delivery quantity is required"],
      min: [
        0.000001,
        "Delivery quantity must be greater than zero",
      ],
    },

    unit: {
      type: String,
      trim: true,
      default: "Pcs",
    },

    grossWeight: {
      type: Number,
      default: 0,
      min: [0, "Gross weight cannot be negative"],
    },

    netWeight: {
      type: Number,
      default: 0,
      min: [0, "Net weight cannot be negative"],
    },

    unitPrice: {
      type: Number,
      default: 0,
      min: [0, "Unit price cannot be negative"],
    },

    amount: {
      type: Number,
      default: 0,
      min: [0, "Amount cannot be negative"],
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

const deliveryChallanSchema = new mongoose.Schema(
  {
    challanNo: {
      type: String,
      required: [true, "Delivery challan number is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },

    sourceType: {
      type: String,
      enum: [
        "Sales Order",
        "Production Output",
      ],
      default: "Sales Order",
      required: true,
      index: true,
    },

    sourceNo: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
      index: true,
    },

    salesOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder",
      default: null,
      index: true,
    },

    salesOrderNo: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
      index: true,
    },

    productionOutput: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReadyProduct",
      default: null,
      index: true,
    },

    productionOutputs: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ReadyProduct",
        },
      ],
      default: [],
      index: true,
    },

    productionJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductionItem",
      default: null,
      index: true,
    },

    productionJobs: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ProductionItem",
        },
      ],
      default: [],
      index: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
      index: true,
    },

    customerName: {
      type: String,
      required: [true, "Customer name is required"],
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

    deliveryAddress: {
      type: String,
      trim: true,
      default: "",
    },

    attentionTo: {
      type: String,
      trim: true,
      default: "",
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

    companyName: {
      type: String,
      trim: true,
      uppercase: true,

      enum: {
        values:
          ISSUING_COMPANIES,

        message:
          "Invalid issuing company",
      },

      default:
        "AL-KARAM-TRADERS",

      maxlength: [
        150,
        "Company name cannot exceed 150 characters",
      ],

      index: true,
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

      index: true,
    },

    companyLogo: {
      type: String,
      trim: true,
      default: "/logo.png",
      maxlength: [
        1000,
        "Company logo path cannot exceed 1000 characters",
      ],
    },

    documentNo: {
      type: String,
      trim: true,
      uppercase: true,
      default: "UP-DC-01 / 01",
      maxlength: [
        100,
        "Document number cannot exceed 100 characters",
      ],
    },

    issueNo: {
      type: String,
      trim: true,
      default: "01",
      maxlength: [
        30,
        "Issue number cannot exceed 30 characters",
      ],
    },

    revisionNo: {
      type: String,
      trim: true,
      default: "00",
      maxlength: [
        30,
        "Revision number cannot exceed 30 characters",
      ],
    },

    documentIssueDate: {
      type: String,
      trim: true,
      default: todayDate,

      validate: {
        validator(value) {
          return (
            !value ||
            /^\d{4}-\d{2}-\d{2}$/.test(value)
          );
        },

        message:
          "Document issue date format must be YYYY-MM-DD",
      },
    },

    challanDate: {
      type: String,
      required: [true, "Challan date is required"],
      default: todayDate,

      validate: {
        validator(value) {
          return /^\d{4}-\d{2}-\d{2}$/.test(value);
        },

        message: "Challan date format must be YYYY-MM-DD",
      },

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

    vehicleNo: {
      type: String,
      trim: true,
      uppercase: true,
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

    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      default: null,
      index: true,
    },

    warehouse: {
      type: String,
      trim: true,
      default: FINISHED_GOODS_GODOWN,
      index: true,
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
      enum: [
        "Draft",
        "Dispatched",
        "Received",
        "Cancelled",
      ],
      default: "Draft",
      index: true,
    },

    invoiceStatus: {
      type: String,
      enum: [
        "Not Invoiced",
        "Invoiced",
      ],
      default: "Not Invoiced",
      index: true,
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

deliveryChallanSchema.index({
  sourceType: 1,
  salesOrder: 1,
  status: 1,
});

deliveryChallanSchema.index({
  sourceType: 1,
  productionOutput: 1,
  status: 1,
});

deliveryChallanSchema.index({
  sourceType: 1,
  productionOutputs: 1,
  status: 1,
});

deliveryChallanSchema.index({
  productionJob: 1,
  challanDate: -1,
});

deliveryChallanSchema.index({
  productionJobs: 1,
  challanDate: -1,
});

deliveryChallanSchema.index({
  customer: 1,
  challanDate: -1,
});

deliveryChallanSchema.index({
  "items.item": 1,
  status: 1,
});

deliveryChallanSchema.pre("validate", function () {
  this.challanNo = cleanText(
    this.challanNo
  ).toUpperCase();

  this.sourceType =
    this.sourceType === "Production Output"
      ? "Production Output"
      : "Sales Order";

  this.sourceNo = cleanText(
    this.sourceNo,
    this.sourceType === "Sales Order"
      ? this.salesOrderNo
      : ""
  ).toUpperCase();

  this.salesOrderNo = cleanText(
    this.salesOrderNo
  ).toUpperCase();

  const uniqueObjectIds = (values = []) => {
    const map = new Map();

    for (const value of values) {
      if (!value) {
        continue;
      }

      const key = String(
        value._id ||
          value
      );

      if (key) {
        map.set(key, value._id || value);
      }
    }

    return [
      ...map.values(),
    ];
  };

  this.productionOutputs =
    uniqueObjectIds([
      ...(Array.isArray(
        this.productionOutputs
      )
        ? this.productionOutputs
        : []),

      this.productionOutput,

      ...(Array.isArray(
        this.items
      )
        ? this.items.map(
            (item) =>
              item.productionOutput
          )
        : []),
    ]);

  this.productionJobs =
    uniqueObjectIds([
      ...(Array.isArray(
        this.productionJobs
      )
        ? this.productionJobs
        : []),

      this.productionJob,

      ...(Array.isArray(
        this.items
      )
        ? this.items.map(
            (item) =>
              item.productionJob
          )
        : []),
    ]);

  this.productionOutput =
    this.productionOutputs[0] ||
    null;

  this.productionJob =
    this.productionJobs[0] ||
    null;

  if (
    this.sourceType === "Sales Order"
  ) {
    if (!this.salesOrder) {
      this.invalidate(
        "salesOrder",
        "Sales order is required for a Sales Order delivery challan"
      );
    }

    if (!this.salesOrderNo) {
      this.invalidate(
        "salesOrderNo",
        "Sales order number is required for a Sales Order delivery challan"
      );
    }

    this.productionOutput =
      null;

    this.productionOutputs =
      [];

    this.productionJob =
      null;

    this.productionJobs =
      [];

    this.sourceNo =
      this.sourceNo ||
      this.salesOrderNo;
  } else {
    if (
      !this.productionOutputs.length
    ) {
      this.invalidate(
        "productionOutputs",
        "At least one Production Output is required"
      );
    }

    if (
      !this.productionJobs.length
    ) {
      this.invalidate(
        "productionJobs",
        "At least one Production Job is required"
      );
    }

    if (!this.sourceNo) {
      this.invalidate(
        "sourceNo",
        "Production output number is required"
      );
    }
  }

  this.customerName = cleanText(
    this.customerName
  );

  this.customerPhone = cleanText(
    this.customerPhone
  );

  this.customerEmail = cleanText(
    this.customerEmail
  ).toLowerCase();

  this.customerAddress = cleanText(
    this.customerAddress
  );

  this.deliveryAddress = cleanText(
    this.deliveryAddress,
    this.customerAddress
  );

  this.attentionTo = cleanText(
    this.attentionTo
  );

  this.poNo = cleanText(
    this.poNo
  );

  this.referenceNo = cleanText(
    this.referenceNo
  );

  this.companyName =
    normalizeIssuingCompany(
      this.companyName,
      this.taxType
    );

  this.taxType =
    taxTypeForCompany(
      this.companyName
    );

  this.companyLogo = cleanText(
    this.companyLogo,
    "/logo.png"
  );

  this.documentNo = cleanText(
    this.documentNo,
    "UP-DC-01 / 01"
  ).toUpperCase();

  this.issueNo = cleanText(
    this.issueNo,
    "01"
  );

  this.revisionNo = cleanText(
    this.revisionNo,
    "00"
  );

  this.documentIssueDate = cleanText(
    this.documentIssueDate,
    todayDate()
  );

  this.challanDate = cleanText(
    this.challanDate,
    todayDate()
  );

  this.dispatchDate = cleanText(
    this.dispatchDate
  );

  this.receivedDate = cleanText(
    this.receivedDate
  );

  this.vehicleNo = cleanText(
    this.vehicleNo
  ).toUpperCase();

  this.driverName = cleanText(
    this.driverName
  );

  this.driverPhone = cleanText(
    this.driverPhone
  );

  this.preparedBy = cleanText(
    this.preparedBy
  );

  this.dispatchedBy = cleanText(
    this.dispatchedBy
  );

  this.receivedBy = cleanText(
    this.receivedBy
  );

  this.receiverDesignation = cleanText(
    this.receiverDesignation
  );

  this.warehouse =
    FINISHED_GOODS_GODOWN;

  this.cancelReason = cleanText(
    this.cancelReason
  );

  this.remarks = cleanText(
    this.remarks
  );

  const items = Array.isArray(
    this.items
  )
    ? this.items
    : [];

  this.items = items.map(
    (item) => {
      item.warehouse =
        FINISHED_GOODS_GODOWN;

      item.itemCode = cleanText(
        item.itemCode
      ).toUpperCase();

      item.itemName = cleanText(
        item.itemName
      );

      item.description = cleanText(
        item.description,
        item.itemName
      );

      item.size = cleanText(
        item.size
      );

      item.textType = cleanText(
        item.textType
      );

      item.productionOutputNo =
        cleanText(
          item.productionOutputNo
        ).toUpperCase();

      item.productionJobNo =
        cleanText(
          item.productionJobNo
        ).toUpperCase();

      item.orderedQty = cleanNumber(
        item.orderedQty
      );

      item.alreadyDeliveredQty =
        cleanNumber(
          item.alreadyDeliveredQty
        );

      item.pendingQty = cleanNumber(
        item.pendingQty
      );

      item.availableStock =
        cleanNumber(
          item.availableStock
        );

      item.cartons = cleanNumber(
        item.cartons
      );

      item.rolls = cleanNumber(
        item.rolls
      );

      item.quantity = cleanNumber(
        item.quantity
      );

      item.unit = cleanText(
        item.unit,
        "Pcs"
      );

      item.grossWeight = cleanNumber(
        item.grossWeight
      );

      item.netWeight = cleanNumber(
        item.netWeight
      );

      item.unitPrice = cleanNumber(
        item.unitPrice
      );

      item.amount =
        item.quantity *
        item.unitPrice;

      item.remarks = cleanText(
        item.remarks
      );

      if (
        this.sourceType === "Sales Order" &&
        !item.salesOrderItemId
      ) {
        this.invalidate(
          "items",
          `Sales order item reference is required for ${item.description}`
        );
      }

      if (
        this.sourceType === "Production Output"
      ) {
        item.productionOutput =
          item.productionOutput ||
          (
            this.productionOutputs.length ===
            1
              ? this.productionOutputs[0]
              : null
          );

        item.productionJob =
          item.productionJob ||
          (
            this.productionJobs.length ===
            1
              ? this.productionJobs[0]
              : null
          );

        if (!item.productionOutput) {
          this.invalidate(
            "items",
            `Production output reference is required for ${item.description}`
          );
        }

        if (!item.productionJob) {
          this.invalidate(
            "items",
            `Production job reference is required for ${item.description}`
          );
        }
      }

      if (
        item.netWeight >
          item.grossWeight &&
        item.grossWeight > 0
      ) {
        this.invalidate(
          "items",
          `Net weight cannot exceed gross weight for ${item.description}`
        );
      }

      return item;
    }
  );

  if (
    this.sourceType ===
    "Production Output"
  ) {
    this.productionOutputs =
      uniqueObjectIds(
        this.items.map(
          (item) =>
            item.productionOutput
        )
      );

    this.productionJobs =
      uniqueObjectIds(
        this.items.map(
          (item) =>
            item.productionJob
        )
      );

    this.productionOutput =
      this.productionOutputs[0] ||
      null;

    this.productionJob =
      this.productionJobs[0] ||
      null;
  }

  this.totalCartons =
    this.items.reduce(
      (sum, item) =>
        sum +
        cleanNumber(
          item.cartons
        ),
      0
    );

  this.totalRolls =
    this.items.reduce(
      (sum, item) =>
        sum +
        cleanNumber(
          item.rolls
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

  this.totalGrossWeight =
    this.items.reduce(
      (sum, item) =>
        sum +
        cleanNumber(
          item.grossWeight
        ),
      0
    );

  this.totalNetWeight =
    this.items.reduce(
      (sum, item) =>
        sum +
        cleanNumber(
          item.netWeight
        ),
      0
    );

  this.subtotal =
    this.items.reduce(
      (sum, item) =>
        sum +
        cleanNumber(
          item.amount
        ),
      0
    );
});

module.exports = mongoose.model(
  "DeliveryChallan",
  deliveryChallanSchema
);