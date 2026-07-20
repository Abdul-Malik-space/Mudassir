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

  return Number.isFinite(number) ? number : 0;
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

  const numericFields = [
    "purchasePrice",
    "salePrice",
    "openingStock",
    "minStock",
  ];

  numericFields.forEach((field) => {
    if (target[field] !== undefined) {
      target[field] = normalizeNumber(
        target[field]
      );
    }
  });

  if (target.itemType === "Service") {
    target.stockManaged = false;
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
    },

    name: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
      maxlength: [
        150,
        "Item name cannot exceed 150 characters",
      ],
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

    purchasePrice: {
      type: Number,
      default: 0,
      min: [
        0,
        "Purchase price cannot be negative",
      ],
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

/*
 * Mongoose 9:
 * Synchronous middleware میں next() استعمال نہیں ہوگا۔
 */
itemSchema.pre("validate", function () {
  normalizeItemFields(this);

  if (this.itemType === "Service") {
    this.stockManaged = false;
    this.openingStock = 0;
    this.minStock = 0;
  }
});

const updateMiddleware = function () {
  const update = this.getUpdate() || {};

  if (Array.isArray(update)) {
    return;
  }

  if (update.$set) {
    normalizeItemFields(update.$set);
  } else {
    normalizeItemFields(update);
  }

  if (update.$setOnInsert) {
    normalizeItemFields(
      update.$setOnInsert
    );
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

module.exports = mongoose.model(
  "Item",
  itemSchema
);