const express = require("express");
const router = express.Router();

const Vendor = require("../models/vendor");
const Counter = require("../models/Counter");

const cleanPayload = (body) => {
  return {
    vendorCode: body.vendorCode
      ? String(body.vendorCode).trim().toUpperCase()
      : undefined,

    vendorName: body.vendorName ? String(body.vendorName).trim() : "",

    contactPerson: body.contactPerson
      ? String(body.contactPerson).trim()
      : "",

    phoneNumber: body.phoneNumber ? String(body.phoneNumber).trim() : "",

    alternatePhone: body.alternatePhone
      ? String(body.alternatePhone).trim()
      : "",

    email: body.email ? String(body.email).trim().toLowerCase() : undefined,

    address: body.address ? String(body.address).trim() : "",

    city: body.city ? String(body.city).trim() : "",

    ntn: body.ntn ? String(body.ntn).trim() : "",

    strn: body.strn ? String(body.strn).trim() : "",

    openingBalance: Number(body.openingBalance || 0),

    creditLimit: Number(body.creditLimit || 0),

    paymentTerms: body.paymentTerms ? String(body.paymentTerms).trim() : "",

    status: body.status || "Active",

    notes: body.notes ? String(body.notes).trim() : "",
  };
};

const getNextVendorCode = async () => {
  let vendorCode = "";

  for (let i = 0; i < 5; i++) {
    const counter = await Counter.findOneAndUpdate(
      { name: "vendorCode" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    vendorCode = `VEN-${String(counter.seq).padStart(4, "0")}`;

    const exists = await Vendor.findOne({ vendorCode });
    if (!exists) return vendorCode;
  }

  throw new Error("Unable to generate unique vendor code");
};

const peekNextVendorCode = async () => {
  const counter = await Counter.findOne({ name: "vendorCode" });
  const nextSeq = counter ? counter.seq + 1 : 1;
  return `VEN-${String(nextSeq).padStart(4, "0")}`;
};

// Next vendor code
router.get("/next-code", async (req, res) => {
  try {
    const vendorCode = await peekNextVendorCode();

    res.status(200).json({
      success: true,
      vendorCode,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Vendor code generate nahi hua",
      error: error.message,
    });
  }
});

// Add vendor
router.post("/add", async (req, res) => {
  try {
    const payload = cleanPayload(req.body);

    if (!payload.vendorName) {
      return res.status(400).json({
        success: false,
        message: "Vendor name required hai",
      });
    }

    if (!payload.phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number required hai",
      });
    }

    if (!payload.vendorCode) {
      payload.vendorCode = await getNextVendorCode();
    }

    const vendor = new Vendor(payload);
    await vendor.save();

    res.status(201).json({
      success: true,
      message: "Vendor added successfully",
      data: vendor,
    });
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0];

      return res.status(400).json({
        success: false,
        message:
          duplicateField === "email"
            ? "Ye email already kisi vendor ke sath used hai"
            : duplicateField === "vendorCode"
            ? "Ye vendor code already used hai"
            : "Duplicate value found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Vendor save nahi hua",
      error: error.message,
    });
  }
});

// Get all vendors
router.get("/all", async (req, res) => {
  try {
    const { search = "", status = "" } = req.query;

    const query = {};

    if (status && status !== "All") {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { vendorCode: { $regex: search, $options: "i" } },
        { vendorName: { $regex: search, $options: "i" } },
        { contactPerson: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
        { ntn: { $regex: search, $options: "i" } },
        { strn: { $regex: search, $options: "i" } },
      ];
    }

    const vendors = await Vendor.find(query).sort({ createdAt: -1 });

    res.status(200).json(vendors);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Vendors load nahi huay",
      error: error.message,
    });
  }
});

// Get single vendor
router.get("/:id", async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    res.status(200).json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Vendor load nahi hua",
      error: error.message,
    });
  }
});

// Update vendor
router.put("/update/:id", async (req, res) => {
  try {
    const payload = cleanPayload(req.body);

    if (!payload.vendorName) {
      return res.status(400).json({
        success: false,
        message: "Vendor name required hai",
      });
    }

    if (!payload.phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number required hai",
      });
    }

    if (!payload.vendorCode) {
      delete payload.vendorCode;
    }

    const updatedVendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      payload,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedVendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Vendor updated successfully",
      data: updatedVendor,
    });
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0];

      return res.status(400).json({
        success: false,
        message:
          duplicateField === "email"
            ? "Ye email already kisi vendor ke sath used hai"
            : duplicateField === "vendorCode"
            ? "Ye vendor code already used hai"
            : "Duplicate value found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Vendor update nahi hua",
      error: error.message,
    });
  }
});

// Delete vendor
router.delete("/delete/:id", async (req, res) => {
  try {
    const deletedVendor = await Vendor.findByIdAndDelete(req.params.id);

    if (!deletedVendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Vendor deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Vendor delete nahi hua",
      error: error.message,
    });
  }
});

module.exports = router;