const Sales = require("../models/Sales");
const Product = require("../models/Product");

/*
|--------------------------------------------------------------------------
| Text کو matching کے لیے normalize کرنا
|--------------------------------------------------------------------------
*/

const normalizeText = (value = "") => {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
};

/*
|--------------------------------------------------------------------------
| Sales by Category
| GET /api/dashboard/sales-chart?year=2026
|--------------------------------------------------------------------------
*/

const getSalesChart = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();

    const requestedYear = req.query.year
      ? Number(req.query.year)
      : currentYear;

    if (
      !Number.isInteger(requestedYear) ||
      requestedYear < 2000 ||
      requestedYear > 2100
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid year.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | پاکستان کے وقت کے مطابق سال کی ابتدا اور اختتام
    |--------------------------------------------------------------------------
    */

    const startDate = new Date(
      `${requestedYear}-01-01T00:00:00.000+05:00`
    );

    const endDate = new Date(
      `${requestedYear + 1}-01-01T00:00:00.000+05:00`
    );

    /*
    |--------------------------------------------------------------------------
    | Products اور ان کی categories حاصل کرنا
    |--------------------------------------------------------------------------
    */

    const products = await Product.find({})
      .select("name category")
      .lean();

    const productCategoryMap = new Map();

    products.forEach((product) => {
      const normalizedName = normalizeText(product.name);

      if (!normalizedName) {
        return;
      }

      productCategoryMap.set(
        normalizedName,
        product.category?.trim() || "Uncategorized"
      );
    });

    /*
    |--------------------------------------------------------------------------
    | Sales کو product کے لحاظ سے group کرنا
    |--------------------------------------------------------------------------
    */

    const salesByProduct = await Sales.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lt: endDate,
          },
        },
      },

      {
        $group: {
          _id: {
            $trim: {
              input: {
                $ifNull: ["$product", ""],
              },
            },
          },

          amount: {
            $sum: {
              $convert: {
                input: "$totalAmount",
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },

          quantity: {
            $sum: {
              $convert: {
                input: "$qty",
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },

          salesCount: {
            $sum: 1,
          },
        },
      },

      {
        $sort: {
          amount: -1,
        },
      },
    ]);

    /*
    |--------------------------------------------------------------------------
    | Product sales کو category کے مطابق جمع کرنا
    |--------------------------------------------------------------------------
    */

    const categoryMap = new Map();

    salesByProduct.forEach((sale) => {
      const productName = String(sale._id || "").trim();

      const normalizedProductName =
        normalizeText(productName);

      const category =
        productCategoryMap.get(normalizedProductName) ||
        "Uncategorized";

      const existingCategory =
        categoryMap.get(category) || {
          name: category,
          amount: 0,
          quantity: 0,
          salesCount: 0,
        };

      existingCategory.amount += Number(
        sale.amount || 0
      );

      existingCategory.quantity += Number(
        sale.quantity || 0
      );

      existingCategory.salesCount += Number(
        sale.salesCount || 0
      );

      categoryMap.set(
        category,
        existingCategory
      );
    });

    /*
    |--------------------------------------------------------------------------
    | Category data کو بڑی رقم سے چھوٹی رقم تک sort کرنا
    |--------------------------------------------------------------------------
    */

    const allCategories = Array.from(
      categoryMap.values()
    ).sort((a, b) => b.amount - a.amount);

    const totalSalesAmount =
      allCategories.reduce(
        (total, category) =>
          total + Number(category.amount || 0),
        0
      );

    const totalQuantity =
      allCategories.reduce(
        (total, category) =>
          total + Number(category.quantity || 0),
        0
      );

    /*
    |--------------------------------------------------------------------------
    | Top 4 categories الگ، باقی Other میں
    |--------------------------------------------------------------------------
    */

    const TOP_CATEGORY_LIMIT = 4;

    const topCategories = allCategories.slice(
      0,
      TOP_CATEGORY_LIMIT
    );

    const remainingCategories =
      allCategories.slice(TOP_CATEGORY_LIMIT);

    if (remainingCategories.length > 0) {
      const otherCategory =
        remainingCategories.reduce(
          (result, category) => {
            result.amount += Number(
              category.amount || 0
            );

            result.quantity += Number(
              category.quantity || 0
            );

            result.salesCount += Number(
              category.salesCount || 0
            );

            return result;
          },
          {
            name: "Other",
            amount: 0,
            quantity: 0,
            salesCount: 0,
          }
        );

      topCategories.push(otherCategory);
    }

    /*
    |--------------------------------------------------------------------------
    | Percentage calculate کرنا
    |--------------------------------------------------------------------------
    */

    const chartData = topCategories.map(
      (category) => {
        const percentage =
          totalSalesAmount > 0
            ? Number(
                (
                  (category.amount /
                    totalSalesAmount) *
                  100
                ).toFixed(1)
              )
            : 0;

        return {
          name: category.name,
          amount: Number(
            category.amount.toFixed(2)
          ),
          quantity: Number(
            category.quantity.toFixed(2)
          ),
          salesCount: category.salesCount,
          percentage,
        };
      }
    );

    return res.status(200).json({
      success: true,
      year: requestedYear,
      totalSalesAmount: Number(
        totalSalesAmount.toFixed(2)
      ),
      totalQuantity: Number(
        totalQuantity.toFixed(2)
      ),
      data: chartData,
    });
  } catch (error) {
    console.error(
      "Sales chart controller error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Sales category chart data could not be loaded.",
      error: error.message,
    });
  }
};

module.exports = {
  getSalesChart,
};