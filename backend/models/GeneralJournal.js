const mongoose = require("mongoose");

const TRANSACTION_TYPES = [
  "Cash In",
  "Cash Out",
  "Bank In",
  "Bank Out",
  "Cash to Bank",
  "Bank to Cash",
  "Bank to Bank",
  "Adjustment Journal",
  "Opening Balance",
];

const PARTY_TYPES = ["Customer", "Vendor", "Employee", "Owner", "Other"];
const PAYMENT_METHODS = [
  "Cash",
  "Bank Transfer",
  "Cheque",
  "Transfer",
  "Journal",
  "Other",
];
const STATUSES = ["Draft", "Approved", "Cancelled"];
const POSTING_STATUSES = ["Not Posted", "Posted"];

const cleanText = (value, fallback = "") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const cleanNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(number, 0) : 0;
};

const roundMoney = (value) =>
  Math.round((cleanNumber(value) + Number.EPSILON) * 100) / 100;

const journalEntrySchema = new mongoose.Schema(
  {
    account: {
      type: String,
      required: [true, "Account is required"],
      trim: true,
      maxlength: 100,
    },

    accountName: {
      type: String,
      required: [true, "Account name is required"],
      trim: true,
      maxlength: 150,
    },

    accountType: {
      type: String,
      trim: true,
      default: "",
      maxlength: 50,
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
      maxlength: 500,
    },
  },
  {
    _id: false,
    versionKey: false,
  }
);

journalEntrySchema.pre("validate", function () {
  this.account = cleanText(this.account);
  this.accountName = cleanText(this.accountName);
  this.accountType = cleanText(this.accountType);
  this.debit = roundMoney(this.debit);
  this.credit = roundMoney(this.credit);
  this.narration = cleanText(this.narration);

  if ((this.debit <= 0 && this.credit <= 0) || (this.debit > 0 && this.credit > 0)) {
    this.invalidate(
      "debit",
      "A journal row must contain either Debit or Credit, not both"
    );
  }
});

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
  {
    _id: false,
    versionKey: false,
  }
);

const generalJournalSchema = new mongoose.Schema(
  {
    voucherNo: {
      type: String,
      required: [true, "Voucher number is required"],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 50,
      index: true,
    },

    voucherDate: {
      type: String,
      required: [true, "Voucher date is required"],
      validate: {
        validator(value) {
          return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
        },
        message: "Voucher date format must be YYYY-MM-DD",
      },
      index: true,
    },

    /*
     * All values remain in the model for backward compatibility and for the
     * upcoming Payments & Received page. The General Journal route itself now
     * permits only "Adjustment Journal".
     */
    transactionType: {
      type: String,
      required: [true, "Transaction type is required"],
      enum: TRANSACTION_TYPES,
      index: true,
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
      enum: PARTY_TYPES,
      default: "Other",
      index: true,
    },

    partyName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 150,
    },

    referenceNo: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
      index: true,
    },

    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: "Journal",
    },

    chequeNo: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },

    status: {
      type: String,
      enum: STATUSES,
      default: "Draft",
      index: true,
    },

    postingStatus: {
      type: String,
      enum: POSTING_STATUSES,
      default: "Not Posted",
      index: true,
    },

    entries: {
      type: [journalEntrySchema],
      validate: {
        validator(entries) {
          return Array.isArray(entries) && entries.length >= 2;
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
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

generalJournalSchema.index({ transactionType: 1, voucherDate: -1 });
generalJournalSchema.index({ postingStatus: 1, status: 1, createdAt: -1 });

generalJournalSchema.pre("validate", function () {
  this.voucherNo = cleanText(this.voucherNo).toUpperCase();
  this.voucherDate = cleanText(this.voucherDate);
  this.cashAccount = cleanText(this.cashAccount);
  this.bankAccount = cleanText(this.bankAccount);
  this.fromAccount = cleanText(this.fromAccount);
  this.toAccount = cleanText(this.toAccount);
  this.counterAccount = cleanText(this.counterAccount);
  this.partyName = cleanText(this.partyName);
  this.referenceNo = cleanText(this.referenceNo);
  this.chequeNo = cleanText(this.chequeNo);
  this.remarks = cleanText(this.remarks);

  this.entries = Array.isArray(this.entries) ? this.entries : [];

  const totalDebit = roundMoney(
    this.entries.reduce((sum, entry) => sum + cleanNumber(entry.debit), 0)
  );
  const totalCredit = roundMoney(
    this.entries.reduce((sum, entry) => sum + cleanNumber(entry.credit), 0)
  );
  const difference = roundMoney(totalDebit - totalCredit);
  const isBalanced =
    totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.000001;

  this.totals = {
    totalDebit,
    totalCredit,
    difference: isBalanced ? 0 : difference,
    isBalanced,
  };

  if (!isBalanced) {
    this.invalidate(
      "totals",
      "Journal must be balanced. Total Debit and Total Credit must be equal"
    );
  }

  if (this.transactionType === "Adjustment Journal") {
    this.amount = totalDebit;
    this.paymentMethod = "Journal";
    this.cashAccount = "";
    this.bankAccount = "";
    this.fromAccount = "";
    this.toAccount = "";
    this.counterAccount = "";
    this.chequeNo = "";
  } else {
    this.amount = roundMoney(this.amount || totalDebit);
  }

  if (this.postingStatus === "Posted" && this.status !== "Cancelled") {
    this.status = "Approved";
  }

  if (this.status === "Cancelled") {
    this.postingStatus = "Not Posted";
  }
});

module.exports = mongoose.model("GeneralJournal", generalJournalSchema);
