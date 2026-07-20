const mongoose = require("mongoose");

const MOVEMENT_TYPES = [
  "Opening Stock",

  "Purchase In",
  "GRN In",
  "Purchase Return Out",

  "Production Issue",
  "Production Return",
  "Production Wastage",
  "Production Output",

  "Warehouse Transfer In",
  "Warehouse Transfer Out",

  "Sales Out",
  "Delivery Challan Out",
  "Sales Return In",

  "Adjustment In",
  "Adjustment Out",

  "Reversal In",
  "Reversal Out",
];

const todayDate = () =>
  new Date().toISOString().slice(0, 10);

const normalizeNumber = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return number;
};

const normalizeText = (
  value,
  fallback = ""
) => {
  const cleanedValue = String(
    value || ""
  ).trim();

  return cleanedValue || fallback;
};

const stockLedgerSchema =
  new mongoose.Schema(
    {
      date: {
        type: String,
        required: [
          true,
          "Stock movement date is required",
        ],
        default: todayDate,
        validate: {
          validator(value) {
            return /^\d{4}-\d{2}-\d{2}$/.test(
              value
            );
          },
          message:
            "Date format YYYY-MM-DD hona chahiye",
        },
        index: true,
      },

      item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
        required: [
          true,
          "Stock item is required",
        ],
        index: true,
      },

      /*
       * Item code اور name snapshots ہیں۔
       * Item کا نام بعد میں تبدیل ہو تو پرانی ledger history
       * اپنے اصل نام اور code کے ساتھ محفوظ رہے گی۔
       */
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

      /*
       * Warehouse document کا اصل ObjectId link۔
       * Frontend compatibility اور history کے لیے
       * warehouse name بھی ساتھ رکھا گیا ہے۔
       */
      warehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Warehouse",
        default: null,
        index: true,
      },

      warehouse: {
        type: String,
        required: [
          true,
          "Warehouse is required",
        ],
        trim: true,
        default: "Raw Material Godown",
        index: true,
      },

      movementType: {
        type: String,
        enum: {
          values: MOVEMENT_TYPES,
          message:
            "Invalid stock movement type",
        },
        required: [
          true,
          "Movement type is required",
        ],
        index: true,
      },

      sourceModule: {
        type: String,
        trim: true,
        default: "",
        index: true,
      },

      referenceModel: {
        type: String,
        trim: true,
        default: "",
      },

      referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
        index: true,
      },

      /*
       * GRN، Production یا Delivery Challan کی ایک document میں
       * ایک سے زیادہ items ہوں تو ہر line کی الگ شناخت ہوگی۔
       */
      referenceLineId: {
        type: String,
        trim: true,
        default: "",
      },

      referenceNo: {
        type: String,
        trim: true,
        default: "",
        index: true,
      },

      qtyIn: {
        type: Number,
        default: 0,
        min: [
          0,
          "Stock IN cannot be negative",
        ],
      },

      qtyOut: {
        type: Number,
        default: 0,
        min: [
          0,
          "Stock OUT cannot be negative",
        ],
      },

      unit: {
        type: String,
        trim: true,
        default: "Pcs",
      },

      rate: {
        type: Number,
        default: 0,
        min: [
          0,
          "Stock rate cannot be negative",
        ],
      },

      amount: {
        type: Number,
        default: 0,
        min: [
          0,
          "Stock amount cannot be negative",
        ],
      },

      remarks: {
        type: String,
        trim: true,
        default: "",
        maxlength: [
          1000,
          "Stock remarks cannot exceed 1000 characters",
        ],
      },

      /*
       * ایک GRN، Production Receipt یا Delivery Challan کو
       * دوبارہ submit کرنے پر duplicate stock entry نہیں بنے گی۔
       */
      postingKey: {
        type: String,
        trim: true,
        default: undefined,
      },

      /*
       * Cancel یا reversal entry کی linking کے لیے۔
       */
      isReversal: {
        type: Boolean,
        default: false,
      },

      reversalOf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "StockLedger",
        default: null,
        index: true,
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

/*
 * Stock balance اور ledger searching کو تیز کرے گا۔
 */
stockLedgerSchema.index({
  item: 1,
  warehouse: 1,
  date: 1,
});

stockLedgerSchema.index({
  item: 1,
  warehouseId: 1,
  date: 1,
});

stockLedgerSchema.index({
  sourceModule: 1,
  referenceId: 1,
  movementType: 1,
});

stockLedgerSchema.index(
  {
    postingKey: 1,
  },
  {
    unique: true,
    sparse: true,
  }
);

/*
 * Mongoose 9 synchronous middleware۔
 * یہاں function(next) اور next() استعمال نہیں ہوں گے۔
 */
stockLedgerSchema.pre(
  "validate",
  function () {
    this.date = normalizeText(
      this.date,
      todayDate()
    );

    this.itemCode = normalizeText(
      this.itemCode
    ).toUpperCase();

    this.itemName = normalizeText(
      this.itemName
    );

    this.warehouse = normalizeText(
      this.warehouse,
      "Raw Material Godown"
    );

    this.sourceModule = normalizeText(
      this.sourceModule
    );

    this.referenceModel = normalizeText(
      this.referenceModel
    );

    this.referenceLineId =
      normalizeText(
        this.referenceLineId
      );

    this.referenceNo = normalizeText(
      this.referenceNo
    );

    this.unit = normalizeText(
      this.unit,
      "Pcs"
    );

    this.remarks = normalizeText(
      this.remarks
    );

    this.qtyIn = normalizeNumber(
      this.qtyIn
    );

    this.qtyOut = normalizeNumber(
      this.qtyOut
    );

    this.rate = normalizeNumber(
      this.rate
    );

    if (this.qtyIn < 0) {
      this.invalidate(
        "qtyIn",
        "Stock IN cannot be negative"
      );
    }

    if (this.qtyOut < 0) {
      this.invalidate(
        "qtyOut",
        "Stock OUT cannot be negative"
      );
    }

    if (this.rate < 0) {
      this.invalidate(
        "rate",
        "Stock rate cannot be negative"
      );
    }

    const hasQtyIn =
      this.qtyIn > 0;

    const hasQtyOut =
      this.qtyOut > 0;

    /*
     * ہر Stock Ledger entry صرف IN یا صرف OUT ہوگی۔
     */
    if (
      !hasQtyIn &&
      !hasQtyOut
    ) {
      this.invalidate(
        "qtyIn",
        "Stock IN ya Stock OUT quantity required hai"
      );
    }

    if (
      hasQtyIn &&
      hasQtyOut
    ) {
      this.invalidate(
        "qtyOut",
        "Aik Stock Ledger entry mein IN aur OUT dono nahi ho sakte"
      );
    }

    const movementQuantity =
      hasQtyIn
        ? this.qtyIn
        : this.qtyOut;

    this.amount =
      movementQuantity *
      this.rate;

    /*
     * Empty postingKey کو undefined رکھنا ضروری ہے،
     * تاکہ sparse unique index manual entries کو block نہ کرے۔
     */
    if (!this.postingKey) {
      this.postingKey = undefined;
    }
  }
);

stockLedgerSchema
  .virtual("direction")
  .get(function () {
    if (
      Number(this.qtyIn || 0) >
      0
    ) {
      return "IN";
    }

    if (
      Number(this.qtyOut || 0) >
      0
    ) {
      return "OUT";
    }

    return "";
  });

stockLedgerSchema
  .virtual("quantity")
  .get(function () {
    return Number(
      this.qtyIn || 0
    ) > 0
      ? Number(this.qtyIn || 0)
      : Number(this.qtyOut || 0);
  });

module.exports = mongoose.model(
  "StockLedger",
  stockLedgerSchema
);