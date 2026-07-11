const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
  {
    vendorCode: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
    },

    vendorName: {
      type: String,
      required: [true, "Vendor name is required"],
      trim: true,
    },

    contactPerson: {
      type: String,
      trim: true,
      default: "",
    },

    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },

    alternatePhone: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    city: {
      type: String,
      trim: true,
      default: "",
    },

    ntn: {
      type: String,
      trim: true,
      default: "",
    },

    strn: {
      type: String,
      trim: true,
      default: "",
    },

    openingBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    creditLimit: {
      type: Number,
      default: 0,
      min: 0,
    },

    paymentTerms: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

// Important: no next() here
vendorSchema.pre("save", function () {
  if (!this.email || this.email === "") {
    this.email = undefined;
  }

  this.openingBalance = Number(this.openingBalance || 0);
  this.creditLimit = Number(this.creditLimit || 0);
});

// Important: no next() here
vendorSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate() || {};

  if (update.email === "") {
    update.email = undefined;
  }

  if (update.openingBalance !== undefined) {
    update.openingBalance = Number(update.openingBalance || 0);
  }

  if (update.creditLimit !== undefined) {
    update.creditLimit = Number(update.creditLimit || 0);
  }

  this.setUpdate(update);
});

module.exports = mongoose.model("Vendor", vendorSchema);