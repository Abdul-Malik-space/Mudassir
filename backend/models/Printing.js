const mongoose = require("mongoose");

const PRINTING_STATUSES = [
  "Draft",
  "In Progress",
  "Completed",
  "Cancelled",
];

const QC_STATUSES = [
  "Pending",
  "Passed",
  "Partially Passed",
  "Rejected",
];

const todayDate = () =>
  new Date().toISOString().slice(0, 10);

const normalizeText = (value, fallback = "") => {
  const cleanedValue = String(value || "").trim();

  return cleanedValue || fallback;
};

const normalizeNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const quantitiesAreEqual = (first, second) =>
  Math.abs(
    normalizeNumber(first) - normalizeNumber(second)
  ) < 0.000001;

const printingSchema = new mongoose.Schema(
  {
    printingNo: {
      type: String,
      required: [true, "Printing number is required"],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    productionJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductionItem",
      required: [true, "Production job is required"],
      index: true,
    },

    jobNo: {
      type: String,
      required: [true, "Production job number is required"],
      trim: true,
      uppercase: true,
      index: true,
    },

    jobName: {
      type: String,
      required: [true, "Production job name is required"],
      trim: true,
    },

    customerName: {
      type: String,
      trim: true,
      default: "",
    },

    finishedGoodItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: [true, "Finished good item is required"],
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

    entryDate: {
      type: String,
      required: [true, "Printing date is required"],
      default: todayDate,
      validate: {
        validator(value) {
          return /^\d{4}-\d{2}-\d{2}$/.test(value);
        },
        message: "Printing date format must be YYYY-MM-DD",
      },
      index: true,
    },

    plannedQty: {
      type: Number,
      required: [true, "Planned quantity is required"],
      min: [
        0.000001,
        "Planned quantity must be greater than zero",
      ],
    },

    printedQty: {
      type: Number,
      default: 0,
      min: [0, "Printed quantity cannot be negative"],
    },

    goodQty: {
      type: Number,
      default: 0,
      min: [0, "Good quantity cannot be negative"],
    },

    rejectedQty: {
      type: Number,
      default: 0,
      min: [0, "Rejected quantity cannot be negative"],
    },

    wastageQty: {
      type: Number,
      default: 0,
      min: [0, "Wastage quantity cannot be negative"],
    },

    pendingQty: {
      type: Number,
      default: 0,
      min: [0, "Pending quantity cannot be negative"],
    },

    unit: {
      type: String,
      trim: true,
      default: "Pcs",
    },

    paperSize: {
      type: String,
      trim: true,
      default: "",
    },

    colorType: {
      type: String,
      trim: true,
      default: "",
    },

    side: {
      type: String,
      enum: {
        values: ["1-side", "2-side"],
        message: "Invalid printing side",
      },
      default: "1-side",
    },

    impressions: {
      type: Number,
      default: 0,
      min: [0, "Impressions cannot be negative"],
    },

    platesCount: {
      type: Number,
      default: 0,
      min: [0, "Plate count cannot be negative"],
    },

    machine: {
      type: String,
      required: [true, "Printing machine is required"],
      trim: true,
    },

    operator: {
      type: String,
      required: [true, "Printing operator is required"],
      trim: true,
    },

    helper: {
      type: String,
      trim: true,
      default: "",
    },

    shift: {
      type: String,
      enum: {
        values: ["Day", "Night"],
        message: "Invalid printing shift",
      },
      default: "Day",
    },

    startTime: {
      type: String,
      trim: true,
      default: "",
    },

    endTime: {
      type: String,
      trim: true,
      default: "",
    },

    rate: {
      type: Number,
      default: 0,
      min: [0, "Printing rate cannot be negative"],
    },

    totalAmount: {
      type: Number,
      default: 0,
      min: [0, "Printing amount cannot be negative"],
    },

    status: {
      type: String,
      enum: {
        values: PRINTING_STATUSES,
        message: "Invalid printing status",
      },
      default: "Draft",
      index: true,
    },

    qcStatus: {
      type: String,
      enum: {
        values: QC_STATUSES,
        message: "Invalid quality control status",
      },
      default: "Pending",
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

    startedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
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

printingSchema.index({
  productionJob: 1,
  status: 1,
  entryDate: -1,
});

printingSchema.index({
  finishedGoodItem: 1,
  entryDate: -1,
});

printingSchema.pre("validate", function () {
  this.printingNo = normalizeText(
    this.printingNo
  ).toUpperCase();

  this.jobNo = normalizeText(this.jobNo).toUpperCase();
  this.jobName = normalizeText(this.jobName);
  this.customerName = normalizeText(this.customerName);

  this.finishedGoodCode = normalizeText(
    this.finishedGoodCode
  ).toUpperCase();

  this.finishedGoodName = normalizeText(
    this.finishedGoodName
  );

  this.entryDate = normalizeText(
    this.entryDate,
    todayDate()
  );

  this.unit = normalizeText(this.unit, "Pcs");
  this.paperSize = normalizeText(this.paperSize);
  this.colorType = normalizeText(this.colorType);
  this.machine = normalizeText(this.machine);
  this.operator = normalizeText(this.operator);
  this.helper = normalizeText(this.helper);
  this.startTime = normalizeText(this.startTime);
  this.endTime = normalizeText(this.endTime);
  this.remarks = normalizeText(this.remarks);
  this.cancelReason = normalizeText(this.cancelReason);

  this.plannedQty = normalizeNumber(this.plannedQty);
  this.printedQty = normalizeNumber(this.printedQty);
  this.goodQty = normalizeNumber(this.goodQty);
  this.rejectedQty = normalizeNumber(this.rejectedQty);
  this.wastageQty = normalizeNumber(this.wastageQty);
  this.impressions = normalizeNumber(this.impressions);
  this.platesCount = normalizeNumber(this.platesCount);
  this.rate = normalizeNumber(this.rate);

  this.pendingQty = Math.max(
    this.plannedQty - this.goodQty,
    0
  );

  this.totalAmount = this.printedQty * this.rate;

  if (this.goodQty > this.printedQty) {
    this.invalidate(
      "goodQty",
      "Good quantity cannot exceed printed quantity"
    );
  }

  if (this.status === "Completed") {
    if (this.printedQty <= 0) {
      this.invalidate(
        "printedQty",
        "Printed quantity is required before completion"
      );
    }

    const classifiedQty =
      this.goodQty +
      this.rejectedQty +
      this.wastageQty;

    if (!quantitiesAreEqual(classifiedQty, this.printedQty)) {
      this.invalidate(
        "goodQty",
        "Good, rejected and wastage quantities must equal printed quantity"
      );
    }

    if (!this.completedAt) {
      this.completedAt = new Date();
    }
  }

  if (this.status === "In Progress" && !this.startedAt) {
    this.startedAt = new Date();
  }

  if (this.status === "Cancelled" && !this.cancelledAt) {
    this.cancelledAt = new Date();
  }
});

printingSchema.virtual("classifiedQty").get(function () {
  return (
    normalizeNumber(this.goodQty) +
    normalizeNumber(this.rejectedQty) +
    normalizeNumber(this.wastageQty)
  );
});

module.exports = mongoose.model(
  "Printing",
  printingSchema
);