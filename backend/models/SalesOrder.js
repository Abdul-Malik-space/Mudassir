const mongoose = require("mongoose");

const salesOrderItemSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      default: null,
    },

    warehouse: {
      type: String,
      trim: true,
      default: "Main Godown",
    },

    availableStock: {
      type: Number,
      default: 0,
      min: 0,
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
      required: [true, "Quantity is required"],
      min: 0,
    },

    deliveredQty: {
      type: Number,
      default: 0,
      min: 0,
    },

    pendingQty: {
      type: Number,
      default: 0,
      min: 0,
    },

    unit: {
      type: String,
      default: "Rolls",
      trim: true,
    },

    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
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
  }
);

const salesOrderSchema = new mongoose.Schema(
  {
    salesOrderNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
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

    orderDate: {
      type: String,
      required: [true, "Order date is required"],
    },

    deliveryDate: {
      type: String,
      default: "",
    },

    poNo: {
      type: String,
      trim: true,
      default: "",
    },

    referenceNo: {
      type: String,
      trim: true,
      default: "",
    },

    taxType: {
      type: String,
      enum: ["without-tax", "with-tax"],
      default: "without-tax",
    },

    taxRate: {
      type: Number,
      default: 0,
      min: 0,
    },

    items: {
      type: [salesOrderItemSchema],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: "At least one item is required",
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

    salesTax: {
      type: Number,
      default: 0,
      min: 0,
    },

    grandTotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    advance: {
      type: Number,
      default: 0,
      min: 0,
    },

    balance: {
      type: Number,
      default: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Partially Paid", "Paid"],
      default: "Unpaid",
    },

    status: {
      type: String,
      enum: [
        "Draft",
        "Confirmed",
        "In Production",
        "Ready",
        "Partially Delivered",
        "Delivered",
        "Invoiced",
        "Cancelled",
      ],
      default: "Draft",
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

salesOrderSchema.pre("save", function () {
  this.items = (this.items || []).map((item) => {
    const quantity = Number(item.quantity || 0);
    const deliveredQty = Number(item.deliveredQty || 0);
    const unitPrice = Number(item.unitPrice || 0);

    item.cartons = Number(item.cartons || 0);
    item.quantity = quantity;
    item.deliveredQty = deliveredQty;
    item.pendingQty = Math.max(quantity - deliveredQty, 0);
    item.unitPrice = unitPrice;
    item.amount = quantity * unitPrice;
    item.availableStock = Number(item.availableStock || 0);

    return item;
  });
});

salesOrderSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate() || {};

  if (Array.isArray(update.items)) {
    update.items = update.items.map((item) => {
      const quantity = Number(item.quantity || 0);
      const deliveredQty = Number(item.deliveredQty || 0);
      const unitPrice = Number(item.unitPrice || 0);

      return {
        ...item,
        cartons: Number(item.cartons || 0),
        quantity,
        deliveredQty,
        pendingQty: Math.max(quantity - deliveredQty, 0),
        unitPrice,
        amount: quantity * unitPrice,
        availableStock: Number(item.availableStock || 0),
      };
    });
  }

  this.setUpdate(update);
});

module.exports = mongoose.model("SalesOrder", salesOrderSchema);