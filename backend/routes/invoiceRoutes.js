const express = require("express");
const router = express.Router();

const Invoice = require("../models/Invoice");

const DeliveryChallan = require(
  "../models/DeliveryChallan"
);

const SalesOrder = require(
  "../models/SalesOrder"
);

const Counter = require(
  "../models/Counter"
);

const COMPANY_PROFILES =
  Invoice.COMPANY_PROFILES || {
    topical: {
      key: "topical",
      name:
        "TOPICAL PACKAGING PVT. LTD.",
      shortName:
        "Topical Packaging",
      templateType:
        "detailed",
      codePrefix:
        "TP-INV",
      address:
        "21-Km, Ferozepur Road, Lahore, Pakistan",
      phone:
        "+92 321 9970676",
      salesTaxRegNo:
        "32-77-8762-085-29",
      nationalTaxNo:
        "6620209-3",
    },

    alKaram: {
      key: "alKaram",
      name:
        "AL-KARAM TRADERS",
      shortName:
        "Al-Karam Traders",
      templateType:
        "compact",
      codePrefix:
        "AK-INV",
      address:
        "Office #17, 3rd Floor, Gohar Centre, Wahdat Road, Lahore",
      phone:
        "0423 5912858 | 0333 8295065",
      salesTaxRegNo: "",
      nationalTaxNo: "",
    },
  };

const allowedStatuses = [
  "Draft",
  "Issued",
  "Paid",
  "Cancelled",
];

const allowedTaxTypes = [
  "without-tax",
  "with-tax",
];

const allowedTextTypes = [
  "",
  "with-text",
  "without-text",
];

/*
|--------------------------------------------------------------------------
| Basic Helpers
|--------------------------------------------------------------------------
*/

const normalizeProfileKey = (
  value
) => {
  if (
    typeof Invoice.normalizeProfileKey ===
    "function"
  ) {
    return Invoice.normalizeProfileKey(
      value
    );
  }

  const normalized = String(
    value || ""
  )
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");

  return normalized === "alkaram"
    ? "alKaram"
    : "topical";
};

const getProfile = (value) => {
  const key =
    normalizeProfileKey(
      value
    );

  return (
    COMPANY_PROFILES[key] ||
    COMPANY_PROFILES.topical
  );
};

const cleanText = (
  value,
  fallback = ""
) =>
  String(
    value ?? fallback
  ).trim();

const cleanNumber = (value) => {
  const parsed = Number(
    value || 0
  );

  return Number.isFinite(
    parsed
  )
    ? Math.max(parsed, 0)
    : 0;
};

const roundMoney = (value) =>
  Math.round(
    (Number(value || 0) +
      Number.EPSILON) *
      100
  ) / 100;

const getId = (value) => {
  if (!value) {
    return "";
  }

  if (
    typeof value ===
      "object" &&
    value._id
  ) {
    return String(
      value._id
    );
  }

  return String(value);
};

/*
|--------------------------------------------------------------------------
| Amount in Words
|--------------------------------------------------------------------------
*/

const numberToWordsBelowThousand = (
  number
) => {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  let value =
    Math.floor(number);

  const parts = [];

  if (value >= 100) {
    parts.push(
      `${
        ones[
          Math.floor(
            value / 100
          )
        ]
      } Hundred`
    );

    value %= 100;
  }

  if (value >= 20) {
    parts.push(
      tens[
        Math.floor(
          value / 10
        )
      ]
    );

    value %= 10;
  }

  if (value > 0) {
    parts.push(
      ones[value]
    );
  }

  return parts.join(" ");
};

const amountToWords = (
  amount
) => {
  let value =
    Math.round(
      cleanNumber(amount)
    );

  if (value === 0) {
    return "Zero Rupees Only";
  }

  const parts = [];

  const groups = [
    {
      value: 10000000,
      label: "Crore",
    },
    {
      value: 100000,
      label: "Lakh",
    },
    {
      value: 1000,
      label: "Thousand",
    },
  ];

  for (const group of groups) {
    if (
      value >= group.value
    ) {
      const count =
        Math.floor(
          value /
            group.value
        );

      parts.push(
        `${numberToWordsBelowThousand(
          count
        )} ${group.label}`
      );

      value %= group.value;
    }
  }

  if (value > 0) {
    parts.push(
      numberToWordsBelowThousand(
        value
      )
    );
  }

  return `${parts.join(
    " "
  )} Rupees Only`;
};

/*
|--------------------------------------------------------------------------
| Company-Specific Invoice Number
|--------------------------------------------------------------------------
*/

const getCounterName = (
  profileKey
) =>
  `invoiceNo:${profileKey}`;

const getNextInvoiceNo = async (
  companyProfile
) => {
  const profile =
    getProfile(
      companyProfile
    );

  let invoiceNo = "";

  for (
    let attempt = 0;
    attempt < 10;
    attempt += 1
  ) {
    const counter =
      await Counter.findOneAndUpdate(
        {
          name:
            getCounterName(
              profile.key
            ),
        },

        {
          $inc: {
            seq: 1,
          },
        },

        {
          returnDocument:
            "after",

          upsert: true,

          setDefaultsOnInsert:
            true,
        }
      );

    invoiceNo =
      `${profile.codePrefix}-` +
      String(
        counter.seq
      ).padStart(
        4,
        "0"
      );

    const exists =
      await Invoice.exists({
        invoiceNo,
      });

    if (!exists) {
      return invoiceNo;
    }
  }

  throw new Error(
    "Unable to generate a unique invoice number"
  );
};

const peekNextInvoiceNo =
  async (
    companyProfile
  ) => {
    const profile =
      getProfile(
        companyProfile
      );

    const counter =
      await Counter.findOne({
        name:
          getCounterName(
            profile.key
          ),
      }).lean();

    const nextSeq =
      counter
        ? Number(
            counter.seq || 0
          ) + 1
        : 1;

    return (
      `${profile.codePrefix}-` +
      String(
        nextSeq
      ).padStart(
        4,
        "0"
      )
    );
  };

/*
|--------------------------------------------------------------------------
| Sales Order Item Matching
|--------------------------------------------------------------------------
*/

const getSalesOrderItem = (
  invoiceItem,
  salesOrder,
  index
) => {
  const orderItems =
    Array.isArray(
      salesOrder?.items
    )
      ? salesOrder.items
      : [];

  const requestedSalesOrderItemId =
    getId(
      invoiceItem.salesOrderItemId
    );

  const requestedItemId =
    getId(
      invoiceItem.item
    );

  const requestedDescription =
    cleanText(
      invoiceItem.description
    ).toLowerCase();

  const requestedSize =
    cleanText(
      invoiceItem.size
    ).toLowerCase();

  const exact =
    orderItems.find(
      (item) => {
        const rowId =
          getId(
            item._id ||
              item.salesOrderItemId
          );

        const itemId =
          getId(
            item.item
          );

        const description =
          cleanText(
            item.description
          ).toLowerCase();

        const size =
          cleanText(
            item.size
          ).toLowerCase();

        return (
          (requestedSalesOrderItemId &&
            rowId ===
              requestedSalesOrderItemId) ||
          (requestedItemId &&
            itemId ===
              requestedItemId) ||
          (description ===
              requestedDescription &&
            size ===
              requestedSize)
        );
      }
    );

  return (
    exact ||
    orderItems[index] ||
    null
  );
};

/*
|--------------------------------------------------------------------------
| Delivery Challan Item Matching
|--------------------------------------------------------------------------
*/

const findChallanItem = (
  requestedItem,
  challanItems,
  index
) => {
  const deliveryChallanItemId =
    getId(
      requestedItem.deliveryChallanItemId
    );

  const salesOrderItemId =
    getId(
      requestedItem.salesOrderItemId
    );

  const itemId =
    getId(
      requestedItem.item
    );

  const description =
    cleanText(
      requestedItem.description
    ).toLowerCase();

  const size =
    cleanText(
      requestedItem.size
    ).toLowerCase();

  const exact =
    challanItems.find(
      (item) => {
        const challanItemId =
          getId(
            item._id
          );

        const challanSalesOrderItemId =
          getId(
            item.salesOrderItemId
          );

        const challanItemMasterId =
          getId(
            item.item
          );

        const challanDescription =
          cleanText(
            item.description
          ).toLowerCase();

        const challanSize =
          cleanText(
            item.size
          ).toLowerCase();

        return (
          (deliveryChallanItemId &&
            challanItemId ===
              deliveryChallanItemId) ||
          (salesOrderItemId &&
            challanSalesOrderItemId ===
              salesOrderItemId) ||
          (itemId &&
            challanItemMasterId ===
              itemId) ||
          (challanDescription ===
              description &&
            challanSize === size)
        );
      }
    );

  return (
    exact ||
    challanItems[index] ||
    null
  );
};

const getMaximumInvoiceQuantity = (
  challanItem,
  requestedUnit
) => {
  const unit =
    cleanText(
      requestedUnit ||
        challanItem.unit
    ).toLowerCase();

  const isWeightUnit = [
    "kg",
    "kgs",
    "kilogram",
    "kilograms",
  ].includes(unit);

  if (
    isWeightUnit &&
    cleanNumber(
      challanItem.netWeight
    ) > 0
  ) {
    return cleanNumber(
      challanItem.netWeight
    );
  }

  return cleanNumber(
    challanItem.quantity
  );
};

/*
|--------------------------------------------------------------------------
| Validate and Clean Invoice Items
|--------------------------------------------------------------------------
*/

const cleanInvoiceItems = ({
  items = [],
  challan,
  salesOrder,
}) => {
  const challanItems =
    Array.isArray(
      challan.items
    )
      ? challan.items
      : [];

  const requestedItems =
    Array.isArray(items) &&
    items.length
      ? items
      : challanItems;

  const cleanItems = [];

  requestedItems.forEach(
    (
      requestedItem,
      index
    ) => {
      if (
        !requestedItem ||
        !cleanText(
          requestedItem.description
        )
      ) {
        return;
      }

      const challanItem =
        findChallanItem(
          requestedItem,
          challanItems,
          index
        );

      if (!challanItem) {
        throw new Error(
          `Item "${cleanText(
            requestedItem.description
          )}" was not found in the selected delivery challan`
        );
      }

      const salesOrderItem =
        getSalesOrderItem(
          {
            ...requestedItem,

            salesOrderItemId:
              requestedItem.salesOrderItemId ||
              challanItem.salesOrderItemId,

            item:
              requestedItem.item ||
              challanItem.item,
          },

          salesOrder,

          index
        );

      const quantity =
        cleanNumber(
          requestedItem.quantity !==
          undefined
            ? requestedItem.quantity
            : challanItem.quantity
        );

      if (quantity <= 0) {
        return;
      }

      const unit =
        cleanText(
          requestedItem.unit ||
            challanItem.unit ||
            "Rolls"
        );

      const maximumQuantity =
        getMaximumInvoiceQuantity(
          challanItem,
          unit
        );

      if (
        maximumQuantity > 0 &&
        quantity >
          maximumQuantity
      ) {
        throw new Error(
          `Invoice quantity for "${cleanText(
            requestedItem.description
          )}" cannot exceed delivery challan quantity ${maximumQuantity} ${unit}`
        );
      }

      const unitPrice =
        cleanNumber(
          requestedItem.unitPrice !==
              undefined &&
            requestedItem.unitPrice !==
              ""
            ? requestedItem.unitPrice
            : salesOrderItem?.unitPrice
        );

      const grossWeight =
        cleanNumber(
          requestedItem.grossWeight ??
            challanItem.grossWeight
        );

      const netWeight =
        cleanNumber(
          requestedItem.netWeight ??
            challanItem.netWeight
        );

      if (
        grossWeight > 0 &&
        netWeight >
          grossWeight
      ) {
        throw new Error(
          `Net weight cannot exceed gross weight for item "${cleanText(
            requestedItem.description
          )}"`
        );
      }

      cleanItems.push({
        item:
          requestedItem.item ||
          challanItem.item ||
          salesOrderItem?.item ||
          null,

        deliveryChallanItemId:
          challanItem._id ||
          null,

        salesOrderItemId:
          requestedItem.salesOrderItemId ||
          challanItem.salesOrderItemId ||
          salesOrderItem?._id ||
          null,

        description:
          cleanText(
            requestedItem.description ||
              challanItem.description
          ),

        size:
          cleanText(
            requestedItem.size ||
              challanItem.size
          ),

        textType:
          allowedTextTypes.includes(
            requestedItem.textType
          )
            ? requestedItem.textType
            : allowedTextTypes.includes(
                  challanItem.textType
                )
              ? challanItem.textType
              : "",

        cartons:
          cleanNumber(
            requestedItem.cartons ??
              challanItem.cartons
          ),

        rolls:
          cleanNumber(
            requestedItem.rolls ??
              challanItem.rolls
          ),

        packing:
          cleanText(
            requestedItem.packing ||
              requestedItem.cartons ||
              challanItem.cartons ||
              ""
          ),

        quantity,

        unit,

        unitPrice,

        grossWeight,

        netWeight,

        amount:
          roundMoney(
            quantity *
              unitPrice
          ),

        remarks:
          cleanText(
            requestedItem.remarks
          ),
      });
    }
  );

  return cleanItems;
};

/*
|--------------------------------------------------------------------------
| Invoice Totals
|--------------------------------------------------------------------------
*/

const calculateTotals = ({
  items = [],
  taxType =
    "without-tax",
  taxRate = 0,
  paidAmount = 0,
}) => {
  const finalTaxType =
    allowedTaxTypes.includes(
      taxType
    )
      ? taxType
      : "without-tax";

  const finalTaxRate =
    finalTaxType ===
    "with-tax"
      ? cleanNumber(
          taxRate || 18
        )
      : 0;

  if (
    finalTaxRate > 100
  ) {
    throw new Error(
      "Sales tax rate cannot exceed 100 percent"
    );
  }

  const subtotal =
    roundMoney(
      items.reduce(
        (sum, item) =>
          sum +
          cleanNumber(
            item.amount
          ),
        0
      )
    );

  const salesTax =
    finalTaxType ===
    "with-tax"
      ? roundMoney(
          subtotal *
            (finalTaxRate /
              100)
        )
      : 0;

  const grandTotal =
    roundMoney(
      subtotal +
        salesTax
    );

  const finalPaidAmount =
    roundMoney(
      cleanNumber(
        paidAmount
      )
    );

  if (
    finalPaidAmount >
    grandTotal
  ) {
    throw new Error(
      "Paid amount cannot exceed grand total"
    );
  }

  const balance =
    roundMoney(
      grandTotal -
        finalPaidAmount
    );

  let paymentStatus =
    "Unpaid";

  if (
    grandTotal > 0 &&
    balance <= 0
  ) {
    paymentStatus =
      "Paid";
  } else if (
    finalPaidAmount > 0
  ) {
    paymentStatus =
      "Partially Paid";
  }

  return {
    totalCartons:
      items.reduce(
        (sum, item) =>
          sum +
          cleanNumber(
            item.cartons
          ),
        0
      ),

    totalRolls:
      items.reduce(
        (sum, item) =>
          sum +
          cleanNumber(
            item.rolls
          ),
        0
      ),

    totalQuantity:
      items.reduce(
        (sum, item) =>
          sum +
          cleanNumber(
            item.quantity
          ),
        0
      ),

    totalGrossWeight:
      items.reduce(
        (sum, item) =>
          sum +
          cleanNumber(
            item.grossWeight
          ),
        0
      ),

    totalNetWeight:
      items.reduce(
        (sum, item) =>
          sum +
          cleanNumber(
            item.netWeight
          ),
        0
      ),

    subtotal,
    taxType:
      finalTaxType,
    taxRate:
      finalTaxRate,
    salesTax,
    grandTotal,
    paidAmount:
      finalPaidAmount,
    balance,
    paymentStatus,

    amountInWords:
      amountToWords(
        grandTotal
      ),
  };
};

/*
|--------------------------------------------------------------------------
| Populate Invoice
|--------------------------------------------------------------------------
*/

const populateInvoice = (
  query
) =>
  query
    .populate(
      "deliveryChallan",

      [
        "challanNo",
        "challanDate",
        "dispatchDate",
        "status",
        "invoiceStatus",
        "companyProfile",
        "companyName",
        "templateType",
        "totalCartons",
        "totalRolls",
        "totalQuantity",
        "totalGrossWeight",
        "totalNetWeight",
      ].join(" ")
    )

    .populate(
      "salesOrder",

      [
        "salesOrderNo",
        "orderDate",
        "deliveryDate",
        "status",
        "poNo",
        "taxType",
        "items",
      ].join(" ")
    )

    .populate(
      "customer",

      [
        "customerName",
        "phoneNumber",
        "email",
        "address",
        "city",
        "ntn",
        "strn",
        "customerNTN",
        "customerSTRN",
      ].join(" ")
    )

    .populate(
      "items.item",

      [
        "code",
        "name",
        "unit",
        "category",
        "brand",
        "purchasePrice",
        "salePrice",
      ].join(" ")
    );

/*
|--------------------------------------------------------------------------
| Sync Delivery Challan Invoice Status
|--------------------------------------------------------------------------
*/

const syncChallanInvoiceStatus =
  async (
    deliveryChallanId
  ) => {
    if (!deliveryChallanId) {
      return;
    }

    const activeInvoice =
      await Invoice.exists({
        deliveryChallan:
          deliveryChallanId,

        isActive: true,
      });

    await DeliveryChallan.findByIdAndUpdate(
      deliveryChallanId,

      {
        invoiceStatus:
          activeInvoice
            ? "Invoiced"
            : "Not Invoiced",
      },

      {
        returnDocument:
          "after",

        runValidators:
          true,
      }
    );
  };

/*
|--------------------------------------------------------------------------
| Sync Sales Order Status
|--------------------------------------------------------------------------
*/

const syncSalesOrderStatus =
  async (
    salesOrderId
  ) => {
    if (!salesOrderId) {
      return;
    }

    const salesOrder =
      await SalesOrder.findById(
        salesOrderId
      );

    if (
      !salesOrder ||
      salesOrder.status ===
        "Cancelled"
    ) {
      return;
    }

    const activeChallans =
      await DeliveryChallan.find({
        salesOrder:
          salesOrderId,

        status: {
          $ne: "Cancelled",
        },
      }).select(
        "invoiceStatus status"
      );

    const totalOrdered =
      (
        salesOrder.items || []
      ).reduce(
        (sum, item) =>
          sum +
          cleanNumber(
            item.quantity
          ),
        0
      );

    const totalDelivered =
      (
        salesOrder.items || []
      ).reduce(
        (sum, item) =>
          sum +
          cleanNumber(
            item.deliveredQty
          ),
        0
      );

    const fullyDelivered =
      totalOrdered > 0 &&
      totalDelivered >=
        totalOrdered;

    const partiallyDelivered =
      totalDelivered > 0 &&
      totalDelivered <
        totalOrdered;

    const allChallansInvoiced =
      activeChallans.length >
        0 &&
      activeChallans.every(
        (challan) =>
          challan.invoiceStatus ===
          "Invoiced"
      );

    let nextStatus =
      salesOrder.status;

    if (
      fullyDelivered &&
      allChallansInvoiced
    ) {
      nextStatus =
        "Invoiced";
    } else if (
      fullyDelivered
    ) {
      nextStatus =
        "Delivered";
    } else if (
      partiallyDelivered
    ) {
      nextStatus =
        "Partially Delivered";
    } else if (
      salesOrder.status !==
      "Draft"
    ) {
      nextStatus =
        "Confirmed";
    }

    await SalesOrder.findByIdAndUpdate(
      salesOrderId,

      {
        status:
          nextStatus,
      },

      {
        returnDocument:
          "after",

        runValidators:
          true,
      }
    );
  };

const syncRelatedStatuses =
  async ({
    deliveryChallanId,
    salesOrderId,
  }) => {
    await syncChallanInvoiceStatus(
      deliveryChallanId
    );

    await syncSalesOrderStatus(
      salesOrderId
    );
  };

/*
|--------------------------------------------------------------------------
| Next Invoice Number
|--------------------------------------------------------------------------
*/

router.get(
  "/next-no",

  async (req, res) => {
    try {
      const profile =
        getProfile(
          req.query
            .companyProfile
        );

      const invoiceNo =
        await peekNextInvoiceNo(
          profile.key
        );

      return res
        .status(200)
        .json({
          success: true,
          invoiceNo,

          companyProfile:
            profile.key,

          companyName:
            profile.name,

          templateType:
            profile.templateType,
        });
    } catch (error) {
      console.error(
        "Invoice Next Number Error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Invoice number could not be generated",

          error:
            error.message,
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Get All Invoices
|--------------------------------------------------------------------------
*/

router.get(
  "/all",

  async (req, res) => {
    try {
      const {
        search = "",
        status = "",
        companyProfile = "",
        taxType = "",
        customer = "",
        deliveryChallan = "",
        salesOrder = "",
        paymentStatus = "",
      } = req.query;

      const query = {};

      if (
        status &&
        status !== "All"
      ) {
        query.status =
          status;
      }

      if (
        companyProfile &&
        companyProfile !==
          "All"
      ) {
        query.companyProfile =
          normalizeProfileKey(
            companyProfile
          );
      }

      if (
        taxType &&
        taxType !== "All"
      ) {
        query.taxType =
          taxType;
      }

      if (customer) {
        query.customer =
          customer;
      }

      if (
        deliveryChallan
      ) {
        query.deliveryChallan =
          deliveryChallan;
      }

      if (salesOrder) {
        query.salesOrder =
          salesOrder;
      }

      if (
        paymentStatus &&
        paymentStatus !==
          "All"
      ) {
        query.paymentStatus =
          paymentStatus;
      }

      if (search) {
        query.$or = [
          {
            invoiceNo: {
              $regex:
                search,

              $options:
                "i",
            },
          },

          {
            challanNo: {
              $regex:
                search,

              $options:
                "i",
            },
          },

          {
            salesOrderNo: {
              $regex:
                search,

              $options:
                "i",
            },
          },

          {
            customerName: {
              $regex:
                search,

              $options:
                "i",
            },
          },

          {
            customerPhone: {
              $regex:
                search,

              $options:
                "i",
            },
          },

          {
            poNo: {
              $regex:
                search,

              $options:
                "i",
            },
          },

          {
            companyName: {
              $regex:
                search,

              $options:
                "i",
            },
          },

          {
            "items.description": {
              $regex:
                search,

              $options:
                "i",
            },
          },
        ];
      }

      const invoices =
        await populateInvoice(
          Invoice.find(
            query
          ).sort({
            createdAt: -1,
          })
        );

      return res
        .status(200)
        .json(invoices);
    } catch (error) {
      console.error(
        "Invoices Load Error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Invoices could not be loaded",

          error:
            error.message,
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Get Single Invoice
|--------------------------------------------------------------------------
*/

router.get(
  "/:id",

  async (req, res) => {
    try {
      const invoice =
        await populateInvoice(
          Invoice.findById(
            req.params.id
          )
        );

      if (!invoice) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Invoice not found",
          });
      }

      return res
        .status(200)
        .json({
          success: true,

          data:
            invoice,
        });
    } catch (error) {
      console.error(
        "Invoice Single Load Error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Invoice could not be loaded",

          error:
            error.message,
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Add Invoice
|--------------------------------------------------------------------------
*/

router.post(
  "/add",

  async (req, res) => {
    let savedInvoice =
      null;

    try {
      const {
        deliveryChallan,
        invoiceDate,
      } = req.body;

      if (
        !deliveryChallan
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Delivery Challan is required",
          });
      }

      if (!invoiceDate) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invoice date is required",
          });
      }

      const challan =
        await DeliveryChallan.findById(
          deliveryChallan
        );

      if (!challan) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Delivery Challan not found",
          });
      }

      if (
        challan.status ===
        "Cancelled"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "A cancelled delivery challan cannot be invoiced",
          });
      }

      const activeInvoice =
        await Invoice.findOne({
          deliveryChallan:
            challan._id,

          isActive: true,
        });

      if (
        activeInvoice
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "An active invoice already exists for this delivery challan",
          });
      }

      const salesOrder =
        await SalesOrder.findById(
          challan.salesOrder
        );

      if (
        !salesOrder
      ) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Sales Order not found",
          });
      }

      const profile =
        getProfile(
          challan.companyProfile ||
            req.body
              .companyProfile
        );

      const cleanItems =
        cleanInvoiceItems({
          items:
            req.body.items,

          challan,

          salesOrder,
        });

      if (
        !cleanItems.length
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Add at least one valid invoice item",
          });
      }

      const totals =
        calculateTotals({
          items:
            cleanItems,

          taxType:
            req.body.taxType ||
            salesOrder.taxType ||
            "without-tax",

          taxRate:
            req.body.taxRate,

          paidAmount:
            req.body
              .paidAmount,
        });

      const finalStatus =
        totals.paymentStatus ===
        "Paid"
          ? "Paid"
          : allowedStatuses.includes(
                req.body.status
              )
            ? req.body
                .status
            : "Draft";

      const invoiceNo =
        await getNextInvoiceNo(
          profile.key
        );

      const invoice =
        new Invoice({
          companyProfile:
            profile.key,

          companyName:
            profile.name,

          companyShortName:
            profile.shortName,

          companyAddress:
            profile.address,

          companyPhone:
            profile.phone,

          templateType:
            profile.templateType,

          invoiceNo,

          deliveryChallan:
            challan._id,

          challanNo:
            challan.challanNo,

          salesOrder:
            salesOrder._id,

          salesOrderNo:
            salesOrder.salesOrderNo,

          customer:
            challan.customer,

          customerName:
            challan.customerName,

          customerPhone:
            challan.customerPhone ||
            "",

          customerEmail:
            challan.customerEmail ||
            "",

          customerAddress:
            challan.deliveryAddress ||
            challan.customerAddress ||
            "",

          customerCity:
            challan.customerCity ||
            "",

          customerNTN:
            req.body
              .customerNTN ||
            salesOrder.customerNTN ||
            salesOrder.ntn ||
            "",

          customerSTRN:
            req.body
              .customerSTRN ||
            salesOrder.customerSTRN ||
            salesOrder.strn ||
            "",

          invoiceDate:
            cleanText(
              req.body.invoiceDate
            ),

          dueDate:
            cleanText(
              req.body.dueDate
            ),

          poNo:
            cleanText(
              req.body.poNo ||
                challan.poNo ||
                salesOrder.poNo
            ),

          taxType:
            totals.taxType,

          taxRate:
            totals.taxRate,

          salesTaxRegNo:
            cleanText(
              req.body
                .salesTaxRegNo ||
                profile.salesTaxRegNo
            ),

          nationalTaxNo:
            cleanText(
              req.body
                .nationalTaxNo ||
                profile.nationalTaxNo
            ),

          paymentTerms:
            cleanText(
              req.body
                .paymentTerms,
              "Due on Receipt"
            ) ||
            "Due on Receipt",

          preparedBy:
            cleanText(
              req.body.preparedBy
            ),

          items:
            cleanItems,

          totalCartons:
            totals.totalCartons,

          totalRolls:
            totals.totalRolls,

          totalQuantity:
            totals.totalQuantity,

          totalGrossWeight:
            totals.totalGrossWeight,

          totalNetWeight:
            totals.totalNetWeight,

          subtotal:
            totals.subtotal,

          salesTax:
            totals.salesTax,

          grandTotal:
            totals.grandTotal,

          paidAmount:
            totals.paidAmount,

          balance:
            totals.balance,

          paymentStatus:
            totals.paymentStatus,

          amountInWords:
            totals.amountInWords,

          status:
            finalStatus,

          remarks:
            cleanText(
              req.body.remarks
            ),
        });

      savedInvoice =
        await invoice.save();

      await syncRelatedStatuses({
        deliveryChallanId:
          challan._id,

        salesOrderId:
          salesOrder._id,
      });

      const populatedInvoice =
        await populateInvoice(
          Invoice.findById(
            savedInvoice._id
          )
        );

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Invoice created successfully",

          data:
            populatedInvoice,
        });
    } catch (error) {
      console.error(
        "Invoice Add Error:",
        error
      );

      if (
        savedInvoice?._id
      ) {
        const deliveryChallanId =
          savedInvoice.deliveryChallan;

        const salesOrderId =
          savedInvoice.salesOrder;

        await Invoice.findByIdAndDelete(
          savedInvoice._id
        );

        try {
          await syncRelatedStatuses({
            deliveryChallanId,
            salesOrderId,
          });
        } catch (
          syncError
        ) {
          console.error(
            "Invoice rollback status sync error:",
            syncError
          );
        }
      }

      if (
        error.code === 11000
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invoice number or delivery challan is already in use",

            error:
              error.message,
          });
      }

      return res
        .status(400)
        .json({
          success: false,

          message:
            "Invoice could not be saved",

          error:
            error.message,
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Update Invoice
|--------------------------------------------------------------------------
*/

router.put(
  "/update/:id",

  async (req, res) => {
    try {
      const invoice =
        await Invoice.findById(
          req.params.id
        );

      if (!invoice) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Invoice not found",
          });
      }

      if (
        invoice.status ===
        "Cancelled"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "A cancelled invoice cannot be updated",
          });
      }

      const oldChallanId =
        invoice.deliveryChallan;

      const oldSalesOrderId =
        invoice.salesOrder;

      const challan =
        await DeliveryChallan.findById(
          req.body
            .deliveryChallan ||
            invoice.deliveryChallan
        );

      if (!challan) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Delivery Challan not found",
          });
      }

      if (
        challan.status ===
        "Cancelled"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "A cancelled delivery challan cannot be invoiced",
          });
      }

      const otherInvoice =
        await Invoice.findOne({
          deliveryChallan:
            challan._id,

          isActive: true,

          _id: {
            $ne:
              invoice._id,
          },
        });

      if (otherInvoice) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Another active invoice already exists for this delivery challan",
          });
      }

      const salesOrder =
        await SalesOrder.findById(
          challan.salesOrder
        );

      if (
        !salesOrder
      ) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Sales Order not found",
          });
      }

      const profile =
        getProfile(
          challan.companyProfile ||
            invoice.companyProfile
        );

      const cleanItems =
        cleanInvoiceItems({
          items:
            req.body.items ||
            invoice.items,

          challan,

          salesOrder,
        });

      if (
        !cleanItems.length
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Add at least one valid invoice item",
          });
      }

      const totals =
        calculateTotals({
          items:
            cleanItems,

          taxType:
            req.body.taxType ||
            invoice.taxType,

          taxRate:
            req.body.taxRate !==
            undefined
              ? req.body.taxRate
              : invoice.taxRate,

          paidAmount:
            req.body.paidAmount !==
            undefined
              ? req.body.paidAmount
              : invoice.paidAmount,
        });

      const finalStatus =
        totals.paymentStatus ===
        "Paid"
          ? "Paid"
          : allowedStatuses.includes(
                req.body.status
              )
            ? req.body.status
            : invoice.status;

      invoice.companyProfile =
        profile.key;

      invoice.companyName =
        profile.name;

      invoice.companyShortName =
        profile.shortName;

      invoice.companyAddress =
        profile.address;

      invoice.companyPhone =
        profile.phone;

      invoice.templateType =
        profile.templateType;

      invoice.deliveryChallan =
        challan._id;

      invoice.challanNo =
        challan.challanNo;

      invoice.salesOrder =
        salesOrder._id;

      invoice.salesOrderNo =
        salesOrder.salesOrderNo;

      invoice.customer =
        challan.customer;

      invoice.customerName =
        challan.customerName;

      invoice.customerPhone =
        challan.customerPhone ||
        "";

      invoice.customerEmail =
        challan.customerEmail ||
        "";

      invoice.customerAddress =
        challan.deliveryAddress ||
        challan.customerAddress ||
        "";

      invoice.customerCity =
        challan.customerCity ||
        "";

      invoice.customerNTN =
        cleanText(
          req.body.customerNTN ??
            invoice.customerNTN
        );

      invoice.customerSTRN =
        cleanText(
          req.body.customerSTRN ??
            invoice.customerSTRN
        );

      invoice.invoiceDate =
        cleanText(
          req.body.invoiceDate ||
            invoice.invoiceDate
        );

      invoice.dueDate =
        cleanText(
          req.body.dueDate ??
            invoice.dueDate
        );

      invoice.poNo =
        cleanText(
          req.body.poNo ||
            challan.poNo ||
            salesOrder.poNo ||
            invoice.poNo
        );

      invoice.taxType =
        totals.taxType;

      invoice.taxRate =
        totals.taxRate;

      invoice.salesTaxRegNo =
        cleanText(
          req.body.salesTaxRegNo ??
            invoice.salesTaxRegNo ??
            profile.salesTaxRegNo
        );

      invoice.nationalTaxNo =
        cleanText(
          req.body.nationalTaxNo ??
            invoice.nationalTaxNo ??
            profile.nationalTaxNo
        );

      invoice.paymentTerms =
        cleanText(
          req.body.paymentTerms ??
            invoice.paymentTerms,
          "Due on Receipt"
        ) || "Due on Receipt";

      invoice.preparedBy =
        cleanText(
          req.body.preparedBy ??
            invoice.preparedBy
        );

      invoice.items =
        cleanItems;

      invoice.totalCartons =
        totals.totalCartons;

      invoice.totalRolls =
        totals.totalRolls;

      invoice.totalQuantity =
        totals.totalQuantity;

      invoice.totalGrossWeight =
        totals.totalGrossWeight;

      invoice.totalNetWeight =
        totals.totalNetWeight;

      invoice.subtotal =
        totals.subtotal;

      invoice.salesTax =
        totals.salesTax;

      invoice.grandTotal =
        totals.grandTotal;

      invoice.paidAmount =
        totals.paidAmount;

      invoice.balance =
        totals.balance;

      invoice.paymentStatus =
        totals.paymentStatus;

      invoice.amountInWords =
        totals.amountInWords;

      invoice.status =
        finalStatus;

      invoice.remarks =
        cleanText(
          req.body.remarks ??
            invoice.remarks
        );

      const savedInvoice =
        await invoice.save();

      await syncRelatedStatuses({
        deliveryChallanId:
          oldChallanId,

        salesOrderId:
          oldSalesOrderId,
      });

      await syncRelatedStatuses({
        deliveryChallanId:
          challan._id,

        salesOrderId:
          salesOrder._id,
      });

      const populatedInvoice =
        await populateInvoice(
          Invoice.findById(
            savedInvoice._id
          )
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Invoice updated successfully",

          data:
            populatedInvoice,
        });
    } catch (error) {
      console.error(
        "Invoice Update Error:",
        error
      );

      if (
        error.code === 11000
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invoice number or delivery challan is already in use",

            error:
              error.message,
          });
      }

      return res
        .status(400)
        .json({
          success: false,

          message:
            "Invoice could not be updated",

          error:
            error.message,
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Update Payment
|--------------------------------------------------------------------------
*/

router.patch(
  "/payment/:id",

  async (req, res) => {
    try {
      const invoice =
        await Invoice.findById(
          req.params.id
        );

      if (!invoice) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Invoice not found",
          });
      }

      if (
        invoice.status ===
        "Cancelled"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Payment cannot be updated for a cancelled invoice",
          });
      }

      const paidAmount =
        roundMoney(
          cleanNumber(
            req.body
              .paidAmount
          )
        );

      if (
        paidAmount >
        cleanNumber(
          invoice.grandTotal
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Paid amount cannot exceed grand total",
          });
      }

      invoice.paidAmount =
        paidAmount;

      invoice.balance =
        roundMoney(
          invoice.grandTotal -
            paidAmount
        );

      if (
        invoice.grandTotal >
          0 &&
        invoice.balance <= 0
      ) {
        invoice.paymentStatus =
          "Paid";

        invoice.status =
          "Paid";
      } else if (
        paidAmount > 0
      ) {
        invoice.paymentStatus =
          "Partially Paid";

        if (
          invoice.status ===
          "Paid"
        ) {
          invoice.status =
            "Issued";
        }
      } else {
        invoice.paymentStatus =
          "Unpaid";

        if (
          invoice.status ===
          "Paid"
        ) {
          invoice.status =
            "Issued";
        }
      }

      const savedInvoice =
        await invoice.save();

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Payment updated successfully",

          data:
            savedInvoice,
        });
    } catch (error) {
      console.error(
        "Invoice Payment Error:",
        error
      );

      return res
        .status(400)
        .json({
          success: false,

          message:
            "Payment could not be updated",

          error:
            error.message,
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Cancel Invoice
|--------------------------------------------------------------------------
*/

router.patch(
  "/cancel/:id",

  async (req, res) => {
    try {
      const invoice =
        await Invoice.findById(
          req.params.id
        );

      if (!invoice) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Invoice not found",
          });
      }

      invoice.status =
        "Cancelled";

      invoice.isActive =
        false;

      const savedInvoice =
        await invoice.save();

      await syncRelatedStatuses({
        deliveryChallanId:
          invoice.deliveryChallan,

        salesOrderId:
          invoice.salesOrder,
      });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Invoice cancelled successfully",

          data:
            savedInvoice,
        });
    } catch (error) {
      console.error(
        "Invoice Cancel Error:",
        error
      );

      return res
        .status(400)
        .json({
          success: false,

          message:
            "Invoice could not be cancelled",

          error:
            error.message,
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Delete Invoice
|--------------------------------------------------------------------------
*/

router.delete(
  "/delete/:id",

  async (req, res) => {
    try {
      const invoice =
        await Invoice.findById(
          req.params.id
        );

      if (!invoice) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Invoice not found",
          });
      }

      const deliveryChallanId =
        invoice.deliveryChallan;

      const salesOrderId =
        invoice.salesOrder;

      await Invoice.findByIdAndDelete(
        req.params.id
      );

      await syncRelatedStatuses({
        deliveryChallanId,
        salesOrderId,
      });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Invoice deleted successfully",
        });
    } catch (error) {
      console.error(
        "Invoice Delete Error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Invoice could not be deleted",

          error:
            error.message,
        });
    }
  }
);

module.exports = router;