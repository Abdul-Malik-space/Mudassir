const mongoose = require("mongoose");

const deliveryChallanItemSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
    default: null,
  },

  salesOrderItemId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },

  warehouse: {
    type: String,
    trim: true,
    default: "Main Godown",
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

  orderedQty: {
    type: Number,
    default: 0,
    min: 0,
  },

  alreadyDeliveredQty: {
    type: Number,
    default: 0,
    min: 0,
  },

  pendingQty: {
    type: Number,
    default: 0,
    min: 0,
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
});

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
      default: "Main Godown",
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

deliveryChallanSchema.pre("save", function () {
  this.warehouse = String(this.warehouse || "Main Godown").trim();

  this.items = (this.items || []).map((item) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice || 0);

    item.warehouse = String(item.warehouse || this.warehouse || "Main Godown").trim();
    item.orderedQty = Number(item.orderedQty || 0);
    item.alreadyDeliveredQty = Number(item.alreadyDeliveredQty || 0);
    item.pendingQty = Number(item.pendingQty || 0);
    item.cartons = Number(item.cartons || 0);
    item.quantity = quantity;
    item.unitPrice = unitPrice;
    item.amount = quantity * unitPrice;

    return item;
  });

  this.totalCartons = this.items.reduce(
    (sum, item) => sum + Number(item.cartons || 0),
    0
  );

  this.totalQuantity = this.items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  this.subtotal = this.items.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );
});

deliveryChallanSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate() || {};

  if (update.warehouse !== undefined) {
    update.warehouse = String(update.warehouse || "Main Godown").trim();
  }

  if (Array.isArray(update.items)) {
    update.items = update.items.map((item) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unitPrice || 0);

      return {
        ...item,
        warehouse: String(item.warehouse || update.warehouse || "Main Godown").trim(),
        orderedQty: Number(item.orderedQty || 0),
        alreadyDeliveredQty: Number(item.alreadyDeliveredQty || 0),
        pendingQty: Number(item.pendingQty || 0),
        cartons: Number(item.cartons || 0),
        quantity,
        unitPrice,
        amount: quantity * unitPrice,
      };
    });

    update.totalCartons = update.items.reduce(
      (sum, item) => sum + Number(item.cartons || 0),
      0
    );

    update.totalQuantity = update.items.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );

    update.subtotal = update.items.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );
  }

  this.setUpdate(update);
});

module.exports = mongoose.model("DeliveryChallan", deliveryChallanSchema);