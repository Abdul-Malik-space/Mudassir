const express = require("express");
const router = express.Router();

const GeneralJournal = require("../models/GeneralJournal");
const Counter = require("../models/Counter");

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

const voucherTypes = [
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

const manualTypes = ["Adjustment Journal", "Opening Balance"];

const allowedStatuses = ["Draft", "Approved", "Cancelled"];
const allowedPostingStatuses = ["Not Posted", "Posted"];
const allowedPartyTypes = ["Customer", "Vendor", "Employee", "Owner", "Other"];
const allowedPaymentMethods = [
  "Cash",
  "Bank Transfer",
  "Cheque",
  "Transfer",
  "Journal",
  "Other",
];

const getAccount = (accountId) => {
  return allAccounts.find((account) => account.id === accountId);
};

const getAccountName = (accountId) => {
  return getAccount(accountId)?.name || "";
};

const getAccountType = (accountId) => {
  return getAccount(accountId)?.type || "";
};

const getNextVoucherNo = async () => {
  const year = new Date().getFullYear();
  let voucherNo = "";

  for (let i = 0; i < 5; i++) {
    const counter = await Counter.findOneAndUpdate(
      { name: `generalJournal-${year}` },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    voucherNo = `JV-${year}-${String(counter.seq).padStart(4, "0")}`;

    const exists = await GeneralJournal.findOne({ voucherNo });
    if (!exists) return voucherNo;
  }

  throw new Error("Unable to generate unique voucher number");
};

const peekNextVoucherNo = async () => {
  const year = new Date().getFullYear();
  const counter = await Counter.findOne({ name: `generalJournal-${year}` });
  const nextSeq = counter ? counter.seq + 1 : 1;

  return `JV-${year}-${String(nextSeq).padStart(4, "0")}`;
};

const makeEntry = (account, debit, credit, narration) => {
  const selectedAccount = getAccount(account);

  if (!selectedAccount) {
    throw new Error(`Invalid account selected: ${account}`);
  }

  return {
    account,
    accountName: selectedAccount.name,
    accountType: selectedAccount.type,
    debit: Number(debit || 0),
    credit: Number(credit || 0),
    narration: narration || "",
  };
};

const buildAutoEntries = (body) => {
  const amount = Number(body.amount || 0);

  if (amount <= 0) {
    throw new Error("Amount required hai");
  }

  const type = body.transactionType;

  if (type === "Cash In") {
    if (!body.cashAccount || !body.counterAccount) {
      throw new Error("Cash Account aur Counter Account required hain");
    }

    if (body.cashAccount === body.counterAccount) {
      throw new Error("Cash Account aur Counter Account same nahi ho sakte");
    }

    return [
      makeEntry(body.cashAccount, amount, 0, "Cash received"),
      makeEntry(body.counterAccount, 0, amount, "Cash in counter entry"),
    ];
  }

  if (type === "Cash Out") {
    if (!body.cashAccount || !body.counterAccount) {
      throw new Error("Cash Account aur Counter Account required hain");
    }

    if (body.cashAccount === body.counterAccount) {
      throw new Error("Cash Account aur Counter Account same nahi ho sakte");
    }

    return [
      makeEntry(body.counterAccount, amount, 0, "Cash out counter entry"),
      makeEntry(body.cashAccount, 0, amount, "Cash paid"),
    ];
  }

  if (type === "Bank In") {
    if (!body.bankAccount || !body.counterAccount) {
      throw new Error("Bank Account aur Counter Account required hain");
    }

    if (body.bankAccount === body.counterAccount) {
      throw new Error("Bank Account aur Counter Account same nahi ho sakte");
    }

    return [
      makeEntry(body.bankAccount, amount, 0, "Bank received"),
      makeEntry(body.counterAccount, 0, amount, "Bank in counter entry"),
    ];
  }

  if (type === "Bank Out") {
    if (!body.bankAccount || !body.counterAccount) {
      throw new Error("Bank Account aur Counter Account required hain");
    }

    if (body.bankAccount === body.counterAccount) {
      throw new Error("Bank Account aur Counter Account same nahi ho sakte");
    }

    return [
      makeEntry(body.counterAccount, amount, 0, "Bank out counter entry"),
      makeEntry(body.bankAccount, 0, amount, "Bank paid"),
    ];
  }

  if (
    type === "Cash to Bank" ||
    type === "Bank to Cash" ||
    type === "Bank to Bank"
  ) {
    if (!body.fromAccount || !body.toAccount) {
      throw new Error("From Account aur To Account required hain");
    }

    if (body.fromAccount === body.toAccount) {
      throw new Error("From Account aur To Account same nahi ho sakte");
    }

    return [
      makeEntry(body.toAccount, amount, 0, "Transfer received account"),
      makeEntry(body.fromAccount, 0, amount, "Transfer paid account"),
    ];
  }

  throw new Error("Invalid automatic voucher type");
};

const cleanManualEntries = (entries = []) => {
  const cleanEntries = entries
    .filter(
      (entry) =>
        entry &&
        (entry.account ||
          Number(entry.debit || 0) > 0 ||
          Number(entry.credit || 0) > 0)
    )
    .map((entry) => {
      const debit = Number(entry.debit || 0);
      const credit = Number(entry.credit || 0);

      if (!entry.account) {
        throw new Error("Har journal row mein account required hai");
      }

      const selectedAccount = getAccount(entry.account);

      if (!selectedAccount) {
        throw new Error(`Invalid account selected: ${entry.account}`);
      }

      if (debit <= 0 && credit <= 0) {
        throw new Error("Har row mein Debit ya Credit amount required hai");
      }

      if (debit > 0 && credit > 0) {
        throw new Error("Aik row mein Debit aur Credit dono nahi ho sakte");
      }

      return {
        account: entry.account,
        accountName: selectedAccount.name,
        accountType: selectedAccount.type,
        debit,
        credit,
        narration: entry.narration || "",
      };
    });

  if (cleanEntries.length < 2) {
    throw new Error("Manual journal mein kam az kam 2 rows required hain");
  }

  return cleanEntries;
};

const calculateTotals = (entries = []) => {
  const totalDebit = entries.reduce(
    (sum, entry) => sum + Number(entry.debit || 0),
    0
  );

  const totalCredit = entries.reduce(
    (sum, entry) => sum + Number(entry.credit || 0),
    0
  );

  const difference = totalDebit - totalCredit;

  return {
    totalDebit,
    totalCredit,
    difference,
    isBalanced: Number(totalDebit) === Number(totalCredit),
  };
};

const buildVoucherPayload = async (body, existingVoucher = null) => {
  if (!body.voucherDate && !existingVoucher?.voucherDate) {
    throw new Error("Voucher date required hai");
  }

  const transactionType =
    body.transactionType || existingVoucher?.transactionType || "";

  if (!voucherTypes.includes(transactionType)) {
    throw new Error("Invalid transaction type");
  }

  const entries = manualTypes.includes(transactionType)
    ? cleanManualEntries(body.entries || existingVoucher?.entries || [])
    : buildAutoEntries({
        ...existingVoucher?.toObject?.(),
        ...body,
        transactionType,
      });

  const totals = calculateTotals(entries);

  if (!totals.isBalanced) {
    throw new Error("Voucher balanced nahi hai. Debit aur Credit equal honay chahiye");
  }

  const amount = Number(
    body.amount || existingVoucher?.amount || totals.totalDebit || 0
  );

  const postingStatus = allowedPostingStatuses.includes(body.postingStatus)
    ? body.postingStatus
    : existingVoucher?.postingStatus || "Not Posted";

  const status =
    postingStatus === "Posted"
      ? "Approved"
      : allowedStatuses.includes(body.status)
      ? body.status
      : existingVoucher?.status || "Draft";

  const voucherNo = body.voucherNo
    ? String(body.voucherNo).trim().toUpperCase()
    : existingVoucher?.voucherNo || (await getNextVoucherNo());

  return {
    voucherNo,
    voucherDate: body.voucherDate || existingVoucher?.voucherDate,

    transactionType,
    amount,

    cashAccount: body.cashAccount || existingVoucher?.cashAccount || "",
    bankAccount: body.bankAccount || existingVoucher?.bankAccount || "",
    fromAccount: body.fromAccount || existingVoucher?.fromAccount || "",
    toAccount: body.toAccount || existingVoucher?.toAccount || "",
    counterAccount: body.counterAccount || existingVoucher?.counterAccount || "",

    partyType: allowedPartyTypes.includes(body.partyType)
      ? body.partyType
      : existingVoucher?.partyType || "Other",

    partyName: body.partyName || existingVoucher?.partyName || "",
    referenceNo: body.referenceNo || existingVoucher?.referenceNo || "",

    paymentMethod: allowedPaymentMethods.includes(body.paymentMethod)
      ? body.paymentMethod
      : existingVoucher?.paymentMethod || "Cash",

    chequeNo: body.chequeNo || existingVoucher?.chequeNo || "",
    remarks: body.remarks || "",

    status,
    postingStatus,

    entries,
    totals,
  };
};

// Next voucher no
router.get("/next-no", async (req, res) => {
  try {
    const voucherNo = await peekNextVoucherNo();

    res.status(200).json({
      success: true,
      voucherNo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Voucher number generate nahi hua",
      error: error.message,
    });
  }
});

// Accounts list for frontend
router.get("/accounts", async (req, res) => {
  res.status(200).json({
    success: true,
    accounts: allAccounts,
    cashAccounts,
    bankAccounts,
    incomeAccounts,
    expenseAccounts,
    receivablePayableAccounts,
    adjustmentAccounts,
    voucherTypes,
  });
});

// Get all vouchers
router.get("/all", async (req, res) => {
  try {
    const {
      search = "",
      transactionType = "",
      status = "",
      postingStatus = "",
      partyType = "",
      dateFrom = "",
      dateTo = "",
    } = req.query;

    const query = {};

    if (transactionType && transactionType !== "All") {
      query.transactionType = transactionType;
    }

    if (status && status !== "All") {
      query.status = status;
    }

    if (postingStatus && postingStatus !== "All") {
      query.postingStatus = postingStatus;
    }

    if (partyType && partyType !== "All") {
      query.partyType = partyType;
    }

    if (dateFrom || dateTo) {
      query.voucherDate = {};

      if (dateFrom) query.voucherDate.$gte = dateFrom;
      if (dateTo) query.voucherDate.$lte = dateTo;
    }

    if (search) {
      query.$or = [
        { voucherNo: { $regex: search, $options: "i" } },
        { transactionType: { $regex: search, $options: "i" } },
        { partyName: { $regex: search, $options: "i" } },
        { referenceNo: { $regex: search, $options: "i" } },
        { chequeNo: { $regex: search, $options: "i" } },
        { remarks: { $regex: search, $options: "i" } },
        { "entries.accountName": { $regex: search, $options: "i" } },
        { "entries.narration": { $regex: search, $options: "i" } },
      ];
    }

    const journals = await GeneralJournal.find(query).sort({
      voucherDate: -1,
      createdAt: -1,
    });

    res.status(200).json(journals);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "General journals load nahi huay",
      error: error.message,
    });
  }
});

// Get single voucher
router.get("/:id", async (req, res) => {
  try {
    const journal = await GeneralJournal.findById(req.params.id);

    if (!journal) {
      return res.status(404).json({
        success: false,
        message: "Journal voucher not found",
      });
    }

    res.status(200).json({
      success: true,
      data: journal,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Journal voucher load nahi hua",
      error: error.message,
    });
  }
});

// Add voucher
router.post("/add", async (req, res) => {
  try {
    const payload = await buildVoucherPayload(req.body);

    const journal = new GeneralJournal(payload);
    const savedJournal = await journal.save();

    res.status(201).json({
      success: true,
      message: "Journal voucher created successfully",
      data: savedJournal,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Ye voucher number already used hai",
      });
    }

    res.status(400).json({
      success: false,
      message: "Journal voucher save nahi hua",
      error: error.message,
    });
  }
});

// Update voucher
router.put("/update/:id", async (req, res) => {
  try {
    const existingJournal = await GeneralJournal.findById(req.params.id);

    if (!existingJournal) {
      return res.status(404).json({
        success: false,
        message: "Journal voucher not found",
      });
    }

    if (existingJournal.postingStatus === "Posted") {
      return res.status(400).json({
        success: false,
        message: "Posted voucher update nahi ho sakta. Pehle unpost karein.",
      });
    }

    if (existingJournal.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled voucher update nahi ho sakta",
      });
    }

    const payload = await buildVoucherPayload(req.body, existingJournal);

    const updatedJournal = await GeneralJournal.findByIdAndUpdate(
      req.params.id,
      payload,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Journal voucher updated successfully",
      data: updatedJournal,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Ye voucher number already used hai",
      });
    }

    res.status(400).json({
      success: false,
      message: "Journal voucher update nahi hua",
      error: error.message,
    });
  }
});

// Post voucher
router.put("/post/:id", async (req, res) => {
  try {
    const journal = await GeneralJournal.findById(req.params.id);

    if (!journal) {
      return res.status(404).json({
        success: false,
        message: "Journal voucher not found",
      });
    }

    if (journal.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled voucher post nahi ho sakta",
      });
    }

    if (!journal.totals?.isBalanced) {
      return res.status(400).json({
        success: false,
        message: "Unbalanced voucher post nahi ho sakta",
      });
    }

    journal.postingStatus = "Posted";
    journal.status = "Approved";

    await journal.save();

    res.status(200).json({
      success: true,
      message: "Journal voucher posted successfully",
      data: journal,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Journal voucher post nahi hua",
      error: error.message,
    });
  }
});

// Unpost voucher
router.put("/unpost/:id", async (req, res) => {
  try {
    const journal = await GeneralJournal.findById(req.params.id);

    if (!journal) {
      return res.status(404).json({
        success: false,
        message: "Journal voucher not found",
      });
    }

    if (journal.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled voucher unpost nahi ho sakta",
      });
    }

    journal.postingStatus = "Not Posted";
    journal.status = "Draft";

    await journal.save();

    res.status(200).json({
      success: true,
      message: "Journal voucher unposted successfully",
      data: journal,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Journal voucher unpost nahi hua",
      error: error.message,
    });
  }
});

// Cancel voucher
router.patch("/cancel/:id", async (req, res) => {
  try {
    const journal = await GeneralJournal.findById(req.params.id);

    if (!journal) {
      return res.status(404).json({
        success: false,
        message: "Journal voucher not found",
      });
    }

    journal.status = "Cancelled";
    journal.postingStatus = "Not Posted";

    await journal.save();

    res.status(200).json({
      success: true,
      message: "Journal voucher cancelled successfully",
      data: journal,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Journal voucher cancel nahi hua",
      error: error.message,
    });
  }
});

// Delete voucher
router.delete("/delete/:id", async (req, res) => {
  try {
    const journal = await GeneralJournal.findById(req.params.id);

    if (!journal) {
      return res.status(404).json({
        success: false,
        message: "Journal voucher not found",
      });
    }

    if (journal.postingStatus === "Posted") {
      return res.status(400).json({
        success: false,
        message: "Posted voucher delete nahi ho sakta. Pehle unpost karein.",
      });
    }

    await GeneralJournal.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Journal voucher deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Journal voucher delete nahi hua",
      error: error.message,
    });
  }
});

module.exports = router;