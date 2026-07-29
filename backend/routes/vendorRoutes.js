const express = require("express");

const router = express.Router();

const Vendor = require("../models/vendor");
const Counter = require("../models/Counter");

const cleanPayload = (body = {}) => {
  const email = body.email
    ? String(body.email).trim().toLowerCase()
    : undefined;

  return {
    vendorCode: body.vendorCode
      ? String(body.vendorCode).trim().toUpperCase()
      : undefined,

    vendorName: String(
      body.vendorName ||
        body.name ||
        ""
    ).trim(),

    contactPerson: String(
      body.contactPerson ||
        ""
    ).trim(),

    phoneNumber: String(
      body.phoneNumber ||
        body.phone ||
        ""
    ).trim(),

    alternatePhone: String(
      body.alternatePhone ||
        ""
    ).trim(),

    email,

    address: String(
      body.address ||
        ""
    ).trim(),

    city: String(
      body.city ||
        ""
    ).trim(),

    ntn: String(
      body.ntn ||
        ""
    )
      .trim()
      .toUpperCase(),

    strn: String(
      body.strn ||
        ""
    )
      .trim()
      .toUpperCase(),

    openingBalance: Number(
      body.openingBalance ||
        body.balance ||
        0
    ),

    creditLimit: Number(
      body.creditLimit ||
        0
    ),

    paymentTerms: String(
      body.paymentTerms ||
        ""
    ).trim(),

    status: [
      "Active",
      "Inactive",
    ].includes(body.status)
      ? body.status
      : "Active",

    notes: String(
      body.notes ||
        ""
    ).trim(),
  };
};

const getNextVendorCode = async () => {
  for (
    let attempt = 0;
    attempt < 20;
    attempt += 1
  ) {
    const counter =
      await Counter.findOneAndUpdate(
        {
          name: "vendorCode",
        },
        {
          $inc: {
            seq: 1,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );

    const vendorCode =
      `VEN-${String(
        counter.seq
      ).padStart(4, "0")}`;

    const exists =
      await Vendor.exists({
        vendorCode,
      });

    if (!exists) {
      return vendorCode;
    }
  }

  throw new Error(
    "Unable to generate unique vendor code"
  );
};

const peekNextVendorCode = async () => {
  const counter =
    await Counter.findOne({
      name: "vendorCode",
    });

  const nextSeq =
    Number(counter?.seq || 0) +
    1;

  return `VEN-${String(
    nextSeq
  ).padStart(4, "0")}`;
};

const duplicateMessage = (error) => {
  if (error.code !== 11000) {
    return (
      error.message ||
      "Vendor save nahi hua"
    );
  }

  const duplicateField =
    Object.keys(
      error.keyPattern || {}
    )[0];

  if (duplicateField === "email") {
    return "Ye email already kisi vendor ke sath used hai";
  }

  if (
    duplicateField ===
    "vendorCode"
  ) {
    return "Ye vendor code already used hai";
  }

  return "Duplicate value found";
};

router.get(
  "/next-code",
  async (req, res) => {
    try {
      const vendorCode =
        await peekNextVendorCode();

      return res
        .status(200)
        .json({
          success: true,
          vendorCode,
        });
    } catch (error) {
      console.error(
        "Vendor Next Code Error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Vendor code generate nahi hua",
          error: error.message,
        });
    }
  }
);

router.post(
  "/add",
  async (req, res) => {
    try {
      const payload =
        cleanPayload(req.body);

      if (!payload.vendorName) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Vendor name required hai",
          });
      }

      if (!payload.phoneNumber) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Phone number required hai",
          });
      }

      if (!payload.address) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Address required hai",
          });
      }

      if (!payload.vendorCode) {
        payload.vendorCode =
          await getNextVendorCode();
      }

      const vendor =
        await Vendor.create(
          payload
        );

      return res
        .status(201)
        .json({
          success: true,
          message:
            "Vendor added successfully",
          data: vendor,
        });
    } catch (error) {
      console.error(
        "Vendor Add Error:",
        error
      );

      return res
        .status(400)
        .json({
          success: false,
          message:
            duplicateMessage(
              error
            ),
        });
    }
  }
);

router.get(
  "/all",
  async (req, res) => {
    try {
      const {
        search = "",
        status = "",
      } = req.query;

      const query = {};

      if (
        status &&
        status !== "All"
      ) {
        query.status = status;
      }

      if (search) {
        query.$or = [
          {
            vendorCode: {
              $regex: search,
              $options: "i",
            },
          },
          {
            vendorName: {
              $regex: search,
              $options: "i",
            },
          },
          {
            contactPerson: {
              $regex: search,
              $options: "i",
            },
          },
          {
            phoneNumber: {
              $regex: search,
              $options: "i",
            },
          },
          {
            alternatePhone: {
              $regex: search,
              $options: "i",
            },
          },
          {
            email: {
              $regex: search,
              $options: "i",
            },
          },
          {
            address: {
              $regex: search,
              $options: "i",
            },
          },
          {
            city: {
              $regex: search,
              $options: "i",
            },
          },
          {
            ntn: {
              $regex: search,
              $options: "i",
            },
          },
          {
            strn: {
              $regex: search,
              $options: "i",
            },
          },
        ];
      }

      const vendors =
        await Vendor.find(query)
          .sort({
            createdAt: -1,
          });

      return res
        .status(200)
        .json(vendors);
    } catch (error) {
      console.error(
        "Vendors Load Error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Vendors load nahi huay",
          error: error.message,
        });
    }
  }
);

router.get(
  "/:id",
  async (req, res) => {
    try {
      const vendor =
        await Vendor.findById(
          req.params.id
        );

      if (!vendor) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Vendor not found",
          });
      }

      return res
        .status(200)
        .json({
          success: true,
          data: vendor,
        });
    } catch (error) {
      console.error(
        "Vendor Single Load Error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Vendor load nahi hua",
          error: error.message,
        });
    }
  }
);

router.put(
  "/update/:id",
  async (req, res) => {
    try {
      const payload =
        cleanPayload(req.body);

      if (!payload.vendorName) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Vendor name required hai",
          });
      }

      if (!payload.phoneNumber) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Phone number required hai",
          });
      }

      if (!payload.address) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Address required hai",
          });
      }

      if (!payload.vendorCode) {
        delete payload.vendorCode;
      }

      const updatedVendor =
        await Vendor.findByIdAndUpdate(
          req.params.id,
          payload,
          {
            new: true,
            runValidators: true,
          }
        );

      if (!updatedVendor) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Vendor not found",
          });
      }

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Vendor updated successfully",
          data: updatedVendor,
        });
    } catch (error) {
      console.error(
        "Vendor Update Error:",
        error
      );

      return res
        .status(400)
        .json({
          success: false,
          message:
            duplicateMessage(
              error
            ),
        });
    }
  }
);

router.delete(
  "/delete/:id",
  async (req, res) => {
    try {
      const deletedVendor =
        await Vendor.findByIdAndDelete(
          req.params.id
        );

      if (!deletedVendor) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Vendor not found",
          });
      }

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Vendor deleted successfully",
        });
    } catch (error) {
      console.error(
        "Vendor Delete Error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Vendor delete nahi hua",
          error: error.message,
        });
    }
  }
);

module.exports = router;
