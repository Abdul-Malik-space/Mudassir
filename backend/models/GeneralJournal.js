const mongoose = require("mongoose");

const journalEntrySchema = new mongoose.Schema(
  {
    account: {
      type: String,
      required: true,
      trim: true,
    },

    accountName: {
      type: String,
      required: true,
      trim: true,
    },

    accountType: {
      type: String,
      trim: true,
      default: "",
    },

    debit: {
      type: Number,
      default: 0,
      min: 0,
    },

    credit: {
      type: Number,
      default: 0,
      min: 0,
    },

    narration: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const journalTotalsSchema = new mongoose.Schema(
  {
    totalDebit: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalCredit: {
      type: Number,
      default: 0,
      min: 0,
    },

    difference: {
      type: Number,
      default: 0,
    },

    isBalanced: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const generalJournalSchema = new mongoose.Schema(
  {
    voucherNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    voucherDate: {
      type: String,
      required: [true, "Voucher date is required"],
    },

    transactionType: {
      type: String,
      required: true,
      enum: [
        "Cash In",
        "Cash Out",
        "Bank In",
        "Bank Out",
        "Cash to Bank",
        "Bank to Cash",
        "Bank to Bank",
        "Adjustment Journal",
        "Opening Balance",
      ],
    },

    amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    cashAccount: {
      type: String,
      trim: true,
      default: "",
    },

    bankAccount: {
      type: String,
      trim: true,
      default: "",
    },

    fromAccount: {
      type: String,
      trim: true,
      default: "",
    },

    toAccount: {
      type: String,
      trim: true,
      default: "",
    },

    counterAccount: {
      type: String,
      trim: true,
      default: "",
    },

    partyType: {
      type: String,
      enum: ["Customer", "Vendor", "Employee", "Owner", "Other"],
      default: "Other",
    },

    partyName: {
      type: String,
      trim: true,
      default: "",
    },

    referenceNo: {
      type: String,
      trim: true,
      default: "",
    },

    paymentMethod: {
      type: String,
      enum: ["Cash", "Bank Transfer", "Cheque", "Transfer", "Journal", "Other"],
      default: "Cash",
    },

    chequeNo: {
      type: String,
      trim: true,
      default: "",
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["Draft", "Approved", "Cancelled"],
      default: "Draft",
    },

    postingStatus: {
      type: String,
      enum: ["Not Posted", "Posted"],
      default: "Not Posted",
    },

    entries: {
      type: [journalEntrySchema],
      validate: {
        validator: function (entries) {
          return entries && entries.length >= 2;
        },
        message: "At least two journal entries are required",
      },
    },

    totals: {
      type: journalTotalsSchema,
      required: true,
      default: () => ({
        totalDebit: 0,
        totalCredit: 0,
        difference: 0,
        isBalanced: false,
      }),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("GeneralJournal", generalJournalSchema);