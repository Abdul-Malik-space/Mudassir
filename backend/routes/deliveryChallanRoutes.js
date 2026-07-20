const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const Counter = require("../models/Counter");
const DeliveryChallan = require(
  "../models/DeliveryChallan"
);
const Item = require("../models/Item");
const SalesOrder = require("../models/SalesOrder");
const StockLedger = require("../models/StockLedger");
const Warehouse = require("../models/Warehouse");

const {
  FINISHED_GOODS_GODOWN,
  ensureDefaultWarehouses,
  postStockMovement,
} = require("../utils/stockService");

const FINISHED_GOODS_WAREHOUSE =
  FINISHED_GOODS_GODOWN ||
  "Finished Goods Godown";

const FINISHED_GOODS_ALIASES = [
  FINISHED_GOODS_WAREHOUSE,
  "Finished Goods Warehouse",
];

const ACTIVE_DELIVERY_STATUSES = [
  "Dispatched",
  "Received",
];

const todayDate = () =>
  new Date().toISOString().slice(0, 10);

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
    value
  );

const duplicateMessage = (
  error,
  fallback
) => {
  if (
    error.code !==
    11000
  ) {
    return (
      error.message ||
      fallback
    );
  }

  const field =
    Object.keys(
      error.keyPattern || {}
    )[0] || "value";

  const value =
    error.keyValue?.[field];

  return `Duplicate ${field}: ${String(
    value
  )}`;
};

const populateChallan = (
  query
) =>
  query
    .populate(
      "salesOrder",
      "salesOrderNo orderNo poNo customerName customerPhone customerEmail customerAddress deliveryAddress status items"
    )
    .populate(
      "customer",
      "name customerName phone email address city status"
    )
    .populate(
      "items.item",
      "code name itemType unit salePrice purchasePrice status stockManaged"
    )
    .populate(
      "warehouseId",
      "code name warehouseType status"
    );

const getFinishedGoodsWarehouse =
  async () => {
    await ensureDefaultWarehouses();

    const warehouse =
      await Warehouse.findOne({
        $or: [
          {
            name:
              FINISHED_GOODS_WAREHOUSE,
          },
          {
            name:
              "Finished Goods Warehouse",
          },
          {
            code:
              "WH-FG",
          },
        ],
      });

    if (!warehouse) {
      throw new Error(
        "Finished Goods Godown not found"
      );
    }

    if (
      warehouse.status ===
      "Inactive"
    ) {
      throw new Error(
        "Finished Goods Godown is inactive"
      );
    }

    return warehouse;
  };

const getHighestExistingSequence =
  async () => {
    const rows =
      await DeliveryChallan.find(
        {}
      )
        .select(
          "challanNo"
        )
        .lean();

    return rows.reduce(
      (
        highest,
        row
      ) => {
        const match =
          String(
            row.challanNo ||
              ""
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

const syncCounter =
  async () => {
    const highestExistingSequence =
      await getHighestExistingSequence();

    const counter =
      await Counter.findOneAndUpdate(
        {
          name:
            "deliveryChallanNo",
        },
        {
          $max: {
            seq:
              highestExistingSequence,
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

const getNextChallanNo =
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
              "deliveryChallanNo",
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

      const challanNo =
        `DC-${String(
          counter.seq
        ).padStart(4, "0")}`;

      const exists =
        await DeliveryChallan.exists({
          challanNo,
        });

      if (!exists) {
        return challanNo;
      }
    }

    throw new Error(
      "Unable to generate a unique delivery challan number"
    );
  };

const peekNextChallanNo =
  async () => {
    const currentSequence =
      await syncCounter();

    return `DC-${String(
      currentSequence + 1
    ).padStart(4, "0")}`;
  };

const getCurrentStock =
  async (
    itemId,
    warehouse
  ) => {
    const result =
      await StockLedger.aggregate([
        {
          $match: {
            item:
              new mongoose.Types.ObjectId(
                itemId
              ),

            $or: [
              {
                warehouseId:
                  warehouse._id,
              },
              {
                warehouse: {
                  $in:
                    FINISHED_GOODS_ALIASES,
                },
              },
            ],
          },
        },
        {
          $group: {
            _id: null,

            qtyIn: {
              $sum:
                "$qtyIn",
            },

            qtyOut: {
              $sum:
                "$qtyOut",
            },
          },
        },
      ]);

    return Math.max(
      cleanNumber(
        result[0]?.qtyIn
      ) -
        cleanNumber(
          result[0]?.qtyOut
        ),
      0
    );
  };

const getDeliveredQuantityMap =
  async (
    salesOrderId,
    excludedChallanId = null
  ) => {
    const query = {
      salesOrder:
        salesOrderId,

      status: {
        $in:
          ACTIVE_DELIVERY_STATUSES,
      },
    };

    if (
      excludedChallanId
    ) {
      query._id = {
        $ne:
          excludedChallanId,
      };
    }

    const challans =
      await DeliveryChallan.find(
        query
      )
        .select(
          "items.salesOrderItemId items.quantity"
        )
        .lean();

    const map =
      new Map();

    for (
      const challan of
      challans
    ) {
      for (
        const item of
        challan.items ||
        []
      ) {
        const key =
          idOf(
            item.salesOrderItemId
          );

        if (!key) {
          continue;
        }

        map.set(
          key,
          cleanNumber(
            map.get(key)
          ) +
            cleanNumber(
              item.quantity
            )
        );
      }
    }

    return map;
  };

const getSalesOrderNumber = (
  salesOrder
) =>
  cleanText(
    salesOrder.salesOrderNo ||
      salesOrder.orderNo,
    String(
      salesOrder._id
    )
  ).toUpperCase();

const loadSalesOrder =
  async (
    salesOrderId
  ) => {
    if (
      !isValidId(
        salesOrderId
      )
    ) {
      throw new Error(
        "A valid sales order is required"
      );
    }

    const salesOrder =
      await SalesOrder.findById(
        salesOrderId
      )
        .populate(
          "customer",
          "name customerName phone email address city status"
        )
        .populate(
          "items.item",
          "code name itemType unit salePrice purchasePrice status stockManaged"
        );

    if (!salesOrder) {
      throw new Error(
        "Sales order not found"
      );
    }

    if (
      salesOrder.status ===
      "Cancelled"
    ) {
      throw new Error(
        "A delivery challan cannot be created for a cancelled sales order"
      );
    }

    if (
      [
        "Delivered",
        "Invoiced",
      ].includes(
        salesOrder.status
      )
    ) {
      throw new Error(
        "This sales order is already delivered or invoiced"
      );
    }

    if (
      salesOrder.status ===
      "Draft"
    ) {
      throw new Error(
        "Confirm the sales order before creating a delivery challan"
      );
    }

    if (
      !salesOrder.customer
    ) {
      throw new Error(
        "The selected sales order has no customer reference"
      );
    }

    return salesOrder;
  };

const buildCustomerDetails = (
  body,
  salesOrder
) => {
  const customer =
    salesOrder.customer ||
    {};

  const customerName =
    cleanText(
      body.customerName ||
        salesOrder.customerName ||
        customer.customerName ||
        customer.name
    );

  if (
    !customerName
  ) {
    throw new Error(
      "Customer name is required"
    );
  }

  const customerAddress =
    cleanText(
      body.customerAddress ||
        body.deliveryAddress ||
        salesOrder.customerAddress ||
        salesOrder.deliveryAddress ||
        customer.address
    );

  return {
    customer:
      customer._id ||
      customer,

    customerName,

    customerPhone:
      cleanText(
        body.customerPhone ||
          salesOrder.customerPhone ||
          customer.phone
      ),

    customerEmail:
      cleanText(
        body.customerEmail ||
          salesOrder.customerEmail ||
          customer.email
      ),

    customerAddress,

    deliveryAddress:
      cleanText(
        body.deliveryAddress,
        customerAddress
      ),

    attentionTo:
      cleanText(
        body.attentionTo ||
          salesOrder.contactPerson ||
          salesOrder.attentionTo
      ),
  };
};

const prepareDeliveryItems =
  async ({
    rows,
    salesOrder,
    warehouse,
    excludedChallanId = null,
    requireCurrentStock = false,
  }) => {
    if (
      !Array.isArray(
        rows
      )
    ) {
      throw new Error(
        "Delivery items must be an array"
      );
    }

    const deliveredMap =
      await getDeliveredQuantityMap(
        salesOrder._id,
        excludedChallanId
      );

    const salesOrderItems =
      new Map(
        (
          salesOrder.items ||
          []
        ).map(
          (row) => [
            String(
              row._id
            ),
            row,
          ]
        )
      );

    const prepared =
      [];

    const usedSalesOrderRows =
      new Set();

    for (
      const row of
      rows
    ) {
      const salesOrderItemId =
        idOf(
          row.salesOrderItemId ||
            row._id
        );

      if (
        !salesOrderItemId ||
        !salesOrderItems.has(
          salesOrderItemId
        )
      ) {
        continue;
      }

      if (
        usedSalesOrderRows.has(
          salesOrderItemId
        )
      ) {
        throw new Error(
          "The same sales order item cannot be added more than once"
        );
      }

      usedSalesOrderRows.add(
        salesOrderItemId
      );

      const orderRow =
        salesOrderItems.get(
          salesOrderItemId
        );

      const itemDocument =
        orderRow.item;

      const itemId =
        idOf(
          itemDocument
        );

      if (
        !itemId ||
        !isValidId(
          itemId
        )
      ) {
        throw new Error(
          "A sales order item is not linked with Item Master"
        );
      }

      const item =
        typeof itemDocument ===
          "object" &&
        itemDocument.itemType
          ? itemDocument
          : await Item.findById(
              itemId
            );

      if (!item) {
        throw new Error(
          "A finished good item could not be found"
        );
      }

      if (
        item.itemType !==
          "Finished Good" ||
        item.stockManaged ===
          false
      ) {
        throw new Error(
          `Item "${item.name}" is not a stock-managed Finished Good`
        );
      }

      if (
        item.status ===
        "Inactive"
      ) {
        throw new Error(
          `Finished good "${item.name}" is inactive`
        );
      }

      const orderedQty =
        cleanNumber(
          orderRow.quantity
        );

      const alreadyDeliveredQty =
        cleanNumber(
          deliveredMap.get(
            salesOrderItemId
          )
        );

      const pendingQty =
        Math.max(
          orderedQty -
            alreadyDeliveredQty,
          0
        );

      const quantity =
        cleanNumber(
          row.quantity
        );

      if (
        quantity <= 0
      ) {
        continue;
      }

      if (
        quantity >
        pendingQty
      ) {
        throw new Error(
          `${item.name}: delivery quantity exceeds pending quantity ${pendingQty} ${
            orderRow.unit ||
            item.unit ||
            "Pcs"
          }`
        );
      }

      const availableStock =
        await getCurrentStock(
          item._id,
          warehouse
        );

      if (
        requireCurrentStock &&
        quantity >
          availableStock
      ) {
        throw new Error(
          `${item.name}: insufficient finished goods stock. Available ${availableStock} ${
            orderRow.unit ||
            item.unit ||
            "Pcs"
          }`
        );
      }

      const grossWeight =
        cleanNumber(
          row.grossWeight
        );

      const netWeight =
        cleanNumber(
          row.netWeight
        );

      if (
        grossWeight > 0 &&
        netWeight >
          grossWeight
      ) {
        throw new Error(
          `${item.name}: net weight cannot exceed gross weight`
        );
      }

      const unitPrice =
        cleanNumber(
          row.unitPrice ??
            orderRow.unitPrice ??
            item.salePrice
        );

      prepared.push({
        salesOrderItemId:
          orderRow._id,

        item:
          item._id,

        warehouseId:
          warehouse._id,

        warehouse:
          warehouse.name,

        itemCode:
          item.code,

        itemName:
          item.name,

        description:
          cleanText(
            row.description ||
              orderRow.description ||
              orderRow.itemName,
            item.name
          ),

        size:
          cleanText(
            row.size ||
              orderRow.size
          ),

        orderedQty,

        alreadyDeliveredQty,

        pendingQty,

        availableStock,

        cartons:
          cleanNumber(
            row.cartons
          ),

        quantity,

        unit:
          cleanText(
            row.unit ||
              orderRow.unit,
            item.unit ||
              "Pcs"
          ),

        grossWeight,

        netWeight,

        unitPrice,

        amount:
          quantity *
          unitPrice,

        remarks:
          cleanText(
            row.remarks
          ),
      });
    }

    if (
      !prepared.length
    ) {
      throw new Error(
        "Add at least one valid finished good item"
      );
    }

    return prepared;
  };

const calculateTotals = (
  items
) => ({
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

  subtotal:
    items.reduce(
      (sum, item) =>
        sum +
        cleanNumber(
          item.amount
        ),
      0
    ),
});

const getEligibleSalesOrders =
  async () => {
    const warehouse =
      await getFinishedGoodsWarehouse();

    const salesOrders =
      await SalesOrder.find({
        status: {
          $nin: [
            "Draft",
            "Cancelled",
            "Delivered",
            "Invoiced",
          ],
        },
      })
        .populate(
          "customer",
          "name customerName phone email address city status"
        )
        .populate(
          "items.item",
          "code name itemType unit salePrice purchasePrice status stockManaged"
        )
        .sort({
          createdAt: -1,
        });

    const output =
      [];

    for (
      const order of
      salesOrders
    ) {
      const deliveredMap =
        await getDeliveredQuantityMap(
          order._id
        );

      const items =
        [];

      for (
        const row of
        order.items ||
        []
      ) {
        const item =
          row.item;

        if (
          !item ||
          item.itemType !==
            "Finished Good" ||
          item.stockManaged ===
            false ||
          item.status ===
            "Inactive"
        ) {
          continue;
        }

        const orderedQty =
          cleanNumber(
            row.quantity
          );

        const alreadyDeliveredQty =
          cleanNumber(
            deliveredMap.get(
              String(
                row._id
              )
            )
          );

        const pendingQty =
          Math.max(
            orderedQty -
              alreadyDeliveredQty,
            0
          );

        if (
          pendingQty <= 0
        ) {
          continue;
        }

        const availableStock =
          await getCurrentStock(
            item._id,
            warehouse
          );

        items.push({
          salesOrderItemId:
            row._id,

          item:
            item._id,

          itemCode:
            item.code,

          itemName:
            item.name,

          description:
            cleanText(
              row.description ||
                row.itemName,
              item.name
            ),

          size:
            cleanText(
              row.size
            ),

          orderedQty,

          alreadyDeliveredQty,

          pendingQty,

          availableStock,

          quantity:
            Math.min(
              pendingQty,
              availableStock
            ),

          unit:
            cleanText(
              row.unit,
              item.unit ||
                "Pcs"
            ),

          cartons:
            cleanNumber(
              row.cartons
            ),

          grossWeight:
            cleanNumber(
              row.grossWeight
            ),

          netWeight:
            cleanNumber(
              row.netWeight
            ),

          unitPrice:
            cleanNumber(
              row.unitPrice ??
                item.salePrice
            ),

          remarks:
            cleanText(
              row.remarks
            ),

          warehouseId:
            warehouse._id,

          warehouse:
            warehouse.name,
        });
      }

      if (
        !items.length
      ) {
        continue;
      }

      const customer =
        order.customer ||
        {};

      output.push({
        _id:
          order._id,

        salesOrderNo:
          getSalesOrderNumber(
            order
          ),

        poNo:
          cleanText(
            order.poNo
          ),

        status:
          order.status,

        customer:
          customer._id ||
          customer,

        customerName:
          cleanText(
            order.customerName ||
              customer.customerName ||
              customer.name
          ),

        customerPhone:
          cleanText(
            order.customerPhone ||
              customer.phone
          ),

        customerEmail:
          cleanText(
            order.customerEmail ||
              customer.email
          ),

        customerAddress:
          cleanText(
            order.customerAddress ||
              order.deliveryAddress ||
              customer.address
          ),

        attentionTo:
          cleanText(
            order.contactPerson ||
              order.attentionTo
          ),

        items,
      });
    }

    return output;
  };

const syncSalesOrder =
  async (
    salesOrderId
  ) => {
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

    const deliveredMap =
      await getDeliveredQuantityMap(
        salesOrder._id
      );

    let totalOrdered =
      0;

    let totalDelivered =
      0;

    const updatedItems =
      (
        salesOrder.items ||
        []
      ).map(
        (row) => {
          const orderedQty =
            cleanNumber(
              row.quantity
            );

          const deliveredQty =
            cleanNumber(
              deliveredMap.get(
                String(
                  row._id
                )
              )
            );

          const pendingQty =
            Math.max(
              orderedQty -
                deliveredQty,
              0
            );

          totalOrdered +=
            orderedQty;

          totalDelivered +=
            deliveredQty;

          return {
            ...row.toObject(),

            deliveredQty,

            pendingQty,
          };
        }
      );

    let status =
      salesOrder.status;

    if (
      totalDelivered <= 0
    ) {
      if (
        status ===
        "Partially Delivered"
      ) {
        status =
          "Confirmed";
      }
    } else if (
      totalOrdered > 0 &&
      totalDelivered >=
        totalOrdered
    ) {
      status =
        "Delivered";
    } else {
      status =
        "Partially Delivered";
    }

    await SalesOrder.findByIdAndUpdate(
      salesOrder._id,
      {
        items:
          updatedItems,

        status,
      },
      {
        runValidators:
          true,
      }
    );
  };

const removeFailedDispatchEntries =
  async (
    challanId
  ) => {
    await StockLedger.deleteMany({
      sourceModule:
        "DeliveryChallan",

      referenceModel:
        "DeliveryChallan",

      referenceId:
        challanId,

      movementType:
        "Delivery Challan Out",

      isReversal: {
        $ne: true,
      },
    });
  };

const dispatchChallan =
  async (
    challan
  ) => {
    if (
      challan.status !==
      "Draft"
    ) {
      throw new Error(
        "Only a Draft delivery challan can be dispatched"
      );
    }

    if (
      challan.stockPosted
    ) {
      throw new Error(
        "Delivery challan stock has already been posted"
      );
    }

    const warehouse =
      await getFinishedGoodsWarehouse();

    const salesOrder =
      await loadSalesOrder(
        challan.salesOrder
      );

    const preparedItems =
      await prepareDeliveryItems({
        rows:
          challan.items,

        salesOrder,

        warehouse,

        excludedChallanId:
          challan._id,

        requireCurrentStock:
          true,
      });

    const requestedByItem =
      new Map();

    for (
      const row of
      preparedItems
    ) {
      const itemId =
        idOf(
          row.item
        );

      requestedByItem.set(
        itemId,
        cleanNumber(
          requestedByItem.get(
            itemId
          )
        ) +
          cleanNumber(
            row.quantity
          )
      );
    }

    for (
      const [
        itemId,
        requiredQty,
      ] of
      requestedByItem.entries()
    ) {
      const availableStock =
        await getCurrentStock(
          itemId,
          warehouse
        );

      if (
        requiredQty >
        availableStock
      ) {
        const item =
          await Item.findById(
            itemId
          ).select(
            "name unit"
          );

        throw new Error(
          `${item?.name || "Finished good"}: insufficient stock. Available ${availableStock} ${
            item?.unit ||
            "Pcs"
          }`
        );
      }
    }

    let createdEntry =
      false;

    try {
      for (
        const row of
        preparedItems
      ) {
        await postStockMovement({
          item:
            row.item,

          warehouse:
            warehouse._id,

          date:
            challan.dispatchDate ||
            challan.challanDate ||
            todayDate(),

          movementType:
            "Delivery Challan Out",

          sourceModule:
            "DeliveryChallan",

          referenceModel:
            "DeliveryChallan",

          referenceId:
            challan._id,

          referenceLineId:
            String(
              row.salesOrderItemId
            ),

          referenceNo:
            challan.challanNo,

          postingKey:
            `DC:${challan._id}:${row.salesOrderItemId}:OUT`,

          qtyIn: 0,

          qtyOut:
            cleanNumber(
              row.quantity
            ),

          rate:
            cleanNumber(
              row.unitPrice
            ),

          remarks:
            `Delivery Challan ${challan.challanNo} against Sales Order ${challan.salesOrderNo}`,

          allowDuplicate:
            false,

          allowNegativeStock:
            false,
        });

        createdEntry =
          true;
      }

      challan.items =
        preparedItems;

      Object.assign(
        challan,
        calculateTotals(
          preparedItems
        )
      );

      challan.warehouseId =
        warehouse._id;

      challan.warehouse =
        warehouse.name;

      challan.status =
        "Dispatched";

      challan.dispatchDate =
        challan.dispatchDate ||
        todayDate();

      challan.stockPosted =
        true;

      challan.stockPostedAt =
        new Date();

      challan.reversalPosted =
        false;

      await challan.save();

      await syncSalesOrder(
        challan.salesOrder
      );
    } catch (error) {
      if (
        createdEntry
      ) {
        await removeFailedDispatchEntries(
          challan._id
        );
      }

      challan.status =
        "Draft";

      challan.stockPosted =
        false;

      challan.stockPostedAt =
        null;

      try {
        await challan.save();
      } catch (
        rollbackError
      ) {
        console.error(
          "Delivery challan rollback failed:",
          rollbackError.message
        );
      }

      throw error;
    }
  };

const cancelChallan =
  async (
    challan,
    cancelReason
  ) => {
    if (
      challan.invoiceStatus ===
      "Invoiced"
    ) {
      throw new Error(
        "An invoiced delivery challan cannot be cancelled"
      );
    }

    if (
      challan.status ===
      "Cancelled"
    ) {
      throw new Error(
        "Delivery challan is already cancelled"
      );
    }

    if (
      challan.status ===
      "Draft"
    ) {
      challan.status =
        "Cancelled";

      challan.cancelledAt =
        new Date();

      challan.cancelReason =
        cleanText(
          cancelReason,
          "Delivery challan cancelled"
        );

      await challan.save();

      await syncSalesOrder(
        challan.salesOrder
      );

      return;
    }

    if (
      !ACTIVE_DELIVERY_STATUSES.includes(
        challan.status
      ) ||
      !challan.stockPosted
    ) {
      throw new Error(
        "Only a dispatched delivery challan can be reversed"
      );
    }

    const originalEntries =
      await StockLedger.find({
        sourceModule:
          "DeliveryChallan",

        referenceModel:
          "DeliveryChallan",

        referenceId:
          challan._id,

        movementType:
          "Delivery Challan Out",

        isReversal: {
          $ne: true,
        },
      }).sort({
        createdAt: 1,
      });

    if (
      !originalEntries.length
    ) {
      throw new Error(
        "Original delivery challan stock entries were not found"
      );
    }

    for (
      const original of
      originalEntries
    ) {
      const alreadyReversed =
        await StockLedger.exists({
          reversalOf:
            original._id,

          isReversal:
            true,
        });

      if (
        alreadyReversed
      ) {
        continue;
      }

      await postStockMovement({
        item:
          original.item,

        warehouse:
          original.warehouseId ||
          original.warehouse,

        date:
          todayDate(),

        movementType:
          "Reversal In",

        sourceModule:
          "DeliveryChallan Cancellation",

        referenceModel:
          "DeliveryChallan",

        referenceId:
          challan._id,

        referenceLineId:
          `REV-${original._id}`,

        referenceNo:
          challan.challanNo,

        postingKey:
          `DC:${challan._id}:${original._id}:REV-IN`,

        qtyIn:
          cleanNumber(
            original.qtyOut
          ),

        qtyOut: 0,

        rate:
          cleanNumber(
            original.rate
          ),

        remarks:
          `Cancellation reversal of Delivery Challan ${challan.challanNo}`,

        allowDuplicate:
          false,

        allowInactiveItem:
          true,

        isReversal:
          true,

        reversalOf:
          original._id,
      });
    }

    challan.status =
      "Cancelled";

    challan.stockPosted =
      false;

    challan.reversalPosted =
      true;

    challan.cancelledAt =
      new Date();

    challan.cancelReason =
      cleanText(
        cancelReason,
        "Delivery challan cancelled and stock reversed"
      );

    await challan.save();

    await syncSalesOrder(
      challan.salesOrder
    );
  };

router.get(
  "/next-no",
  async (req, res) => {
    try {
      const challanNo =
        await peekNextChallanNo();

      return res.json({
        success: true,

        challanNo,

        deliveryChallanNo:
          challanNo,
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          message:
            error.message,
        });
    }
  }
);

router.get(
  "/eligible-sales-orders",
  async (req, res) => {
    try {
      const orders =
        await getEligibleSalesOrders();

      return res.json(
        orders
      );
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          message:
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
        invoiceStatus = "",
        salesOrder = "",
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
        invoiceStatus &&
        invoiceStatus !==
          "All"
      ) {
        query.invoiceStatus =
          invoiceStatus;
      }

      if (
        salesOrder
      ) {
        if (
          !isValidId(
            salesOrder
          )
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "Invalid sales order ID",
            });
        }

        query.salesOrder =
          salesOrder;
      }

      if (search) {
        query.$or = [
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
            poNo: {
              $regex:
                search,

              $options:
                "i",
            },
          },
          {
            vehicleNo: {
              $regex:
                search,

              $options:
                "i",
            },
          },
          {
            "items.itemCode": {
              $regex:
                search,

              $options:
                "i",
            },
          },
          {
            "items.itemName": {
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

      const challans =
        await populateChallan(
          DeliveryChallan.find(
            query
          ).sort({
            challanDate: -1,

            createdAt: -1,
          })
        );

      return res.json(
        challans
      );
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          message:
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
              "Invalid delivery challan ID",
          });
      }

      const challan =
        await populateChallan(
          DeliveryChallan.findById(
            req.params.id
          )
        );

      if (!challan) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Delivery challan not found",
          });
      }

      return res.json({
        success: true,

        data:
          challan,
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          message:
            error.message,
        });
    }
  }
);

router.post(
  "/add",
  async (req, res) => {
    try {
      const body =
        req.body ||
        {};

      const salesOrder =
        await loadSalesOrder(
          body.salesOrder
        );

      const warehouse =
        await getFinishedGoodsWarehouse();

      const items =
        await prepareDeliveryItems({
          rows:
            body.items,

          salesOrder,

          warehouse,

          requireCurrentStock:
            false,
        });

      const challanNo =
        await getNextChallanNo();

      const customerDetails =
        buildCustomerDetails(
          body,
          salesOrder
        );

      const challan =
        await DeliveryChallan.create({
          challanNo,

          salesOrder:
            salesOrder._id,

          salesOrderNo:
            getSalesOrderNumber(
              salesOrder
            ),

          ...customerDetails,

          poNo:
            cleanText(
              body.poNo ||
                salesOrder.poNo
            ),

          referenceNo:
            cleanText(
              body.referenceNo
            ),

          challanDate:
            cleanText(
              body.challanDate,
              todayDate()
            ),

          dispatchDate:
            cleanText(
              body.dispatchDate
            ),

          receivedDate:
            "",

          vehicleNo:
            cleanText(
              body.vehicleNo
            ),

          driverName:
            cleanText(
              body.driverName
            ),

          driverPhone:
            cleanText(
              body.driverPhone
            ),

          preparedBy:
            cleanText(
              body.preparedBy
            ),

          dispatchedBy:
            cleanText(
              body.dispatchedBy
            ),

          receivedBy:
            "",

          receiverDesignation:
            "",

          warehouseId:
            warehouse._id,

          warehouse:
            warehouse.name,

          items,

          ...calculateTotals(
            items
          ),

          status:
            "Draft",

          invoiceStatus:
            "Not Invoiced",

          stockPosted:
            false,

          remarks:
            cleanText(
              body.remarks
            ),
        });

      const data =
        await populateChallan(
          DeliveryChallan.findById(
            challan._id
          )
        );

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Delivery challan draft created successfully",

          data,
        });
    } catch (error) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            duplicateMessage(
              error,
              "Unable to create delivery challan"
            ),
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
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid delivery challan ID",
          });
      }

      const challan =
        await DeliveryChallan.findById(
          req.params.id
        );

      if (!challan) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Delivery challan not found",
          });
      }

      if (
        challan.status !==
          "Draft" ||
        challan.stockPosted
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Only an unposted Draft delivery challan can be edited",
          });
      }

      if (
        challan.invoiceStatus ===
        "Invoiced"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "An invoiced delivery challan cannot be edited",
          });
      }

      const body =
        req.body ||
        {};

      const salesOrder =
        await loadSalesOrder(
          body.salesOrder ||
            challan.salesOrder
        );

      const warehouse =
        await getFinishedGoodsWarehouse();

      const items =
        await prepareDeliveryItems({
          rows:
            body.items ||
            challan.items,

          salesOrder,

          warehouse,

          excludedChallanId:
            challan._id,

          requireCurrentStock:
            false,
        });

      const customerDetails =
        buildCustomerDetails(
          body,
          salesOrder
        );

      challan.salesOrder =
        salesOrder._id;

      challan.salesOrderNo =
        getSalesOrderNumber(
          salesOrder
        );

      Object.assign(
        challan,
        customerDetails
      );

      challan.poNo =
        cleanText(
          body.poNo ||
            salesOrder.poNo
        );

      challan.referenceNo =
        cleanText(
          body.referenceNo
        );

      challan.challanDate =
        cleanText(
          body.challanDate,
          challan.challanDate
        );

      challan.dispatchDate =
        cleanText(
          body.dispatchDate
        );

      challan.vehicleNo =
        cleanText(
          body.vehicleNo
        );

      challan.driverName =
        cleanText(
          body.driverName
        );

      challan.driverPhone =
        cleanText(
          body.driverPhone
        );

      challan.preparedBy =
        cleanText(
          body.preparedBy
        );

      challan.dispatchedBy =
        cleanText(
          body.dispatchedBy
        );

      challan.warehouseId =
        warehouse._id;

      challan.warehouse =
        warehouse.name;

      challan.items =
        items;

      Object.assign(
        challan,
        calculateTotals(
          items
        )
      );

      challan.remarks =
        cleanText(
          body.remarks
        );

      await challan.save();

      const data =
        await populateChallan(
          DeliveryChallan.findById(
            challan._id
          )
        );

      return res.json({
        success: true,

        message:
          "Delivery challan draft updated successfully",

        data,
      });
    } catch (error) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            error.message,
        });
    }
  }
);

router.post(
  "/dispatch/:id",
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
              "Invalid delivery challan ID",
          });
      }

      const challan =
        await DeliveryChallan.findById(
          req.params.id
        );

      if (!challan) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Delivery challan not found",
          });
      }

      if (
        req.body.dispatchDate
      ) {
        challan.dispatchDate =
          cleanText(
            req.body.dispatchDate
          );
      }

      if (
        req.body.dispatchedBy
      ) {
        challan.dispatchedBy =
          cleanText(
            req.body.dispatchedBy
          );
      }

      if (
        req.body.vehicleNo !==
        undefined
      ) {
        challan.vehicleNo =
          cleanText(
            req.body.vehicleNo
          );
      }

      if (
        req.body.driverName !==
        undefined
      ) {
        challan.driverName =
          cleanText(
            req.body.driverName
          );
      }

      if (
        req.body.driverPhone !==
        undefined
      ) {
        challan.driverPhone =
          cleanText(
            req.body.driverPhone
          );
      }

      await dispatchChallan(
        challan
      );

      const data =
        await populateChallan(
          DeliveryChallan.findById(
            challan._id
          )
        );

      return res.json({
        success: true,

        message:
          "Delivery challan dispatched and stock posted successfully",

        data,
      });
    } catch (error) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            error.message,
        });
    }
  }
);

router.post(
  "/receive/:id",
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
              "Invalid delivery challan ID",
          });
      }

      const challan =
        await DeliveryChallan.findById(
          req.params.id
        );

      if (!challan) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Delivery challan not found",
          });
      }

      if (
        challan.status !==
          "Dispatched" ||
        !challan.stockPosted
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Only a Dispatched delivery challan can be marked as Received",
          });
      }

      challan.status =
        "Received";

      challan.receivedDate =
        cleanText(
          req.body.receivedDate,
          todayDate()
        );

      challan.receivedBy =
        cleanText(
          req.body.receivedBy
        );

      challan.receiverDesignation =
        cleanText(
          req.body.receiverDesignation
        );

      await challan.save();

      await syncSalesOrder(
        challan.salesOrder
      );

      const data =
        await populateChallan(
          DeliveryChallan.findById(
            challan._id
          )
        );

      return res.json({
        success: true,

        message:
          "Delivery challan marked as Received",

        data,
      });
    } catch (error) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            error.message,
        });
    }
  }
);

router.post(
  "/cancel/:id",
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
              "Invalid delivery challan ID",
          });
      }

      const challan =
        await DeliveryChallan.findById(
          req.params.id
        );

      if (!challan) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Delivery challan not found",
          });
      }

      await cancelChallan(
        challan,
        req.body.cancelReason
      );

      const data =
        await populateChallan(
          DeliveryChallan.findById(
            challan._id
          )
        );

      return res.json({
        success: true,

        message:
          challan.reversalPosted
            ? "Delivery challan cancelled and stock reversed"
            : "Delivery challan cancelled",

        data,
      });
    } catch (error) {
      return res
        .status(400)
        .json({
          success: false,

          message:
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
        !isValidId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid delivery challan ID",
          });
      }

      const challan =
        await DeliveryChallan.findById(
          req.params.id
        );

      if (!challan) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Delivery challan not found",
          });
      }

      const status =
        cleanText(
          req.body.status
        );

      if (
        status ===
        "Dispatched"
      ) {
        if (
          req.body.dispatchDate
        ) {
          challan.dispatchDate =
            cleanText(
              req.body.dispatchDate
            );
        }

        if (
          req.body.dispatchedBy
        ) {
          challan.dispatchedBy =
            cleanText(
              req.body.dispatchedBy
            );
        }

        await dispatchChallan(
          challan
        );
      } else if (
        status ===
        "Received"
      ) {
        if (
          challan.status !==
            "Dispatched" ||
          !challan.stockPosted
        ) {
          throw new Error(
            "Only a Dispatched delivery challan can be marked as Received"
          );
        }

        challan.status =
          "Received";

        challan.receivedDate =
          cleanText(
            req.body.receivedDate,
            todayDate()
          );

        challan.receivedBy =
          cleanText(
            req.body.receivedBy
          );

        challan.receiverDesignation =
          cleanText(
            req.body.receiverDesignation
          );

        await challan.save();

        await syncSalesOrder(
          challan.salesOrder
        );
      } else if (
        status ===
        "Cancelled"
      ) {
        await cancelChallan(
          challan,
          req.body.cancelReason
        );
      } else {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid delivery challan status action",
          });
      }

      const data =
        await populateChallan(
          DeliveryChallan.findById(
            challan._id
          )
        );

      return res.json({
        success: true,

        message:
          "Delivery challan status updated successfully",

        data,
      });
    } catch (error) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            error.message,
        });
    }
  }
);

router.delete(
  "/delete/:id",
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
              "Invalid delivery challan ID",
          });
      }

      const challan =
        await DeliveryChallan.findById(
          req.params.id
        );

      if (!challan) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Delivery challan not found",
          });
      }

      if (
        challan.status !==
          "Draft" ||
        challan.stockPosted
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Only an unposted Draft delivery challan can be deleted",
          });
      }

      if (
        challan.invoiceStatus ===
        "Invoiced"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "An invoiced delivery challan cannot be deleted",
          });
      }

      await DeliveryChallan.findByIdAndDelete(
        challan._id
      );

      return res.json({
        success: true,

        message:
          "Delivery challan draft deleted successfully",
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          message:
            error.message,
        });
    }
  }
);

module.exports = router;