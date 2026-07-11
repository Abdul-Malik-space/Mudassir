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

    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
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
  { timestamps: true }
);

// Important: no next() here
customerSchema.pre("save", function () {
  if (!this.email || this.email === "") {
    this.email = undefined;
  }

  this.openingBalance = Number(this.openingBalance || 0);
  this.creditLimit = Number(this.creditLimit || 0);
});

// Important: no next() here
customerSchema.pre("findOneAndUpdate", function () {
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

module.exports = mongoose.model("Customer", customerSchema);