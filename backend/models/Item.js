const mongoose = require("mongoose");

const ITEM_TYPES = [
  "Raw Material",
  "Packing Material",
  "Finished Good",
  "Consumable",
  "Service",
];

const ITEM_TYPE_ALIASES = {
  RAW_MATERIAL: "Raw Material",
  RAWMATERIAL: "Raw Material",

  PACKING_MATERIAL: "Packing Material",
  PACKINGMATERIAL: "Packing Material",

  FINISHED_GOOD: "Finished Good",
  FINISHED_GOODS: "Finished Good",
  FINISHEDGOOD: "Finished Good",
  FINISHEDGOODS: "Finished Good",
  FINISHED_PRODUCT: "Finished Good",
  FINISHEDPRODUCT: "Finished Good",

  CONSUMABLE: "Consumable",
  CONSUMABLES: "Consumable",

  SERVICE: "Service",
  SERVICES: "Service",
};

const normalizeItemType = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  const originalValue = String(value).trim();

  const normalizedKey = originalValue
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  return (
    ITEM_TYPE_ALIASES[normalizedKey] ||
    originalValue
  );
};

const normalizeStatus = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  const normalizedValue = String(value)
    .trim()
    .toLowerCase();

  if (normalizedValue === "active") {
    return "Active";
  }

  if (normalizedValue === "inactive") {
    return "Inactive";
  }

  return String(value).trim();
};

const normalizeNumber = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return 0;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? Math.max(number, 0)
    : 0;
};

const normalizeMoney = (value) => {
  const number = normalizeNumber(value);

  if (number === undefined) {
    return undefined;
  }

  return Math.round(
    (number + Number.EPSILON) * 100
  ) / 100;
};

const normalizeItemFields = (target = {}) => {
  if (!target || typeof target !== "object") {
    return target;
  }

  if (target.code !== undefined) {
    target.code = String(target.code || "")
      .trim()
      .toUpperCase();
  }

  if (target.name !== undefined) {
    target.name = String(target.name || "").trim();
  }

  if (target.category !== undefined) {
    target.category =
      String(target.category || "").trim() ||
      "General";
  }

  if (target.brand !== undefined) {
    target.brand = String(target.brand || "").trim();
  }

  if (target.unit !== undefined) {
    target.unit =
      String(target.unit || "").trim() || "Pcs";
  }

  if (target.itemType !== undefined) {
    target.itemType = normalizeItemType(
      target.itemType
    );
  }

  if (target.status !== undefined) {
    target.status = normalizeStatus(target.status);
  }

  if (target.notes !== undefined) {
    target.notes = String(target.notes || "").trim();
  }

  ["purchasePrice", "salePrice"].forEach(
    (field) => {
      if (target[field] !== undefined) {
        target[field] = normalizeMoney(
          target[field]
        );
      }
    }
  );

  ["openingStock", "minStock"].forEach(
    (field) => {
      if (target[field] !== undefined) {
        target[field] = normalizeNumber(
          target[field]
        );
      }
    }
  );

  if (target.itemType === "Service") {
    target.stockManaged = false;
    target.purchasePrice = 0;
    target.openingStock = 0;
    target.minStock = 0;
  }

  return target;
};

const itemSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Item code is required"],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [
        50,
        "Item code cannot exceed 50 characters",
      ],
      index: true,
    },

    name: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
      maxlength: [
        150,
        "Item name cannot exceed 150 characters",
      ],
      index: true,
    },

    itemType: {
      type: String,
      enum: {
        values: ITEM_TYPES,
        message: "Invalid item type",
      },
      default: "Raw Material",
      index: true,
    },

    category: {
      type: String,
      trim: true,
      default: "General",
      maxlength: [
        100,
        "Category cannot exceed 100 characters",
      ],
    },

    brand: {
      type: String,
      trim: true,
      default: "",
      maxlength: [
        100,
        "Brand cannot exceed 100 characters",
      ],
    },

    unit: {
      type: String,
      trim: true,
      default: "Pcs",
      maxlength: [
        30,
        "Unit cannot exceed 30 characters",
      ],
    },

    /*
     * Purchase Order میں item select ہونے پر یہی default
     * purchase price استعمال ہوگا۔
     */
    purchasePrice: {
      type: Number,
      default: 0,
      min: [
        0,
        "Purchase price cannot be negative",
      ],
    },

    purchasePriceUpdatedAt: {
      type: Date,
      default: null,
    },

    salePrice: {
      type: Number,
      default: 0,
      min: [
        0,
        "Sale price cannot be negative",
      ],
    },

    openingStock: {
      type: Number,
      default: 0,
      min: [
        0,
        "Opening stock cannot be negative",
      ],
    },

    openingStockPosted: {
      type: Boolean,
      default: false,
    },

    minStock: {
      type: Number,
      default: 0,
      min: [
        0,
        "Minimum stock cannot be negative",
      ],
    },

    stockManaged: {
      type: Boolean,
      default: true,
      index: true,
    },

    status: {
      type: String,
      enum: {
        values: ["Active", "Inactive"],
        message:
          "Status must be Active or Inactive",
      },
      default: "Active",
      index: true,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: [
        1000,
        "Notes cannot exceed 1000 characters",
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

itemSchema.index({
  name: 1,
  category: 1,
  brand: 1,
});

itemSchema.index({
  itemType: 1,
  status: 1,
});

itemSchema.index({
  status: 1,
  stockManaged: 1,
  itemType: 1,
  code: 1,
});

/*
 * Mongoose 9:
 * Synchronous middleware میں next() استعمال نہیں ہوگا۔
 */
itemSchema.pre("validate", function () {
  const purchasePriceChanged =
    this.isNew ||
    this.isModified("purchasePrice");

  normalizeItemFields(this);

  if (purchasePriceChanged) {
    this.purchasePriceUpdatedAt =
      new Date();
  }

  if (this.itemType === "Service") {
    this.stockManaged = false;
    this.purchasePrice = 0;
    this.openingStock = 0;
    this.minStock = 0;
  }
});

const updateMiddleware = function () {
  const update = this.getUpdate() || {};

  if (Array.isArray(update)) {
    return;
  }

  const operatorUpdate =
    Object.keys(update).some(
      (key) =>
        key.startsWith("$")
    );

  const target =
    operatorUpdate
      ? update.$set || {}
      : update;

  const hasPurchasePrice =
    Object.prototype.hasOwnProperty.call(
      target,
      "purchasePrice"
    );

  normalizeItemFields(target);

  if (
    operatorUpdate &&
    update.$set
  ) {
    update.$set = target;
  }

  if (update.$setOnInsert) {
    normalizeItemFields(
      update.$setOnInsert
    );
  }

  if (hasPurchasePrice) {
    if (operatorUpdate) {
      update.$set = {
        ...(update.$set || {}),
        purchasePriceUpdatedAt:
          new Date(),
      };
    } else {
      update.purchasePriceUpdatedAt =
        new Date();
    }
  }

  this.setUpdate(update);
};

itemSchema.pre(
  "findOneAndUpdate",
  updateMiddleware
);

itemSchema.pre(
  "updateOne",
  updateMiddleware
);

itemSchema.pre(
  "updateMany",
  updateMiddleware
);

itemSchema.virtual(
  "isInventoryItem"
).get(function () {
  return (
    this.stockManaged === true &&
    this.itemType !== "Service"
  );
});

itemSchema.virtual(
  "purchaseOrderDefault"
).get(function () {
  return {
    item: this._id,
    code: this.code,
    name: this.name,
    itemType: this.itemType,
    unit: this.unit,
    purchasePrice:
      normalizeMoney(
        this.purchasePrice
      ) || 0,
  };
});

module.exports = mongoose.model(
  "Item",
  itemSchema
);
