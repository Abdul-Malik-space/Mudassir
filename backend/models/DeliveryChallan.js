const mongoose = require("mongoose");

const deliveryChallanItemSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      default: null,
    },

    description: {
      type: String,
      required: [true, "Item description is required"],
      trim: true,
    },

    size: {
      type: String,
      trim: true,
      default: "",
    },

    textType: {
      type: String,
      enum: ["", "with-text", "without-text"],
      default: "",
    },

    cartons: {
      type: Number,
      default: 0,
      min: 0,
    },

    quantity: {
      type: Number,
      required: [true, "Delivery quantity is required"],
      min: 0,
    },

    unit: {
      type: String,
      trim: true,
      default: "Rolls",
    },

    unitPrice: {
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
  { _id: false }
);

const deliveryChallanSchema = new mongoose.Schema(
  {
    challanNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    salesOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder",
      required: [true, "Sales Order is required"],
    },

    salesOrderNo: {
      type: String,
      required: true,
      trim: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer is required"],
    },

    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    customerPhone: {
      type: String,
      trim: true,
      default: "",
    },

    customerEmail: {
      type: String,
      trim: true,
      default: "",
    },

    customerAddress: {
      type: String,
      trim: true,
      default: "",
    },

    customerCity: {
      type: String,
      trim: true,
      default: "",
    },

    challanDate: {
      type: String,
      required: [true, "Challan date is required"],
    },

    poNo: {
      type: String,
      trim: true,
      default: "",
    },

    vehicleNo: {
      type: String,
      trim: true,
      default: "",
    },

    driverName: {
      type: String,
      trim: true,
      default: "",
    },

    driverPhone: {
      type: String,
      trim: true,
      default: "",
    },

    deliveredBy: {
      type: String,
      trim: true,
      default: "",
    },

    receivedBy: {
      type: String,
      trim: true,
      default: "",
    },

    warehouse: {
      type: String,
      trim: true,
      default: "Main Warehouse",
    },

    items: {
      type: [deliveryChallanItemSchema],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: "At least one delivery item is required",
      },
    },

    totalCartons: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["Draft", "Dispatched", "Received", "Cancelled"],
      default: "Draft",
    },

    invoiceStatus: {
      type: String,
      enum: ["Not Invoiced", "Invoiced"],
      default: "Not Invoiced",
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DeliveryChallan", deliveryChallanSchema);