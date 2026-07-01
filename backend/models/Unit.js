const mongoose = require("mongoose");

const unitSchema = new mongoose.Schema({
  name: { type: String, required: true },
  shortName: { type: String, required: true },
  description: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("Unit", unitSchema);