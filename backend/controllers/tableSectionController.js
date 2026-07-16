const SalesOrder = require("../models/SalesOrder");
const Sales = require("../models/Sales");

/*
|--------------------------------------------------------------------------
| Helper: Limit
|--------------------------------------------------------------------------
*/

const getValidLimit = (value, fallback = 5) => {
  const parsedValue = Number(value);

  if (
    Number.isInteger(parsedValue) &&
    parsedValue > 0 &&
    parsedValue <= 100
  ) {
    return parsedValue;
  }

  return fallback;
};

/*
|--------------------------------------------------------------------------
| Helper: Year
|--------------------------------------------------------------------------
*/

const getValidYear = (value) => {
  const currentYear = new Date().getFullYear();
  const year = value ? Number(value) : currentYear;

  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100
  ) {
    return null;
  }

  return year;
};

/*
|--------------------------------------------------------------------------
| Helper: Pakistan year range
|--------------------------------------------------------------------------
*/

const getYearRange = (year) => {
  const startDate = new Date(
    `${year}-01-01T00:00:00.000+05:00`
  );

  const endDate = new Date(
    `${year + 1}-01-01T00:00:00.000+05:00`
  );

  return {
    startDate,
    endDate,
  };
};

/*
|--------------------------------------------------------------------------
| Recent order کا product text
|--------------------------------------------------------------------------
*/

const getOrderProducts = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    return "No product";
  }

  const descriptions = items
    .map((item) => item?.description?.trim())
    .filter(Boolean);

  if (descriptions.length === 0) {
    return "No product";
  }

  return descriptions.join(", ");
};

/*
|--------------------------------------------------------------------------
| Recent order کو frontend format میں تبدیل کرنا
|--------------------------------------------------------------------------
*/

const formatOrder = (order) => {
  const totalQuantity = Array.isArray(order.items)
    ? order.items.reduce(
        (total, item) =>
          total + Number(item.quantity || 0),
        0
      )
    : 0;

  return {
    orderId:
      order.salesOrderNo ||
      `#${String(order._id)
        .slice(-6)
        .toUpperCase()}`,

    customer:
      order.customerName || "Unknown Customer",

    product: getOrderProducts(order.items),

    amount: Number(order.grandTotal || 0),

    status: order.status || "Draft",

    date:
      order.orderDate ||
      order.createdAt ||
      null,

    totalQuantity,

    itemCount: Array.isArray(order.items)
      ? order.items.length
      : 0,
  };
};

/*
|--------------------------------------------------------------------------
| Recent orders حاصل کرنا
|--------------------------------------------------------------------------
*/

const fetchRecentOrders = async (limit = null) => {
  let query = SalesOrder.find({})
    .sort({
      createdAt: -1,
    })
    .select(
      "salesOrderNo customerName items grandTotal status orderDate createdAt"
    );

  if (limit) {
    query = query.limit(limit);
  }

  const orders = await query.lean();

  return orders.map(formatOrder);
};

/*
|--------------------------------------------------------------------------
| کسی سال کی product sales aggregate کرنا
|--------------------------------------------------------------------------
*/

const aggregateProductsByYear = async (year) => {
  const { startDate, endDate } =
    getYearRange(year);

  return Sales.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startDate,
          $lt: endDate,
        },
      },
    },

    {
      $project: {
        normalizedProduct: {
          $toLower: {
            $trim: {
              input: {
                $ifNull: ["$product", ""],
              },
            },
          },
        },

        productName: {
          $trim: {
            input: {
              $ifNull: ["$product", ""],
            },
          },
        },

        quantity: {
          $convert: {
            input: "$qty",
            to: "double",
            onError: 0,
            onNull: 0,
          },
        },

        revenue: {
          $convert: {
            input: "$totalAmount",
            to: "double",
            onError: 0,
            onNull: 0,
          },
        },
      },
    },

    {
      $match: {
        normalizedProduct: {
          $ne: "",
        },
      },
    },

    {
      $group: {
        _id: "$normalizedProduct",

        name: {
          $first: "$productName",
        },

        sales: {
          $sum: "$quantity",
        },

        revenue: {
          $sum: "$revenue",
        },

        salesCount: {
          $sum: 1,
        },
      },
    },

    {
      $sort: {
        revenue: -1,
        name: 1,
      },
    },
  ]);
};

/*
|--------------------------------------------------------------------------
| Top Products اور trend تیار کرنا
|--------------------------------------------------------------------------
*/

const buildTopProducts = async (year) => {
  const [currentProducts, previousProducts] =
    await Promise.all([
      aggregateProductsByYear(year),
      aggregateProductsByYear(year - 1),
    ]);

  const previousRevenueMap = new Map(
    previousProducts.map((product) => [
      product._id,
      Number(product.revenue || 0),
    ])
  );

  return currentProducts.map((product) => {
    const currentRevenue = Number(
      product.revenue || 0
    );

    const previousRevenue =
      previousRevenueMap.get(product._id) || 0;

    let changeValue = 0;

    if (previousRevenue === 0) {
      changeValue =
        currentRevenue > 0 ? 100 : 0;
    } else {
      changeValue =
        ((currentRevenue - previousRevenue) /
          previousRevenue) *
        100;
    }

    changeValue = Number(
      changeValue.toFixed(1)
    );

    let trend = "same";

    if (changeValue > 0) {
      trend = "up";
    } else if (changeValue < 0) {
      trend = "down";
    }

    return {
      name: product.name || "Unnamed Product",

      sales: Number(
        Number(product.sales || 0).toFixed(2)
      ),

      salesCount: Number(
        product.salesCount || 0
      ),

      revenue: Number(
        currentRevenue.toFixed(2)
      ),

      previousRevenue: Number(
        previousRevenue.toFixed(2)
      ),

      trend,

      changeValue,

      change: `${
        changeValue > 0 ? "+" : ""
      }${changeValue}%`,
    };
  });
};

/*
|--------------------------------------------------------------------------
| Table Section Summary
| GET /api/dashboard/table-section
|--------------------------------------------------------------------------
*/

const getTableSectionSummary = async (
  req,
  res
) => {
  try {
    const year = getValidYear(req.query.year);

    if (!year) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid year.",
      });
    }

    const recentLimit = getValidLimit(
      req.query.recentLimit,
      5
    );

    const productLimit = getValidLimit(
      req.query.productLimit,
      5
    );

    const [
      recentOrders,
      totalRecentOrders,
      allTopProducts,
    ] = await Promise.all([
      fetchRecentOrders(recentLimit),

      SalesOrder.countDocuments(),

      buildTopProducts(year),
    ]);

    const topProducts = allTopProducts.slice(
      0,
      productLimit
    );

    return res.status(200).json({
      success: true,
      year,

      recentOrders: {
        items: recentOrders,
        total: totalRecentOrders,
        hasMore:
          totalRecentOrders >
          recentOrders.length,
      },

      topProducts: {
        items: topProducts,
        total: allTopProducts.length,
        hasMore:
          allTopProducts.length >
          topProducts.length,
      },
    });
  } catch (error) {
    console.error(
      "Table section summary error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Dashboard table data could not be loaded.",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| All Recent Orders
| GET /api/dashboard/table-section/recent-orders
|--------------------------------------------------------------------------
*/

const getAllRecentOrders = async (req, res) => {
  try {
    const orders = await fetchRecentOrders();

    return res.status(200).json({
      success: true,
      total: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error(
      "All recent orders error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Recent orders could not be loaded.",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| All Top Products
| GET /api/dashboard/table-section/top-products
|--------------------------------------------------------------------------
*/

const getAllTopProducts = async (req, res) => {
  try {
    const year = getValidYear(req.query.year);

    if (!year) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid year.",
      });
    }

    const products =
      await buildTopProducts(year);

    return res.status(200).json({
      success: true,
      year,
      total: products.length,
      data: products,
    });
  } catch (error) {
    console.error(
      "All top products error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Top products could not be loaded.",
      error: error.message,
    });
  }
};

module.exports = {
  getTableSectionSummary,
  getAllRecentOrders,
  getAllTopProducts,
};