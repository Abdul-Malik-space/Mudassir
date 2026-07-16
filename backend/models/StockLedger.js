const mongoose = require("mongoose");

const stockLedgerSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
    },

    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },

    itemCode: {
      type: String,
      trim: true,
      default: "",
    },

    itemName: {
      type: String,
      trim: true,
      default: "",
    },

    warehouse: {
      type: String,
      trim: true,
      default: "Main Godown",
    },

    movementType: {
      type: String,
      enum: [
        "Opening Stock",
        "Purchase In",
        "GRN In",
        "Production Issue",
        "Production Return",
        "Production Wastage",
        "Production Output",
        "Sales Out",
        "Delivery Challan Out",
        "Adjustment In",
        "Adjustment Out",
      ],
      required: true,
    },

    sourceModule: {
      type: String,
      trim: true,
      default: "",
    },

    referenceModel: {
      type: String,
      trim: true,
      default: "",
    },

    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    referenceNo: {
      type: String,
      trim: true,
      default: "",
    },

    qtyIn: {
      type: Number,
      default: 0,
      min: 0,
    },

    qtyOut: {
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
    },
  },
  { timestamps: true }
);

stockLedgerSchema.pre("validate", function () {
  this.qtyIn = Number(this.qtyIn || 0);
  this.qtyOut = Number(this.qtyOut || 0);
  this.rate = Number(this.rate || 0);

  const qty = this.qtyIn > 0 ? this.qtyIn : this.qtyOut;
  this.amount = qty * this.rate;
});

module.exports = mongoose.model("StockLedger", stockLedgerSchema);