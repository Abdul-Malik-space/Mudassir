const mongoose = require("mongoose");

const WAREHOUSE_TYPES = [
  "Raw Material",
  "Finished Goods",
  "Work In Process",
  "General",
];

const WAREHOUSE_STATUSES = [
  "Active",
  "Inactive",
  "Full",
];

const normalizeText = (
  value,
  fallback = ""
) => {
  const cleanedValue = String(
    value || ""
  ).trim();

  return cleanedValue || fallback;
};

const normalizeWarehouseType = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  const normalizedValue = String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  const aliases = {
    rawmaterial: "Raw Material",
    rawmaterialgodown: "Raw Material",

    finishedgood: "Finished Goods",
    finishedgoods: "Finished Goods",
    finishedproduct: "Finished Goods",
    finishedproductgodown:
      "Finished Goods",

    workinprocess: "Work In Process",
    wip: "Work In Process",
    productionfloor: "Work In Process",

    general: "General",
    warehouse: "General",
  };

  return (
    aliases[normalizedValue] ||
    String(value).trim()
  );
};

const normalizeWarehouseStatus = (
  value
) => {
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

  if (normalizedValue === "full") {
    return "Full";
  }

  return String(value).trim();
};

const normalizePercentage = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, number)
  );
};

const normalizeWarehouseFields = (
  target = {}
) => {
  if (!target || typeof target !== "object") {
    return target;
  }

  if (target.code !== undefined) {
    target.code = String(target.code || "")
      .trim()
      .toUpperCase();
  }

  if (target.name !== undefined) {
    target.name = normalizeText(target.name);
  }

  if (target.warehouseType !== undefined) {
    target.warehouseType =
      normalizeWarehouseType(
        target.warehouseType
      );
  }

  if (target.location !== undefined) {
    target.location = normalizeText(
      target.location
    );
  }

  if (target.capacity !== undefined) {
    target.capacity = normalizeText(
      target.capacity
    );
  }

  if (
    target.capacityPercent !== undefined
  ) {
    target.capacityPercent =
      normalizePercentage(
        target.capacityPercent
      );
  }

  if (target.status !== undefined) {
    target.status =
      normalizeWarehouseStatus(
        target.status
      );
  }

  if (target.notes !== undefined) {
    target.notes = normalizeText(target.notes);
  }

  return target;
};

const warehouseSchema =
  new mongoose.Schema(
    {
      code: {
        type: String,
        trim: true,
        uppercase: true,
        unique: true,
        sparse: true,
        maxlength: [
          30,
          "Warehouse code cannot exceed 30 characters",
        ],
      },

      name: {
        type: String,
        required: [
          true,
          "Warehouse name is required",
        ],
        trim: true,
        unique: true,
        maxlength: [
          150,
          "Warehouse name cannot exceed 150 characters",
        ],
      },

      warehouseType: {
        type: String,
        enum: {
          values: WAREHOUSE_TYPES,
          message: "Invalid warehouse type",
        },
        default: "General",
        index: true,
      },

      location: {
        type: String,
        trim: true,
        default: "",
        maxlength: [
          250,
          "Warehouse location cannot exceed 250 characters",
        ],
      },

      capacity: {
        type: String,
        trim: true,
        default: "",
        maxlength: [
          100,
          "Warehouse capacity cannot exceed 100 characters",
        ],
      },

      capacityPercent: {
        type: Number,
        default: 0,
        min: [
          0,
          "Capacity percentage cannot be less than zero",
        ],
        max: [
          100,
          "Capacity percentage cannot exceed 100",
        ],
      },

      status: {
        type: String,
        enum: {
          values: WAREHOUSE_STATUSES,
          message: "Invalid warehouse status",
        },
        default: "Active",
        index: true,
      },

      isSystem: {
        type: Boolean,
        default: false,
        index: true,
      },

      notes: {
        type: String,
        trim: true,
        default: "",
        maxlength: [
          1000,
          "Warehouse notes cannot exceed 1000 characters",
        ],
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

warehouseSchema.index({
  warehouseType: 1,
  status: 1,
});

warehouseSchema.index({
  name: 1,
  location: 1,
});

/*
 * Mongoose 9:
 * Synchronous middleware میں next() استعمال نہیں ہوگا۔
 */
warehouseSchema.pre(
  "validate",
  function () {
    normalizeWarehouseFields(this);
  }
);

const updateMiddleware = function () {
  const update = this.getUpdate() || {};

  if (Array.isArray(update)) {
    return;
  }

  if (update.$set) {
    normalizeWarehouseFields(
      update.$set
    );
  } else {
    normalizeWarehouseFields(update);
  }

  if (update.$setOnInsert) {
    normalizeWarehouseFields(
      update.$setOnInsert
    );
  }

  this.setUpdate(update);
};

warehouseSchema.pre(
  "findOneAndUpdate",
  updateMiddleware
);

warehouseSchema.pre(
  "updateOne",
  updateMiddleware
);

warehouseSchema.pre(
  "updateMany",
  updateMiddleware
);

module.exports = mongoose.model(
  "Warehouse",
  warehouseSchema
);