const mongoose = require("mongoose");

const laminationSchema = new mongoose.Schema({
  jobCardId: { type: String, trim: true, default: "" },
  product: { type: String, required: true, trim: true },
  laminationType: { type: String, trim: true, default: "Gloss" },
  qty: { type: Number, required: true },
  rate: { type: Number, default: 0 },
  wastageQty: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  side: { type: String, enum: ["Single", "Double"], default: "Single" },
  employee: { type: String, trim: true, default: "" },
  time: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("Lamination", laminationSchema);
