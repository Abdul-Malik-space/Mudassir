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
      uppercase: true,
      default: "",
      maxlength: [30, "NTN number cannot exceed 30 characters"],
    },

    strn: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
      maxlength: [30, "STRN number cannot exceed 30 characters"],
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
  {
    timestamps: true,
    versionKey: false,
  }
);

vendorSchema.pre("save", function () {
  if (!this.email || this.email === "") {
    this.email = undefined;
  }

  this.ntn = String(this.ntn || "")
    .trim()
    .toUpperCase();

  this.strn = String(this.strn || "")
    .trim()
    .toUpperCase();

  this.openingBalance = Number(this.openingBalance || 0);
  this.creditLimit = Number(this.creditLimit || 0);
});

vendorSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate() || {};
  const payload = update.$set || update;

  if (payload.email === "") {
    if (!update.$unset) {
      update.$unset = {};
    }

    update.$unset.email = 1;
    delete payload.email;
  }

  if (payload.ntn !== undefined) {
    payload.ntn = String(payload.ntn || "")
      .trim()
      .toUpperCase();
  }

  if (payload.strn !== undefined) {
    payload.strn = String(payload.strn || "")
      .trim()
      .toUpperCase();
  }

  if (payload.openingBalance !== undefined) {
    payload.openingBalance = Number(payload.openingBalance || 0);
  }

  if (payload.creditLimit !== undefined) {
    payload.creditLimit = Number(payload.creditLimit || 0);
  }

  if (update.$set) {
    update.$set = payload;
  }

  this.setUpdate(update);
});

module.exports = mongoose.model("Vendor", vendorSchema);
