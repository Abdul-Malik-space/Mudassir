const mongoose = require("mongoose");

const deliveryChallanItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    size: { type: String, trim: true, default: "" },
    cartons: { type: Number, default: 0 },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, trim: true, default: "Rolls" },
  },
  { _id: false }
);

const deliveryChallanSchema = new mongoose.Schema(
  {
    challanNo: { type: String, required: true, unique: true, trim: true },

    salesOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder",
      required: true,
    },

    salesOrderNo: { type: String, required: true, trim: true },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, trim: true, default: "" },
    customerEmail: { type: String, trim: true, default: "" },
    customerAddress: { type: String, trim: true, default: "" },

    challanDate: { type: String, required: true },
    poNo: { type: String, trim: true, default: "" },

    vehicleNo: { type: String, trim: true, default: "" },
    driverName: { type: String, trim: true, default: "" },
    deliveredBy: { type: String, trim: true, default: "" },
    receivedBy: { type: String, trim: true, default: "" },

    items: {
      type: [deliveryChallanItemSchema],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: "At least one delivery item is required",
      },
    },

    totalCartons: { type: Number, default: 0 },
    totalQuantity: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["Draft", "Dispatched", "Received", "Cancelled"],
      default: "Draft",
    },

    remarks: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DeliveryChallan", deliveryChallanSchema);