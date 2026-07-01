const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, default: "" },
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", default: null },
    category: { type: String, trim: true, default: "" },
    unit: { type: String, trim: true, default: "Pcs" },
    price: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
