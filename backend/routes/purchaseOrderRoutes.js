const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const PurchaseOrder = require(
  "../models/PurchaseOrder"
);

const Vendor = require(
  "../models/vendor"
);

const Item = require(
  "../models/Item"
);

const Counter = require(
  "../models/Counter"
);

const ALLOWED_STATUSES = [
  "Draft",
  "Ordered",
  "Partially Received",
  "Received",
  "Cancelled",
];

const USER_SELECTABLE_STATUSES = [
  "Draft",
  "Ordered",
  "Cancelled",
];

const ALLOWED_TAX_TYPES = [
  "without-tax",
  "with-tax",
];

const cleanText = (
  value,
  fallback = ""
) => {
  const text = String(
    value ?? ""
  ).trim();

  return text || fallback;
};

const cleanNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? Math.max(number, 0)
    : 0;
};

const roundMoney = (value) =>
  Math.round(
    (cleanNumber(value) +
      Number.EPSILON) *
      100
  ) / 100;

const idOf = (value) => {
  if (!value) {
    return "";
  }

  if (
    typeof value ===
      "object"
  ) {
    return String(
      value._id ||
        value.id ||
        ""
    );
  }

  return String(value);
};

const isValidId = (value) =>
  mongoose.isValidObjectId(
    idOf(value)
  );

const getItemCode = (item) =>
  cleanText(
    item?.code ||
      item?.itemCode ||
      item?.sku ||
      item?.productCode
  ).toUpperCase();

const getItemName = (item) =>
  cleanText(
    item?.name ||
      item?.itemName ||
      item?.description ||
      item?.title
  );

const getItemUnit = (item) =>
  cleanText(
    item?.unit ||
      item?.uom ||
      item?.measurementUnit,
    "Pcs"
  );

const getItemPurchasePrice = (
  item
) =>
  cleanNumber(
    item?.purchasePrice ??
      item?.purchaseRate ??
      item?.costPrice ??
      item?.rate ??
      0
  );

const getPaymentStatus = (
  grandTotal,
  advance
) => {
  const total =
    cleanNumber(grandTotal);

  const paid =
    cleanNumber(advance);

  if (paid <= 0) {
    return "Unpaid";
  }

  if (
    total > 0 &&
    paid >= total
  ) {
    return "Paid";
  }

  return "Partially Paid";
};

const duplicateMessage = (
  error,
  fallback
) => {
  if (
    error.code !== 11000
  ) {
    return (
      error.message ||
      fallback
    );
  }

  const field =
    Object.keys(
      error.keyPattern || {}
    )[0] ||
    "value";

  const value =
    error.keyValue?.[field];

  return `Duplicate ${field}: ${String(
    value ?? ""
  )}`;
};

const populatePurchaseOrder = (
  query
) =>
  query
    .populate(
      "vendor",
      [
        "vendorName",
        "name",
        "phoneNumber",
        "phone",
        "email",
        "address",
        "city",
        "ntn",
        "strn",
        "status",
      ].join(" ")
    )
    .populate(
      "items.item",
      [
        "code",
        "name",
        "itemCode",
        "itemName",
        "description",
        "unit",
        "uom",
        "purchasePrice",
        "purchaseRate",
        "costPrice",
        "status",
        "itemType",
        "stockManaged",
      ].join(" ")
    );

const getHighestExistingSequence =
  async () => {
    const rows =
      await PurchaseOrder.find({})
        .select(
          "purchaseOrderNo"
        )
        .lean();

    return rows.reduce(
      (highest, row) => {
        const match =
          cleanText(
            row.purchaseOrderNo
          ).match(
            /(\d+)(?!.*\d)/
          );

        const sequence =
          match
            ? Number(
                match[1]
              )
            : 0;

        return Math.max(
          highest,
          sequence
        );
      },
      0
    );
  };

const syncCounter = async () => {
  const highest =
    await getHighestExistingSequence();

  const counter =
    await Counter.findOneAndUpdate(
      {
        name:
          "purchaseOrderNo",
      },
      {
        $max: {
          seq: highest,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert:
          true,
      }
    );

  return cleanNumber(
    counter.seq
  );
};

const getNextPurchaseOrderNo =
  async () => {
    await syncCounter();

    for (
      let attempt = 0;
      attempt < 20;
      attempt += 1
    ) {
      const counter =
        await Counter.findOneAndUpdate(
          {
            name:
              "purchaseOrderNo",
          },
          {
            $inc: {
              seq: 1,
            },
          },
          {
            new: true,
            upsert: true,
            setDefaultsOnInsert:
              true,
          }
        );

      const purchaseOrderNo =
        `PO-${String(
          counter.seq
        ).padStart(
          4,
          "0"
        )}`;

      const exists =
        await PurchaseOrder.exists({
          purchaseOrderNo,
        });

      if (!exists) {
        return purchaseOrderNo;
      }
    }

    throw new Error(
      "Unable to generate a unique purchase order number"
    );
  };

const peekNextPurchaseOrderNo =
  async () => {
    const currentSequence =
      await syncCounter();

    return `PO-${String(
      currentSequence + 1
    ).padStart(
      4,
      "0"
    )}`;
  };

const buildVendorSnapshot = (
  vendor
) => ({
  vendor:
    vendor._id,

  vendorName:
    cleanText(
      vendor.vendorName ||
        vendor.name
    ),

  vendorPhone:
    cleanText(
      vendor.phoneNumber ||
        vendor.phone
    ),

  vendorEmail:
    cleanText(
      vendor.email
    ).toLowerCase(),

  vendorAddress:
    cleanText(
      vendor.address
    ),

  vendorCity:
    cleanText(
      vendor.city
    ),

  vendorNtn:
    cleanText(
      vendor.ntn ||
        vendor.vendorNtn
    ),

  vendorStrn:
    cleanText(
      vendor.strn ||
        vendor.vendorStrn
    ),
});

const makeFallbackRowKey = (
  row
) =>
  [
    idOf(row.item),
    cleanText(
      row.description
    ).toLowerCase(),
    cleanText(
      row.size
    ).toLowerCase(),
    cleanText(
      row.unit,
      "Pcs"
    ).toLowerCase(),
  ].join("|");

const buildExistingRowMaps = (
  existingOrder
) => {
  const byId =
    new Map();

  const byFallback =
    new Map();

  for (
    const row of
    existingOrder?.items || []
  ) {
    const rowId =
      idOf(row._id);

    if (rowId) {
      byId.set(
        rowId,
        row
      );
    }

    const fallbackKey =
      makeFallbackRowKey(
        row
      );

    if (
      !byFallback.has(
        fallbackKey
      )
    ) {
      byFallback.set(
        fallbackKey,
        row
      );
    }
  }

  return {
    byId,
    byFallback,
  };
};

const preparePurchaseItems =
  async (
    rows = [],
    existingOrder = null
  ) => {
    if (
      !Array.isArray(rows)
    ) {
      throw new Error(
        "Purchase items must be an array"
      );
    }

    const candidateRows =
      rows.filter(
        (row) =>
          row &&
          idOf(row.item) &&
          cleanNumber(
            row.quantity
          ) > 0 &&
          Number.isFinite(
            Number(
              row.unitPrice ?? 0
            )
          ) &&
          Number(
            row.unitPrice ?? 0
          ) >= 0
      );

    if (
      candidateRows.length === 0
    ) {
      throw new Error(
        "Select at least one Item Master record and enter valid quantity and unit price"
      );
    }

    const itemIds =
      [
        ...new Set(
          candidateRows.map(
            (row) =>
              idOf(
                row.item
              )
          )
        ),
      ];

    if (
      itemIds.some(
        (itemId) =>
          !mongoose.isValidObjectId(
            itemId
          )
      )
    ) {
      throw new Error(
        "One or more selected Item Master IDs are invalid"
      );
    }

    const itemDocuments =
      await Item.find({
        _id: {
          $in:
            itemIds,
        },
      });

    const itemMap =
      new Map(
        itemDocuments.map(
          (item) => [
            String(item._id),
            item,
          ]
        )
      );

    const {
      byId,
      byFallback,
    } =
      buildExistingRowMaps(
        existingOrder
      );

    return candidateRows.map(
      (row) => {
        const itemId =
          idOf(row.item);

        const itemDocument =
          itemMap.get(
            itemId
          );

        if (!itemDocument) {
          throw new Error(
            `Selected Item Master record ${itemId} was not found`
          );
        }

        if (
          itemDocument.status ===
          "Inactive"
        ) {
          throw new Error(
            `Item "${getItemName(
              itemDocument
            )}" is inactive`
          );
        }

        const description =
          cleanText(
            row.description,
            getItemName(
              itemDocument
            )
          );

        if (!description) {
          throw new Error(
            `Item ${getItemCode(
              itemDocument
            ) ||
              itemId} has no name or description`
          );
        }

        const size =
          cleanText(
            row.size
          );

        const unit =
          cleanText(
            row.unit,
            getItemUnit(
              itemDocument
            )
          );

        const quantity =
          cleanNumber(
            row.quantity
          );

        const unitPrice =
          row.unitPrice !==
              undefined &&
            row.unitPrice !==
              ""
            ? roundMoney(
                row.unitPrice
              )
            : roundMoney(
                getItemPurchasePrice(
                  itemDocument
                )
              );

        const rowId =
          idOf(row._id);

        const fallbackKey =
          makeFallbackRowKey({
            item: itemId,
            description,
            size,
            unit,
          });

        const existingRow =
          (
            rowId &&
            byId.get(rowId)
          ) ||
          byFallback.get(
            fallbackKey
          ) ||
          null;

        const receivedQty =
          existingRow
            ? cleanNumber(
                existingRow.receivedQty
              )
            : 0;

        if (
          quantity <
          receivedQty
        ) {
          throw new Error(
            `Quantity for "${description}" cannot be less than already received quantity ${receivedQty} ${unit}`
          );
        }

        return {
          _id:
            existingRow?._id ||
            undefined,

          item:
            itemDocument._id,

          description,

          size,

          cartons:
            cleanNumber(
              row.cartons
            ),

          quantity,

          unit,

          unitPrice,

          amount:
            roundMoney(
              quantity *
                unitPrice
            ),

          receivedQty,

          pendingQty:
            Math.max(
              quantity -
                receivedQty,
              0
            ),

          remarks:
            cleanText(
              row.remarks
            ),
        };
      }
    );
  };

const calculateTotals = ({
  items,
  taxType,
  advance,
}) => {
  const finalTaxType =
    ALLOWED_TAX_TYPES.includes(
      taxType
    )
      ? taxType
      : "without-tax";

  const taxRate =
    finalTaxType ===
    "with-tax"
      ? 18
      : 0;

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
            0.18
        )
      : 0;

  const grandTotal =
    roundMoney(
      subtotal +
        salesTax
    );

  const finalAdvance =
    roundMoney(
      advance
    );

  if (
    finalAdvance >
    grandTotal
  ) {
    throw new Error(
      "Advance cannot exceed grand total"
    );
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

    totalQuantity:
      items.reduce(
        (sum, item) =>
          sum +
          cleanNumber(
            item.quantity
          ),
        0
      ),

    subtotal,
    taxType:
      finalTaxType,
    taxRate,
    salesTax,
    grandTotal,
    advance:
      finalAdvance,

    balance:
      roundMoney(
        Math.max(
          grandTotal -
            finalAdvance,
          0
        )
      ),

    paymentStatus:
      getPaymentStatus(
        grandTotal,
        finalAdvance
      ),
  };
};

const loadVendor =
  async (vendorId) => {
    if (
      !isValidId(vendorId)
    ) {
      throw new Error(
        "A valid vendor is required"
      );
    }

    const vendor =
      await Vendor.findById(
        idOf(vendorId)
      );

    if (!vendor) {
      throw new Error(
        "Vendor not found"
      );
    }

    if (
      vendor.status ===
      "Inactive"
    ) {
      throw new Error(
        "Selected vendor is inactive"
      );
    }

    return vendor;
  };

router.get(
  "/next-no",
  async (req, res) => {
    try {
      const purchaseOrderNo =
        await peekNextPurchaseOrderNo();

      return res
        .status(200)
        .json({
          success: true,
          purchaseOrderNo,
        });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            "Purchase order number could not be generated",
          error:
            error.message,
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
        vendor = "",
      } = req.query;

      const query = {};

      if (
        status &&
        status !==
          "All"
      ) {
        query.status =
          status;
      }

      if (vendor) {
        query.vendor =
          vendor;
      }

      if (search) {
        query.$or = [
          {
            purchaseOrderNo: {
              $regex:
                search,
              $options:
                "i",
            },
          },
          {
            vendorName: {
              $regex:
                search,
              $options:
                "i",
            },
          },
          {
            vendorPhone: {
              $regex:
                search,
              $options:
                "i",
            },
          },
          {
            referenceNo: {
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

      const orders =
        await populatePurchaseOrder(
          PurchaseOrder.find(
            query
          ).sort({
            createdAt: -1,
          })
        );

      return res
        .status(200)
        .json(orders);
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            "Purchase orders could not be loaded",
          error:
            error.message,
        });
    }
  }
);

router.get(
  "/:id",
  async (req, res) => {
    try {
      if (
        !isValidId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid purchase order ID",
          });
      }

      const order =
        await populatePurchaseOrder(
          PurchaseOrder.findById(
            req.params.id
          )
        );

      if (!order) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Purchase order not found",
          });
      }

      return res
        .status(200)
        .json({
          success: true,
          data: order,
        });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            "Purchase order could not be loaded",
          error:
            error.message,
        });
    }
  }
);

router.post(
  "/add",
  async (req, res) => {
    try {
      const vendor =
        await loadVendor(
          req.body.vendor
        );

      if (
        !cleanText(
          req.body.orderDate
        )
      ) {
        throw new Error(
          "Order date is required"
        );
      }

      const items =
        await preparePurchaseItems(
          req.body.items
        );

      const totals =
        calculateTotals({
          items,
          taxType:
            req.body.taxType,
          advance:
            req.body.advance,
        });

      const purchaseOrderNo =
        cleanText(
          req.body
            .purchaseOrderNo
        )
          ? cleanText(
              req.body
                .purchaseOrderNo
            ).toUpperCase()
          : await getNextPurchaseOrderNo();

      const vendorSnapshot =
        buildVendorSnapshot(
          vendor
        );

      const selectedStatus =
        USER_SELECTABLE_STATUSES.includes(
          req.body.status
        )
          ? req.body.status
          : "Draft";

      const purchaseOrder =
        new PurchaseOrder({
          purchaseOrderNo,

          ...vendorSnapshot,

          orderDate:
            cleanText(
              req.body.orderDate
            ),

          expectedDate:
            cleanText(
              req.body.expectedDate
            ),

          referenceNo:
            cleanText(
              req.body.referenceNo
            ),

          taxType:
            totals.taxType,

          taxRate:
            totals.taxRate,

          items,

          totalCartons:
            totals.totalCartons,

          totalQuantity:
            totals.totalQuantity,

          subtotal:
            totals.subtotal,

          salesTax:
            totals.salesTax,

          grandTotal:
            totals.grandTotal,

          advance:
            totals.advance,

          balance:
            totals.balance,

          paymentStatus:
            totals.paymentStatus,

          status:
            selectedStatus,

          remarks:
            cleanText(
              req.body.remarks
            ),
        });

      const savedOrder =
        await purchaseOrder.save();

      const populatedOrder =
        await populatePurchaseOrder(
          PurchaseOrder.findById(
            savedOrder._id
          )
        );

      return res
        .status(201)
        .json({
          success: true,
          message:
            "Purchase order created successfully",
          data:
            populatedOrder,
        });
    } catch (error) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            duplicateMessage(
              error,
              "Purchase order could not be saved"
            ),
          error:
            error.message,
        });
    }
  }
);

router.put(
  "/update/:id",
  async (req, res) => {
    try {
      if (
        !isValidId(
          req.params.id
        )
      ) {
        throw new Error(
          "Invalid purchase order ID"
        );
      }

      const existingOrder =
        await PurchaseOrder.findById(
          req.params.id
        );

      if (!existingOrder) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Purchase order not found",
          });
      }

      if (
        existingOrder.status ===
        "Received"
      ) {
        throw new Error(
          "A received purchase order cannot be updated"
        );
      }

      if (
        existingOrder.status ===
        "Cancelled"
      ) {
        throw new Error(
          "A cancelled purchase order cannot be updated"
        );
      }

      const vendor =
        await loadVendor(
          req.body.vendor ||
            existingOrder.vendor
        );

      const items =
        await preparePurchaseItems(
          req.body.items ||
            existingOrder.items,
          existingOrder
        );

      const totals =
        calculateTotals({
          items,
          taxType:
            req.body.taxType ||
            existingOrder.taxType,
          advance:
            req.body.advance ??
            existingOrder.advance,
        });

      const vendorSnapshot =
        buildVendorSnapshot(
          vendor
        );

      existingOrder.purchaseOrderNo =
        cleanText(
          req.body
            .purchaseOrderNo,
          existingOrder
            .purchaseOrderNo
        ).toUpperCase();

      Object.assign(
        existingOrder,
        vendorSnapshot,
        {
          orderDate:
            cleanText(
              req.body.orderDate,
              existingOrder.orderDate
            ),

          expectedDate:
            cleanText(
              req.body.expectedDate
            ),

          referenceNo:
            cleanText(
              req.body.referenceNo
            ),

          taxType:
            totals.taxType,

          taxRate:
            totals.taxRate,

          items,

          totalCartons:
            totals.totalCartons,

          totalQuantity:
            totals.totalQuantity,

          subtotal:
            totals.subtotal,

          salesTax:
            totals.salesTax,

          grandTotal:
            totals.grandTotal,

          advance:
            totals.advance,

          balance:
            totals.balance,

          paymentStatus:
            totals.paymentStatus,

          remarks:
            cleanText(
              req.body.remarks
            ),
        }
      );

      if (
        USER_SELECTABLE_STATUSES.includes(
          req.body.status
        )
      ) {
        existingOrder.status =
          req.body.status;
      }

      const savedOrder =
        await existingOrder.save();

      const populatedOrder =
        await populatePurchaseOrder(
          PurchaseOrder.findById(
            savedOrder._id
          )
        );

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Purchase order updated successfully",
          data:
            populatedOrder,
        });
    } catch (error) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            duplicateMessage(
              error,
              "Purchase order could not be updated"
            ),
          error:
            error.message,
        });
    }
  }
);

router.patch(
  "/status/:id",
  async (req, res) => {
    try {
      if (
        !ALLOWED_STATUSES.includes(
          req.body.status
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid status",
          });
      }

      const order =
        await PurchaseOrder.findById(
          req.params.id
        );

      if (!order) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Purchase order not found",
          });
      }

      const receivedQty =
        (order.items || []).reduce(
          (sum, row) =>
            sum +
            cleanNumber(
              row.receivedQty
            ),
          0
        );

      if (
        [
          "Partially Received",
          "Received",
        ].includes(
          req.body.status
        ) &&
        receivedQty <= 0
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Receiving status is controlled by GRN and cannot be selected before goods are received",
          });
      }

      order.status =
        req.body.status;

      const savedOrder =
        await order.save();

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Purchase order status updated successfully",
          data:
            savedOrder,
        });
    } catch (error) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            error.message ||
            "Status could not be updated",
          error:
            error.message,
        });
    }
  }
);

router.delete(
  "/delete/:id",
  async (req, res) => {
    try {
      const order =
        await PurchaseOrder.findById(
          req.params.id
        );

      if (!order) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Purchase order not found",
          });
      }

      if (
        [
          "Partially Received",
          "Received",
        ].includes(
          order.status
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "A received purchase order cannot be deleted",
          });
      }

      await PurchaseOrder.findByIdAndDelete(
        req.params.id
      );

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Purchase order deleted successfully",
        });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            error.message ||
            "Purchase order could not be deleted",
          error:
            error.message,
        });
    }
  }
);

module.exports = router;
