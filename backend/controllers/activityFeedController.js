const Customer = require("../models/customer");
const SalesOrder = require("../models/SalesOrder");
const Sales = require("../models/Sales");
const DeliveryChallan = require(
  "../models/DeliveryChallan"
);
const GRN = require("../models/GRN");
const ReadyProduct = require(
  "../models/ReadyProducts"
);

/*
|--------------------------------------------------------------------------
| Limit validate کرنا
|--------------------------------------------------------------------------
*/

const getValidLimit = (
  value,
  fallback = 6,
  maximum = 200
) => {
  const parsedValue = Number(value);

  if (
    Number.isInteger(parsedValue) &&
    parsedValue > 0
  ) {
    return Math.min(parsedValue, maximum);
  }

  return fallback;
};

/*
|--------------------------------------------------------------------------
| Object یا value سے readable text نکالنا
|--------------------------------------------------------------------------
*/

const getText = (...values) => {
  for (const value of values) {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      continue;
    }

    if (typeof value === "object") {
      const objectText =
        value.customerName ||
        value.vendorName ||
        value.supplierName ||
        value.productName ||
        value.itemName ||
        value.name ||
        value.title ||
        value.code;

      if (objectText) {
        return String(objectText).trim();
      }

      continue;
    }

    const stringValue = String(value).trim();

    if (stringValue) {
      return stringValue;
    }
  }

  return "";
};

/*
|--------------------------------------------------------------------------
| رقم کو number میں تبدیل کرنا
|--------------------------------------------------------------------------
*/

const getNumber = (...values) => {
  for (const value of values) {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return 0;
};

/*
|--------------------------------------------------------------------------
| Currency
|--------------------------------------------------------------------------
*/

const formatCurrency = (value) => {
  return `Rs ${Number(
    value || 0
  ).toLocaleString("en-PK", {
    maximumFractionDigits: 0,
  })}`;
};

/*
|--------------------------------------------------------------------------
| Document ID کا مختصر حصہ
|--------------------------------------------------------------------------
*/

const getShortId = (id) => {
  if (!id) {
    return "";
  }

  return String(id)
    .slice(-6)
    .toUpperCase();
};

/*
|--------------------------------------------------------------------------
| Document کی بہترین date حاصل کرنا
|--------------------------------------------------------------------------
*/

const getDocumentDate = (
  document,
  additionalFields = []
) => {
  const dateFields = [
    ...additionalFields,
    "createdAt",
    "updatedAt",
    "date",
  ];

  for (const field of dateFields) {
    const value = document?.[field];

    if (!value) {
      continue;
    }

    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  /*
  MongoDB ObjectId سے creation date حاصل کرنا
  */

  if (
    document?._id &&
    typeof document._id.getTimestamp ===
      "function"
  ) {
    return document._id.getTimestamp();
  }

  return new Date(0);
};

/*
|--------------------------------------------------------------------------
| Customer Activity
|--------------------------------------------------------------------------
*/

const createCustomerActivity = (customer) => {
  const customerName =
    getText(
      customer.customerName,
      customer.name,
      customer.companyName,
      customer.businessName
    ) ||
    `Customer ${getShortId(customer._id)}`;

  return {
    id: `customer-${customer._id}`,
    type: "customer",
    title: "New customer added",
    description: `${customerName} was added to customers`,
    createdAt: getDocumentDate(customer),
    referenceId: String(customer._id),
  };
};

/*
|--------------------------------------------------------------------------
| Sales Order Activity
|--------------------------------------------------------------------------
*/

const createSalesOrderActivity = (order) => {
  const orderNumber =
    getText(
      order.salesOrderNo,
      order.orderNo,
      order.soNumber,
      order.referenceNo
    ) ||
    `SO-${getShortId(order._id)}`;

  const customerName =
    getText(
      order.customerName,
      order.customer,
      order.clientName
    ) || "Unknown customer";

  const amount = getNumber(
    order.grandTotal,
    order.totalAmount,
    order.netTotal,
    order.amount
  );

  const status = getText(order.status);

  const descriptionParts = [
    `${orderNumber} for ${customerName}`,
  ];

  if (amount > 0) {
    descriptionParts.push(
      formatCurrency(amount)
    );
  }

  if (status) {
    descriptionParts.push(status);
  }

  return {
    id: `sales-order-${order._id}`,
    type: "order",
    title: "New sales order received",
    description:
      descriptionParts.join(" • "),
    createdAt: getDocumentDate(order, [
      "orderDate",
      "salesOrderDate",
    ]),
    referenceId: String(order._id),
  };
};

/*
|--------------------------------------------------------------------------
| Sale Activity
|--------------------------------------------------------------------------
*/

const createSaleActivity = (sale) => {
  const productName =
    getText(
      sale.product,
      sale.productName,
      sale.itemName
    ) || "Product";

  const customerName = getText(
    sale.customerName,
    sale.customer
  );

  const amount = getNumber(
    sale.totalAmount,
    sale.grandTotal,
    sale.amount
  );

  const descriptionParts = [productName];

  if (customerName) {
    descriptionParts.push(customerName);
  }

  if (amount > 0) {
    descriptionParts.push(
      formatCurrency(amount)
    );
  }

  return {
    id: `sale-${sale._id}`,
    type: "sale",
    title: "Sale recorded",
    description:
      descriptionParts.join(" • "),
    createdAt: getDocumentDate(sale, [
      "saleDate",
      "invoiceDate",
    ]),
    referenceId: String(sale._id),
  };
};

/*
|--------------------------------------------------------------------------
| Delivery Challan Activity
|--------------------------------------------------------------------------
*/

const createDeliveryActivity = (
  delivery
) => {
  const challanNumber =
    getText(
      delivery.deliveryChallanNo,
      delivery.challanNo,
      delivery.dcNo,
      delivery.deliveryNo
    ) ||
    `DC-${getShortId(delivery._id)}`;

  const customerName =
    getText(
      delivery.customerName,
      delivery.customer,
      delivery.clientName
    ) || "Unknown customer";

  const status = getText(delivery.status);

  const descriptionParts = [
    `${challanNumber} for ${customerName}`,
  ];

  if (status) {
    descriptionParts.push(status);
  }

  return {
    id: `delivery-${delivery._id}`,
    type: "delivery",
    title: "Delivery challan created",
    description:
      descriptionParts.join(" • "),
    createdAt: getDocumentDate(delivery, [
      "challanDate",
      "deliveryDate",
    ]),
    referenceId: String(delivery._id),
  };
};

/*
|--------------------------------------------------------------------------
| GRN Activity
|--------------------------------------------------------------------------
*/

const createGRNActivity = (grn) => {
  const grnNumber =
    getText(
      grn.grnNo,
      grn.grnNumber,
      grn.receiptNo
    ) ||
    `GRN-${getShortId(grn._id)}`;

  const supplierName =
    getText(
      grn.supplierName,
      grn.vendorName,
      grn.vendor,
      grn.supplier
    ) || "Supplier";

  const status = getText(grn.status);

  const descriptionParts = [
    `${grnNumber} from ${supplierName}`,
  ];

  if (status) {
    descriptionParts.push(status);
  }

  return {
    id: `grn-${grn._id}`,
    type: "grn",
    title: "Goods received",
    description:
      descriptionParts.join(" • "),
    createdAt: getDocumentDate(grn, [
      "grnDate",
      "receivedDate",
    ]),
    referenceId: String(grn._id),
  };
};

/*
|--------------------------------------------------------------------------
| Ready Product Activity
|--------------------------------------------------------------------------
*/

const createReadyProductActivity = (
  readyProduct
) => {
  const productName =
    getText(
      readyProduct.productName,
      readyProduct.itemName,
      readyProduct.product,
      readyProduct.name
    ) || "Ready product";

  const quantity = getNumber(
    readyProduct.qty,
    readyProduct.quantity,
    readyProduct.readyQty
  );

  const description =
    quantity > 0
      ? `${productName} • Quantity ${quantity.toLocaleString(
          "en-PK"
        )}`
      : productName;

  return {
    id: `ready-product-${readyProduct._id}`,
    type: "readyProduct",
    title: "Ready product updated",
    description,
    createdAt: getDocumentDate(
      readyProduct
    ),
    referenceId: String(
      readyProduct._id
    ),
  };
};

/*
|--------------------------------------------------------------------------
| Activity Feed
| GET /api/dashboard/activity-feed?limit=6
|--------------------------------------------------------------------------
*/

const getActivityFeed = async (req, res) => {
  try {
    const limit = getValidLimit(
      req.query.limit,
      6,
      200
    );

    /*
    ہر collection سے اتنے records لیں گے
    کہ sorting کے بعد صحیح latest activities ملیں۔
    */

    const collectionLimit = Math.min(
      Math.max(limit * 3, 20),
      200
    );

    const [
      customers,
      salesOrders,
      sales,
      deliveryChallans,
      grns,
      readyProducts,

      customerCount,
      salesOrderCount,
      salesCount,
      deliveryCount,
      grnCount,
      readyProductCount,
    ] = await Promise.all([
      Customer.find({})
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .limit(collectionLimit)
        .lean(),

      SalesOrder.find({})
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .limit(collectionLimit)
        .lean(),

      Sales.find({})
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .limit(collectionLimit)
        .lean(),

      DeliveryChallan.find({})
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .limit(collectionLimit)
        .lean(),

      GRN.find({})
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .limit(collectionLimit)
        .lean(),

      ReadyProduct.find({})
        .sort({
          updatedAt: -1,
          createdAt: -1,
          _id: -1,
        })
        .limit(collectionLimit)
        .lean(),

      Customer.countDocuments(),
      SalesOrder.countDocuments(),
      Sales.countDocuments(),
      DeliveryChallan.countDocuments(),
      GRN.countDocuments(),
      ReadyProduct.countDocuments(),
    ]);

    const activities = [
      ...customers.map(
        createCustomerActivity
      ),

      ...salesOrders.map(
        createSalesOrderActivity
      ),

      ...sales.map(createSaleActivity),

      ...deliveryChallans.map(
        createDeliveryActivity
      ),

      ...grns.map(createGRNActivity),

      ...readyProducts.map(
        createReadyProductActivity
      ),
    ]
      .filter((activity) => {
        const date = new Date(
          activity.createdAt
        );

        return !Number.isNaN(
          date.getTime()
        );
      })
      .sort((first, second) => {
        return (
          new Date(second.createdAt) -
          new Date(first.createdAt)
        );
      });

    const totalAvailable =
      customerCount +
      salesOrderCount +
      salesCount +
      deliveryCount +
      grnCount +
      readyProductCount;

    const limitedActivities =
      activities.slice(0, limit);

    return res.status(200).json({
      success: true,
      total: totalAvailable,
      returned:
        limitedActivities.length,
      hasMore:
        totalAvailable >
        limitedActivities.length,
      data: limitedActivities,
    });
  } catch (error) {
    console.error(
      "Activity feed controller error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Activity feed could not be loaded.",
      error: error.message,
    });
  }
};

module.exports = {
  getActivityFeed,
};