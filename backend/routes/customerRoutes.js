const express = require("express");

const router = express.Router();

const Customer = require("../models/customer");
const Counter = require("../models/Counter");

const cleanPayload = (body = {}) => ({
  customerCode: body.customerCode
    ? String(body.customerCode).trim().toUpperCase()
    : undefined,

  customerName: String(
    body.customerName ||
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

  openingBalance: Number(
    body.openingBalance ||
      body.balance ||
      0
  ),

  creditLimit: Number(
    body.creditLimit ||
      0
  ),

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
});

const getNextCustomerCode = async () => {
  for (
    let attempt = 0;
    attempt < 20;
    attempt += 1
  ) {
    const counter =
      await Counter.findOneAndUpdate(
        {
          name: "customerCode",
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

    const customerCode =
      `CUS-${String(
        counter.seq
      ).padStart(4, "0")}`;

    const exists =
      await Customer.exists({
        customerCode,
      });

    if (!exists) {
      return customerCode;
    }
  }

  throw new Error(
    "Unable to generate unique customer code"
  );
};

const peekNextCustomerCode = async () => {
  const counter =
    await Counter.findOne({
      name: "customerCode",
    });

  const nextSeq =
    Number(counter?.seq || 0) +
    1;

  return `CUS-${String(
    nextSeq
  ).padStart(4, "0")}`;
};

const duplicateMessage = (error) => {
  if (error.code !== 11000) {
    return (
      error.message ||
      "Customer could not be saved"
    );
  }

  const duplicateField =
    Object.keys(
      error.keyPattern || {}
    )[0];

  if (
    duplicateField ===
    "customerCode"
  ) {
    return "This customer code is already used";
  }

  return "Duplicate value found";
};

router.get(
  "/next-code",
  async (req, res) => {
    try {
      const customerCode =
        await peekNextCustomerCode();

      return res
        .status(200)
        .json({
          success: true,
          customerCode,
        });
    } catch (error) {
      console.error(
        "Customer Next Code Error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Customer code could not be generated",
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

      if (!payload.customerName) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Customer name is required",
          });
      }

      if (!payload.address) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Address is required",
          });
      }

      if (
        payload.ntn.length > 30
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "NTN number cannot exceed 30 characters",
          });
      }

      if (!payload.customerCode) {
        payload.customerCode =
          await getNextCustomerCode();
      }

      const customer =
        await Customer.create(
          payload
        );

      return res
        .status(201)
        .json({
          success: true,
          message:
            "Customer added successfully",
          data: customer,
        });
    } catch (error) {
      console.error(
        "Customer Add Error:",
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
        query.status =
          status;
      }

      if (search) {
        query.$or = [
          {
            customerCode: {
              $regex: search,
              $options: "i",
            },
          },
          {
            customerName: {
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
        ];
      }

      const customers =
        await Customer.find(query)
          .select("-email")
          .sort({
            createdAt: -1,
          });

      return res
        .status(200)
        .json(customers);
    } catch (error) {
      console.error(
        "Customers Load Error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Customers could not be loaded",
          error: error.message,
        });
    }
  }
);

router.get(
  "/:id",
  async (req, res) => {
    try {
      const customer =
        await Customer.findById(
          req.params.id
        ).select("-email");

      if (!customer) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Customer not found",
          });
      }

      return res
        .status(200)
        .json({
          success: true,
          data: customer,
        });
    } catch (error) {
      console.error(
        "Customer Single Load Error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Customer could not be loaded",
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

      if (!payload.customerName) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Customer name is required",
          });
      }

      if (!payload.address) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Address is required",
          });
      }

      if (
        payload.ntn.length > 30
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "NTN number cannot exceed 30 characters",
          });
      }

      if (!payload.customerCode) {
        delete payload.customerCode;
      }

      const updatedCustomer =
        await Customer.findByIdAndUpdate(
          req.params.id,
          {
            $set: payload,
            $unset: {
              email: 1,
            },
          },
          {
            new: true,
            runValidators: true,
          }
        ).select("-email");

      if (!updatedCustomer) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Customer not found",
          });
      }

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Customer updated successfully",
          data: updatedCustomer,
        });
    } catch (error) {
      console.error(
        "Customer Update Error:",
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
      const deletedCustomer =
        await Customer.findByIdAndDelete(
          req.params.id
        );

      if (!deletedCustomer) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Customer not found",
          });
      }

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Customer deleted successfully",
        });
    } catch (error) {
      console.error(
        "Customer Delete Error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Customer could not be deleted",
          error: error.message,
        });
    }
  }
);

module.exports = router;
