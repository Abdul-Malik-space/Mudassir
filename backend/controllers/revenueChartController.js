const Sales = require("../models/Sales");
const Expense = require("../models/Expense");

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/*
|--------------------------------------------------------------------------
| کسی collection کا ماہانہ total نکالنا
|--------------------------------------------------------------------------
*/

const getMonthlyTotals = async (
  Model,
  amountField,
  startDate,
  endDate
) => {
  return Model.aggregate([
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
          $month: {
            date: "$createdAt",
            timezone: "Asia/Karachi",
          },
        },

        total: {
          $sum: {
            $convert: {
              input: `$${amountField}`,
              to: "double",
              onError: 0,
              onNull: 0,
            },
          },
        },
      },
    },

    {
      $sort: {
        _id: 1,
      },
    },
  ]);
};

/*
|--------------------------------------------------------------------------
| Revenue Chart API
| GET /api/dashboard/revenue-chart?year=2026
|--------------------------------------------------------------------------
*/

const getRevenueChart = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();

    const selectedYear = req.query.year
      ? Number(req.query.year)
      : currentYear;

    if (
      !Number.isInteger(selectedYear) ||
      selectedYear < 2000 ||
      selectedYear > 2100
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid year.",
      });
    }

    // پاکستان کے وقت کے مطابق سال کی ابتدا
    const startDate = new Date(
      `${selectedYear}-01-01T00:00:00.000+05:00`
    );

    // اگلے سال کی ابتدا
    const endDate = new Date(
      `${selectedYear + 1}-01-01T00:00:00.000+05:00`
    );

    const [revenueRecords, expenseRecords] =
      await Promise.all([
        getMonthlyTotals(
          Sales,
          "totalAmount",
          startDate,
          endDate
        ),

        getMonthlyTotals(
          Expense,
          "amount",
          startDate,
          endDate
        ),
      ]);

    const revenueMap = new Map(
      revenueRecords.map((record) => [
        Number(record._id),
        Number(record.total || 0),
      ])
    );

    const expenseMap = new Map(
      expenseRecords.map((record) => [
        Number(record._id),
        Number(record.total || 0),
      ])
    );

    const chartData = MONTH_NAMES.map(
      (month, index) => {
        const monthNumber = index + 1;

        const revenue =
          revenueMap.get(monthNumber) || 0;

        const expenses =
          expenseMap.get(monthNumber) || 0;

        return {
          month,
          monthNumber,
          revenue,
          expenses,
          profit: revenue - expenses,
        };
      }
    );

    const totalRevenue = chartData.reduce(
      (total, record) =>
        total + Number(record.revenue || 0),
      0
    );

    const totalExpenses = chartData.reduce(
      (total, record) =>
        total + Number(record.expenses || 0),
      0
    );

    return res.status(200).json({
      success: true,
      year: selectedYear,

      totals: {
        revenue: totalRevenue,
        expenses: totalExpenses,
        profit: totalRevenue - totalExpenses,
      },

      data: chartData,
    });
  } catch (error) {
    console.error(
      "Revenue chart controller error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Revenue chart data could not be loaded.",
      error: error.message,
    });
  }
};

module.exports = {
  getRevenueChart,
};