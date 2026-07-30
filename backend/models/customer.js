const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    customerCode: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
    },

    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
    },

    contactPerson: {
      type: String,
      trim: true,
      default: "",
    },

    phoneNumber: {
      type: String,
      trim: true,
      default: "",
    },

    alternatePhone: {
      type: String,
      trim: true,
      default: "",
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

customerSchema.pre("save", function () {
  this.phoneNumber = String(this.phoneNumber || "").trim();
  this.alternatePhone = String(this.alternatePhone || "").trim();

  this.ntn = String(this.ntn || "")
    .trim()
    .toUpperCase();

  this.openingBalance = Number(this.openingBalance || 0);
  this.creditLimit = Number(this.creditLimit || 0);
});

customerSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate() || {};
  const values = update.$set || update;

  if (values.phoneNumber !== undefined) {
    values.phoneNumber = String(values.phoneNumber || "").trim();
  }

  if (values.alternatePhone !== undefined) {
    values.alternatePhone = String(values.alternatePhone || "").trim();
  }

  if (values.ntn !== undefined) {
    values.ntn = String(values.ntn || "")
      .trim()
      .toUpperCase();
  }

  if (values.openingBalance !== undefined) {
    values.openingBalance = Number(values.openingBalance || 0);
  }

  if (values.creditLimit !== undefined) {
    values.creditLimit = Number(values.creditLimit || 0);
  }

  if (update.$set) {
    update.$set = values;
  }

  this.setUpdate(update);
});

module.exports = mongoose.model("Customer", customerSchema);
