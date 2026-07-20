const mongoose = require("mongoose");

const PRODUCTION_STATUSES = [
  "Draft",
  "Approved",
  "Material Issued",
  "In Printing",
  "Quality Check",
  "Completed",
  "Closed",
  "Cancelled",
];

const SOURCE_TYPES = [
  "Sales Order",
  "Internal Requirement",
];

const PRIORITIES = [
  "Normal",
  "High",
  "Urgent",
];

const todayDate = () =>
  new Date().toISOString().slice(0, 10);

const normalizeText = (
  value,
  fallback = ""
) => {
  const text = String(
    value || ""
  ).trim();

  return text || fallback;
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

const materialRequirementSchema =
  new mongoose.Schema(
    {
      item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
        required: [
          true,
          "Material item is required",
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

      requiredQty: {
        type: Number,
        required: [
          true,
          "Required quantity is required",
        ],
        min: [
          0.000001,
          "Required quantity must be greater than zero",
        ],
      },

      issuedQty: {
        type: Number,
        default: 0,
        min: [
          0,
          "Issued quantity cannot be negative",
        ],
      },

      returnedQty: {
        type: Number,
        default: 0,
        min: [
          0,
          "Returned quantity cannot be negative",
        ],
      },

      wastageQty: {
        type: Number,
        default: 0,
        min: [
          0,
          "Wastage quantity cannot be negative",
        ],
      },

      consumedQty: {
        type: Number,
        default: 0,
        min: [
          0,
          "Consumed quantity cannot be negative",
        ],
      },

      pendingIssueQty: {
        type: Number,
        default: 0,
        min: [
          0,
          "Pending issue quantity cannot be negative",
        ],
      },

      unit: {
        type: String,
        trim: true,
        default: "Pcs",
      },

      rate: {
        type: Number,
        default: 0,
        min: [
          0,
          "Material rate cannot be negative",
        ],
      },

      remarks: {
        type: String,
        trim: true,
        default: "",
        maxlength: [
          500,
          "Material remarks cannot exceed 500 characters",
        ],
      },
    },
    {
      _id: true,
      id: false,
    }
  );

materialRequirementSchema.pre(
  "validate",
  function () {
    this.itemCode = normalizeText(
      this.itemCode
    ).toUpperCase();

    this.itemName = normalizeText(
      this.itemName
    );

    this.unit = normalizeText(
      this.unit,
      "Pcs"
    );

    this.remarks = normalizeText(
      this.remarks
    );

    this.requiredQty = normalizeNumber(
      this.requiredQty
    );

    this.issuedQty = normalizeNumber(
      this.issuedQty
    );

    this.returnedQty = normalizeNumber(
      this.returnedQty
    );

    this.wastageQty = normalizeNumber(
      this.wastageQty
    );

    this.rate = normalizeNumber(
      this.rate
    );

    if (
      this.returnedQty >
      this.issuedQty
    ) {
      this.invalidate(
        "returnedQty",
        "Returned quantity cannot exceed issued quantity"
      );
    }

    const netIssuedQty = Math.max(
      this.issuedQty -
        this.returnedQty,
      0
    );

    this.consumedQty =
      netIssuedQty;

    this.pendingIssueQty =
      Math.max(
        this.requiredQty -
          netIssuedQty,
        0
      );
  }
);

const productionItemSchema =
  new mongoose.Schema(
    {
      jobNo: {
        type: String,
        required: [
          true,
          "Production job number is required",
        ],
        unique: true,
        trim: true,
        uppercase: true,
        index: true,
      },

      jobName: {
        type: String,
        required: [
          true,
          "Production job name is required",
        ],
        trim: true,
        maxlength: [
          200,
          "Production job name cannot exceed 200 characters",
        ],
      },

      sourceType: {
        type: String,
        enum: {
          values: SOURCE_TYPES,
          message:
            "Invalid production source type",
        },
        default: "Sales Order",
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
      },

      internalReference: {
        type: String,
        trim: true,
        default: "",
      },

      customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer",
        default: null,
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

      customerPO: {
        type: String,
        trim: true,
        default: "",
      },

      finishedGoodItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
        required: [
          true,
          "Finished good item is required",
        ],
        index: true,
      },

      finishedGoodCode: {
        type: String,
        trim: true,
        uppercase: true,
        default: "",
      },

      finishedGoodName: {
        type: String,
        trim: true,
        default: "",
      },

      targetQty: {
        type: Number,
        required: [
          true,
          "Target quantity is required",
        ],
        min: [
          0.000001,
          "Target quantity must be greater than zero",
        ],
      },

      unit: {
        type: String,
        trim: true,
        default: "Pcs",
      },

      jobDate: {
        type: String,
        required: [
          true,
          "Job date is required",
        ],
        default: todayDate,
        validate: {
          validator(value) {
            return /^\d{4}-\d{2}-\d{2}$/.test(
              value
            );
          },
          message:
            "Job date format must be YYYY-MM-DD",
        },
        index: true,
      },

      dueDate: {
        type: String,
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

      priority: {
        type: String,
        enum: {
          values: PRIORITIES,
          message:
            "Invalid production priority",
        },
        default: "Normal",
        index: true,
      },

      paperType: {
        type: String,
        trim: true,
        default: "",
      },

      gsm: {
        type: Number,
        default: 0,
        min: [
          0,
          "GSM cannot be negative",
        ],
      },

      sheetSize: {
        type: String,
        trim: true,
        default: "",
      },

      finishedSize: {
        type: String,
        trim: true,
        default: "",
      },

      totalSheets: {
        type: Number,
        default: 0,
        min: [
          0,
          "Total sheets cannot be negative",
        ],
      },

      noOfColors: {
        type: String,
        trim: true,
        default: "",
      },

      dieNo: {
        type: String,
        trim: true,
        default: "",
      },

      materialRequirements: {
        type: [
          materialRequirementSchema,
        ],
        default: [],
      },

      printedQty: {
        type: Number,
        default: 0,
        min: [
          0,
          "Printed quantity cannot be negative",
        ],
      },

      goodQty: {
        type: Number,
        default: 0,
        min: [
          0,
          "Good quantity cannot be negative",
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

      wastageQty: {
        type: Number,
        default: 0,
        min: [
          0,
          "Wastage quantity cannot be negative",
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

      materialIssuePosted: {
        type: Boolean,
        default: false,
        index: true,
      },

      productionOutputPosted: {
        type: Boolean,
        default: false,
        index: true,
      },

      productionOutputQty: {
        type: Number,
        default: 0,
        min: [
          0,
          "Production output quantity cannot be negative",
        ],
      },

      status: {
        type: String,
        enum: {
          values:
            PRODUCTION_STATUSES,
          message:
            "Invalid production status",
        },
        default: "Draft",
        index: true,
      },

      instructions: {
        type: String,
        trim: true,
        default: "",
        maxlength: [
          2000,
          "Instructions cannot exceed 2000 characters",
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

      approvedAt: {
        type: Date,
        default: null,
      },

      printingStartedAt: {
        type: Date,
        default: null,
      },

      completedAt: {
        type: Date,
        default: null,
      },

      closedAt: {
        type: Date,
        default: null,
      },

      cancelledAt: {
        type: Date,
        default: null,
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

productionItemSchema.index({
  status: 1,
  priority: 1,
  dueDate: 1,
});

productionItemSchema.index({
  customerName: 1,
  jobName: 1,
});

productionItemSchema.index({
  finishedGoodItem: 1,
  status: 1,
});

productionItemSchema.pre(
  "validate",
  function () {
    this.jobNo = normalizeText(
      this.jobNo
    ).toUpperCase();

    this.jobName = normalizeText(
      this.jobName
    );

    this.salesOrderNo =
      normalizeText(
        this.salesOrderNo
      ).toUpperCase();

    this.internalReference =
      normalizeText(
        this.internalReference
      );

    this.customerName =
      normalizeText(
        this.customerName
      );

    this.customerPO =
      normalizeText(
        this.customerPO
      );

    this.finishedGoodCode =
      normalizeText(
        this.finishedGoodCode
      ).toUpperCase();

    this.finishedGoodName =
      normalizeText(
        this.finishedGoodName
      );

    this.unit = normalizeText(
      this.unit,
      "Pcs"
    );

    this.jobDate = normalizeText(
      this.jobDate,
      todayDate()
    );

    this.dueDate = normalizeText(
      this.dueDate
    );

    this.paperType = normalizeText(
      this.paperType
    );

    this.sheetSize = normalizeText(
      this.sheetSize
    );

    this.finishedSize =
      normalizeText(
        this.finishedSize
      );

    this.noOfColors = normalizeText(
      this.noOfColors
    );

    this.dieNo = normalizeText(
      this.dieNo
    );

    this.instructions =
      normalizeText(
        this.instructions
      );

    this.remarks = normalizeText(
      this.remarks
    );

    this.targetQty = normalizeNumber(
      this.targetQty
    );

    this.gsm = normalizeNumber(
      this.gsm
    );

    this.totalSheets =
      normalizeNumber(
        this.totalSheets
      );

    this.printedQty =
      normalizeNumber(
        this.printedQty
      );

    this.goodQty = normalizeNumber(
      this.goodQty
    );

    this.rejectedQty =
      normalizeNumber(
        this.rejectedQty
      );

    this.wastageQty =
      normalizeNumber(
        this.wastageQty
      );

    this.productionOutputQty =
      normalizeNumber(
        this.productionOutputQty
      );

    this.pendingQty = Math.max(
      this.targetQty -
        this.goodQty,
      0
    );

    if (
      this.sourceType ===
        "Sales Order" &&
      !this.salesOrder
    ) {
      this.invalidate(
        "salesOrder",
        "Sales Order is required for this production job"
      );
    }

    if (
      this.sourceType ===
      "Internal Requirement"
    ) {
      this.salesOrder = null;
      this.salesOrderNo = "";
    }

    if (
      this.goodQty >
      this.printedQty
    ) {
      this.invalidate(
        "goodQty",
        "Good quantity cannot exceed printed quantity"
      );
    }

    if (
      this.productionOutputQty >
      this.goodQty
    ) {
      this.invalidate(
        "productionOutputQty",
        "Production output quantity cannot exceed good quantity"
      );
    }

    if (
      this.status ===
        "Approved" &&
      !this.approvedAt
    ) {
      this.approvedAt =
        new Date();
    }

    if (
      this.status ===
        "In Printing" &&
      !this.printingStartedAt
    ) {
      this.printingStartedAt =
        new Date();
    }

    if (
      this.status ===
        "Completed" &&
      !this.completedAt
    ) {
      this.completedAt =
        new Date();
    }

    if (
      this.status === "Closed" &&
      !this.closedAt
    ) {
      this.closedAt =
        new Date();
    }

    if (
      this.status ===
        "Cancelled" &&
      !this.cancelledAt
    ) {
      this.cancelledAt =
        new Date();
    }
  }
);

productionItemSchema
  .virtual("code")
  .get(function () {
    return this.jobNo;
  });

productionItemSchema
  .virtual("name")
  .get(function () {
    return this.jobName;
  });

productionItemSchema
  .virtual("quantity")
  .get(function () {
    return this.targetQty;
  });

productionItemSchema
  .virtual("deliveryDate")
  .get(function () {
    return this.dueDate;
  });

module.exports = mongoose.model(
  "ProductionItem",
  productionItemSchema
);