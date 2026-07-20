const mongoose = require("mongoose");

const todayDate = () =>
  new Date().toISOString().slice(0, 10);

const numberValue = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

const textValue = (value, fallback = "") => {
  const valueText = String(value || "").trim();

  return valueText || fallback;
};

const readyProductSchema = new mongoose.Schema(
  {
    readyNo: {
      type: String,
      required: [true, "Ready product number is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },

    productionJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductionItem",
      required: [true, "Production job is required"],
      index: true,
    },

    printing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Printing",
      required: [true, "Completed printing record is required"],
      index: true,
    },

    jobNo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    printingNo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
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

    qcDate: {
      type: String,
      required: [true, "QC date is required"],
      default: todayDate,
      validate: {
        validator(value) {
          return /^\d{4}-\d{2}-\d{2}$/.test(value);
        },
        message: "QC date format must be YYYY-MM-DD",
      },
      index: true,
    },

    printingGoodQty: {
      type: Number,
      required: true,
      min: [
        0.000001,
        "Printing good quantity must be greater than zero",
      ],
    },

    passedQty: {
      type: Number,
      required: true,
      min: [0, "Passed quantity cannot be negative"],
    },

    rejectedQty: {
      type: Number,
      default: 0,
      min: [0, "Rejected quantity cannot be negative"],
    },

    holdQty: {
      type: Number,
      default: 0,
      min: [0, "Hold quantity cannot be negative"],
    },

    unit: {
      type: String,
      trim: true,
      default: "Pcs",
    },

    qcStatus: {
      type: String,
      enum: [
        "Passed",
        "Partially Passed",
        "Rejected",
        "Hold",
      ],
      default: "Passed",
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
      default: "Finished Goods Godown",
      index: true,
    },

    checkedBy: {
      type: String,
      required: [true, "Quality checker is required"],
      trim: true,
    },

    packedBy: {
      type: String,
      trim: true,
      default: "",
    },

    packaging: {
      type: String,
      trim: true,
      default: "",
    },

    rate: {
      type: Number,
      default: 0,
      min: [0, "Rate cannot be negative"],
    },

    totalAmount: {
      type: Number,
      default: 0,
      min: [0, "Amount cannot be negative"],
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

readyProductSchema.index({
  printing: 1,
  status: 1,
});

readyProductSchema.index({
  productionJob: 1,
  qcDate: -1,
});

readyProductSchema.index({
  finishedGoodItem: 1,
  stockPosted: 1,
});

readyProductSchema.pre("validate", function () {
  this.readyNo = textValue(
    this.readyNo
  ).toUpperCase();

  this.jobNo = textValue(
    this.jobNo
  ).toUpperCase();

  this.printingNo = textValue(
    this.printingNo
  ).toUpperCase();

  this.customerName = textValue(
    this.customerName
  );

  this.finishedGoodCode = textValue(
    this.finishedGoodCode
  ).toUpperCase();

  this.finishedGoodName = textValue(
    this.finishedGoodName
  );

  this.qcDate = textValue(
    this.qcDate,
    todayDate()
  );

  this.unit = textValue(
    this.unit,
    "Pcs"
  );

  this.warehouse = textValue(
    this.warehouse,
    "Finished Goods Godown"
  );

  this.checkedBy = textValue(
    this.checkedBy
  );

  this.packedBy = textValue(
    this.packedBy
  );

  this.packaging = textValue(
    this.packaging
  );

  this.remarks = textValue(
    this.remarks
  );

  this.cancelReason = textValue(
    this.cancelReason
  );

  this.printingGoodQty = numberValue(
    this.printingGoodQty
  );

  this.passedQty = numberValue(
    this.passedQty
  );

  this.rejectedQty = numberValue(
    this.rejectedQty
  );

  this.holdQty = numberValue(
    this.holdQty
  );

  this.rate = numberValue(
    this.rate
  );

  const classifiedQty =
    this.passedQty +
    this.rejectedQty +
    this.holdQty;

  if (
    Math.abs(
      classifiedQty - this.printingGoodQty
    ) > 0.000001
  ) {
    this.invalidate(
      "passedQty",
      "Passed, rejected and hold quantities must equal printing good quantity"
    );
  }

  if (
    this.passedQty > 0 &&
    this.rejectedQty === 0 &&
    this.holdQty === 0
  ) {
    this.qcStatus = "Passed";
  } else if (this.passedQty > 0) {
    this.qcStatus = "Partially Passed";
  } else if (
    this.rejectedQty > 0 &&
    this.holdQty === 0
  ) {
    this.qcStatus = "Rejected";
  } else {
    this.qcStatus = "Hold";
  }

  this.totalAmount =
    this.passedQty * this.rate;

  if (
    this.status === "Posted" &&
    this.passedQty <= 0
  ) {
    this.invalidate(
      "passedQty",
      "Passed quantity must be greater than zero before posting output"
    );
  }
});

readyProductSchema
  .virtual("outputQty")
  .get(function () {
    return numberValue(
      this.passedQty
    );
  });

module.exports = mongoose.model(
  "ReadyProduct",
  readyProductSchema
);