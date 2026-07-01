const mongoose = require("mongoose");

const traderSchema = new mongoose.Schema({

  traderName: {
    type: String,
    required: true
  },

  phoneNumber: {
    type: String,
    required: true
  },

  alternatePhone: {
    type: String
  },

  email: {
    type: String
  },

  address: {
    type: String,
    required: true
  },

  city: {
    type: String
  },

  openingBalance: {
    type: Number,
    default: 0
  },

  cnic: {
    type: String
  },

  status: {
    type: String,
    default: "Active"
  },

  notes: {
    type: String
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("Trader", traderSchema);