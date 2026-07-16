const Sales = require("../models/Sales");
const Expense = require("../models/Expense");
const Customer = require("../models/customer");
const ReadyProduct = require("../models/ReadyProducts");

// موجودہ یا پچھلے مہینے کی ابتدا اور اختتام حاصل کرنا
const getMonthRange = (monthsBack = 0) => {
  const now = new Date();

  const start = new Date(
    now.getFullYear(),
    now.getMonth() - monthsBack,
    1
  );

  const end = new Date(
    now.getFullYear(),
    now.getMonth() - monthsBack + 1,
    1
  );

  return { start, end };
};

// موجودہ اور پچھلے مہینے کے درمیان فیصد نکالنا
const getPercentageChange = (currentValue, previousValue) => {
  if (previousValue === 0) {
    return currentValue === 0 ? 0 : 100;
  }

  return Number(
    (((currentValue - previousValue) / previousValue) * 100).toFixed(1)
  );
};

// کسی model کے مخصوص field کا total نکالنا
const sumField = async (Model, field, match = {}) => {
  const result = await Model.aggregate([
    {
      $match: match,
    },
    {
      $group: {
        _id: null,
        total: {
          $sum: {
            $ifNull: [`$${field}`, 0],
          },
        },
      },
    },
  ]);

  return result[0]?.total || 0;
};

// Card کے لیے final data تیار کرنا
const makeStat = (value, currentMonthValue, previousMonthValue) => {
  const change = getPercentageChange(
    currentMonthValue,
    previousMonthValue
  );

  return {
    value,
    change,
    trend: change < 0 ? "down" : "up",
  };
};

// Dashboard statistics حاصل کرنا
const getDashboardStats = async (req, res) => {
  try {
    const currentMonth = getMonthRange(0);
    const previousMonth = getMonthRange(1);

    const currentMonthMatch = {
      createdAt: {
        $gte: currentMonth.start,
        $lt: currentMonth.end,
      },
    };

    const previousMonthMatch = {
      createdAt: {
        $gte: previousMonth.start,
        $lt: previousMonth.end,
      },
    };

    const [
      totalRevenue,
      totalExpenses,
      totalCustomers,
      totalReadyProducts,

      currentRevenue,
      previousRevenue,

      currentExpenses,
      previousExpenses,

      currentCustomers,
      previousCustomers,

      currentReadyProducts,
      previousReadyProducts,
    ] = await Promise.all([
      // تمام records کا total
      sumField(Sales, "totalAmount"),
      sumField(Expense, "amount"),
      Customer.countDocuments(),
      sumField(ReadyProduct, "qty"),

      // موجودہ اور پچھلے مہینے کی sales
      sumField(Sales, "totalAmount", currentMonthMatch),
      sumField(Sales, "totalAmount", previousMonthMatch),

      // موجودہ اور پچھلے مہینے کے expenses
      sumField(Expense, "amount", currentMonthMatch),
      sumField(Expense, "amount", previousMonthMatch),

      // موجودہ اور پچھلے مہینے کے customers
      Customer.countDocuments(currentMonthMatch),
      Customer.countDocuments(previousMonthMatch),

      // موجودہ اور پچھلے مہینے کے ready products
      sumField(ReadyProduct, "qty", currentMonthMatch),
      sumField(ReadyProduct, "qty", previousMonthMatch),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalRevenue: makeStat(
          totalRevenue,
          currentRevenue,
          previousRevenue
        ),

        totalExpenses: makeStat(
          totalExpenses,
          currentExpenses,
          previousExpenses
        ),

        totalCustomers: makeStat(
          totalCustomers,
          currentCustomers,
          previousCustomers
        ),

        readyProducts: makeStat(
          totalReadyProducts,
          currentReadyProducts,
          previousReadyProducts
        ),
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);

    return res.status(500).json({
      success: false,
      message: "Dashboard statistics could not be loaded.",
      error: error.message,
    });
  }
};

module.exports = {
  getDashboardStats,
};