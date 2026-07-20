const mongoose = require("mongoose");

const todayDate = () =>
  new Date().toISOString().slice(0, 10);

const num = (value) =>
  Number.isFinite(Number(value))
    ? Number(value)
    : 0;

const text = (value, fallback = "") =>
  String(value || "").trim() || fallback;

const materialIssueItemSchema =
  new mongoose.Schema(
    {
      materialRequirementId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [
          true,
          "Production material line is required",
        ],
      },

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
        default: 0,
        min: 0,
      },

      previousIssuedQty: {
        type: Number,
        default: 0,
        min: 0,
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
        min: 0,
      },

      unit: {
        type: String,
        trim: true,
        default: "Pcs",
      },

      rate: {
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
        maxlength: 500,
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

    this.previousIssuedQty = num(
      this.previousIssuedQty
    );

    this.issueQty = num(
      this.issueQty
    );

    this.rate = num(this.rate);

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
        index: true,
      },

      productionJob: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProductionItem",
        required: [
          true,
          "Production job is required",
        ],
        index: true,
      },

      jobNo: {
        type: String,
        required: true,
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
        type: mongoose.Schema.Types.ObjectId,
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
        required: true,
        default: todayDate,

        validate: {
          validator(value) {
            return /^\d{4}-\d{2}-\d{2}$/.test(
              value
            );
          },

          message:
            "Issue date format must be YYYY-MM-DD",
        },

        index: true,
      },

      warehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Warehouse",
        default: null,
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
              Array.isArray(value) &&
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
        min: 0,
      },

      totalAmount: {
        type: Number,
        default: 0,
        min: 0,
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
        maxlength: 1000,
      },

      status: {
        type: String,
        enum: [
          "Draft",
          "Posted",
          "Cancelled",
        ],
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
        maxlength: 1000,
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
    this.issueNo = text(
      this.issueNo
    ).toUpperCase();

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

    const totals = (
      this.items || []
    ).reduce(
      (result, row) => {
        result.totalIssueQty +=
          num(row.issueQty);

        result.totalAmount +=
          num(row.issueQty) *
          num(row.rate);

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

module.exports = mongoose.model(
  "MaterialIssue",
  materialIssueSchema
);