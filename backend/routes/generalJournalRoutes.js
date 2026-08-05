const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const GeneralJournal = require("../models/GeneralJournal");
const Counter = require("../models/Counter");

const JOURNAL_TYPE = "Adjustment Journal";
const ALLOWED_STATUSES = ["Draft", "Approved", "Cancelled"];
const ALLOWED_POSTING_STATUSES = ["Not Posted", "Posted"];
const ALLOWED_PARTY_TYPES = [
  "Customer",
  "Vendor",
  "Employee",
  "Owner",
  "Other",
];

const cashAccounts = [
  { id: "cash-in-hand", name: "Cash in Hand", type: "Cash" },
];

const bankAccounts = [
  { id: "bank-main", name: "Main Bank Account", type: "Bank" },
  { id: "bank-ubl", name: "UBL Bank Account", type: "Bank" },
  { id: "bank-meezan", name: "Meezan Bank Account", type: "Bank" },
];

const incomeAccounts = [
  { id: "sales-income", name: "Sales Income", type: "Income" },
  { id: "service-income", name: "Service Income", type: "Income" },
  { id: "other-income", name: "Other Income", type: "Income" },
];

const expenseAccounts = [
  { id: "purchase-expense", name: "Purchase Expense", type: "Expense" },
  { id: "salary-expense", name: "Salary Expense", type: "Expense" },
  { id: "rent-expense", name: "Rent Expense", type: "Expense" },
  { id: "utility-expense", name: "Utility Expense", type: "Expense" },
  { id: "freight-expense", name: "Freight Expense", type: "Expense" },
  { id: "misc-expense", name: "Miscellaneous Expense", type: "Expense" },
];

const receivablePayableAccounts = [
  { id: "customer-receivable", name: "Customer Receivable", type: "Asset" },
  { id: "vendor-payable", name: "Vendor Payable", type: "Liability" },
  { id: "employee-payable", name: "Employee Payable", type: "Liability" },
];

const adjustmentAccounts = [
  { id: "opening-capital", name: "Opening Capital", type: "Equity" },
  { id: "owner-drawing", name: "Owner Drawing", type: "Equity" },
  { id: "stock-adjustment", name: "Stock Adjustment", type: "Adjustment" },
  { id: "round-off", name: "Round Off", type: "Adjustment" },
];

const allAccounts = [
  ...cashAccounts,
  ...bankAccounts,
  ...incomeAccounts,
  ...expenseAccounts,
  ...receivablePayableAccounts,
  ...adjustmentAccounts,
];

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

const escapeRegex = (value) =>
  String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isValidId = (value) => mongoose.isValidObjectId(value);

const getAccount = (accountId) =>
  allAccounts.find((account) => account.id === cleanText(accountId)) || null;

const duplicateMessage = (error, fallback = "Journal could not be saved") => {
  if (error?.code !== 11000) return error?.message || fallback;
  return "This voucher number already exists";
};

const formatVoucherNo = (year, sequence) =>
  `JV-${year}-${String(sequence).padStart(4, "0")}`;

const getCounterName = (year) => `generalJournal-${year}`;

const getNextVoucherNo = async () => {
  const year = new Date().getFullYear();

  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const counter = await Counter.findOneAndUpdate(
      { name: getCounterName(year) },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const voucherNo = formatVoucherNo(year, counter.seq);
    const exists = await GeneralJournal.exists({ voucherNo });
    if (!exists) return voucherNo;
  }

  throw new Error("Unable to generate a unique voucher number");
};

const peekNextVoucherNo = async () => {
  const year = new Date().getFullYear();
  const counter = await Counter.findOne({ name: getCounterName(year) }).lean();
  let sequence = Math.max(Number(counter?.seq || 0) + 1, 1);

  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const voucherNo = formatVoucherNo(year, sequence);
    if (!(await GeneralJournal.exists({ voucherNo }))) return voucherNo;
    sequence += 1;
  }

  throw new Error("Unable to preview the next voucher number");
};

const cleanJournalEntries = (entries = []) => {
  if (!Array.isArray(entries)) {
    throw new Error("Journal entries must be an array");
  }

  const cleanEntries = entries
    .filter(
      (entry) =>
        entry &&
        (cleanText(entry.account) ||
          cleanNumber(entry.debit) > 0 ||
          cleanNumber(entry.credit) > 0 ||
          cleanText(entry.narration))
    )
    .map((entry, index) => {
      const account = getAccount(entry.account);
      if (!account) {
        throw new Error(`Select a valid account in journal row ${index + 1}`);
      }

      const debit = roundMoney(entry.debit);
      const credit = roundMoney(entry.credit);

      if ((debit <= 0 && credit <= 0) || (debit > 0 && credit > 0)) {
        throw new Error(
          `Journal row ${index + 1} must contain either Debit or Credit`
        );
      }

      return {
        account: account.id,
        accountName: account.name,
        accountType: account.type,
        debit,
        credit,
        narration: cleanText(entry.narration),
      };
    });

  if (cleanEntries.length < 2) {
    throw new Error("At least two journal entries are required");
  }

  return cleanEntries;
};

const calculateTotals = (entries) => {
  const totalDebit = roundMoney(
    entries.reduce((sum, entry) => sum + cleanNumber(entry.debit), 0)
  );
  const totalCredit = roundMoney(
    entries.reduce((sum, entry) => sum + cleanNumber(entry.credit), 0)
  );
  const difference = roundMoney(totalDebit - totalCredit);
  const isBalanced =
    totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.000001;

  if (!isBalanced) {
    throw new Error("Total Debit and Total Credit must be equal");
  }

  return { totalDebit, totalCredit, difference: 0, isBalanced: true };
};

const buildAdjustmentPayload = ({ body = {}, existingJournal = null }) => {
  const voucherDate = cleanText(
    body.voucherDate ?? existingJournal?.voucherDate
  );

  if (!/^\d{4}-\d{2}-\d{2}$/.test(voucherDate)) {
    throw new Error("A valid voucher date is required");
  }

  const entries = cleanJournalEntries(
    body.entries ?? existingJournal?.entries ?? []
  );
  const totals = calculateTotals(entries);

  return {
    voucherDate,
    transactionType: JOURNAL_TYPE,
    amount: totals.totalDebit,

    // These fields belong to the future Payments & Received page. They are
    // intentionally blank on an Adjustment Journal.
    cashAccount: "",
    bankAccount: "",
    fromAccount: "",
    toAccount: "",
    counterAccount: "",

    partyType: ALLOWED_PARTY_TYPES.includes(body.partyType)
      ? body.partyType
      : ALLOWED_PARTY_TYPES.includes(existingJournal?.partyType)
        ? existingJournal.partyType
        : "Other",
    partyName: cleanText(body.partyName ?? existingJournal?.partyName),
    referenceNo: cleanText(
      body.referenceNo ?? existingJournal?.referenceNo
    ),
    paymentMethod: "Journal",
    chequeNo: "",
    remarks: cleanText(body.remarks ?? existingJournal?.remarks),
    status: "Draft",
    postingStatus: "Not Posted",
    entries,
    totals,
  };
};

const findAdjustmentJournal = async (journalId) => {
  if (!isValidId(journalId)) throw new Error("Invalid journal ID");

  const journal = await GeneralJournal.findOne({
    _id: journalId,
    transactionType: JOURNAL_TYPE,
  });

  if (!journal) throw new Error("Adjustment Journal not found");
  return journal;
};

router.get("/next-no", async (req, res) => {
  try {
    return res.json({ success: true, voucherNo: await peekNextVoucherNo() });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Voucher number could not be generated",
    });
  }
});

router.get("/accounts", async (req, res) => {
  return res.json({
    success: true,
    accounts: allAccounts,
    cashAccounts,
    bankAccounts,
    incomeAccounts,
    expenseAccounts,
    receivablePayableAccounts,
    adjustmentAccounts,
    voucherTypes: [JOURNAL_TYPE],
  });
});

router.get("/all", async (req, res) => {
  try {
    const {
      search = "",
      status = "",
      postingStatus = "",
      partyType = "",
      dateFrom = "",
      dateTo = "",
    } = req.query;

    const query = { transactionType: JOURNAL_TYPE };

    if (status && status !== "All" && ALLOWED_STATUSES.includes(status)) {
      query.status = status;
    }

    if (
      postingStatus &&
      postingStatus !== "All" &&
      ALLOWED_POSTING_STATUSES.includes(postingStatus)
    ) {
      query.postingStatus = postingStatus;
    }

    if (
      partyType &&
      partyType !== "All" &&
      ALLOWED_PARTY_TYPES.includes(partyType)
    ) {
      query.partyType = partyType;
    }

    if (dateFrom || dateTo) {
      query.voucherDate = {};
      if (dateFrom) query.voucherDate.$gte = dateFrom;
      if (dateTo) query.voucherDate.$lte = dateTo;
    }

    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        "voucherNo",
        "partyName",
        "referenceNo",
        "remarks",
        "entries.accountName",
        "entries.narration",
      ].map((field) => ({
        [field]: { $regex: safeSearch, $options: "i" },
      }));
    }

    const journals = await GeneralJournal.find(query).sort({
      voucherDate: -1,
      createdAt: -1,
    });

    return res.json({ success: true, journals });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Adjustment Journals could not be loaded",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const journal = await findAdjustmentJournal(req.params.id);
    return res.json({ success: true, data: journal });
  } catch (error) {
    return res.status(error.message === "Invalid journal ID" ? 400 : 404).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/add", async (req, res) => {
  try {
    const payload = buildAdjustmentPayload({ body: req.body || {} });
    const journal = await GeneralJournal.create({
      voucherNo: await getNextVoucherNo(),
      ...payload,
    });

    return res.status(201).json({
      success: true,
      message: "Adjustment Journal created successfully",
      data: journal,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: duplicateMessage(error, "Adjustment Journal could not be saved"),
    });
  }
});

router.put("/update/:id", async (req, res) => {
  try {
    const journal = await findAdjustmentJournal(req.params.id);

    if (journal.postingStatus === "Posted") {
      throw new Error("Posted journal cannot be updated. Unpost it first.");
    }

    if (journal.status === "Cancelled") {
      throw new Error("Cancelled journal cannot be updated");
    }

    const payload = buildAdjustmentPayload({
      body: req.body || {},
      existingJournal: journal,
    });

    Object.assign(journal, payload);
    await journal.save();

    return res.json({
      success: true,
      message: "Adjustment Journal updated successfully",
      data: journal,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: duplicateMessage(
        error,
        "Adjustment Journal could not be updated"
      ),
    });
  }
});

router.put("/post/:id", async (req, res) => {
  try {
    const journal = await findAdjustmentJournal(req.params.id);

    if (journal.status === "Cancelled") {
      throw new Error("Cancelled journal cannot be posted");
    }

    const totals = calculateTotals(cleanJournalEntries(journal.entries));
    journal.totals = totals;
    journal.amount = totals.totalDebit;
    journal.postingStatus = "Posted";
    journal.status = "Approved";
    await journal.save();

    return res.json({
      success: true,
      message: "Adjustment Journal posted successfully",
      data: journal,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

router.put("/unpost/:id", async (req, res) => {
  try {
    const journal = await findAdjustmentJournal(req.params.id);

    if (journal.status === "Cancelled") {
      throw new Error("Cancelled journal cannot be unposted");
    }

    journal.postingStatus = "Not Posted";
    journal.status = "Draft";
    await journal.save();

    return res.json({
      success: true,
      message: "Adjustment Journal unposted successfully",
      data: journal,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

router.patch("/cancel/:id", async (req, res) => {
  try {
    const journal = await findAdjustmentJournal(req.params.id);

    if (journal.postingStatus === "Posted") {
      throw new Error("Posted journal must be unposted before cancellation");
    }

    journal.status = "Cancelled";
    journal.postingStatus = "Not Posted";
    await journal.save();

    return res.json({
      success: true,
      message: "Adjustment Journal cancelled successfully",
      data: journal,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

router.delete("/delete/:id", async (req, res) => {
  try {
    const journal = await findAdjustmentJournal(req.params.id);

    if (journal.postingStatus === "Posted") {
      throw new Error("Posted journal cannot be deleted. Unpost it first.");
    }

    if (journal.status === "Cancelled") {
      throw new Error("Cancelled journal cannot be deleted");
    }

    await GeneralJournal.deleteOne({ _id: journal._id });
    return res.json({
      success: true,
      message: "Adjustment Journal deleted successfully",
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
