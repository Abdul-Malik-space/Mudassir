const mongoose = require("mongoose");

const MATERIAL_ISSUE_STATUSES = [
  "Draft",
  "Posted",
  "Cancelled",
];

const MATERIAL_ISSUE_NO_PATTERN =
  /^MI-[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

const todayDate = () =>
  new Date()
    .toISOString()
    .slice(0, 10);

const num = (value) =>
  Number.isFinite(Number(value))
    ? Number(value)
    : 0;

const text = (
  value,
  fallback = ""
) =>
  String(
    value ?? ""
  ).trim() || fallback;

const normalizeIssueNo = (
  value
) =>
  text(value)
    .toUpperCase()
    .replace(/\s+/g, "");

const isValidDateString = (
  value
) => {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return false;
  }

  const date = new Date(
    `${value}T00:00:00.000Z`
  );

  return (
    !Number.isNaN(
      date.getTime()
    ) &&
    date
      .toISOString()
      .slice(0, 10) ===
      value
  );
};

const materialIssueItemSchema =
  new mongoose.Schema(
    {
      materialRequirementId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        required: [
          true,
          "Production material line is required",
        ],
      },

      item: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Item",

        required: [
          true,
          "Material item is required",
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

      requiredQty: {
        type: Number,
        default: 0,

        min: [
          0,
          "Required quantity cannot be negative",
        ],
      },

      previousIssuedQty: {
        type: Number,
        default: 0,

        min: [
          0,
          "Previous issued quantity cannot be negative",
        ],
      },

      issueQty: {
        type: Number,

        required: [
          true,
          "Issue quantity is required",
        ],

        min: [
          0.000001,
          "Issue quantity must be greater than zero",
        ],
      },

      pendingAfterIssue: {
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

      rate: {
        type: Number,
        default: 0,

        min: [
          0,
          "Material rate cannot be negative",
        ],
      },

      amount: {
        type: Number,
        default: 0,

        min: [
          0,
          "Material amount cannot be negative",
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
    }
  );

materialIssueItemSchema.pre(
  "validate",
  function () {
    this.itemCode = text(
      this.itemCode
    ).toUpperCase();

    this.itemName = text(
      this.itemName
    );

    this.unit = text(
      this.unit,
      "Pcs"
    );

    this.remarks = text(
      this.remarks
    );

    this.requiredQty = num(
      this.requiredQty
    );

    this.previousIssuedQty =
      num(
        this.previousIssuedQty
      );

    this.issueQty = num(
      this.issueQty
    );

    this.rate = num(
      this.rate
    );

    const totalIssued =
      this.previousIssuedQty +
      this.issueQty;

    if (
      totalIssued >
      this.requiredQty
    ) {
      this.invalidate(
        "issueQty",
        "Issued quantity cannot exceed required quantity"
      );
    }

    this.pendingAfterIssue =
      Math.max(
        this.requiredQty -
          totalIssued,
        0
      );

    this.amount =
      this.issueQty *
      this.rate;
  }
);

const materialIssueSchema =
  new mongoose.Schema(
    {
      issueNo: {
        type: String,

        required: [
          true,
          "Material issue number is required",
        ],

        unique: true,
        trim: true,
        uppercase: true,

        maxlength: [
          50,
          "Material issue number cannot exceed 50 characters",
        ],

        validate: {
          validator(value) {
            return (
              MATERIAL_ISSUE_NO_PATTERN
                .test(
                  normalizeIssueNo(
                    value
                  )
                )
            );
          },

          message:
            "Material issue number must start with MI- and contain only letters, numbers or hyphens",
        },

        index: true,
      },

      productionJob: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref:
          "ProductionItem",

        required: [
          true,
          "Production job is required",
        ],

        index: true,
      },

      jobNo: {
        type: String,

        required: [
          true,
          "Production job number is required",
        ],

        trim: true,
        uppercase: true,
        index: true,
      },

      jobName: {
        type: String,
        trim: true,
        default: "",
      },

      finishedGoodItem: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Item",
        default: null,
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

      issueDate: {
        type: String,

        required: [
          true,
          "Issue date is required",
        ],

        default:
          todayDate,

        validate: {
          validator(value) {
            return isValidDateString(
              value
            );
          },

          message:
            "Issue date must be a valid date in YYYY-MM-DD format",
        },

        index: true,
      },

      warehouseId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref:
          "Warehouse",

        default: null,
        index: true,
      },

      warehouse: {
        type: String,
        trim: true,

        default:
          "Raw Material Godown",

        index: true,
      },

      items: {
        type: [
          materialIssueItemSchema,
        ],

        validate: {
          validator(value) {
            return (
              Array.isArray(
                value
              ) &&
              value.length > 0
            );
          },

          message:
            "At least one material item is required",
        },
      },

      totalIssueQty: {
        type: Number,
        default: 0,

        min: [
          0,
          "Total issue quantity cannot be negative",
        ],
      },

      totalAmount: {
        type: Number,
        default: 0,

        min: [
          0,
          "Total amount cannot be negative",
        ],
      },

      issuedBy: {
        type: String,
        trim: true,
        default: "",
      },

      receivedBy: {
        type: String,
        trim: true,
        default: "",
      },

      remarks: {
        type: String,
        trim: true,
        default: "",

        maxlength: [
          1000,
          "Remarks cannot exceed 1000 characters",
        ],
      },

      status: {
        type: String,

        enum: {
          values:
            MATERIAL_ISSUE_STATUSES,

          message:
            "Invalid material issue status",
        },

        default: "Draft",
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

materialIssueSchema.index({
  productionJob: 1,
  issueDate: -1,
});

materialIssueSchema.index({
  status: 1,
  stockPosted: 1,
});

materialIssueSchema.pre(
  "validate",
  function () {
    this.issueNo =
      normalizeIssueNo(
        this.issueNo
      );

    this.jobNo = text(
      this.jobNo
    ).toUpperCase();

    this.jobName = text(
      this.jobName
    );

    this.finishedGoodCode =
      text(
        this.finishedGoodCode
      ).toUpperCase();

    this.finishedGoodName =
      text(
        this.finishedGoodName
      );

    this.issueDate = text(
      this.issueDate,
      todayDate()
    );

    this.warehouse = text(
      this.warehouse,
      "Raw Material Godown"
    );

    this.issuedBy = text(
      this.issuedBy
    );

    this.receivedBy = text(
      this.receivedBy
    );

    this.remarks = text(
      this.remarks
    );

    this.cancelReason = text(
      this.cancelReason
    );

    const lineIds =
      new Set();

    const itemIds =
      new Set();

    for (
      const row of
      this.items || []
    ) {
      const lineId =
        String(
          row
            .materialRequirementId ||
            ""
        );

      const itemId =
        String(
          row.item || ""
        );

      if (
        lineId &&
        lineIds.has(
          lineId
        )
      ) {
        this.invalidate(
          "items",
          "The same production material line cannot be issued twice"
        );
      }

      if (
        itemId &&
        itemIds.has(
          itemId
        )
      ) {
        this.invalidate(
          "items",
          "The same material item cannot be issued twice in one document"
        );
      }

      if (lineId) {
        lineIds.add(
          lineId
        );
      }

      if (itemId) {
        itemIds.add(
          itemId
        );
      }
    }

    const totals = (
      this.items || []
    ).reduce(
      (
        result,
        row
      ) => {
        const issueQty =
          num(
            row.issueQty
          );

        const rate =
          num(
            row.rate
          );

        result.totalIssueQty +=
          issueQty;

        result.totalAmount +=
          issueQty *
          rate;

        return result;
      },
      {
        totalIssueQty: 0,
        totalAmount: 0,
      }
    );

    this.totalIssueQty =
      totals.totalIssueQty;

    this.totalAmount =
      totals.totalAmount;
  }
);

module.exports =
  mongoose.model(
    "MaterialIssue",
    materialIssueSchema
  );