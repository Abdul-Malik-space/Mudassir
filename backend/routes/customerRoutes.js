const express = require("express");
const router = express.Router();

const Customer = require("../models/customer");
const Counter = require("../models/Counter");

const cleanPayload = (body) => {
  return {
    customerCode: body.customerCode ? String(body.customerCode).trim().toUpperCase() : undefined,
    customerName: body.customerName ? String(body.customerName).trim() : "",
    contactPerson: body.contactPerson ? String(body.contactPerson).trim() : "",
    email: body.email ? String(body.email).trim().toLowerCase() : undefined,
    phoneNumber: body.phoneNumber ? String(body.phoneNumber).trim() : "",
    alternatePhone: body.alternatePhone ? String(body.alternatePhone).trim() : "",
    address: body.address ? String(body.address).trim() : "",
    city: body.city ? String(body.city).trim() : "",
    openingBalance: Number(body.openingBalance || 0),
    creditLimit: Number(body.creditLimit || 0),
    status: body.status || "Active",
    notes: body.notes ? String(body.notes).trim() : "",
  };
};

const getNextCustomerCode = async () => {
  let code = "";

  for (let i = 0; i < 5; i++) {
    const counter = await Counter.findOneAndUpdate(
      { name: "customerCode" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    code = `CUS-${String(counter.seq).padStart(4, "0")}`;

    const exists = await Customer.findOne({ customerCode: code });
    if (!exists) return code;
  }

  throw new Error("Unable to generate unique customer code");
};

const peekNextCustomerCode = async () => {
  const counter = await Counter.findOne({ name: "customerCode" });
  const nextSeq = counter ? counter.seq + 1 : 1;
  return `CUS-${String(nextSeq).padStart(4, "0")}`;
};

// Next customer code preview
router.get("/next-code", async (req, res) => {
  try {
    const customerCode = await peekNextCustomerCode();

    res.status(200).json({
      success: true,
      customerCode,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Customer code generate nahi hua",
      error: error.message,
    });
  }
});

// Add customer
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

// Get all customers
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
        { phoneNumber: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
      ];
    }

    const customers = await Customer.find(query).sort({ createdAt: -1 });

    res.status(200).json(customers);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Customers load nahi huay",
      error: error.message,
    });
  }
});

// Get single customer
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
    res.status(500).json({
      success: false,
      message: "Customer load nahi hua",
      error: error.message,
    });
  }
});

// Update customer
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

// Delete customer
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
    res.status(500).json({
      success: false,
      message: "Customer delete nahi hua",
      error: error.message,
    });
  }
});

module.exports = router;