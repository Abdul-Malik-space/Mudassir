const express = require("express");
const router = express.Router();

const Customer = require("../models/customer");
const Counter = require("../models/Counter");

const cleanPayload = (body = {}) => {
  const email = body.email ? String(body.email).trim().toLowerCase() : undefined;

  return {
    customerCode: body.customerCode
      ? String(body.customerCode).trim().toUpperCase()
      : undefined,

    customerName: String(body.customerName || body.name || "").trim(),

    contactPerson: String(body.contactPerson || "").trim(),

    email,

    phoneNumber: String(body.phoneNumber || body.phone || "").trim(),

    alternatePhone: String(body.alternatePhone || "").trim(),

    address: String(body.address || "").trim(),

    city: String(body.city || "").trim(),

    openingBalance: Number(body.openingBalance || body.balance || 0),

    creditLimit: Number(body.creditLimit || 0),

    status: ["Active", "Inactive"].includes(body.status)
      ? body.status
      : "Active",

    notes: String(body.notes || "").trim(),
  };
};

const getNextCustomerCode = async () => {
  let customerCode = "";

  for (let i = 0; i < 5; i++) {
    const counter = await Counter.findOneAndUpdate(
      { name: "customerCode" },
      { $inc: { seq: 1 } },
      {
        new: true,
        upsert: true,
      }
    );

    customerCode = `CUS-${String(counter.seq).padStart(4, "0")}`;

    const exists = await Customer.findOne({ customerCode });
    if (!exists) return customerCode;
  }

  throw new Error("Unable to generate unique customer code");
};

const peekNextCustomerCode = async () => {
  const counter = await Counter.findOne({ name: "customerCode" });
  const nextSeq = counter ? counter.seq + 1 : 1;

  return `CUS-${String(nextSeq).padStart(4, "0")}`;
};

router.get("/next-code", async (req, res) => {
  try {
    const customerCode = await peekNextCustomerCode();

    res.status(200).json({
      success: true,
      customerCode,
    });
  } catch (error) {
    console.error("Customer Next Code Error:", error);

    res.status(500).json({
      success: false,
      message: "Customer code generate nahi hua",
      error: error.message,
    });
  }
});

router.post("/add", async (req, res) => {
  try {
    const payload = cleanPayload(req.body);

    if (!payload.customerName) {
      return res.status(400).json({
        success: false,
        message: "Customer name required hai",
      });
    }

    if (!payload.phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number required hai",
      });
    }

    if (!payload.address) {
      return res.status(400).json({
        success: false,
        message: "Address required hai",
      });
    }

    if (!payload.customerCode) {
      payload.customerCode = await getNextCustomerCode();
    }

    const customer = new Customer(payload);
    await customer.save();

    res.status(201).json({
      success: true,
      message: "Customer added successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Customer Add Error:", error);

    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0];

      return res.status(400).json({
        success: false,
        message:
          duplicateField === "email"
            ? "Ye email already kisi customer ke sath used hai"
            : duplicateField === "customerCode"
            ? "Ye customer code already used hai"
            : "Duplicate value found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Customer save nahi hua",
      error: error.message,
    });
  }
});

router.get("/all", async (req, res) => {
  try {
    const { search = "", status = "" } = req.query;

    const query = {};

    if (status && status !== "All") {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { customerCode: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { contactPerson: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
        { alternatePhone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
      ];
    }

    const customers = await Customer.find(query).sort({ createdAt: -1 });

    res.status(200).json(customers);
  } catch (error) {
    console.error("Customers Load Error:", error);

    res.status(500).json({
      success: false,
      message: "Customers load nahi huay",
      error: error.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error("Customer Single Load Error:", error);

    res.status(500).json({
      success: false,
      message: "Customer load nahi hua",
      error: error.message,
    });
  }
});

router.put("/update/:id", async (req, res) => {
  try {
    const payload = cleanPayload(req.body);

    if (!payload.customerName) {
      return res.status(400).json({
        success: false,
        message: "Customer name required hai",
      });
    }

    if (!payload.phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number required hai",
      });
    }

    if (!payload.address) {
      return res.status(400).json({
        success: false,
        message: "Address required hai",
      });
    }

    if (!payload.customerCode) {
      delete payload.customerCode;
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(
      req.params.id,
      payload,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedCustomer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: updatedCustomer,
    });
  } catch (error) {
    console.error("Customer Update Error:", error);

    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0];

      return res.status(400).json({
        success: false,
        message:
          duplicateField === "email"
            ? "Ye email already kisi customer ke sath used hai"
            : duplicateField === "customerCode"
            ? "Ye customer code already used hai"
            : "Duplicate value found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Customer update nahi hua",
      error: error.message,
    });
  }
});

router.delete("/delete/:id", async (req, res) => {
  try {
    const deletedCustomer = await Customer.findByIdAndDelete(req.params.id);

    if (!deletedCustomer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Customer Delete Error:", error);

    res.status(500).json({
      success: false,
      message: "Customer delete nahi hua",
      error: error.message,
    });
  }
});

module.exports = router;