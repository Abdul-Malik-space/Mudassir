const mongoose = require("mongoose");

const FINISHED_GOODS_GODOWN = "Finished Goods Godown";

const todayDate = () =>
  new Date().toISOString().slice(0, 10);

const cleanText = (value, fallback = "") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const cleanNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? Math.max(number, 0)
    : 0;
};

const deliveryChallanItemSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: [true, "Finished good item is required"],
      index: true,
    },

    salesOrderItemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Sales order item reference is required"],
    },

    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      default: null,
    },

    warehouse: {
      type: String,
      trim: true,
      default: FINISHED_GOODS_GODOWN,
    },

    itemCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    itemName: {
      type: String,
      trim: true,
      default: "",
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

    orderedQty: {
      type: Number,
      default: 0,
      min: [0, "Ordered quantity cannot be negative"],
    },

    alreadyDeliveredQty: {
      type: Number,
      default: 0,
      min: [0, "Previously delivered quantity cannot be negative"],
    },

    pendingQty: {
      type: Number,
      default: 0,
      min: [0, "Pending quantity cannot be negative"],
    },

    availableStock: {
      type: Number,
      default: 0,
      min: [0, "Available stock cannot be negative"],
    },

    cartons: {
      type: Number,
      default: 0,
      min: [0, "Cartons cannot be negative"],
    },

    quantity: {
      type: Number,
      required: [true, "Delivery quantity is required"],
      min: [
        0.000001,
        "Delivery quantity must be greater than zero",
      ],
    },

    unit: {
      type: String,
      trim: true,
      default: "Pcs",
    },

    grossWeight: {
      type: Number,
      default: 0,
      min: [0, "Gross weight cannot be negative"],
    },

    netWeight: {
      type: Number,
      default: 0,
      min: [0, "Net weight cannot be negative"],
    },

    unitPrice: {
      type: Number,
      default: 0,
      min: [0, "Unit price cannot be negative"],
    },

    amount: {
      type: Number,
      default: 0,
      min: [0, "Amount cannot be negative"],
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
      maxlength: [
        1000,
        "Item remarks cannot exceed 1000 characters",
      ],
    },
  },
  {
    _id: true,
    versionKey: false,
  }
);

const deliveryChallanSchema = new mongoose.Schema(
  {
    challanNo: {
      type: String,
      required: [true, "Delivery challan number is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },

    salesOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder",
      required: [true, "Sales order is required"],
      index: true,
    },

    salesOrderNo: {
      type: String,
      required: [true, "Sales order number is required"],
      trim: true,
      uppercase: true,
      index: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer is required"],
      index: true,
    },

    customerName: {
      type: String,
      required: [true, "Customer name is required"],
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
      lowercase: true,
      default: "",
    },

    customerAddress: {
      type: String,
      trim: true,
      default: "",
    },

    deliveryAddress: {
      type: String,
      trim: true,
      default: "",
    },

    attentionTo: {
      type: String,
      trim: true,
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

    challanDate: {
      type: String,
      required: [true, "Challan date is required"],
      default: todayDate,

      validate: {
        validator(value) {
          return /^\d{4}-\d{2}-\d{2}$/.test(value);
        },

        message: "Challan date format must be YYYY-MM-DD",
      },

      index: true,
    },

    dispatchDate: {
      type: String,
      trim: true,
      default: "",
    },

    receivedDate: {
      type: String,
      trim: true,
      default: "",
    },

    vehicleNo: {
      type: String,
      trim: true,
      uppercase: true,
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

    preparedBy: {
      type: String,
      trim: true,
      default: "",
    },

    dispatchedBy: {
      type: String,
      trim: true,
      default: "",
    },

    receivedBy: {
      type: String,
      trim: true,
      default: "",
    },

    receiverDesignation: {
      type: String,
      trim: true,
      default: "",
    },

    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      default: null,
      index: true,
    },

    warehouse: {
      type: String,
      trim: true,
      default: FINISHED_GOODS_GODOWN,
      index: true,
    },

    items: {
      type: [deliveryChallanItemSchema],

      validate: {
        validator(items) {
          return Array.isArray(items) && items.length > 0;
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

    totalGrossWeight: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalNetWeight: {
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
      enum: [
        "Draft",
        "Dispatched",
        "Received",
        "Cancelled",
      ],
      default: "Draft",
      index: true,
    },

    invoiceStatus: {
      type: String,
      enum: [
        "Not Invoiced",
        "Invoiced",
      ],
      default: "Not Invoiced",
      index: true,
    },

    stockPosted: {
      type: Boolean,
      default: false,
      index: true,
    },

    stockPostedAt: {
      type: Date,
      default: null,
    },

    reversalPosted: {
      type: Boolean,
      default: false,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelReason: {
      type: String,
      trim: true,
      default: "",
      maxlength: [
        1000,
        "Cancel reason cannot exceed 1000 characters",
      ],
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
      maxlength: [
        2000,
        "Remarks cannot exceed 2000 characters",
      ],
    },
  },
  {
    timestamps: true,
    versionKey: false,

    toJSON: {
      virtuals: true,
    },

    toObject: {
      virtuals: true,
    },
  }
);

deliveryChallanSchema.index({
  salesOrder: 1,
  status: 1,
});

deliveryChallanSchema.index({
  customer: 1,
  challanDate: -1,
});

deliveryChallanSchema.index({
  "items.item": 1,
  status: 1,
});

deliveryChallanSchema.pre("validate", function () {
  this.challanNo = cleanText(
    this.challanNo
  ).toUpperCase();

  this.salesOrderNo = cleanText(
    this.salesOrderNo
  ).toUpperCase();

  this.customerName = cleanText(
    this.customerName
  );

  this.customerPhone = cleanText(
    this.customerPhone
  );

  this.customerEmail = cleanText(
    this.customerEmail
  ).toLowerCase();

  this.customerAddress = cleanText(
    this.customerAddress
  );

  this.deliveryAddress = cleanText(
    this.deliveryAddress,
    this.customerAddress
  );

  this.attentionTo = cleanText(
    this.attentionTo
  );

  this.poNo = cleanText(
    this.poNo
  );

  this.referenceNo = cleanText(
    this.referenceNo
  );

  this.challanDate = cleanText(
    this.challanDate,
    todayDate()
  );

  this.dispatchDate = cleanText(
    this.dispatchDate
  );

  this.receivedDate = cleanText(
    this.receivedDate
  );

  this.vehicleNo = cleanText(
    this.vehicleNo
  ).toUpperCase();

  this.driverName = cleanText(
    this.driverName
  );

  this.driverPhone = cleanText(
    this.driverPhone
  );

  this.preparedBy = cleanText(
    this.preparedBy
  );

  this.dispatchedBy = cleanText(
    this.dispatchedBy
  );

  this.receivedBy = cleanText(
    this.receivedBy
  );

  this.receiverDesignation = cleanText(
    this.receiverDesignation
  );

  this.warehouse =
    FINISHED_GOODS_GODOWN;

  this.cancelReason = cleanText(
    this.cancelReason
  );

  this.remarks = cleanText(
    this.remarks
  );

  const items = Array.isArray(
    this.items
  )
    ? this.items
    : [];

  this.items = items.map(
    (item) => {
      item.warehouse =
        FINISHED_GOODS_GODOWN;

      item.itemCode = cleanText(
        item.itemCode
      ).toUpperCase();

      item.itemName = cleanText(
        item.itemName
      );

      item.description = cleanText(
        item.description,
        item.itemName
      );

      item.size = cleanText(
        item.size
      );

      item.orderedQty = cleanNumber(
        item.orderedQty
      );

      item.alreadyDeliveredQty =
        cleanNumber(
          item.alreadyDeliveredQty
        );

      item.pendingQty = cleanNumber(
        item.pendingQty
      );

      item.availableStock =
        cleanNumber(
          item.availableStock
        );

      item.cartons = cleanNumber(
        item.cartons
      );

      item.quantity = cleanNumber(
        item.quantity
      );

      item.unit = cleanText(
        item.unit,
        "Pcs"
      );

      item.grossWeight = cleanNumber(
        item.grossWeight
      );

      item.netWeight = cleanNumber(
        item.netWeight
      );

      item.unitPrice = cleanNumber(
        item.unitPrice
      );

      item.amount =
        item.quantity *
        item.unitPrice;

      item.remarks = cleanText(
        item.remarks
      );

      if (
        item.netWeight >
          item.grossWeight &&
        item.grossWeight > 0
      ) {
        this.invalidate(
          "items",
          `Net weight cannot exceed gross weight for ${item.description}`
        );
      }

      return item;
    }
  );

  this.totalCartons =
    this.items.reduce(
      (sum, item) =>
        sum +
        cleanNumber(
          item.cartons
        ),
      0
    );

  this.totalQuantity =
    this.items.reduce(
      (sum, item) =>
        sum +
        cleanNumber(
          item.quantity
        ),
      0
    );

  this.totalGrossWeight =
    this.items.reduce(
      (sum, item) =>
        sum +
        cleanNumber(
          item.grossWeight
        ),
      0
    );

  this.totalNetWeight =
    this.items.reduce(
      (sum, item) =>
        sum +
        cleanNumber(
          item.netWeight
        ),
      0
    );

  this.subtotal =
    this.items.reduce(
      (sum, item) =>
        sum +
        cleanNumber(
          item.amount
        ),
      0
    );
});

module.exports = mongoose.model(
  "DeliveryChallan",
  deliveryChallanSchema
);