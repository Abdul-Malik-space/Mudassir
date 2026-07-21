const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const SalesOrder = require(
  "../models/SalesOrder"
);

const Customer = require(
  "../models/customer"
);

const Item = require(
  "../models/Item"
);

const Counter = require(
  "../models/Counter"
);

const Warehouse = require(
  "../models/Warehouse"
);

const StockLedger = require(
  "../models/StockLedger"
);

const DeliveryChallan = require(
  "../models/DeliveryChallan"
);

const {
  ensureDefaultWarehouses,
} = require(
  "../utils/stockService"
);

const FINISHED_GOODS_GODOWN =
  "Finished Goods Godown";

const FINISHED_GOODS_ALIASES = [
  "Finished Goods Godown",
  "Finished Goods Warehouse",
];

const MANUAL_STATUS_TRANSITIONS = {
  Draft: [
    "Confirmed",
    "Cancelled",
  ],

  Confirmed: [
    "In Production",
    "Ready",
    "Cancelled",
  ],

  "In Production": [
    "Ready",
    "Cancelled",
  ],

  Ready: [
    "Cancelled",
  ],

  "Partially Delivered": [],

  Delivered: [],

  Invoiced: [],

  Cancelled: [],
};

const todayDate = () =>
  new Date()
    .toISOString()
    .slice(0, 10);

const cleanText = (
  value,
  fallback = ""
) => {
  const text = String(
    value ?? ""
  ).trim();

  return text || fallback;
};

const cleanNumber = (
  value
) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? Math.max(number, 0)
    : 0;
};

const idOf = (
  value
) => {
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

const isValidId = (
  value
) =>
  mongoose.isValidObjectId(
    value
  );

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
    )[0] || "value";

  const value =
    error.keyValue?.[
      field
    ];

  return `Duplicate ${field}: ${String(
    value
  )}`;
};

const populateSalesOrder = (
  query
) =>
  query
    .populate(
      "customer",
      "customerName name phoneNumber phone email address city status"
    )

    .populate(
      "items.item",
      "code name itemType unit category brand purchasePrice salePrice status stockManaged"
    )

    .populate(
      "items.warehouseId",
      "code name warehouseType status"
    );

const getFinishedGoodsWarehouse =
  async () => {
    await ensureDefaultWarehouses();

    const warehouse =
      await Warehouse.findOne({
        $or: [
          {
            code:
              "WH-FG",
          },

          {
            name:
              FINISHED_GOODS_GODOWN,
          },

          {
            name:
              "Finished Goods Warehouse",
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

const getCurrentStockMap =
  async (
    itemIds,
    warehouse
  ) => {
    const cleanIds = [
      ...new Set(
        itemIds
          .map(
            (itemId) =>
              idOf(
                itemId
              )
          )
          .filter(
            (itemId) =>
              isValidId(
                itemId
              )
          )
      ),
    ];

    if (
      cleanIds.length === 0
    ) {
      return new Map();
    }

    const objectIds =
      cleanIds.map(
        (itemId) =>
          new mongoose.Types.ObjectId(
            itemId
          )
      );

    const rows =
      await StockLedger.aggregate([
        {
          $match: {
            item: {
              $in:
                objectIds,
            },

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
            _id: "$item",

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

    return new Map(
      rows.map(
        (row) => [
          String(
            row._id
          ),

          Math.max(
            cleanNumber(
              row.qtyIn
            ) -
              cleanNumber(
                row.qtyOut
              ),
            0
          ),
        ]
      )
    );
  };

const getHighestExistingSequence =
  async () => {
    const result =
      await SalesOrder.aggregate([
        {
          $match: {
            salesOrderNo:
              /^SO-\d+$/i,
          },
        },

        {
          $project: {
            sequence: {
              $toInt: {
                $arrayElemAt: [
                  {
                    $split: [
                      "$salesOrderNo",
                      "-",
                    ],
                  },

                  1,
                ],
              },
            },
          },
        },

        {
          $sort: {
            sequence: -1,
          },
        },

        {
          $limit: 1,
        },
      ]);

    return cleanNumber(
      result[0]?.sequence
    );
  };

const syncSalesOrderCounter =
  async () => {
    const highestSequence =
      await getHighestExistingSequence();

    const counter =
      await Counter.findOneAndUpdate(
        {
          name:
            "salesOrderNo",
        },

        {
          $max: {
            seq:
              highestSequence,
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

const getNextSalesOrderNo =
  async () => {
    await syncSalesOrderCounter();

    for (
      let attempt = 0;
      attempt < 20;
      attempt += 1
    ) {
      const counter =
        await Counter.findOneAndUpdate(
          {
            name:
              "salesOrderNo",
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

      const salesOrderNo =
        `SO-${String(
          counter.seq
        ).padStart(4, "0")}`;

      const exists =
        await SalesOrder.exists({
          salesOrderNo,
        });

      if (!exists) {
        return salesOrderNo;
      }
    }

    throw new Error(
      "Unable to generate a unique sales order number"
    );
  };

const peekNextSalesOrderNo =
  async () => {
    const currentSequence =
      await syncSalesOrderCounter();

    return `SO-${String(
      currentSequence + 1
    ).padStart(4, "0")}`;
  };

const buildCustomerSnapshot = (
  customer
) => ({
  customer:
    customer._id,

  customerName:
    cleanText(
      customer.customerName ||
        customer.name
    ),

  customerPhone:
    cleanText(
      customer.phoneNumber ||
        customer.phone
    ),

  customerEmail:
    cleanText(
      customer.email
    ).toLowerCase(),

  customerAddress:
    cleanText(
      customer.address
    ),

  customerCity:
    cleanText(
      customer.city
    ),
});

const loadCustomer =
  async (
    customerId
  ) => {
    if (
      !isValidId(
        customerId
      )
    ) {
      throw new Error(
        "A valid customer is required"
      );
    }

    const customer =
      await Customer.findById(
        customerId
      );

    if (!customer) {
      throw new Error(
        "Customer not found"
      );
    }

    if (
      customer.status ===
      "Inactive"
    ) {
      throw new Error(
        "Selected customer is inactive"
      );
    }

    return customer;
  };

const prepareSalesOrderItems =
  async (
    rows,
    existingOrder = null
  ) => {
    if (
      !Array.isArray(
        rows
      )
    ) {
      throw new Error(
        "Sales order items must be an array"
      );
    }

    const cleanRows =
      rows.filter(
        (row) =>
          row &&
          idOf(
            row.item
          ) &&
          cleanNumber(
            row.quantity
          ) > 0
      );

    if (
      cleanRows.length === 0
    ) {
      throw new Error(
        "Add at least one Finished Good item"
      );
    }

    const itemIds =
      cleanRows.map(
        (row) =>
          idOf(
            row.item
          )
      );

    if (
      itemIds.some(
        (itemId) =>
          !isValidId(
            itemId
          )
      )
    ) {
      throw new Error(
        "One or more item IDs are invalid"
      );
    }

    if (
      new Set(
        itemIds
      ).size !==
      itemIds.length
    ) {
      throw new Error(
        "The same Finished Good cannot be added more than once"
      );
    }

    const warehouse =
      await getFinishedGoodsWarehouse();

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
            String(
              item._id
            ),

            item,
          ]
        )
      );

    const stockMap =
      await getCurrentStockMap(
        itemIds,
        warehouse
      );

    const existingByRowId =
      new Map();

    const existingByItemId =
      new Map();

    for (
      const row of
      existingOrder?.items ||
      []
    ) {
      existingByRowId.set(
        String(
          row._id
        ),
        row
      );

      existingByItemId.set(
        idOf(
          row.item
        ),
        row
      );
    }

    return cleanRows.map(
      (row) => {
        const item =
          itemMap.get(
            idOf(
              row.item
            )
          );

        if (!item) {
          throw new Error(
            "A selected Finished Good could not be found"
          );
        }

        if (
          item.itemType !==
          "Finished Good"
        ) {
          throw new Error(
            `Item "${item.name}" is not a Finished Good`
          );
        }

        if (
          item.stockManaged ===
          false
        ) {
          throw new Error(
            `Item "${item.name}" is not stock-managed`
          );
        }

        if (
          item.status ===
          "Inactive"
        ) {
          throw new Error(
            `Finished Good "${item.name}" is inactive`
          );
        }

        const existingRow =
          (
            row._id &&
            existingByRowId.get(
              String(
                row._id
              )
            )
          ) ||
          existingByItemId.get(
            String(
              item._id
            )
          );

        const quantity =
          cleanNumber(
            row.quantity
          );

        const deliveredQty =
          cleanNumber(
            existingRow
              ?.deliveredQty
          );

        if (
          quantity <
          deliveredQty
        ) {
          throw new Error(
            `${item.name}: ordered quantity cannot be less than delivered quantity ${deliveredQty}`
          );
        }

        const rawUnitPrice =
          row.unitPrice ===
            "" ||
          row.unitPrice ===
            undefined ||
          row.unitPrice ===
            null
            ? item.salePrice
            : row.unitPrice;

        const unitPrice =
          cleanNumber(
            rawUnitPrice
          );

        return {
          _id:
            existingRow?._id ||
            undefined,

          item:
            item._id,

          warehouseId:
            warehouse._id,

          warehouse:
            FINISHED_GOODS_GODOWN,

          itemCode:
            item.code,

          itemName:
            item.name,

          availableStock:
            cleanNumber(
              stockMap.get(
                String(
                  item._id
                )
              )
            ),

          description:
            cleanText(
              row.description,
              item.name
            ),

          size:
            cleanText(
              row.size
            ),

          textType:
            [
              "",
              "with-text",
              "without-text",
            ].includes(
              row.textType
            )
              ? row.textType
              : "",

          cartons:
            cleanNumber(
              row.cartons
            ),

          quantity,

          deliveredQty,

          pendingQty:
            Math.max(
              quantity -
                deliveredQty,
              0
            ),

          unit:
            cleanText(
              row.unit,
              item.unit ||
                "Pcs"
            ),

          unitPrice,

          amount:
            quantity *
            unitPrice,

          remarks:
            cleanText(
              row.remarks
            ),
        };
      }
    );
  };

const hasDeliveryHistory =
  async (
    salesOrderId
  ) => {
    return Boolean(
      await DeliveryChallan.exists({
        salesOrder:
          salesOrderId,

        status: {
          $in: [
            "Dispatched",
            "Received",
          ],
        },
      })
    );
  };

router.get(
  "/finished-goods",
  async (
    req,
    res
  ) => {
    try {
      const warehouse =
        await getFinishedGoodsWarehouse();

      const items =
        await Item.find({
          itemType:
            "Finished Good",

          stockManaged: {
            $ne: false,
          },

          status:
            "Active",
        })
          .select(
            "code name itemType category brand unit purchasePrice salePrice minStock status stockManaged"
          )
          .sort({
            name: 1,
          });

      const stockMap =
        await getCurrentStockMap(
          items.map(
            (item) =>
              item._id
          ),
          warehouse
        );

      const output =
        items.map(
          (item) => ({
            _id:
              item._id,

            code:
              item.code,

            name:
              item.name,

            itemType:
              item.itemType,

            category:
              item.category ||
              "",

            brand:
              item.brand ||
              "",

            unit:
              item.unit ||
              "Pcs",

            purchasePrice:
              cleanNumber(
                item.purchasePrice
              ),

            salePrice:
              cleanNumber(
                item.salePrice
              ),

            minimumStock:
              cleanNumber(
                item.minStock
              ),

            availableStock:
              cleanNumber(
                stockMap.get(
                  String(
                    item._id
                  )
                )
              ),

            warehouseId:
              warehouse._id,

            warehouse:
              FINISHED_GOODS_GODOWN,

            warehouseDisplay:
              "Finished Goods Warehouse",
          })
        );

      return res.json(
        output
      );
    } catch (error) {
      console.error(
        "Finished Goods Load Error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            error.message ||
            "Unable to load Finished Goods",
        });
    }
  }
);

router.get(
  "/next-no",
  async (
    req,
    res
  ) => {
    try {
      const salesOrderNo =
        await peekNextSalesOrderNo();

      return res.json({
        success: true,
        salesOrderNo,
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          message:
            error.message ||
            "Unable to generate sales order number",
        });
    }
  }
);

router.get(
  "/all",
  async (
    req,
    res
  ) => {
    try {
      const {
        search = "",
        status = "",
        customer = "",
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
        customer
      ) {
        if (
          !isValidId(
            customer
          )
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "Invalid customer ID",
            });
        }

        query.customer =
          customer;
      }

      if (search) {
        query.$or = [
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
            referenceNo: {
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

      const orders =
        await populateSalesOrder(
          SalesOrder.find(
            query
          ).sort({
            orderDate: -1,
            createdAt: -1,
          })
        );

      return res.json(
        orders
      );
    } catch (error) {
      console.error(
        "Sales Orders Load Error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            error.message ||
            "Unable to load sales orders",
        });
    }
  }
);

router.get(
  "/:id",
  async (
    req,
    res
  ) => {
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
              "Invalid sales order ID",
          });
      }

      const order =
        await populateSalesOrder(
          SalesOrder.findById(
            req.params.id
          )
        );

      if (!order) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Sales order not found",
          });
      }

      return res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          message:
            error.message ||
            "Unable to load sales order",
        });
    }
  }
);

router.post(
  "/add",
  async (
    req,
    res
  ) => {
    try {
      const body =
        req.body ||
        {};

      const customer =
        await loadCustomer(
          body.customer
        );

      if (
        !body.orderDate
      ) {
        throw new Error(
          "Order date is required"
        );
      }

      const items =
        await prepareSalesOrderItems(
          body.items
        );

      const salesOrderNo =
        await getNextSalesOrderNo();

      const requestedStatus =
        [
          "Draft",
          "Confirmed",
        ].includes(
          body.status
        )
          ? body.status
          : "Draft";

      const order =
        new SalesOrder({
          salesOrderNo,

          ...buildCustomerSnapshot(
            customer
          ),

          orderDate:
            cleanText(
              body.orderDate,
              todayDate()
            ),

          deliveryDate:
            cleanText(
              body.deliveryDate
            ),

          poNo:
            cleanText(
              body.poNo
            ),

          referenceNo:
            cleanText(
              body.referenceNo
            ),

          taxType:
            body.taxType ===
            "with-tax"
              ? "with-tax"
              : "without-tax",

          items,

          advance:
            cleanNumber(
              body.advance
            ),

          status:
            requestedStatus,

          remarks:
            cleanText(
              body.remarks
            ),
        });

      await order.save();

      const data =
        await populateSalesOrder(
          SalesOrder.findById(
            order._id
          )
        );

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Sales order created successfully",

          data,
        });
    } catch (error) {
      console.error(
        "Sales Order Add Error:",
        error
      );

      return res
        .status(400)
        .json({
          success: false,

          message:
            duplicateMessage(
              error,
              "Unable to create sales order"
            ),
        });
    }
  }
);

router.put(
  "/update/:id",
  async (
    req,
    res
  ) => {
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
              "Invalid sales order ID",
          });
      }

      const order =
        await SalesOrder.findById(
          req.params.id
        );

      if (!order) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Sales order not found",
          });
      }

      if (
        ![
          "Draft",
          "Confirmed",
        ].includes(
          order.status
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Only Draft or Confirmed sales orders can be edited",
          });
      }

      if (
        await hasDeliveryHistory(
          order._id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Sales order cannot be edited after delivery has started",
          });
      }

      const body =
        req.body ||
        {};

      const customer =
        await loadCustomer(
          body.customer ||
            order.customer
        );

      const items =
        await prepareSalesOrderItems(
          body.items ||
            order.items,
          order
        );

      Object.assign(
        order,
        buildCustomerSnapshot(
          customer
        )
      );

      order.orderDate =
        cleanText(
          body.orderDate,
          order.orderDate
        );

      order.deliveryDate =
        cleanText(
          body.deliveryDate
        );

      order.poNo =
        cleanText(
          body.poNo
        );

      order.referenceNo =
        cleanText(
          body.referenceNo
        );

      order.taxType =
        body.taxType ===
        "with-tax"
          ? "with-tax"
          : "without-tax";

      order.items =
        items;

      order.advance =
        cleanNumber(
          body.advance
        );

      if (
        [
          "Draft",
          "Confirmed",
        ].includes(
          body.status
        )
      ) {
        order.status =
          body.status;
      }

      order.remarks =
        cleanText(
          body.remarks
        );

      await order.save();

      const data =
        await populateSalesOrder(
          SalesOrder.findById(
            order._id
          )
        );

      return res.json({
        success: true,

        message:
          "Sales order updated successfully",

        data,
      });
    } catch (error) {
      console.error(
        "Sales Order Update Error:",
        error
      );

      return res
        .status(400)
        .json({
          success: false,

          message:
            duplicateMessage(
              error,
              "Unable to update sales order"
            ),
        });
    }
  }
);

router.patch(
  "/status/:id",
  async (
    req,
    res
  ) => {
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
              "Invalid sales order ID",
          });
      }

      const order =
        await SalesOrder.findById(
          req.params.id
        );

      if (!order) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Sales order not found",
          });
      }

      const requestedStatus =
        cleanText(
          req.body.status
        );

      const allowedStatuses =
        MANUAL_STATUS_TRANSITIONS[
          order.status
        ] || [];

      if (
        !allowedStatuses.includes(
          requestedStatus
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              `Status cannot be changed from ${order.status} to ${requestedStatus}`,
          });
      }

      if (
        requestedStatus ===
        "Cancelled" &&
        await hasDeliveryHistory(
          order._id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Cancel the delivery challan before cancelling this sales order",
          });
      }

      order.status =
        requestedStatus;

      await order.save();

      const data =
        await populateSalesOrder(
          SalesOrder.findById(
            order._id
          )
        );

      return res.json({
        success: true,

        message:
          "Sales order status updated successfully",

        data,
      });
    } catch (error) {
      console.error(
        "Sales Order Status Error:",
        error
      );

      return res
        .status(400)
        .json({
          success: false,

          message:
            error.message ||
            "Unable to update sales order status",
        });
    }
  }
);

router.delete(
  "/delete/:id",
  async (
    req,
    res
  ) => {
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
              "Invalid sales order ID",
          });
      }

      const order =
        await SalesOrder.findById(
          req.params.id
        );

      if (!order) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Sales order not found",
          });
      }

      if (
        order.status !==
        "Draft"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Only a Draft sales order can be deleted",
          });
      }

      const challanExists =
        await DeliveryChallan.exists({
          salesOrder:
            order._id,
        });

      if (
        challanExists
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "This sales order has delivery challan history and cannot be deleted",
          });
      }

      await SalesOrder.findByIdAndDelete(
        order._id
      );

      return res.json({
        success: true,

        message:
          "Sales order draft deleted successfully",
      });
    } catch (error) {
      console.error(
        "Sales Order Delete Error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            error.message ||
            "Unable to delete sales order",
        });
    }
  }
);

module.exports = router;