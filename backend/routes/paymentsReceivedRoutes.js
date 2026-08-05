const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const GeneralJournal = require("../models/GeneralJournal");
const Counter = require("../models/Counter");

const PAYMENT_TYPES = ["Cash In", "Cash Out", "Bank In", "Bank Out"];
const CASH_TYPES = ["Cash In", "Cash Out"];
const BANK_TYPES = ["Bank In", "Bank Out"];
const ALLOWED_PARTY_TYPES = [
  "Customer",
  "Vendor",
  "Employee",
  "Owner",
  "Other",
];
const ALLOWED_PAYMENT_METHODS = [
  "Cash",
  "Bank Transfer",
  "Cheque",
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

const counterAccounts = [
  ...incomeAccounts,
  ...expenseAccounts,
  ...receivablePayableAccounts,
  ...adjustmentAccounts,
];

const allAccounts = [...cashAccounts, ...bankAccounts, ...counterAccounts];

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

const makeEntry = (accountId, debit, credit, narration) => {
  const account = getAccount(accountId);

  if (!account) {
    throw new Error(`Invalid account selected: ${cleanText(accountId, "Unknown")}`);
  }

  return {
    account: account.id,
    accountName: account.name,
    accountType: account.type,
    debit: roundMoney(debit),
    credit: roundMoney(credit),
    narration: cleanText(narration),
  };
};

const getDefaultCounterAccount = (transactionType) => {
  if (transactionType === "Cash In" || transactionType === "Bank In") {
    return "customer-receivable";
  }

  return "purchase-expense";
};

const formatVoucherNo = (year, sequence) =>
  `PR-${year}-${String(sequence).padStart(4, "0")}`;

const getCounterName = (year) => `paymentsReceived-${year}`;

const getNextVoucherNo = async () => {
  const year = new Date().getFullYear();

  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const counter = await Counter.findOneAndUpdate(
      { name: getCounterName(year) },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const voucherNo = formatVoucherNo(year, counter.seq);
    if (!(await GeneralJournal.exists({ voucherNo }))) return voucherNo;
  }

  throw new Error("Unable to generate a unique payment voucher number");
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

  throw new Error("Unable to preview the next payment voucher number");
};

const calculateTotals = (entries) => {
  const totalDebit = roundMoney(
    entries.reduce((sum, entry) => sum + cleanNumber(entry.debit), 0)
  );
  const totalCredit = roundMoney(
    entries.reduce((sum, entry) => sum + cleanNumber(entry.credit), 0)
  );

  if (totalDebit <= 0 || Math.abs(totalDebit - totalCredit) > 0.000001) {
    throw new Error("Payment voucher must have equal Debit and Credit totals");
  }

  return {
    totalDebit,
    totalCredit,
    difference: 0,
    isBalanced: true,
  };
};

const buildPaymentEntries = ({
  transactionType,
  amount,
  cashAccount,
  bankAccount,
  counterAccount,
  narration,
}) => {
  const finalAmount = roundMoney(amount);

  if (finalAmount <= 0) throw new Error("Amount must be greater than zero");
  if (!PAYMENT_TYPES.includes(transactionType)) {
    throw new Error("Select Cash In, Cash Out, Bank In or Bank Out");
  }

  const counter = getAccount(counterAccount);
  if (!counter || !counterAccounts.some((row) => row.id === counter.id)) {
    throw new Error("Select a valid counter account");
  }

  if (CASH_TYPES.includes(transactionType)) {
    const cash = getAccount(cashAccount);
    if (!cash || cash.type !== "Cash") throw new Error("Select a valid cash account");
    if (cash.id === counter.id) throw new Error("Cash and counter accounts cannot be the same");

    if (transactionType === "Cash In") {
      return [
        makeEntry(cash.id, finalAmount, 0, narration || "Cash received"),
        makeEntry(counter.id, 0, finalAmount, narration || "Cash receipt counter entry"),
      ];
    }

    return [
      makeEntry(counter.id, finalAmount, 0, narration || "Cash payment counter entry"),
      makeEntry(cash.id, 0, finalAmount, narration || "Cash paid"),
    ];
  }

  const bank = getAccount(bankAccount);
  if (!bank || bank.type !== "Bank") throw new Error("Select a valid bank account");
  if (bank.id === counter.id) throw new Error("Bank and counter accounts cannot be the same");

  if (transactionType === "Bank In") {
    return [
      makeEntry(bank.id, finalAmount, 0, narration || "Bank receipt"),
      makeEntry(counter.id, 0, finalAmount, narration || "Bank receipt counter entry"),
    ];
  }

  return [
    makeEntry(counter.id, finalAmount, 0, narration || "Bank payment counter entry"),
    makeEntry(bank.id, 0, finalAmount, narration || "Bank paid"),
  ];
};

const buildPaymentPayload = ({ body = {}, existingVoucher = null }) => {
  const transactionType = cleanText(
    body.transactionType ?? existingVoucher?.transactionType
  );

  if (!PAYMENT_TYPES.includes(transactionType)) {
    throw new Error("Invalid Payments & Received transaction type");
  }

  const voucherDate = cleanText(body.voucherDate ?? existingVoucher?.voucherDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(voucherDate)) {
    throw new Error("A valid voucher date is required");
  }

  const amount = roundMoney(body.amount ?? existingVoucher?.amount);
  const cashAccount = CASH_TYPES.includes(transactionType)
    ? cleanText(body.cashAccount ?? existingVoucher?.cashAccount, "cash-in-hand")
    : "";
  const bankAccount = BANK_TYPES.includes(transactionType)
    ? cleanText(body.bankAccount ?? existingVoucher?.bankAccount, "bank-main")
    : "";
  const counterAccount = cleanText(
    body.counterAccount ?? existingVoucher?.counterAccount,
    getDefaultCounterAccount(transactionType)
  );
  const remarks = cleanText(body.remarks ?? existingVoucher?.remarks);

  const entries = buildPaymentEntries({
    transactionType,
    amount,
    cashAccount,
    bankAccount,
    counterAccount,
    narration: remarks,
  });
  const totals = calculateTotals(entries);

  const partyType = ALLOWED_PARTY_TYPES.includes(body.partyType)
    ? body.partyType
    : ALLOWED_PARTY_TYPES.includes(existingVoucher?.partyType)
      ? existingVoucher.partyType
      : "Other";

  const defaultPaymentMethod = CASH_TYPES.includes(transactionType)
    ? "Cash"
    : "Bank Transfer";
  const requestedPaymentMethod = cleanText(
    body.paymentMethod ?? existingVoucher?.paymentMethod,
    defaultPaymentMethod
  );
  const paymentMethod = ALLOWED_PAYMENT_METHODS.includes(requestedPaymentMethod)
    ? requestedPaymentMethod
    : defaultPaymentMethod;

  if (CASH_TYPES.includes(transactionType) && paymentMethod !== "Cash") {
    throw new Error("Cash In and Cash Out must use Cash payment method");
  }

  if (BANK_TYPES.includes(transactionType) && paymentMethod === "Cash") {
    throw new Error("Bank In and Bank Out cannot use Cash payment method");
  }

  return {
    voucherDate,
    transactionType,
    amount,
    cashAccount,
    bankAccount,
    fromAccount: "",
    toAccount: "",
    counterAccount,
    partyType,
    partyName: cleanText(body.partyName ?? existingVoucher?.partyName),
    referenceNo: cleanText(body.referenceNo ?? existingVoucher?.referenceNo),
    paymentMethod,
    chequeNo:
      paymentMethod === "Cheque"
        ? cleanText(body.chequeNo ?? existingVoucher?.chequeNo)
        : cleanText(body.chequeNo ?? existingVoucher?.chequeNo),
    remarks,
    status: "Draft",
    postingStatus: "Not Posted",
    entries,
    totals,
  };
};

const findPaymentVoucher = async (voucherId) => {
  if (!isValidId(voucherId)) throw new Error("Invalid payment voucher ID");

  const voucher = await GeneralJournal.findOne({
    _id: voucherId,
    transactionType: { $in: PAYMENT_TYPES },
  });

  if (!voucher) throw new Error("Payment voucher not found");
  return voucher;
};

router.get("/next-no", async (req, res) => {
  try {
    return res.json({ success: true, voucherNo: await peekNextVoucherNo() });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Payment voucher number could not be generated",
    });
  }
});

router.get("/accounts", async (req, res) =>
  res.json({
    success: true,
    paymentTypes: PAYMENT_TYPES,
    cashAccounts,
    bankAccounts,
    counterAccounts,
  })
);

router.get("/all", async (req, res) => {
  try {
    const {
      search = "",
      transactionType = "",
      postingStatus = "",
      status = "",
      dateFrom = "",
      dateTo = "",
    } = req.query;

    const query = { transactionType: { $in: PAYMENT_TYPES } };

    if (PAYMENT_TYPES.includes(transactionType)) {
      query.transactionType = transactionType;
    }
    if (["Not Posted", "Posted"].includes(postingStatus)) {
      query.postingStatus = postingStatus;
    }
    if (["Draft", "Approved", "Cancelled"].includes(status)) {
      query.status = status;
    }
    if (dateFrom || dateTo) {
      query.voucherDate = {};
      if (dateFrom) query.voucherDate.$gte = dateFrom;
      if (dateTo) query.voucherDate.$lte = dateTo;
    }

    if (cleanText(search)) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { voucherNo: { $regex: safeSearch, $options: "i" } },
        { partyName: { $regex: safeSearch, $options: "i" } },
        { referenceNo: { $regex: safeSearch, $options: "i" } },
        { chequeNo: { $regex: safeSearch, $options: "i" } },
        { remarks: { $regex: safeSearch, $options: "i" } },
        { "entries.accountName": { $regex: safeSearch, $options: "i" } },
      ];
    }

    const vouchers = await GeneralJournal.find(query).sort({
      voucherDate: -1,
      createdAt: -1,
    });

    return res.json({ success: true, vouchers });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Payment vouchers could not be loaded",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    return res.json({ success: true, data: await findPaymentVoucher(req.params.id) });
  } catch (error) {
    return res.status(error.message.includes("not found") ? 404 : 400).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/add", async (req, res) => {
  try {
    const payload = buildPaymentPayload({ body: req.body || {} });
    const voucherNo = await getNextVoucherNo();
    const requestedPostingStatus =
      req.body?.postingStatus === "Posted" ? "Posted" : "Not Posted";

    const voucher = await GeneralJournal.create({
      voucherNo,
      ...payload,
      postingStatus: requestedPostingStatus,
      status: requestedPostingStatus === "Posted" ? "Approved" : "Draft",
    });

    return res.status(201).json({
      success: true,
      message:
        requestedPostingStatus === "Posted"
          ? "Payment voucher created and posted successfully"
          : "Payment voucher saved as draft",
      data: voucher,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error?.code === 11000
          ? "Payment voucher number already exists"
          : error.message || "Payment voucher could not be saved",
    });
  }
});

router.put("/update/:id", async (req, res) => {
  try {
    const voucher = await findPaymentVoucher(req.params.id);

    if (voucher.postingStatus === "Posted") {
      throw new Error("Posted payment voucher cannot be edited");
    }
    if (voucher.status === "Cancelled") {
      throw new Error("Cancelled payment voucher cannot be edited");
    }

    const payload = buildPaymentPayload({
      body: req.body || {},
      existingVoucher: voucher,
    });
    const requestedPostingStatus =
      req.body?.postingStatus === "Posted" ? "Posted" : "Not Posted";

    Object.assign(voucher, payload, {
      postingStatus: requestedPostingStatus,
      status: requestedPostingStatus === "Posted" ? "Approved" : "Draft",
    });

    await voucher.save();

    return res.json({
      success: true,
      message:
        requestedPostingStatus === "Posted"
          ? "Payment voucher updated and posted successfully"
          : "Payment voucher updated successfully",
      data: voucher,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

router.put("/post/:id", async (req, res) => {
  try {
    const voucher = await findPaymentVoucher(req.params.id);

    if (voucher.status === "Cancelled") {
      throw new Error("Cancelled payment voucher cannot be posted");
    }
    if (!voucher.totals?.isBalanced) {
      throw new Error("Unbalanced payment voucher cannot be posted");
    }

    voucher.postingStatus = "Posted";
    voucher.status = "Approved";
    await voucher.save();

    return res.json({
      success: true,
      message: "Payment voucher posted successfully",
      data: voucher,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

router.put("/unpost/:id", async (req, res) => {
  try {
    const voucher = await findPaymentVoucher(req.params.id);

    if (voucher.status === "Cancelled") {
      throw new Error("Cancelled payment voucher cannot be unposted");
    }

    voucher.postingStatus = "Not Posted";
    voucher.status = "Draft";
    await voucher.save();

    return res.json({
      success: true,
      message: "Payment voucher unposted successfully",
      data: voucher,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

router.patch("/cancel/:id", async (req, res) => {
  try {
    const voucher = await findPaymentVoucher(req.params.id);
    voucher.status = "Cancelled";
    voucher.postingStatus = "Not Posted";
    voucher.remarks = cleanText(
      req.body?.reason,
      voucher.remarks || "Payment voucher cancelled"
    );
    await voucher.save();

    return res.json({
      success: true,
      message: "Payment voucher cancelled successfully",
      data: voucher,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

router.delete("/delete/:id", async (req, res) => {
  try {
    const voucher = await findPaymentVoucher(req.params.id);

    if (voucher.postingStatus === "Posted") {
      throw new Error("Posted payment voucher cannot be deleted. Unpost it first.");
    }

    await voucher.deleteOne();
    return res.json({ success: true, message: "Payment voucher deleted successfully" });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
